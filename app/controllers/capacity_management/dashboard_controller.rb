module CapacityManagement
  class DashboardController < ::ApplicationController
    authorization_checked! :index, :data, :save_capacity, :save_retrospective

    before_action :find_project_by_project_id
    before_action :authorize_read_access, only: %i[index data]
    before_action :authorize_edit_access, only: %i[save_capacity save_retrospective]
    before_action :load_sprint
    before_action :load_project_filter

    def index
      @sprints            = load_filtered_sprints
      @available_projects = available_projects_list
      @active_tab         = params[:tab] || 'capacity'
      @can_edit_capacity_management = can_edit_capacity_management?

      # Capacity tab data
      @sprint_info      = build_sprint_info
      @team_summary     = build_team_summary
      @member_rows      = build_member_rows
      @burndown         = build_burndown
      @capacity_configs = build_capacity_configs

      # Retrospective tab data
      @past_sprints       = load_past_sprints
      @retrospective_data = build_retrospective_data
    end

    def data
      render json: {
        sprint_info:     build_sprint_info,
        team_summary:    build_team_summary,
        member_workload: build_member_rows,
        burn_down:       build_burndown,
        capacity_configs: build_capacity_configs
      }
    end

    def save_capacity
      configs = params.require(:capacity_configs)

      configs.each do |config|
        version_id = config[:version_id] || @sprint&.id
        user_id    = config[:user_id]
        hours      = config[:hours_per_day].to_f

        next unless version_id && user_id && hours > 0

        record = SprintCapacityConfiguration.find_or_initialize_by(
          version_id: version_id,
          user_id: user_id
        )
        record.hours_per_day = hours

        if config[:available_days].present?
          days = config[:available_days].to_i
          record.available_days = days > 0 ? days : nil
        end

        record.save!
      end

      render json: { success: true }
    rescue StandardError => e
      render json: { success: false, error: e.message }, status: :unprocessable_entity
    end

    def save_retrospective
      version_id = params.require(:version_id)
      retro = SprintRetrospective.find_or_create_for(version_id, @project.id)
      retro.update!(
        went_well:    params[:went_well],
        went_wrong:   params[:went_wrong],
        improvements: params[:improvements]
      )
      render json: { success: true }
    rescue StandardError => e
      render json: { success: false, error: e.message }, status: :unprocessable_entity
    end

    private

    def authorize_read_access
      return if can_view_capacity_management?

      deny_access
    end

    def authorize_edit_access
      return if can_edit_capacity_management?

      deny_access
    end

    def can_view_capacity_management?
      User.current.allowed_in_project?(:view_capacity_management, @project) ||
        User.current.allowed_in_project?(:view_work_packages, @project)
    end

    def can_edit_capacity_management?
      User.current.allowed_in_project?(:edit_capacity_management, @project)
    end

    # ── Filtro de proyectos ────────────────────────────────────────────────
    def load_project_filter
      @project_filter_mode = params[:project_filter] || 'current'
      @selected_project_ids = if params[:project_ids].present?
                                Array(params[:project_ids]).map(&:to_i)
                              else
                                []
                              end
    end

    def available_projects_list
      projects = [@project]
      projects += @project.descendants.visible.to_a
      projects.map { |p| { id: p.id, name: p.name, parent_id: p.parent_id, identifier: p.identifier } }
    end

    def filtered_projects
      case @project_filter_mode
      when 'current'
        [@project]
      when 'children'
        @project.descendants.visible.to_a
      when 'all'
        [@project] + @project.descendants.visible.to_a
      when 'selected'
        all = [@project] + @project.descendants.visible.to_a
        if @selected_project_ids.any?
          all.select { |p| @selected_project_ids.include?(p.id) }
        else
          [@project]
        end
      else
        [@project]
      end
    end

    def load_filtered_sprints
      shared_versions_for(filtered_projects)
    end

    # ── Cargar sprint activo ──────────────────────────────────────────────
    def load_sprint
      @sprint = if params[:sprint_id].present?
                  Version.find_by(id: params[:sprint_id])
                end

      return if @sprint

      sprints = shared_versions_for([@project]).order(:effective_date)
      @sprint = sprints.where('effective_date >= ?', Date.today).first
      @sprint ||= sprints.order(effective_date: :desc).first
    end

    # ── Work packages filtrados por sprint y proyectos ────────────────────
    def filtered_work_packages(sprint: nil)
      sprint ||= @sprint
      return [] unless sprint

      project_ids = filtered_projects.map(&:id)

      WorkPackage.includes(:status, :assigned_to)
                 .where(version_id: sprint.id)
                 .where(project_id: project_ids)
                 .to_a
    end

    # ── Miembros de los proyectos filtrados ───────────────────────────────
    def filtered_member_users
      project_ids = filtered_projects.map(&:id)

      Member.includes(:principal)
            .where(project_id: project_ids)
            .filter_map { |m| m.principal if m.principal&.type == 'User' }
            .uniq
    end

    # ── Info del sprint (cabecera) ────────────────────────────────────────
    def build_sprint_info
      return { name: nil } unless @sprint

      today     = Date.today
      s         = @sprint.start_date
      e         = @sprint.effective_date
      total     = work_days_between(s, e)
      elapsed   = s ? work_days_between(s, [today, e].compact.min) : 0
      remaining = [total - elapsed, 0].max
      wps       = filtered_work_packages
      projects  = filtered_projects

      {
        id:                  @sprint.id,
        name:                @sprint.name,
        start_date:          s&.strftime('%d/%b/%Y'),
        end_date:            e&.strftime('%d/%b/%Y'),
        total_work_days:     total,
        work_days_remaining: remaining,
        total_tasks:         wps.count,
        completed_tasks:     closed_wps(wps).count,
        pending_tasks:       wps.count - closed_wps(wps).count,
        projects_count:      projects.count,
        projects_names:      projects.map(&:name)
      }
    end

    # ── Resumen del equipo ────────────────────────────────────────────────
    def build_team_summary
      return { total_capacity: 0.0, total_estimated: 0.0, completed_hours: 0.0, remaining_hours: 0.0, percent_complete: 0.0 } unless @sprint

      wps      = filtered_work_packages
      total    = wps.sum { |wp| wp.estimated_hours.to_f }
      logged   = team_logged_hours
      open_rem = wps.reject { |wp| wp.status&.is_closed? }.sum { |wp| wp.estimated_hours.to_f }
      users    = filtered_member_users
      capacity = users.sum { |u| WorkloadService.sprint_capacity(u, @sprint) }
      pct      = total > 0 ? (logged / total * 100).round(1) : 0.0

      {
        total_capacity:   capacity.round(1),
        total_estimated:  total.round(1),
        completed_hours:  logged.round(1),
        remaining_hours:  open_rem.round(1),
        percent_complete: pct
      }
    end

    # ── Filas por miembro ─────────────────────────────────────────────────
    def build_member_rows
      return [] unless @sprint

      wps         = filtered_work_packages
      users       = filtered_member_users
      project_ids = filtered_projects.map(&:id)

      today             = Date.today
      sprint_total_days = work_days_between(@sprint.start_date, @sprint.effective_date)
      sprint_elapsed    = @sprint.start_date ? work_days_between(@sprint.start_date, [today, @sprint.effective_date].compact.min) : 0

      users.map do |user|
        user_wps       = wps.select { |wp| wp.assigned_to_id == user.id }
        capacity       = WorkloadService.sprint_capacity(user, @sprint)
        assigned       = user_wps.sum { |wp| wp.estimated_hours.to_f }.round(1)

        # Horas invertidas: time entries en WPs asignados al usuario (por cualquiera)
        # + time entries del usuario en WPs no asignados a él
        assigned_wp_ids = user_wps.map(&:id)
        logged_assigned = assigned_wp_ids.any? ? TimeEntry.where(entity_type: 'WorkPackage', entity_id: assigned_wp_ids).sum(:hours).to_f : 0.0
        logged_personal = WorkloadService.logged_hours(user, @sprint, project_ids)
        logged = (logged_assigned + logged_personal).round(1)
        remaining_open = user_wps.reject { |wp| wp.status&.is_closed? }
                                 .sum { |wp| wp.estimated_hours.to_f }.round(1)

        config_days    = ::CapacityManagement::SprintCapacityConfiguration
                           .available_days_for(@sprint.id, user.id)
        avail_days     = config_days || sprint_total_days
        elapsed_avail  = [sprint_elapsed, avail_days].min
        expected_today = avail_days > 0 ? (assigned * elapsed_avail.to_f / avail_days).round(1) : 0.0

        speed_status = if assigned == 0
          :no_assign
        elsif expected_today <= 0
          :no_data
        else
          ratio = (logged / expected_today * 100).round(0)
          if ratio < 80 then :slow elsif ratio <= 110 then :normal else :fast end
        end
        speed_ratio = expected_today > 0 ? (logged / expected_today * 100).round(0) : nil

        percent = capacity > 0 ? (assigned / capacity * 100).round(1) : (assigned > 0 ? 100.0 : 0.0)

        wp_filters = CGI.escape(
          { f: [
              { n: 'assignee_or_group', o: '=', v: [user.id.to_s] },
              { n: 'version',  o: '=', v: [@sprint.id.to_s] }
            ]
          }.to_json
        )
        wp_url = "/projects/#{@project.identifier}/work_packages?query_props=#{wp_filters}"

        {
          user:             user,
          user_id:        user.id,
          user_name:      user.name,
          initials:       user.name.split.map { |w| w[0].upcase }.first(2).join,
          capacity:       capacity.round(1),
          assigned:       assigned,
          logged:         logged,
          remaining_open: remaining_open,
          expected_today: expected_today,
          elapsed_days:   elapsed_avail,
          avail_days:     avail_days,
          speed_status:   speed_status,
          speed_ratio:    speed_ratio,
          percent:        percent,
          overloaded:     capacity > 0 && assigned > capacity,
          wp_url:         wp_url
        }
      end
    end

    # ── Configuraciones de capacidad por sprint ───────────────────────────
    def build_capacity_configs
      return [] unless @sprint

      sprint_work_days = work_days_between(@sprint.start_date, @sprint.effective_date)
      users = filtered_member_users
      users.map do |user|
        config = ::CapacityManagement::SprintCapacityConfiguration.find_config(@sprint.id, user.id)
        {
          user:             user,
          user_id:          user.id,
          user_name:        user.name,
          initials:         user.name.split.map { |w| w[0].upcase }.first(2).join,
          hours_per_day:    (config&.hours_per_day || 8.0).round(1),
          available_days:   config&.available_days || sprint_work_days,
          sprint_work_days: sprint_work_days
        }
      end
    end

    # ── Datos del burndown ────────────────────────────────────────────────
    def build_burndown
      empty = { labels: [], ideal: [], remaining: [], capacity: [], stats: empty_stats }
      return empty unless @sprint&.start_date && @sprint&.effective_date

      today  = Date.today
      s      = @sprint.start_date
      e      = @sprint.effective_date
      wdays  = work_days_in_range(s, e)
      n      = wdays.size
      return empty if n.zero?

      wps         = filtered_work_packages
      total_h     = wps.sum { |wp| wp.estimated_hours.to_f }
      current_rem = wps.sum do |wp|
        if wp.status&.is_closed?
          0.0
        elsif wp.remaining_hours.to_f > 0
          wp.remaining_hours.to_f
        else
          wp.estimated_hours.to_f
        end
      end
      done_h      = total_h - current_rem
      not_estimated = wps.count { |wp| wp.estimated_hours.to_f == 0.0 }
      users         = filtered_member_users
      cap_per_day   = users.sum { |u| WorkloadService.hours_per_day(u, sprint: @sprint) }
      days_elapsed  = wdays.count { |d| d <= today }

      ideal = wdays.each_with_index.map do |_, i|
        n > 1 ? (total_h * (1.0 - i.to_f / (n - 1))).round(2) : 0.0
      end

      remaining = wdays.each_with_index.map do |day, i|
        next nil if day > today

        if days_elapsed <= 1
          total_h.round(2)
        else
          t = i.to_f / (days_elapsed - 1)
          (total_h + t * (current_rem - total_h)).round(2)
        end
      end

      capacity_line = wdays.each_with_index.map do |_, i|
        (cap_per_day * (n - i)).round(2)
      end

      pct = total_h > 0 ? (done_h / total_h * 100).round(1) : 0.0

      {
        labels:    wdays.map { |d| d.strftime('%d/%m') },
        ideal:     ideal,
        remaining: remaining,
        capacity:  capacity_line,
        stats: {
          percent_complete:  pct,
          total_scope:       total_h.round(1),
          current_remaining: current_rem.round(1),
          not_estimated:     not_estimated,
          avg_burndown:      n > 0 ? (total_h / n).round(1) : 0.0
        }
      }
    end

    # ══════════════════════════════════════════════════════════════════════
    #  RETROSPECTIVA — Métodos
    # ══════════════════════════════════════════════════════════════════════

    def load_past_sprints
      shared_versions_for(filtered_projects)
        .where.not(status: 'open')
        .or(shared_versions_for(filtered_projects).where('effective_date < ?', Date.today))
        .distinct
        .order(effective_date: :desc)
    end

    def shared_versions_for(projects)
      version_ids = projects.flat_map do |project|
        Version.shared_with(project).pluck(:id)
      end.uniq

      Version.visible(User.current)
             .where(id: version_ids)
             .distinct
             .order(effective_date: :desc)
    end

    def build_retrospective_data
      sprints = @past_sprints || load_past_sprints
      project_ids = filtered_projects.map(&:id)

      sprints.map do |sp|
        wps = filtered_work_packages(sprint: sp)
        retro = SprintRetrospective.find_by(version_id: sp.id, project_id: @project.id)

        total_wps       = wps.count
        closed_wps_list = closed_wps(wps)
        open_wps_list   = wps.reject { |wp| wp.status&.is_closed? }

        total_hours     = wps.sum { |wp| wp.estimated_hours.to_f }
        closed_hours    = closed_wps_list.sum { |wp| wp.estimated_hours.to_f }
        logged_hours    = team_logged_hours_for(sp)

        # KPI: Velocity (horas completadas en el sprint)
        velocity = closed_hours.round(1)

        # KPI: Predictability (completado / comprometido)
        predictability = total_hours > 0 ? (closed_hours / total_hours * 100).round(1) : 0.0

        # KPI: Throughput (tareas cerradas)
        throughput = closed_wps_list.count

        # KPI: Completion rate (% tareas cerradas)
        completion_rate = total_wps > 0 ? (throughput.to_f / total_wps * 100).round(1) : 0.0

        # KPI: Scope change (tareas sin estimación = posible scope creep)
        not_estimated = wps.count { |wp| wp.estimated_hours.to_f == 0.0 }

        # KPI: Estimation accuracy (horas reales vs estimadas)
        estimation_accuracy = total_hours > 0 ? (logged_hours / total_hours * 100).round(1) : nil

        {
          sprint:            sp,
          sprint_id:         sp.id,
          sprint_name:       sp.name,
          start_date:        sp.start_date&.strftime('%d/%b/%Y'),
          end_date:          sp.effective_date&.strftime('%d/%b/%Y'),
          status:            sp.status,
          total_tasks:       total_wps,
          completed_tasks:   throughput,
          open_tasks:        open_wps_list.count,
          total_hours:       total_hours.round(1),
          closed_hours:      closed_hours.round(1),
          logged_hours:      logged_hours.round(1),
          not_estimated:     not_estimated,
          velocity:          velocity,
          predictability:    predictability,
          throughput:        throughput,
          completion_rate:   completion_rate,
          estimation_accuracy: estimation_accuracy,
          retrospective:     retro
        }
      end
    end

    def team_logged_hours_for(sprint)
      project_ids = filtered_projects.map(&:id)
      wp_ids = WorkPackage.where(version_id: sprint.id, project_id: project_ids).pluck(:id)
      return 0.0 if wp_ids.empty?
      TimeEntry.where(entity_type: 'WorkPackage', entity_id: wp_ids).sum(:hours).to_f
    rescue StandardError
      0.0
    end

    # ── Helpers ───────────────────────────────────────────────────────────

    def closed_wps(wps)
      wps.select { |wp| wp.status&.is_closed? }
    end

    def team_logged_hours
      return 0.0 unless @sprint
      project_ids = filtered_projects.map(&:id)
      wp_ids = WorkPackage.where(version_id: @sprint.id, project_id: project_ids).pluck(:id)
      return 0.0 if wp_ids.empty?
      TimeEntry.where(entity_type: 'WorkPackage', entity_id: wp_ids).sum(:hours).to_f.round(1)
    rescue StandardError
      0.0
    end

    def member_users
      @member_users ||= filtered_member_users
    end

    def work_days_between(start_d, end_d)
      return 0 unless start_d && end_d
      return 0 if end_d < start_d

      work_days_in_range(start_d, end_d).size
    end

    def work_days_in_range(start_d, end_d)
      return [] unless start_d && end_d
      return [] if end_d < start_d

      (start_d..end_d).select { |d| work_day?(d) }
    end

    def work_day?(date)
      return false unless date.wday.between?(1, 5)

      if defined?(NonWorkingDay)
        !NonWorkingDay.exists?(date: date)
      else
        true
      end
    rescue StandardError
      date.wday.between?(1, 5)
    end

    def empty_stats
      { percent_complete: 0.0, total_scope: 0.0, current_remaining: 0.0, not_estimated: 0, avg_burndown: 0.0 }
    end
  end
end

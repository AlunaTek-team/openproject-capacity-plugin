module CapacityManagement
  class DashboardController < ::ApplicationController
    before_action :find_project
    before_action :authorize

    def index
      @members = @project.members.includes(:user)
      @sprint_id = params[:sprint_id]
      @sprint = @project.versions.find_by(id: @sprint_id) || @project.versions.last
    end

    def data
      @sprint_id = params[:sprint_id]
      @sprint = @project.versions.find_by(id: @sprint_id) || @project.versions.last

      render json: {
        capacity: calculate_total_capacity,
        workload: calculate_current_workload,
        burn_down: calculate_burn_down_data,
        velocity: calculate_team_velocity,
        member_workload: calculate_member_workloads
      }
    end

    private

    def find_project
      @project = Project.find(params[:project_id])
    end

    def authorize
      require_login
      deny_access unless User.current.allowed_to?(:view_capacity_management, @project)
    end

    def calculate_member_workloads
      @project.members.includes(:user).map do |member|
        WorkloadService.check_overload(member.user, @sprint)
      end
    end

    def calculate_total_capacity
      @project.members.includes(:user).sum do |member|
        WorkloadService.calculate_user_capacity(member.user, @sprint)
      end
    end

    def calculate_current_workload
      work_packages = @project.work_packages.where(version_id: @sprint&.id)
      work_packages.sum { |wp| wp.estimated_hours || 0 }
    end

    def calculate_burn_down_data
      return empty_burn_down unless @sprint&.start_date && @sprint&.effective_date

      days = (@sprint.start_date..@sprint.effective_date).to_a
      return empty_burn_down if days.size < 2

      total_hours = calculate_current_workload
      ideal_burn = days.each_with_index.map { |_, i| (total_hours - (i * (total_hours.to_f / (days.size - 1)))).round(2) }
      actual_burn = calculate_actual_burn(days, total_hours)

      {
        labels: days.map { |d| d.strftime('%d %b') },
        ideal: ideal_burn,
        actual: actual_burn
      }
    end

    def calculate_actual_burn(days, total_hours)
      days.map do |day|
        if day <= Date.today
          idx = days.index(day)
          (total_hours * (1 - (idx.to_f / days.size))).round(2)
        end
      end
    end

    def empty_burn_down
      { labels: [], ideal: [], actual: [] }
    end

    def calculate_team_velocity
      past_sprints = @project.versions.where('effective_date < ?', Date.today).last(3)
      return 0 if past_sprints.empty?

      total_completed = past_sprints.sum do |v|
        @project.work_packages.where(version_id: v.id, status: { is_closed: true }).sum(:estimated_hours)
      end
      (total_completed / past_sprints.size).round(2)
    end
  end
end

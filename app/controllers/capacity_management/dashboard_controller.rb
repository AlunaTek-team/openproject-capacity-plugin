module CapacityManagement
  class DashboardController < ::ApplicationController
    before_action :find_project
    before_action :authorize

    def index
      # Initial data loading for the dashboard view
      @members = @project.members.includes(:user)
      @sprint_id = params[:sprint_id] # Assuming we use OpenProject versions as sprints
      @sprint = @project.versions.find_by(id: @sprint_id) || @project.versions.last
    end

    def data
      # JSON endpoint for Chart.js
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

    def calculate_member_workloads
      capacity_field = UserCustomField.find_by(name: 'Member Capacity (Hours)')
      @project.members.includes(:user).map do |member|
        # Si el campo no existe, devolvemos un objeto seguro para evitar Error 500
        if capacity_field.nil?
          { user_name: member.user.name, capacity: 0, workload: 0, is_overloaded: false, percentage: 0 }
        else
          WorkloadService.check_overload(member.user, @sprint)
        end
      end
    end

    def calculate_total_capacity
      @project.members.includes(:user).sum do |member|
        WorkloadService.calculate_user_capacity(member.user, @sprint)
      end
    end

    def calculate_current_workload
      # Sum of estimated hours or remaining work for assigned tasks in the sprint
      work_packages = @project.work_packages.where(version_id: @sprint&.id)
      work_packages.sum { |wp| wp.estimated_hours || 0 }
    end

    def calculate_burn_down_data
      # Mocking burn-down data for now
      days = (@sprint.start_date..@sprint.effective_date).to_a
      total_hours = calculate_current_workload
      ideal_burn = days.each_with_index.map { |_, i| (total_hours - (i * (total_hours.to_f / (days.size - 1)))).round(2) }
      
      # Actual burn (requires historical data from OpenProject journals)
      actual_burn = calculate_actual_burn(days)

      {
        labels: days.map { |d| d.strftime('%d %b') },
        ideal: ideal_burn,
        actual: actual_burn
      }
    end

    def calculate_actual_burn(days)
      # Simplified actual burn calculation based on remaining work
      # In a real scenario, we'd query journals for historical custom values
      days.map { |day| day <= Date.today ? (calculate_current_workload * (1 - (days.index(day).to_f / days.size))).round(2) : nil }
    end

    def calculate_team_velocity
      # Sum of hours completed in past sprints
      past_sprints = @project.versions.where('effective_date < ?', Date.today).last(3)
      return 0 if past_sprints.empty?

      total_completed = past_sprints.sum do |v|
        @project.work_packages.where(version_id: v.id, status: { is_closed: true }).sum(:estimated_hours)
      end
      (total_completed / past_sprints.size).round(2)
    end

    def adjust_for_holidays(hours, sprint)
      return hours unless sprint && sprint.start_date && sprint.effective_date
      
      # Assuming 5-day work week, adjust hours per day
      work_days = (sprint.start_date..sprint.effective_date).count { |d| (1..5).include?(d.wday) }
      total_days = (sprint.start_date..sprint.effective_date).count
      
      # Mock adjustment: if there are fewer work days than total calendar days
      (hours * (work_days.to_f / 10)).round # Assuming 10 working days in a 2-week sprint
    end
  end
end

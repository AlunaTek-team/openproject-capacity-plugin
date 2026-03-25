module CapacityManagement
  class WorkloadService
    def self.check_overload(user, sprint)
      capacity = calculate_user_capacity(user, sprint)
      workload = calculate_user_workload(user, sprint)

      {
        user_id: user.id,
        user_name: user.name,
        capacity: capacity,
        workload: workload,
        is_overloaded: (capacity > 0 && workload > capacity),
        percentage: (capacity > 0 ? (workload.to_f / capacity * 100).round(2) : 0)
      }
    end

    def self.calculate_user_capacity(user, sprint)
      capacity_field = UserCustomField.find_by(name: 'Member Capacity (Hours)')
      return 0 unless capacity_field

      base_capacity = user.custom_value_for(capacity_field)&.value.to_i
      adjust_for_holidays(base_capacity, sprint)
    end

    def self.calculate_user_workload(user, sprint)
      WorkPackage.where(assigned_to_id: user.id, version_id: sprint&.id).sum(:estimated_hours)
    end

    private

    def self.adjust_for_holidays(hours, sprint)
      return hours unless sprint && sprint.start_date && sprint.effective_date
      
      # Mocking a holiday calendar. In a real scenario, we'd query a Holiday model
      holidays = [] # Add holiday dates here
      
      work_days = (sprint.start_date..sprint.effective_date).count do |d| 
        (1..5).include?(d.wday) && !holidays.include?(d)
      end
      
      # Assuming 8 hours per work day as a base
      (hours * (work_days.to_f / 10)).round # Assuming 10 working days in a 2-week sprint
    end
  end
end

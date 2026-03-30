module CapacityManagement
  class WorkloadService
    DEFAULT_HOURS_PER_DAY = 8.0

    # Horas por dia configuradas para el usuario:
    # 1. Primero revisa configuracion por sprint (tabla sprint_capacity_configurations)
    # 2. Si no existe, usa custom field "Capacity Per Day (Hours)" del usuario
    # 3. Si nada, usa 8h por defecto
    def self.hours_per_day(user, sprint: nil)
      if sprint
        sprint_config = ::CapacityManagement::SprintCapacityConfiguration.find_config(sprint.id, user.id)
        return sprint_config.hours_per_day if sprint_config
      end

      field = ::UserCustomField.find_by(name: 'Capacity Per Day (Hours)')
      return DEFAULT_HOURS_PER_DAY unless field

      val = user.custom_value_for(field)&.value.to_f
      val > 0 ? val : DEFAULT_HOURS_PER_DAY
    rescue StandardError
      DEFAULT_HOURS_PER_DAY
    end

    # Capacidad total del usuario para el sprint completo.
    # Usa available_days si está configurado; si no, cuenta todos los días hábiles del sprint.
    def self.sprint_capacity(user, sprint)
      return 0.0 unless sprint&.start_date && sprint&.effective_date

      configured = ::CapacityManagement::SprintCapacityConfiguration
                     .available_days_for(sprint.id, user.id)
      work_days = configured || count_work_days(sprint.start_date, sprint.effective_date)
      (hours_per_day(user, sprint: sprint) * work_days).round(1)
    end

    # Horas reales registradas (time entries) del usuario en las tareas del sprint.
    # OpenProject 17 usa entity_type/entity_id en lugar de work_package_id.
    def self.logged_hours(user, sprint, project_ids)
      wp_ids = WorkPackage.where(version_id: sprint.id, project_id: project_ids).pluck(:id)
      return 0.0 if wp_ids.empty?
      TimeEntry.where(user_id: user.id, entity_type: 'WorkPackage', entity_id: wp_ids)
               .sum(:hours).to_f.round(1)
    rescue StandardError => e
      Rails.logger.warn "CapacityManagement: logged_hours error: #{e.message}"
      0.0
    end

    private

    def self.count_work_days(start_date, end_date)
      return 0 unless start_date && end_date
      return 0 if end_date < start_date

      (start_date..end_date).count { |d| work_day?(d) }
    end

    def self.work_day?(date)
      return false unless date.wday.between?(1, 5)

      if defined?(NonWorkingDay)
        !NonWorkingDay.exists?(date: date)
      else
        true
      end
    rescue StandardError
      date.wday.between?(1, 5)
    end
  end
end

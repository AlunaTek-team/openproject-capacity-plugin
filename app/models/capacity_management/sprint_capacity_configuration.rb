module CapacityManagement
  class SprintCapacityConfiguration < ::ApplicationRecord
    self.table_name = 'sprint_capacity_configurations'

    belongs_to :version, class_name: '::Version'
    belongs_to :user, class_name: '::User'

    validates :hours_per_day, numericality: { greater_than: 0, less_than_or_equal_to: 24 }
    validates :available_days,
              numericality: { only_integer: true, greater_than: 0 },
              allow_nil: true
    validates :version_id, uniqueness: { scope: :user_id }

    def self.find_config(version_id, user_id)
      find_by(version_id: version_id, user_id: user_id)
    end

    def self.hours_per_day_for(version_id, user_id, default: 8.0)
      config = find_config(version_id, user_id)
      config&.hours_per_day || default
    end

    def self.available_days_for(version_id, user_id)
      find_config(version_id, user_id)&.available_days
    end
  end
end

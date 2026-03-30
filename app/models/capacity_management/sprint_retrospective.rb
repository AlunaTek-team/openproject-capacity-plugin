module CapacityManagement
  class SprintRetrospective < ::ApplicationRecord
    self.table_name = 'sprint_retrospectives'

    belongs_to :version, class_name: '::Version'
    belongs_to :project, class_name: '::Project'

    validates :version_id, uniqueness: { scope: :project_id, message: 'ya tiene una retrospectiva para este proyecto' }

    def self.find_or_create_for(version_id, project_id)
      find_or_create_by!(version_id: version_id, project_id: project_id)
    end
  end
end

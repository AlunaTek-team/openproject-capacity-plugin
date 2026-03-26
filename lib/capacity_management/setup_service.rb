module CapacityManagement
  class SetupService
    def self.ensure_custom_fields
      # Custom field for User (Member Capacity)
      ensure_user_custom_field('Member Capacity (Hours)', 'int')
      # Custom field for WorkPackage (Remaining Work)
      ensure_work_package_custom_field('Remaining Work (Hours)', 'int')
    end

    private

    def self.ensure_user_custom_field(name, field_format)
      unless UserCustomField.exists?(name: name)
        UserCustomField.create!(
          name: name,
          field_format: field_format,
          is_required: false,
          editable: true
        )
      end
    end

    def self.ensure_work_package_custom_field(name, field_format)
      unless WorkPackageCustomField.exists?(name: name)
        WorkPackageCustomField.create!(
          name: name,
          field_format: field_format,
          is_required: false,
          editable: true,
          is_for_all: true
        )
      end
    end
  end
end

module CapacityManagement
  class SetupService
    def self.ensure_custom_fields
      # Horas por dia por miembro (configurable, default 8h)
      ensure_user_custom_field('Capacity Per Day (Hours)', 'float')
    end

    private

    def self.ensure_user_custom_field(name, field_format)
      unless UserCustomField.exists?(name: name)
        UserCustomField.create!(
          name:         name,
          field_format: field_format,
          is_required:  false,
          editable:     true
        )
      end
    end
  end
end

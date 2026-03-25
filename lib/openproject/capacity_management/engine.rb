module OpenProject
  module CapacityManagement
    class Engine < ::Rails::Engine
      include OpenProject::Plugins::ActsAsOpEngine

      class_inflection_override('openproject' => 'OpenProject')

      initializer 'capacity_management.setup_custom_fields' do
        # Esto se ejecuta automáticamente al arrancar OpenProject
        if ActiveRecord::Base.connection.table_exists?('custom_fields')
          begin
            require_dependency File.expand_path('../../../capacity_management/setup_service', __dir__)
            CapacityManagement::SetupService.ensure_custom_fields
          rescue => e
            Rails.logger.error "Error configurando campos de Capacity Management: #{e.message}"
          end
        end
      end

      register 'openproject-capacity_management',
               requires_openproject: '>= 13.0.0',
               author_url: 'https://github.com/AlunaTek-team' do
        project_module :capacity_management do
          permission :view_capacity_management, {
            'capacity_management/dashboard' => [:index, :data]
          }, permissible_on: :project, public: true
        end

        menu :project_menu,
             :capacity_management_dashboard,
             { controller: 'capacity_management/dashboard', action: 'index' },
             caption: 'Capacidad y Carga',
             param: :project_id,
             icon: 'icon-context icon-stats',
             after: :overview
      end
    end
  end
end

module OpenProject
  module CapacityManagement
    class Engine < ::Rails::Engine
      include OpenProject::Plugins::ActsAsOpEngine

      class_inflection_override('openproject' => 'OpenProject')

      initializer 'capacity_management.setup_custom_fields' do
        # Solo actuar si la base de datos está lista y la tabla existe
        if defined?(ActiveRecord) && ActiveRecord::Base.connection.table_exists?('custom_fields')
          begin
            # Ruta absoluta segura para entornos de contenedores
            plugin_root = File.expand_path('../../../..', __dir__)
            setup_service_path = File.join(plugin_root, 'lib/capacity_management/setup_service.rb')
            
            if File.exist?(setup_service_path)
              require setup_service_path
              ::CapacityManagement::SetupService.ensure_custom_fields
            end
          rescue => e
            Rails.logger.warn "Aviso: No se pudieron configurar campos automáticamente (posiblemente durante seeding): #{e.message}"
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

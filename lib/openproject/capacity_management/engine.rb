module OpenProject
  module CapacityManagement
    class Engine < ::Rails::Engine
      engine_name :openproject_capacity_management

      initializer 'capacity_management.register_plugin' do
        OpenProject::Plugin.register :openproject_capacity_management do
          name 'Capacity Management Plugin'
          author 'Luis Avila'
          description 'Plugin to manage team capacity and workload.'
          version '0.1.0'
          url 'https://github.com/luisavila/openproject-capacity_management'
          author_url 'https://github.com/luisavila'

          requires_openproject '>= 13.0.0'

          menu :project_menu,
               :capacity_management_dashboard,
               { controller: '/capacity_management/dashboard', action: 'index' },
               caption: 'Capacidad y Carga',
               param: :project_id,
               icon: 'icon-context icon-stats',
               after: :overview

          project_module :capacity_management do
            permission :view_capacity_management, {
              'capacity_management/dashboard' => [:index, :data]
            }, public: true
          end
        end
      end
    end
  end
end

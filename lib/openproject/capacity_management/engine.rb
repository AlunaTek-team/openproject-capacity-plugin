module OpenProject
  module CapacityManagement
    class Engine < ::Rails::Engine
      engine_name :openproject_capacity_management
      isolate_namespace CapacityManagement

      initializer 'capacity_management.register' do
        require 'open_project/plugins'

        OpenProject::Plugin.register :openproject_capacity_management,
                                      author_url: 'https://github.com/AlunaTek-team/openproject-capacity-plugin' do
          requires_openproject '>= 13.0.0'

          project_module :capacity_management do
            permission :view_capacity_management, {
              'capacity_management/dashboard' => [:index, :data]
            }, public: true
          end

          menu :project_menu,
               :capacity_management_dashboard,
               { controller: '/capacity_management/dashboard', action: 'index' },
               caption: 'Capacidad y Carga',
               param: :project_id,
               icon: 'icon-context icon-stats',
               after: :overview
        end
      end
    end
  end
end

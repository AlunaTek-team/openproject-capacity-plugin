module OpenProject
  module CapacityManagement
    class Engine < ::Rails::Engine
      include OpenProject::Plugins::ActsAsOpEngine

      register 'openproject-capacity_management',
               requires_openproject: '>= 13.0.0',
               author_url: 'https://github.com/AlunaTek-team/openproject-capacity-plugin' do
        project_module :capacity_management do
          permission :view_capacity_management, {
            'capacity_management/dashboard' => [:index, :data]
          }, permissible_on: :project, public: true
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

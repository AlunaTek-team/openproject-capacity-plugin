module OpenProject
  module CapacityManagement
    class Engine < ::Rails::Engine
      include OpenProject::Plugins::ActsAsOpEngine

      class_inflection_override('openproject' => 'OpenProject')

      initializer 'capacity_management.assets' do |app|
        app.config.assets.precompile += %w[
          capacity_management/chart.min.js
          capacity_management/dashboard.js
        ]
      end

      initializer 'capacity_management.immediate_email_notifications' do
        # Override the build_local_times method in HavingReminderMailToSend to remove
        # the minute filter that only allows exact hours (:00). This enables email
        # notifications every 15 minutes instead of once per hour.
        if defined?(Users::Scopes::HavingReminderMailToSend)
          Users::Scopes::HavingReminderMailToSend.module_eval do
            private

            def build_local_times(times, zone)
              times.map do |time|
                local_time = time.in_time_zone(zone)
                workday = local_time.to_date.cwday
                local_date = local_time.to_date

                [
                  local_date,
                  local_time.strftime("%H:%M:%S+00:00"),
                  zone.tzinfo.canonical_zone.name,
                  workday
                ]
              end
            end
          end
          Rails.logger.info "CapacityManagement: Immediate email notifications enabled (every 15 min)"
        end
      end

      initializer 'capacity_management.setup_custom_fields' do
        if defined?(ActiveRecord) && ActiveRecord::Base.connection.table_exists?('custom_fields')
          begin
            require_relative '../../capacity_management/setup_service'
            if defined?(::UserCustomField)
              ::CapacityManagement::SetupService.ensure_custom_fields
            else
              Rails.logger.warn "CapacityManagement: UserCustomField not available yet, skipping setup"
            end
          rescue => e
            Rails.logger.warn "Aviso: No se pudieron configurar campos automaticamente (posiblemente durante seeding): #{e.message}"
          end
        end
      end

      register 'openproject-capacity_management',
               requires_openproject: '>= 13.0.0',
               author_url: 'https://www.alunatek.com' do
        project_module :capacity_management do
          permission :view_capacity_management, {
            'capacity_management/dashboard' => [:index, :data]
          }, permissible_on: :project, public: true

          permission :edit_capacity_management, {
            'capacity_management/dashboard' => [:save_capacity, :save_retrospective]
          }, permissible_on: :project
        end

        menu :project_menu,
             :capacity_management_dashboard,
             { controller: '/capacity_management/dashboard', action: 'index' },
             caption: 'Capacidad y Carga',
             param: :project_id,
             icon: 'graph',
             after: :overview,
             if: ->(project) do
               user = User.current
               user.allowed_in_project?(:view_capacity_management, project) ||
                 user.allowed_in_project?(:view_work_packages, project)
             end
      end
    end
  end
end

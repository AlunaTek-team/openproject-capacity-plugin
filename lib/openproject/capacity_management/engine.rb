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
        Rails.application.config.to_prepare do
          # Add generic notification method to WorkPackageMailer
          ::WorkPackageMailer.class_eval do
            def work_package_updated(recipient, journal, reason)
              @user = recipient
              @work_package = journal.journable
              @journal = journal
              @reason = reason

              author = journal.user

              User.execute_as author do
                set_work_package_headers(@work_package)
                message_id journal, recipient
                references journal

                send_localized_mail(recipient) do
                  I18n.t(:"mail.work_package_updated.subject",
                         user_name: author.name,
                         id: @work_package.id,
                         subject: @work_package.subject,
                         reason: reason_label(reason))
                end
              end
            end

            private

            def reason_label(reason)
              I18n.t(:"mail.work_package_updated.reasons.#{reason}",
                     default: reason.to_s.humanize)
            end
          end

          # Override supports_mail? and supports_mail_digest? to enable email alerts
          # for ALL notification reasons (not just :mentioned). Without this,
          # mail_alert_sent is set to nil instead of false, and the mail_alert_unsent
          # scope won't find the notification.
          ::Notifications::CreateFromModelService::WorkPackageStrategy.class_eval do
            class << self
              def supports_mail?(_reason)
                true
              end

              def supports_mail_digest?(_reason)
                true
              end
            end
          end

          # Override WorkPackageStrategy to send emails for all reasons using prepend
          ::Notifications::MailService::WorkPackageStrategy.class_eval do
            module_function

            def send_mail(notification)
              WorkPackageMailer
                .work_package_updated(notification.recipient, notification.journal, notification.reason)
                .deliver_later
            end
          end

          Rails.logger.info "CapacityManagement: Immediate email notifications enabled for all work package events"
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

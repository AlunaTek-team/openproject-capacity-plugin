namespace :capacity_management do
  desc 'Initial setup for Capacity Management plugin (ensures custom fields exist)'
  task setup: :environment do
    puts "--- Configurando campos personalizados para Capacity Management ---"
    CapacityManagement::SetupService.ensure_custom_fields
    puts "--- Configuración completada exitosamente ---"
  end
end

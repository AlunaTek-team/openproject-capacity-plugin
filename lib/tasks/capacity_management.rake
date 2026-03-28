namespace :capacity_management do
  desc 'Initial setup for Capacity Management plugin (ensures custom fields exist)'
  task setup: :environment do
    puts "--- Configurando campos personalizados para Capacity Management ---"
    CapacityManagement::SetupService.ensure_custom_fields
    puts "--- Configuracion completada exitosamente ---"
  end

  desc 'Run migrations for Capacity Management plugin'
  task migrate: :environment do
    puts "--- Ejecutando migraciones de Capacity Management ---"

    unless ActiveRecord::Base.connection.table_exists?('sprint_capacity_configurations')
      ActiveRecord::Base.connection.create_table :sprint_capacity_configurations do |t|
        t.references :version, null: false, foreign_key: true
        t.references :user, null: false, foreign_key: true
        t.float :hours_per_day, null: false, default: 8.0
        t.timestamps
      end

      ActiveRecord::Base.connection.add_index :sprint_capacity_configurations,
                                               [:version_id, :user_id],
                                               unique: true,
                                               name: 'idx_sprint_capacity_unique'

      puts "Tabla sprint_capacity_configurations creada exitosamente."
    else
      puts "Tabla sprint_capacity_configurations ya existe, omitiendo."
    end

    puts "--- Migraciones completadas exitosamente ---"
  end
end

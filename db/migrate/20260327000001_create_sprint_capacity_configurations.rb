class CreateSprintCapacityConfigurations < ActiveRecord::Migration[8.1]
  def change
    create_table :sprint_capacity_configurations do |t|
      t.references :version, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.float :hours_per_day, null: false, default: 8.0
      t.timestamps
    end

    add_index :sprint_capacity_configurations,
              [:version_id, :user_id],
              unique: true,
              name: 'idx_sprint_capacity_unique'
  end
end

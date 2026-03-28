class AddAvailableDaysToSprintCapacityConfigurations < ActiveRecord::Migration[8.1]
  def change
    add_column :sprint_capacity_configurations, :available_days, :integer, null: true, default: nil
  end
end

class CreateSprintRetrospectives < ActiveRecord::Migration[7.1]
  def change
    create_table :sprint_retrospectives do |t|
      t.references :version, null: false, foreign_key: true
      t.references :project, null: false, foreign_key: true
      t.text :went_well
      t.text :went_wrong
      t.text :improvements
      t.timestamps
    end

    add_index :sprint_retrospectives, [:version_id, :project_id], unique: true, name: 'idx_retro_version_project'
  end
end

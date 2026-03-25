Gem::Specification.new do |s|
  s.name        = 'openproject-capacity_management'
  s.version     = '0.1.0'
  s.authors     = ['OpenProject Plugin Developer']
  s.email       = ['info@openproject.org']
  s.homepage    = 'https://github.com/AlunaTek-team/openproject-capacity-plugin'
  s.summary     = 'OpenProject Capacity Management Plugin'
  s.description = 'A plugin for OpenProject to manage team capacity, monitor workload, and generate burn-down charts.'
  s.license     = 'GPLv3'

  s.files = Dir["{app,config,db,lib,public}/**/*", "README.md"]

  s.add_dependency 'rails', '>= 7.0'
end

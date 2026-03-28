Gem::Specification.new do |s|
  s.name        = 'openproject-capacity_management'
  s.version     = '1.0.0'
  s.authors     = ['AlunaTek']
  s.email       = ['info@alunatek.com']
  s.homepage    = 'https://www.alunatek.com'
  s.summary     = 'OpenProject Capacity Management Plugin'
  s.description = 'Plugin para OpenProject que permite gestionar la capacidad del equipo por sprint: ' \
                  'dashboard de carga de trabajo por miembro, barra de progreso multicapa (invertido/pendiente/libre), ' \
                  'indicador de velocidad (Lento/Normal/Adelantado), configuracion de horas y dias disponibles por miembro, ' \
                  'grafica de burndown interactiva basada en trabajo restante real, y soporte para proyectos y subproyectos.'
  s.license     = 'GPLv3'

  s.files = Dir["{app,config,db,lib,public}/**/*", "README.md"]

  s.add_dependency 'rails', '>= 7.0'
end

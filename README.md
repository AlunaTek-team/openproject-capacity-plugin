# OpenProject Capacity Management Plugin

Este plugin permite gestionar la capacidad del equipo, monitorear la carga de trabajo y visualizar el progreso mediante gráficas de burn-down.

## Características

- **Definición de Capacidad**: Campo personalizado para registrar las horas disponibles de cada miembro por sprint.
- **Ajuste Automático**: Cálculo de capacidad ajustado según días laborables en el sprint.
- **Monitoreo de Sobrecarga**: Identificación visual de miembros con exceso de trabajo asignado.
- **Gráficas de Burn-down**: Visualización interactiva del progreso del sprint.
- **Cálculo de Velocidad**: Media de horas completadas en sprints anteriores.

## Instalación

1.  Clona este repositorio en el directorio `plugins/` de tu instalación de OpenProject:
    ```bash
    cd /path/to/openproject/plugins
    git clone https://github.com/luisavila/openproject-capacity_management.git capacity_management
    ```

2.  Instala las dependencias y ejecuta el setup de campos personalizados:
    ```bash
    cd /path/to/openproject
    bundle install
    RAILS_ENV=production bundle exec rake capacity_management:setup
    ```

3.  Reinicia tu servidor OpenProject.

## Configuración

1.  **Campos Personalizados**: El plugin creará automáticamente los siguientes campos:
    - `Member Capacity (Hours)` (en el perfil de Usuario).
    - `Remaining Work (Hours)` (en los Paquetes de Trabajo).
2.  **Sprints**: El plugin utiliza las `Versiones` de OpenProject para definir los sprints. Asegúrate de que tus versiones tengan fecha de inicio y fecha de finalización.

## Uso

1.  Navega a un proyecto.
2.  En el menú lateral, selecciona **Capacidad y Carga**.
3.  Podrás ver el Dashboard con la capacidad total, carga actual, velocidad y la gráfica de burn-down.
4.  La lista de miembros mostrará en rojo a aquellos que tengan más horas asignadas que su capacidad disponible.

## Requisitos Técnicos

- OpenProject >= 13.0
- Ruby on Rails 7.x
- Chart.js (cargado vía CDN)

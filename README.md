# OpenProject Capacity Management Plugin

Plugin para gestionar la capacidad del equipo, monitorear la carga de trabajo y visualizar el progreso mediante graficas de burn-down.

## Caracteristicas

- **Definicion de Capacidad**: Campo personalizado para registrar las horas disponibles de cada miembro por sprint.
- **Ajuste Automatico**: Calculo de capacidad ajustado segun dias laborables en el sprint.
- **Monitoreo de Sobrecarga**: Identificacion visual de miembros con exceso de trabajo asignado.
- **Graficas de Burn-down**: Visualizacion interactiva del progreso del sprint.
- **Calculo de Velocidad**: Media de horas completadas en sprints anteriores.

## Imagen Docker

La imagen se construye y publica automaticamente en GitHub Container Registry en cada push a `main`.

```
ghcr.io/alunatek-team/openproject-capacity-plugin:latest
```

### Despliegue automatico

El workflow `.github/workflows/build.yml` se encarga de:
1. Construir la imagen Docker con el plugin instalado
2. Publicarla en `ghcr.io/alunatek-team/openproject-capacity-plugin`
3. Etiquetarla con `latest` y el SHA del commit

Para desplegar manualmente:
```bash
docker build -t ghcr.io/alunatek-team/openproject-capacity-plugin:latest .
docker push ghcr.io/alunatek-team/openproject-capacity-plugin:latest
```

## Uso en Kubernetes (ArgoCD)

La imagen se referencia desde el manifest de ArgoCD en el repositorio `alunaid`:

```yaml
image:
  registry: ghcr.io
  repository: alunatek-team/openproject-capacity-plugin
  tag: latest
```

## Instalacion manual (sin Docker)

1. Clona este repositorio en el directorio `plugins/` de tu instalacion de OpenProject:
   ```bash
   cd /path/to/openproject/plugins
   git clone https://github.com/AlunaTek-team/openproject-capacity-plugin.git capacity_management
   ```

2. Instala las dependencias y ejecuta el setup de campos personalizados:
   ```bash
   cd /path/to/openproject
   bundle install
   RAILS_ENV=production bundle exec rake capacity_management:setup
   ```

3. Reinicia tu servidor OpenProject.

## Configuracion

1. **Campos Personalizados**: El plugin crea automaticamente los siguientes campos:
   - `Member Capacity (Hours)` (en el perfil de Usuario).
   - `Remaining Work (Hours)` (en los Paquetes de Trabajo).
2. **Sprints**: El plugin utiliza las `Versiones` de OpenProject para definir los sprints. Asegurate de que tus versiones tengan fecha de inicio y fecha de finalizacion.

## Uso

1. Navega a un proyecto.
2. En el menu lateral, selecciona **Capacidad y Carga**.
3. Podras ver el Dashboard con la capacidad total, carga actual, velocidad y la grafica de burn-down.
4. La lista de miembros mostrara en rojo a aquellos que tengan mas horas asignadas que su capacidad disponible.

## Requisitos Tecnicos

- OpenProject >= 13.0
- Ruby on Rails 7.x
- Chart.js (cargado via CDN)

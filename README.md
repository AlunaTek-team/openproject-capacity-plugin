# OpenProject Capacity Management Plugin

Plugin desarrollado por [AlunaTek](https://www.alunatek.com) para OpenProject 17+.

Proporciona un dashboard completo de gestión de capacidad por sprint: carga de trabajo por miembro, indicadores de velocidad, configuración de disponibilidad individual, y gráfica de burndown interactiva basada en trabajo restante real.

---

## Características

### Dashboard de capacidad y carga
- Resumen del sprint: días hábiles totales y restantes, tareas totales/completadas/pendientes, proyectos incluidos.
- Tarjetas de resumen del equipo: capacidad total, horas estimadas, horas completadas y horas pendientes.

### Trabajo por miembro
- **Barra de progreso multicapa** por cada miembro:
  - Azul → horas completadas del alcance del sprint
  - Verde semitransparente → horas asignadas del sprint
  - Gris → capacidad libre restante
  - Marcador vertical naranja → avance esperado a la fecha según días disponibles del miembro
- **Indicador de velocidad**: compara horas completadas vs. avance esperado hoy.
  - 🔴 Lento — < 80 % del esperado
  - 🟢 Normal — 80–110 %
  - 🔵 Adelantado — > 110 %
  - (sin dato cuando el sprint aún no arrancó o el miembro no tiene tareas asignadas)

### Configuración de capacidad por sprint
- Tabla editable con horas/día y días disponibles por miembro.
- Permite ajustar la disponibilidad real de cada persona (vacaciones, festivos, dedicación parcial).
- Los cambios se guardan via AJAX sin recargar la página.

### Gráfica de burndown
- Eje X: días hábiles del sprint. Eje Y: horas restantes.
- Línea de trabajo restante: calculada a partir del campo **Trabajo restante** (`remaining_hours`) de cada tarea, reflejando avance parcial aunque la tarea no esté cerrada.
- Línea de capacidad restante: horas disponibles del equipo que quedan en el sprint.
- Línea de tendencia ideal: descenso lineal desde el alcance total hasta cero.
- Respeta los días no laborables configurados en OpenProject.

### Filtros
- Selector de sprint (versiones del proyecto).
- Selector de proyectos multiselección: proyecto actual, subproyectos, o selección manual.

---

## Requisitos

- OpenProject 17.x (Rails 7, Turbo)
- PostgreSQL
- Ruby >= 3.0

---

## Imagen Docker

La imagen se construye y publica automáticamente en GitHub Container Registry en cada push a `main`.

```
ghcr.io/alunatek-team/openproject-capacity-plugin:latest
```

### Despliegue rápido con Docker Compose

```bash
git clone https://github.com/AlunaTek-team/openproject-capacity-plugin.git
cd openproject-capacity-plugin
docker compose up -d
```

### Construcción manual

```bash
docker build -t ghcr.io/alunatek-team/openproject-capacity-plugin:latest .
docker push ghcr.io/alunatek-team/openproject-capacity-plugin:latest
```

---

## Uso en Kubernetes (ArgoCD)

```yaml
image:
  registry: ghcr.io
  repository: alunatek-team/openproject-capacity-plugin
  tag: latest
```

---

## Instalación manual (sin Docker)

1. Clona el repositorio en el directorio `plugins/` de tu instalación de OpenProject:
   ```bash
   cd /path/to/openproject/plugins
   git clone https://github.com/AlunaTek-team/openproject-capacity-plugin.git capacity_management
   ```

2. Instala dependencias y ejecuta el setup:
   ```bash
   cd /path/to/openproject
   bundle install
   RAILS_ENV=production bundle exec rake capacity_management:setup
   ```

3. Reinicia OpenProject.

---

## Configuración

### Sprints
El plugin usa las **Versiones** de OpenProject como sprints. Cada versión debe tener:
- **Fecha de inicio** (Start date)
- **Fecha objetivo** (Due date / Effective date)

### Campos personalizados
El rake task `capacity_management:setup` crea automáticamente:
- `Capacity Per Day (Hours)` — campo de usuario con las horas de trabajo diarias por defecto.

La configuración de horas y días disponibles **por sprint** se gestiona directamente desde el dashboard (tabla de configuración de capacidad), sin necesidad de campos adicionales.

### Tareas y trabajo restante
Para que el burndown refleje el avance parcial, actualiza el campo **Trabajo restante** de cada tarea a medida que el equipo avanza. OpenProject calcula automáticamente este campo al registrar tiempo si la tarea tiene estimación.

---

## Versionado

La versión del plugin se gestiona en un único lugar:

```
openproject-capacity_management.gemspec  →  s.version = '1.0.0'
```

Para publicar una nueva versión:
1. Actualiza `s.version` en el gemspec.
2. Haz commit y push a `main`.
3. El workflow de GitHub Actions construye y publica la imagen automáticamente con el tag `latest` y el SHA del commit.

---

## Autor

Desarrollado por [AlunaTek](https://www.alunatek.com) — [info@alunatek.com](mailto:info@alunatek.com)

Repositorio: [github.com/AlunaTek-team/openproject-capacity-plugin](https://github.com/AlunaTek-team/openproject-capacity-plugin)

Licencia: GPLv3

# rebuild-plugin.ps1
# Rebuild rapido del plugin dentro del contenedor sin reconstruir la imagen completa.
# Uso: .\rebuild-plugin.ps1

param(
    [switch]$Assets,
    [switch]$Full
)

$ErrorActionPreference = "Stop"

if ($Full) {
    Write-Host "Reconstruccion completa de la imagen..." -ForegroundColor Yellow
    docker compose build --no-cache openproject
    docker compose up -d openproject
    Write-Host "Imagen reconstruida y contenedor iniciado." -ForegroundColor Green
    exit 0
}

Write-Host "Copiando plugin al contenedor..." -ForegroundColor Cyan
docker cp . openproject-capacity-plugin-openproject-1:/app/plugins/capacity_management/

Write-Host "Ejecutando bundle install..." -ForegroundColor Cyan
docker compose exec openproject bundle install --jobs=4 --retry=3

if ($Assets) {
    Write-Host "Precompilando assets..." -ForegroundColor Cyan
    docker compose exec openproject ./docker/prod/setup/precompile-assets.sh
}

Write-Host "Reiniciando OpenProject..." -ForegroundColor Cyan
docker compose restart openproject

Write-Host "Plugin actualizado. Accede en http://localhost:8080" -ForegroundColor Green

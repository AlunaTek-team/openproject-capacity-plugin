# OpenProject con plugin openproject-capacity_management de AlunaTek
# Imagen publica: ghcr.io/alunatek-team/openproject-capacity-plugin

FROM openproject/openproject:17

# Copiar plugin a directorio de plugins de OpenProject
COPY . /app/plugins/capacity_management/

# Copiar Gemfile.plugins que referencia el plugin local
COPY Gemfile.plugins /app/

RUN bundle config unset --local deployment 2>/dev/null || true && \
    bundle config unset --local frozen 2>/dev/null || true && \
    bundle install --jobs=4 --retry=3 && \
    bundle config set --local deployment 'true'

RUN bundle list | grep openproject-capacity_management

RUN ./docker/prod/setup/precompile-assets.sh

# Copiar assets JS del plugin al directorio de assets publicos
RUN mkdir -p /app/public/assets/capacity_management && \
    cp /app/plugins/capacity_management/app/assets/javascripts/capacity_management/chart.min.js \
       /app/public/assets/capacity_management/ && \
    cp /app/plugins/capacity_management/app/assets/javascripts/capacity_management/dashboard.js \
       /app/public/assets/capacity_management/


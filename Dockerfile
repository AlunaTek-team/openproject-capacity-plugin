# OpenProject con plugin openproject-capacity_management de AlunaTek
# Imagen pública: ghcr.io/alunatek-team/openproject-capacity-plugin

FROM openproject/openproject:17

COPY Gemfile.plugins /app/

RUN bundle config unset --local deployment 2>/dev/null || true && \
    bundle config unset --local frozen 2>/dev/null || true && \
    bundle install --jobs=4 --retry=3 && \
    bundle config set --local deployment 'true'

RUN bundle list | grep openproject-capacity_management

RUN ./docker/prod/setup/precompile-assets.sh

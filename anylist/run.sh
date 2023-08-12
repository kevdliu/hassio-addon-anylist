#!/usr/bin/with-contenv bashio

set +u

export PORT=$(bashio::addon.port 8080)

bashio::log.info "Starting server on port $PORT"
exec npm run start;

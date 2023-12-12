#!/usr/bin/with-contenv bashio

set +u

ADDON_PORT=$(bashio::addon.port 8080)
bashio::log.info "Addon is accepting requests on port $ADDON_PORT"

CONFIG_PATH=/data/options.json
EMAIL="$(bashio::config 'email')" PASSWORD="$(bashio::config 'password')" IP_FILTER="$(bashio::config 'ip_filter')" DEFAULT_LIST="$(bashio::config 'list')" exec npm run start -- --port 8080 --credentials-file "/data/.anylist_credentials"

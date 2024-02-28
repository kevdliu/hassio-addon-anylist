#!/bin/sh

set +u

exec npm run start -- --credentials-file "/data/.anylist_credentials"

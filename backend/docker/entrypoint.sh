#!/bin/sh
set -e

php artisan optimize
php artisan migrate --force

exec "$@"

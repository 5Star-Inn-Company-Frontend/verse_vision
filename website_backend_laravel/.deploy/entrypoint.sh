#!/bin/sh

echo "🎬 entrypoint.sh: [$(whoami)] [PHP $(php -r 'echo phpversion();')]"

ls

ls $LARAVEL_PATH

cd $LARAVEL_PATH && composer dump-autoload --no-interaction --no-dev --optimize
composer dump-autoload --no-interaction --no-dev --optimize

echo "🎬 artisan commands"

# 💡 Group into a custom command e.g. php artisan app:on-deploy
php artisan migrate --no-interaction --force

echo "🎬 start supervisord"

supervisord -c $LARAVEL_PATH/.deploy/config/supervisor.conf

ARG PHP_VERSION=${PHP_VERSION:-7.4}
FROM php:8.2-fpm-alpine AS php-system-setup

# Install system dependencies
RUN apk add --no-cache dcron busybox-suid libcap curl zip unzip git

# Install PHP extensions
COPY --from=mlocati/php-extension-installer /usr/bin/install-php-extensions /usr/bin/
RUN install-php-extensions intl bcmath gd pdo_mysql pdo_pgsql opcache redis uuid exif pcntl zip

# Install supervisord implementation
COPY --from=ochinchina/supervisord:latest /usr/local/bin/supervisord /usr/local/bin/supervisord

# Install caddy
COPY --from=caddy:2.2.1 /usr/bin/caddy /usr/local/bin/caddy
RUN setcap 'cap_net_bind_service=+ep' /usr/local/bin/caddy

# Install composer
COPY --from=composer/composer:2 /usr/bin/composer /usr/local/bin/composer

FROM php-system-setup AS app-setup

# Set working directory
ENV LARAVEL_PATH=/srv/app
WORKDIR $LARAVEL_PATH

# Add non-root user: 'app'
ARG NON_ROOT_GROUP=${NON_ROOT_GROUP:-app}
ARG NON_ROOT_USER=${NON_ROOT_USER:-app}
RUN addgroup -S $NON_ROOT_GROUP && adduser -S $NON_ROOT_USER -G $NON_ROOT_GROUP
RUN addgroup $NON_ROOT_USER wheel

# Set cron job
COPY ./website_backend_laravel/.deploy/config/crontab /etc/crontabs/$NON_ROOT_USER
RUN chmod 777 /usr/sbin/crond
RUN chown -R $NON_ROOT_USER:$NON_ROOT_GROUP /etc/crontabs/$NON_ROOT_USER && setcap cap_setgid=ep /usr/sbin/crond

# Switch to non-root 'app' user & install app dependencies
COPY ./website_backend_laravel/composer.json ./website_backend_laravel/composer.lock ./
RUN chown -R $NON_ROOT_USER:$NON_ROOT_GROUP $LARAVEL_PATH
USER $NON_ROOT_USER
RUN composer install --prefer-dist --no-scripts --no-dev --no-autoloader
RUN rm -rf /home/$NON_ROOT_USER/.composer

# Copy app
COPY --chown=$NON_ROOT_USER:$NON_ROOT_GROUP . $LARAVEL_PATH/
COPY ./website_backend_laravel/.deploy/config/php/local.ini /usr/local/etc/php/conf.d/local.ini

# Set any ENVs
ARG APP_NAME=${APP_NAME}
ARG APP_ENV=${APP_ENV}
ARG APP_KEY=${APP_KEY}
ARG APP_DEBUG=${APP_DEBUG}
ARG APP_URL=${APP_URL}
ARG ENFORCE_SSL=${ENFORCE_SSL}

ARG APP_LOCALE=${APP_LOCALE}
ARG APP_FALLBACK_LOCALE=${APP_FALLBACK_LOCALE}
ARG APP_FAKER_LOCALE=${APP_FAKER_LOCALE}

ARG APP_MAINTENANCE_DRIVER=${APP_MAINTENANCE_DRIVER}

ARG BCRYPT_ROUNDS=${BCRYPT_ROUNDS}


ARG LOG_CHANNEL=${LOG_CHANNEL}
ARG LOG_STACK=${LOG_STACK}
ARG LOG_DEPRECATIONS_CHANNEL=${LOG_DEPRECATIONS_CHANNEL}
ARG LOG_LEVEL=${LOG_LEVEL}

ARG DB_CONNECTION=${DB_CONNECTION}
ARG DB_HOST=${DB_HOST}
ARG DB_PORT=${DB_PORT}
ARG DB_DATABASE=${DB_DATABASE}
ARG DB_USERNAME=${DB_USERNAME}
ARG DB_PASSWORD=${DB_PASSWORD}

ARG SESSION_DRIVER=${SESSION_DRIVER}
ARG SESSION_LIFETIME=${SESSION_LIFETIME}
ARG SESSION_ENCRYPT=${SESSION_ENCRYPT}
ARG SESSION_PATH=${SESSION_PATH}
ARG SESSION_DOMAIN=${SESSION_DOMAIN}

ARG BROADCAST_DRIVER=${BROADCAST_DRIVER}
ARG FILESYSTEM_DISK=${FILESYSTEM_DISK}
ARG QUEUE_CONNECTION=${QUEUE_CONNECTION}

ARG CACHE_STORE=${CACHE_STORE}

ARG MEMCACHED_HOST=${MEMCACHED_HOST}

ARG REDIS_CLIENT=${REDIS_CLIENT}
ARG REDIS_HOST=${REDIS_HOST}
ARG REDIS_PASSWORD=${REDIS_PASSWORD}
ARG REDIS_PORT=${REDIS_PORT}

ARG MAIL_MAILER=${MAIL_MAILER}
ARG MAIL_SCHEME=${MAIL_SCHEME}
ARG MAIL_HOST=${MAIL_HOST}
ARG MAIL_PORT=${MAIL_PORT}
ARG MAIL_USERNAME=${MAIL_USERNAME}
ARG MAIL_PASSWORD=${MAIL_PASSWORD}
ARG MAIL_FROM_ADDRESS=${MAIL_FROM_ADDRESS}
ARG MAIL_FROM_NAME=${APP_NAME}

ARG PUSHER_APP_ID=${PUSHER_APP_ID}
ARG PUSHER_APP_KEY=${PUSHER_APP_KEY}
ARG PUSHER_APP_SECRET=${PUSHER_APP_SECRET}
ARG PUSHER_APP_CLUSTER=${PUSHER_APP_CLUSTER}

ARG PAYSTACK_SECRET_KEY=${PAYSTACK_SECRET_KEY}
ARG PAYSTACK_PUBLIC_KEY=${PAYSTACK_PUBLIC_KEY}
ARG OPENAI_API_KEY=${OPENAI_API_KEY}

# Start app
EXPOSE 80

RUN ls
COPY ./website_backend_laravel/.deploy/entrypoint.sh /

RUN ls
RUN rm -R ./mobile_camera_flutter
RUN rm -R ./api
RUN rm -R ./data
RUN rm -R ./electron
RUN rm -R ./python
RUN rm -R ./src
RUN rm -R ./public
RUN rm -R ./scripts
RUN ls

COPY ./website_backend_laravel/ $LARAVEL_PATH/
COPY ./website_backend_laravel/storage/logs/sam $LARAVEL_PATH/storage/logs/laravel.log


COPY --chown=$NON_ROOT_USER:$NON_ROOT_GROUP . $LARAVEL_PATH/


ENTRYPOINT ["sh", "/entrypoint.sh"]

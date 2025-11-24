#!/usr/bin/env bash

###############################################################################
# RentApplication Server Bootstrap Script
# --------------------------------------
# This script prepares a fresh Ubuntu/Debian server to host the Laravel +
# Next.js stack described in DEPLOYMENT_PLAN_2025-11-21.md.  It is safe to run
# multiple times and can be customised via environment variables.
#
# Usage:
#   sudo scripts/server-setup.sh
#
# Optional environment overrides:
#   APP_USER=deploy APP_DIR=/var/www/rentapp scripts/server-setup.sh
###############################################################################

set -euo pipefail

if [[ "$EUID" -ne 0 ]]; then
  echo "ERROR: Please run this script with sudo or as root."
  exit 1
fi

APP_USER="${APP_USER:-deploy}"
APP_GROUP="${APP_GROUP:-deploy}"
APP_DIR="${APP_DIR:-/var/www/rentapp}"
REPO_NAME="${REPO_NAME:-Rent_V2}"
PHP_VERSION="${PHP_VERSION:-8.2}"
NODE_MAJOR="${NODE_MAJOR:-20}"

log() {
  printf "\n[%s] %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

create_user() {
  if id "$APP_USER" >/dev/null 2>&1; then
    log "User $APP_USER already exists"
  else
    log "Creating deploy user: $APP_USER"
    useradd -m -s /bin/bash "$APP_USER"
  fi

  if getent group "$APP_GROUP" >/dev/null 2>&1; then
    log "Group $APP_GROUP already exists"
  else
    log "Creating deploy group: $APP_GROUP"
    groupadd "$APP_GROUP"
  fi

  usermod -aG "$APP_GROUP","www-data" "$APP_USER"
}

install_base_packages() {
  log "Updating apt sources"
  apt-get update -y
  apt-get upgrade -y

  log "Installing base packages"
  apt-get install -y \
    curl git unzip gnupg2 ca-certificates lsb-release software-properties-common \
    ufw jq build-essential
}

install_php_stack() {
  if ! command -v php${PHP_VERSION} >/dev/null 2>&1; then
    log "Installing PHP ${PHP_VERSION} and extensions"
    add-apt-repository -y ppa:ondrej/php
    apt-get update -y
    apt-get install -y \
      php${PHP_VERSION}-cli \
      php${PHP_VERSION}-fpm \
      php${PHP_VERSION}-mbstring \
      php${PHP_VERSION}-xml \
      php${PHP_VERSION}-curl \
      php${PHP_VERSION}-zip \
      php${PHP_VERSION}-mysql \
      php${PHP_VERSION}-intl \
      php${PHP_VERSION}-gd
  else
    log "PHP ${PHP_VERSION} already installed"
  fi

  if ! command -v composer >/dev/null 2>&1; then
    log "Installing Composer globally"
    curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
  fi
}

install_node_stack() {
  if ! command -v node >/dev/null 2>&1 || ! node -v | grep -q "v${NODE_MAJOR}"; then
    log "Installing Node.js ${NODE_MAJOR}.x"
    curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | bash -
    apt-get install -y nodejs
  else
    log "Node.js already at desired major version"
  fi

  if ! command -v pm2 >/dev/null 2>&1; then
    log "Installing PM2 globally"
    npm install -g pm2
  fi
}

install_mysql() {
  if ! command -v mysql >/dev/null 2>&1; then
    log "Installing MySQL Server"
    apt-get install -y mysql-server
  else
    log "MySQL already installed"
  fi
}

install_nginx() {
  if ! command -v nginx >/dev/null 2>&1; then
    log "Installing Nginx"
    apt-get install -y nginx
  else
    log "Nginx already installed"
  fi
}

prepare_directories() {
  log "Preparing application directories under ${APP_DIR}"
  mkdir -p "${APP_DIR}/shared/storage"
  mkdir -p "${APP_DIR}/shared/bootstrap/cache"
  mkdir -p "${APP_DIR}/releases"
  mkdir -p "${APP_DIR}/repo"

  chown -R "${APP_USER}:${APP_GROUP}" "${APP_DIR}"
  chmod -R 775 "${APP_DIR}/shared"
}

configure_firewall() {
  if command -v ufw >/dev/null 2>&1; then
    log "Configuring UFW firewall rules"
    ufw allow OpenSSH >/dev/null 2>&1 || true
    ufw allow 80/tcp >/dev/null 2>&1 || true
    ufw allow 443/tcp >/dev/null 2>&1 || true
  fi
}

summary() {
  cat <<EOF

Server bootstrap completed.

Next steps:
  1. Copy your SSH deploy key to ${APP_USER}@<server>.
  2. Run the GitHub Actions deployment (deploy.yml) to publish the latest build.
  3. Verify services via:
       sudo systemctl status php${PHP_VERSION}-fpm
       sudo systemctl status nginx
       sudo -u ${APP_USER} pm2 list

EOF
}

main() {
  create_user
  install_base_packages
  install_php_stack
  install_node_stack
  install_mysql
  install_nginx
  prepare_directories
  configure_firewall
  summary
}

main "$@"


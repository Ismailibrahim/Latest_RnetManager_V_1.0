#!/bin/bash

# One-Command Server Setup Script
# This script automates the initial server setup for RentApplication

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

log_info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    log_error "Please do not run this script as root. It will use sudo when needed."
    exit 1
fi

log "🚀 Starting RentApplication server setup..."
echo ""

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    OS_VERSION=$VERSION_ID
else
    log_error "Cannot detect operating system"
    exit 1
fi

log_info "Detected OS: $OS $OS_VERSION"

# Update system
log_info "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install basic tools
log_info "🛠️  Installing basic tools..."
sudo apt install -y git curl wget unzip software-properties-common

# Install PHP 8.2
log_info "🐘 Installing PHP 8.2 and extensions..."
sudo apt install -y php8.2 php8.2-fpm php8.2-mysql php8.2-xml php8.2-mbstring \
    php8.2-curl php8.2-zip php8.2-gd php8.2-bcmath php8.2-intl

# Install Composer
log_info "📦 Installing Composer..."
if ! command -v composer &> /dev/null; then
    curl -sS https://getcomposer.org/installer | php
    sudo mv composer.phar /usr/local/bin/composer
    sudo chmod +x /usr/local/bin/composer
else
    log "Composer already installed"
fi

# Install Node.js 20
log_info "📦 Installing Node.js 20..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
else
    log "Node.js already installed: $(node --version)"
fi

# Install PM2 globally
log_info "📦 Installing PM2 (Node process manager)..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
    pm2 startup systemd -u $USER --hp $HOME || true
    log "PM2 installed and startup script generated"
else
    log "PM2 already installed: $(pm2 --version)"
fi

# Install Nginx
log_info "🌐 Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    sudo apt install -y nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
else
    log "Nginx already installed"
fi

# Install MySQL
log_info "🗄️  Installing MySQL..."
if ! command -v mysql &> /dev/null; then
    sudo apt install -y mysql-server
    sudo systemctl enable mysql
    sudo systemctl start mysql
else
    log "MySQL already installed"
fi

# Create application directory
APP_DIR="/var/www/webapp"
log_info "📂 Creating application directory: $APP_DIR"
sudo mkdir -p "$APP_DIR"
sudo chown -R $USER:$USER "$APP_DIR"

# Prompt for Git repository
echo ""
read -p "Enter your Git repository URL (or press Enter to skip): " GIT_REPO

if [ -n "$GIT_REPO" ]; then
    log_info "📥 Cloning repository..."
    if [ "$(ls -A $APP_DIR)" ]; then
        log_warning "Directory not empty, skipping clone"
    else
        git clone "$GIT_REPO" "$APP_DIR" || {
            log_error "Failed to clone repository"
            exit 1
        }
    fi
fi

# Setup backend
if [ -d "$APP_DIR/backend" ]; then
    log_info "📦 Setting up backend..."
    cd "$APP_DIR/backend"
    
    # Copy .env if needed
    if [ ! -f ".env" ] && [ -f ".env.example" ]; then
        cp .env.example .env
        log_warning "Created .env from .env.example - please update with your settings!"
    fi
    
    # Install dependencies
    composer install --no-interaction --prefer-dist --optimize-autoloader --no-dev || true
    
    # Generate app key
    php artisan key:generate --force || true
    
    # Set permissions
    sudo chmod -R 775 storage bootstrap/cache
    sudo chown -R www-data:www-data storage bootstrap/cache
fi

# Setup frontend
if [ -d "$APP_DIR/frontend" ]; then
    log_info "🎨 Setting up frontend..."
    cd "$APP_DIR/frontend"
    
    # Copy .env if needed
    if [ ! -f ".env.local" ] && [ -f ".env.example" ]; then
        cp .env.example .env.local
    fi
    
    # Install dependencies
    npm ci || true
fi

# Setup Nginx configuration
log_info "🌐 Setting up Nginx configuration..."
if [ -f "$APP_DIR/config/nginx/rentapp-site.conf" ]; then
    sudo cp "$APP_DIR/config/nginx/rentapp-site.conf" /etc/nginx/sites-available/rentapp
    sudo sed -i "s/YOUR_DOMAIN_OR_IP/$(hostname -I | awk '{print $1}')/g" /etc/nginx/sites-available/rentapp || true
    sudo ln -sf /etc/nginx/sites-available/rentapp /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo nginx -t && sudo systemctl reload nginx
    log "Nginx configuration updated (update server_name in /etc/nginx/sites-available/rentapp with your domain)"
elif [ -f "$APP_DIR/config/nginx/rentapp.conf" ]; then
    sudo cp "$APP_DIR/config/nginx/rentapp.conf" /etc/nginx/sites-available/rentapp
    sudo ln -sf /etc/nginx/sites-available/rentapp /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo nginx -t && sudo systemctl reload nginx
    log "Nginx configuration updated"
fi

# Setup database
echo ""
read -p "Do you want to set up the database now? (yes/no): " SETUP_DB

if [ "$SETUP_DB" = "yes" ]; then
    log_info "🗄️  Setting up database..."
    read -p "Database name: " DB_NAME
    read -p "Database user: " DB_USER
    read -sp "Database password: " DB_PASS
    echo ""
    
    sudo mysql -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    sudo mysql -e "CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';"
    sudo mysql -e "GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';"
    sudo mysql -e "FLUSH PRIVILEGES;"
    
    log "Database created: $DB_NAME"
    
    # Run migrations if backend exists
    if [ -d "$APP_DIR/backend" ]; then
        cd "$APP_DIR/backend"
        php artisan migrate --force || true
    fi
fi

# Copy deploy script
if [ -f "$APP_DIR/config/deploy/deploy.sh" ]; then
    log_info "📋 Setting up deployment script..."
    cp "$APP_DIR/config/deploy/deploy.sh" "$APP_DIR/deploy.sh"
    chmod +x "$APP_DIR/deploy.sh"
fi

# Create logs directory
log_info "📁 Creating logs directory..."
mkdir -p "$APP_DIR/logs"

# Setup PM2 ecosystem file if it exists
if [ -f "$APP_DIR/ecosystem.config.js" ]; then
    log_info "📋 Setting up PM2 ecosystem configuration..."
    cd "$APP_DIR"
    pm2 start ecosystem.config.js || pm2 save || true
    log "PM2 ecosystem configured"
fi

# Summary
echo ""
log "✅ Server setup complete!"
echo ""
echo "📊 Summary:"
echo "  - Application directory: $APP_DIR"
echo "  - PHP: $(php --version | head -n1)"
echo "  - Node.js: $(node --version)"
echo "  - Composer: $(composer --version | head -n1)"
echo "  - Nginx: $(nginx -v 2>&1 | cut -d'/' -f2)"
echo ""
echo "📝 Next steps:"
echo "  1. Update backend/.env with your production settings"
echo "  2. Update frontend/.env.local with your API URL"
echo "  3. Configure Nginx server_name in /etc/nginx/sites-available/rentapp"
echo "  4. Set up SSL certificate (Let's Encrypt recommended)"
echo "  5. Configure GitHub Actions secrets for automated deployment"
echo ""
log "🎉 Setup complete!"


#!/bin/bash

# Queue Worker Setup Script
# This script sets up supervisor to manage Laravel queue workers

set -e

APP_DIR="${APP_DIRECTORY:-/var/www/webapp}"
BACKEND_DIR="$APP_DIR/backend"
SUPERVISOR_CONFIG="/etc/supervisor/conf.d/rentapp-queue.conf"

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

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    log_error "This script must be run as root or with sudo"
    exit 1
fi

log "🚀 Setting up Laravel queue workers with Supervisor..."

# Install Supervisor if not installed
if ! command -v supervisorctl &> /dev/null; then
    log_info "Installing Supervisor..."
    if command -v apt &> /dev/null; then
        apt update
        apt install -y supervisor
    elif command -v yum &> /dev/null; then
        yum install -y supervisor
        systemctl enable supervisord >/dev/null 2>&1 || true
        systemctl start supervisord >/dev/null 2>&1 || true
    else
        log_error "Neither apt nor yum found. Please install Supervisor manually."
        exit 1
    fi
else
    log "Supervisor already installed"
fi

# Create supervisor configuration
log_info "Creating Supervisor configuration..."
cat > "$SUPERVISOR_CONFIG" << EOF
[program:rentapp-queue-worker]
process_name=%(program_name)s_%(process_num)02d
command=php $BACKEND_DIR/artisan queue:work --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=$BACKEND_DIR/storage/logs/queue-worker.log
stopwaitsecs=3600
EOF

log "✅ Supervisor configuration created: $SUPERVISOR_CONFIG"

# Reload supervisor
log_info "Reloading Supervisor..."
supervisorctl reread
supervisorctl update

# Start queue workers
log_info "Starting queue workers..."
supervisorctl start rentapp-queue-worker:*

# Check status
log_info "Queue worker status:"
supervisorctl status rentapp-queue-worker:*

log "✅ Queue workers setup complete!"
log ""
log "📋 Useful commands:"
log "   - Check status: sudo supervisorctl status rentapp-queue-worker:*"
log "   - Restart workers: sudo supervisorctl restart rentapp-queue-worker:*"
log "   - Stop workers: sudo supervisorctl stop rentapp-queue-worker:*"
log "   - View logs: tail -f $BACKEND_DIR/storage/logs/queue-worker.log"


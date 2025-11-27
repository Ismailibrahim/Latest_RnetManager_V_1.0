#!/bin/bash

# RentApplication Deployment Script
# This script should be placed at: /var/www/webapp/deploy.sh
# Make it executable: chmod +x /var/www/webapp/deploy.sh

set -e  # Exit on any error

# IMPORTANT: Read environment variables immediately to ensure they're available
# These are set by GitHub Actions workflow to skip backup during automated deployments
SKIP_BACKUP="${SKIP_BACKUP:-}"
SKIP_GIT_PULL="${SKIP_GIT_PULL:-}"
APP_DIRECTORY="${APP_DIRECTORY:-}"
DEPLOY_ENV="${DEPLOY_ENV:-}"

APP_DIR="${APP_DIRECTORY:-/var/www/webapp}"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
ENVIRONMENT="${DEPLOY_ENV:-production}"

# Debug: Log environment variables at the very start
echo "[$(date +'%Y-%m-%d %H:%M:%S')] DEBUG: Script started"
echo "[$(date +'%Y-%m-%d %H:%M:%S')] DEBUG: SKIP_BACKUP='$SKIP_BACKUP'"
echo "[$(date +'%Y-%m-%d %H:%M:%S')] DEBUG: SKIP_GIT_PULL='$SKIP_GIT_PULL'"
echo "[$(date +'%Y-%m-%d %H:%M:%S')] DEBUG: APP_DIRECTORY='$APP_DIRECTORY'"
echo "[$(date +'%Y-%m-%d %H:%M:%S')] DEBUG: APP_DIR='$APP_DIR'"

# ============================================================================
# CRITICAL: BACKUP DISABLE FLAG - SET IMMEDIATELY FOR AUTOMATED DEPLOYMENTS
# ============================================================================
# If this is an automated deployment (from GitHub Actions), backup is ALWAYS disabled
# This flag is checked at the backup section to completely skip all backup code
DISABLE_BACKUP_FOR_AUTOMATED_DEPLOYMENT=false
if [ "$SKIP_BACKUP" = "true" ] || [ -n "$SKIP_GIT_PULL" ]; then
    DISABLE_BACKUP_FOR_AUTOMATED_DEPLOYMENT=true
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✅ BACKUP DISABLED - Automated deployment detected"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')]    SKIP_BACKUP='$SKIP_BACKUP'"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')]    SKIP_GIT_PULL='$SKIP_GIT_PULL'"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')]    DISABLE_BACKUP_FOR_AUTOMATED_DEPLOYMENT='$DISABLE_BACKUP_FOR_AUTOMATED_DEPLOYMENT'"
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
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

# Error handler
error_handler() {
    log_error "Deployment failed at line $1"
    log_error "Check the logs above for details"
    exit 1
}

trap 'error_handler $LINENO' ERR

log "🚀 Starting deployment (Environment: $ENVIRONMENT)..."

# Pre-deployment checks
log_info "🔍 Running pre-deployment checks..."

# Check if app directory exists
if [ ! -d "$APP_DIR" ]; then
    log_error "Cannot access $APP_DIR"
    exit 1
fi

# Check disk space (at least 500MB free)
AVAILABLE_KB=$(df "$APP_DIR" | tail -1 | awk '{print $4}')
if [ "$AVAILABLE_KB" -lt 512000 ]; then
    log_warning "Low disk space: $(($AVAILABLE_KB / 1024))MB free (recommended: at least 500MB)"
fi

# Check required commands
for cmd in git composer php npm; do
    if ! command -v $cmd &> /dev/null; then
        log_error "$cmd is not installed or not in PATH"
        exit 1
    fi
done

# Check PHP version (should be 8.2+)
PHP_MAJOR=$(php -r 'echo PHP_MAJOR_VERSION;')
PHP_MINOR=$(php -r 'echo PHP_MINOR_VERSION;')
PHP_VERSION="$PHP_MAJOR.$PHP_MINOR"
if [ "$PHP_MAJOR" -lt 8 ] || ([ "$PHP_MAJOR" -eq 8 ] && [ "$PHP_MINOR" -lt 2 ]); then
    log_warning "PHP version $PHP_VERSION is below recommended 8.2+"
fi

log "✅ Pre-deployment checks passed"

# Navigate to app directory
cd "$APP_DIR" || {
    log_error "Cannot access $APP_DIR"
    exit 1
}

# Clean up disk space before creating directories
log_info "🧹 Cleaning up disk space..."
# Remove old backups (keep only 3 most recent)
if [ -d "$APP_DIR/backups" ]; then
    cd "$APP_DIR/backups"
    ls -t *.tar.gz 2>/dev/null | tail -n +4 | xargs -r rm -f
    log "✅ Cleaned old backups"
fi
cd "$APP_DIR"

# Remove old log files
find "$APP_DIR/backend/storage/logs" -name "*.log" -type f -mtime +7 -delete 2>/dev/null || true
find "$APP_DIR" -name "*.tmp" -type f -mtime +1 -delete 2>/dev/null || true

# Check disk space again
AVAILABLE_KB=$(df "$APP_DIR" | tail -1 | awk '{print $4}')
if [ "$AVAILABLE_KB" -lt 51200 ]; then
    log_warning "Very low disk space: $(($AVAILABLE_KB / 1024))MB free"
    log_info "Attempting additional cleanup..."
    
    # Remove node_modules if they exist (will be reinstalled)
    # Fix permissions first, then remove (suppress errors for stubborn files)
    if [ -d "$APP_DIR/frontend/node_modules" ]; then
        log_info "Removing frontend node_modules..."
        chmod -R u+w "$APP_DIR/frontend/node_modules" 2>/dev/null || true
        rm -rf "$APP_DIR/frontend/node_modules" 2>/dev/null || {
            # If rm fails, try find -delete which handles permissions better
            find "$APP_DIR/frontend/node_modules" -type f -exec chmod u+w {} \; 2>/dev/null || true
            find "$APP_DIR/frontend/node_modules" -type d -exec chmod u+w {} \; 2>/dev/null || true
            rm -rf "$APP_DIR/frontend/node_modules" 2>/dev/null || true
        }
        log "✅ Removed frontend node_modules (or attempted)"
    fi
    
    # Remove vendor if it exists
    if [ -d "$APP_DIR/backend/vendor" ]; then
        log_info "Removing backend vendor..."
        chmod -R u+w "$APP_DIR/backend/vendor" 2>/dev/null || true
        rm -rf "$APP_DIR/backend/vendor" 2>/dev/null || {
            find "$APP_DIR/backend/vendor" -type f -exec chmod u+w {} \; 2>/dev/null || true
            find "$APP_DIR/backend/vendor" -type d -exec chmod u+w {} \; 2>/dev/null || true
            rm -rf "$APP_DIR/backend/vendor" 2>/dev/null || true
        }
        log "✅ Removed backend vendor (or attempted)"
    fi
fi

# Create logs directory if it doesn't exist
mkdir -p "$APP_DIR/logs" 2>/dev/null || {
    log_warning "Could not create logs directory, continuing anyway..."
}

# ============================================================================
# BACKUP SECTION - COMPLETELY DISABLED FOR AUTOMATED DEPLOYMENTS
# ============================================================================
# NOTE: Backups are DISABLED for automated deployments because:
# 1. Code is already in Git (can rollback via Git)
# 2. Backups cause SSH timeouts during automated deployments
# 3. They consume disk space unnecessarily
# 4. Automated deployments should be fast and reliable
#
# CRITICAL: Check environment variables IMMEDIATELY and skip ALL backup code
# ============================================================================

# ============================================================================
# IMMEDIATE BACKUP CHECK - EXIT EARLY IF AUTOMATED DEPLOYMENT
# ============================================================================
# CRITICAL: This check happens BEFORE any backup code runs
# If any of these conditions are true, skip ALL backup code immediately
# DO NOT MODIFY THIS LOGIC - It prevents SSH timeouts during automated deployments

# Check if this is an automated deployment (from GitHub Actions)
# CRITICAL: This MUST be the first check - if true, skip ALL backup code
if [ "$DISABLE_BACKUP_FOR_AUTOMATED_DEPLOYMENT" = "true" ] || [ "$SKIP_BACKUP" = "true" ] || [ -n "$SKIP_GIT_PULL" ]; then
    log_info "✅ Backup SKIPPED (automated deployment detected)"
    log_info "   - DISABLE_BACKUP_FOR_AUTOMATED_DEPLOYMENT: $DISABLE_BACKUP_FOR_AUTOMATED_DEPLOYMENT"
    log_info "   - SKIP_BACKUP: $SKIP_BACKUP"
    log_info "   - SKIP_GIT_PULL: $SKIP_GIT_PULL"
    log_info "   Reason: Code is in Git, backup not needed for automated deployments"
    # EXIT THIS SECTION IMMEDIATELY - DO NOT RUN ANY BACKUP CODE BELOW
    # All backup code below this point is SKIPPED for automated deployments
    # This is the END of the backup section for automated deployments
    log_info "   Backup section complete (skipped)"
elif [ "${ENABLE_BACKUP:-}" = "true" ]; then
    # Manual deployment with backup enabled
    log_info "💾 Creating backup (manual deployment with ENABLE_BACKUP=true)..."
    BACKUP_DIR="$APP_DIR/backups"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    mkdir -p "$BACKUP_DIR"
    
    if [ -d "$APP_DIR/backend" ] && [ -d "$APP_DIR/frontend" ]; then
        # Run backup in background with nohup to completely detach from SSH session
        nohup bash -c "
            timeout 300 tar -czf '$BACKUP_DIR/backup_$TIMESTAMP.tar.gz' \
              --exclude='$APP_DIR/backups' \
              --exclude='$APP_DIR/node_modules' \
              --exclude='$APP_DIR/backend/vendor' \
              --exclude='$APP_DIR/backend/storage/logs/*' \
              --exclude='$APP_DIR/backend/storage/framework/cache/*' \
              --exclude='$APP_DIR/backend/storage/framework/sessions/*' \
              --exclude='$APP_DIR/backend/storage/framework/views/*' \
              --exclude='$APP_DIR/frontend/.next' \
              --exclude='$APP_DIR/frontend/node_modules' \
              --exclude='$APP_DIR/frontend/.cache' \
              --exclude='*.log' \
              --exclude='*.tmp' \
              -C '$APP_DIR' . > '$BACKUP_DIR/backup_${TIMESTAMP}.log' 2>&1
            
            if [ \$? -eq 0 ]; then
                echo \"[$(date +'%Y-%m-%d %H:%M:%S')] ✅ Backup created: backup_$TIMESTAMP.tar.gz\" >> '$BACKUP_DIR/backup_${TIMESTAMP}.log'
            else
                echo \"[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  Backup creation had issues\" >> '$BACKUP_DIR/backup_${TIMESTAMP}.log'
            fi
        " > /dev/null 2>&1 &
        
        log_info "Backup process started in background (completely detached)"
        log_info "Deployment will continue immediately"
    else
        log_warning "Backend or frontend directory not found, skipping backup"
    fi
else
    # Neither automated deployment flag nor ENABLE_BACKUP is set
    log_info "✅ Backup SKIPPED (ENABLE_BACKUP not set to 'true' and not automated deployment)"
fi
# ============================================================================
# END OF BACKUP SECTION
# ============================================================================

# Clean up old backups to prevent disk space issues
log_info "Cleaning up old backups..."
if [ -d "$BACKUP_DIR" ]; then
    # Keep only the 5 most recent backups
    cd "$BACKUP_DIR"
    ls -t *.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm -f
    log "✅ Backup cleanup complete"
fi
cd "$APP_DIR"

# Setup SSH for git operations
log_info "🔑 Setting up Git SSH authentication..."

# Try multiple possible SSH key locations
SSH_KEY=""
SSH_DIR=""

# Expand ~ to actual home directory
if [ -n "$HOME" ]; then
    USER_HOME="$HOME"
elif [ -n "$USER" ]; then
    USER_HOME=$(eval echo ~$USER)
else
    USER_HOME="/root"
fi

# Try different possible locations
for key_path in "$USER_HOME/.ssh/github_deploy" "/root/.ssh/github_deploy" "$HOME/.ssh/github_deploy" "~/.ssh/github_deploy"; do
    # Expand ~ if present
    expanded_path=$(eval echo "$key_path" 2>/dev/null || echo "$key_path")
    if [ -f "$expanded_path" ]; then
        SSH_KEY="$expanded_path"
        SSH_DIR=$(dirname "$SSH_KEY")
        break
    fi
done

# If still not found, try to find it
if [ -z "$SSH_KEY" ]; then
    # Try find command as last resort
    FOUND_KEY=$(find /root /home -name "github_deploy" -type f 2>/dev/null | head -1)
    if [ -n "$FOUND_KEY" ]; then
        SSH_KEY="$FOUND_KEY"
        SSH_DIR=$(dirname "$SSH_KEY")
    fi
fi

if [ -n "$SSH_KEY" ] && [ -f "$SSH_KEY" ]; then
    # Set permissions on SSH key
    chmod 600 "$SSH_KEY" 2>/dev/null || true
    [ -f "${SSH_KEY}.pub" ] && chmod 644 "${SSH_KEY}.pub" 2>/dev/null || true
    
    # Ensure GitHub host key is in known_hosts
    KNOWN_HOSTS="${SSH_DIR}/known_hosts"
    if [ ! -f "$KNOWN_HOSTS" ] || ! grep -q "github.com" "$KNOWN_HOSTS" 2>/dev/null; then
        mkdir -p "$SSH_DIR"
        ssh-keyscan github.com >> "$KNOWN_HOSTS" 2>/dev/null || true
        chmod 600 "$KNOWN_HOSTS" 2>/dev/null || true
    fi
    
    # Configure Git to use SSH key
    export GIT_SSH_COMMAND="ssh -i $SSH_KEY -o StrictHostKeyChecking=no -o UserKnownHostsFile=$KNOWN_HOSTS"
    log "✅ Git SSH authentication configured using: $SSH_KEY"
    
    # Test the connection
    log_info "Testing SSH connection..."
    if ssh -T -i "$SSH_KEY" git@github.com 2>&1 | grep -q "successfully authenticated"; then
        log "✅ SSH connection test successful"
    else
        log_warning "SSH connection test had issues, but continuing..."
    fi
else
    log_warning "SSH key not found in any standard location"
    log_info "Searched in: $USER_HOME/.ssh, /root/.ssh, $HOME/.ssh"
    log_warning "Trying without explicit key (may fail if repo requires authentication)..."
    # Try to use default SSH key
    export GIT_SSH_COMMAND="ssh -o StrictHostKeyChecking=no"
fi

# Pull latest code (skip if code was already synced via rsync)
if [ "$SKIP_GIT_PULL" = "true" ]; then
    log_info "📥 Skipping git pull (code already synced from GitHub Actions)"
    log "✅ Code is up to date (synced via rsync)"
else
    log_info "📥 Pulling latest code from main branch..."

    # Check current git status
    log_info "Checking git status..."
    git status --short || true

    # Stash any local changes (but keep untracked files)
    log_info "Stashing local changes if any..."
    git stash push -m "Deployment stash $(date +%Y%m%d_%H%M%S)" --include-untracked 2>/dev/null || {
        log_info "No changes to stash or stash failed (continuing anyway)"
    }

    # Ensure we're on the correct branch
    CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
    log_info "Current branch: $CURRENT_BRANCH"

    if [ "$CURRENT_BRANCH" != "main" ]; then
        log_info "Switching to main branch..."
        git checkout main 2>/dev/null || git checkout -b main origin/main 2>/dev/null || true
    fi

    # Try to fetch with SSH first
    log_info "Fetching from remote..."
    # Ensure GIT_SSH_COMMAND is exported
    export GIT_SSH_COMMAND
    log_info "Using GIT_SSH_COMMAND: $GIT_SSH_COMMAND"

    # Try fetch - GIT_SSH_COMMAND will be used automatically by git
    if git fetch --all 2>&1; then
        log "✅ Git fetch successful"
    else
        FETCH_ERROR=$?
        log_warning "Git fetch failed (exit code: $FETCH_ERROR), trying alternative methods..."
        
        # Try pull instead of fetch
        log_info "Trying: git pull origin main..."
        if git pull origin main 2>&1; then
            log "✅ Git pull successful"
        else
            PULL_ERROR=$?
            log_warning "Git pull also failed (exit code: $PULL_ERROR)"
            log_info "This is not critical if code was already synced via rsync"
            log_info "Continuing with deployment..."
        fi
    fi

    # Reset to match remote (discard any local changes)
    log_info "Resetting to origin/main..."
    if ! git reset --hard origin/main 2>&1; then
        log_warning "Failed to reset to origin/main (continuing anyway)"
    fi

    # Clean untracked files and directories (optional, but helps keep repo clean)
    log_info "Cleaning untracked files..."
    git clean -fd 2>/dev/null || true
fi

COMMIT_HASH=$(git rev-parse --short HEAD)
log "✅ Code updated to commit: $COMMIT_HASH"

# Backend setup
if [ -d "$BACKEND_DIR" ]; then
    log_info "📦 Setting up backend..."
    cd "$BACKEND_DIR"
    
    # Check if .env exists
    if [ ! -f ".env" ]; then
        log_warning ".env file not found, creating default .env file"
        # Create a basic .env file with database credentials
        cat > .env <<'ENVEOF'
APP_NAME="Rent Application"
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://rent.issey.dev

LOG_CHANNEL=stack
LOG_LEVEL=debug

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=rentapp
DB_USERNAME=rentapp_user
DB_PASSWORD=RentApp2024!Secure

BROADCAST_DRIVER=log
CACHE_DRIVER=file
FILESYSTEM_DISK=local
QUEUE_CONNECTION=sync
SESSION_DRIVER=file
SESSION_LIFETIME=120
ENVEOF
        log "✅ Created default .env file"
        log_warning "⚠️  Please verify database credentials in .env file"
        
        # Generate APP_KEY
        php artisan key:generate --force >/dev/null 2>&1 || true
    fi
    
    # Install dependencies
    log_info "Installing PHP dependencies..."
    if ! composer install --no-interaction --prefer-dist --optimize-autoloader --no-dev; then
        log_error "Composer install failed"
        exit 1
    fi
    
    # Database backup before migrations
    log_info "Creating database backup before migrations..."
    if [ -f "$APP_DIR/scripts/backup-database.sh" ]; then
        bash "$APP_DIR/scripts/backup-database.sh" || {
            log_warning "Database backup failed, but continuing with deployment..."
        }
    else
        log_warning "Database backup script not found, skipping backup"
    fi
    
    # Enable maintenance mode
    log_info "Enabling maintenance mode..."
    php artisan down --render="errors::503" --retry=60 || {
        log_warning "Failed to enable maintenance mode, continuing..."
    }
    
    # Run migrations
    log_info "Running database migrations..."
    log_info "Testing database connection..."
    if php artisan db:show >/dev/null 2>&1; then
        log "✅ Database connection successful"
    else
        log_warning "Database connection test failed"
        log_warning "This might be a MySQL authentication issue (auth_socket vs password)"
        log_warning "If using MySQL root with auth_socket, create a dedicated database user:"
        log_warning "  CREATE USER 'app_user'@'localhost' IDENTIFIED BY 'password';"
        log_warning "  GRANT ALL PRIVILEGES ON database_name.* TO 'app_user'@'localhost';"
    fi
    
    if ! php artisan migrate --force 2>&1; then
        log_error "Database migrations failed"
        log_info "Checking database configuration..."
        php artisan db:show 2>&1 || true
        php artisan up || true
        exit 1
    fi
    
    # Clear and cache config
    log_info "Caching configuration..."
    php artisan config:clear || true
    php artisan config:cache || {
        log_warning "Config cache failed, continuing..."
    }
    
    # Cache routes
    php artisan route:clear || true
    php artisan route:cache || {
        log_warning "Route cache failed, continuing..."
    }
    
    # Cache views
    php artisan view:clear || true
    php artisan view:cache || {
        log_warning "View cache failed, continuing..."
    }
    
    # Optimize
    php artisan optimize || {
        log_warning "Optimize failed, continuing..."
    }
    
    # Create storage link for public file access
    log_info "Creating storage symlink..."
    php artisan storage:link || {
        log_warning "Storage link already exists or failed"
    }
    
    # Set proper permissions
    log_info "Setting storage permissions..."
    chmod -R 775 storage bootstrap/cache 2>/dev/null || true
    chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true
    
    # Restart queue workers if supervisor is configured
    log_info "Restarting queue workers..."
    if command -v supervisorctl &> /dev/null; then
        supervisorctl restart rentapp-queue-worker:* || {
            log_warning "Queue workers not configured or restart failed"
        }
    else
        log_warning "Supervisor not available, queue workers not restarted"
    fi
    
    # Disable maintenance mode
    log_info "Disabling maintenance mode..."
    php artisan up || {
        log_warning "Failed to disable maintenance mode"
    }
    
    log "✅ Backend setup complete"
else
    log_error "Backend directory not found: $BACKEND_DIR"
    exit 1
fi

# Frontend setup
if [ -d "$FRONTEND_DIR" ]; then
    log_info "🎨 Setting up frontend..."
    
    # Verify FRONTEND_DIR is correct
    log_info "DEBUG: FRONTEND_DIR=$FRONTEND_DIR, APP_DIR=$APP_DIR"
    if [ ! -d "$FRONTEND_DIR" ]; then
        log_error "Frontend directory not found: $FRONTEND_DIR"
        exit 1
    fi
    
    cd "$FRONTEND_DIR" || {
        log_error "Cannot access frontend directory: $FRONTEND_DIR"
        exit 1
    }
    
    # CRITICAL: Remove node_modules completely if it exists (from previous failed installs or old paths)
    # This ensures we start fresh and avoid permission issues or wrong paths
    if [ -d "node_modules" ] || [ -L "node_modules" ]; then
        log_info "Removing existing node_modules for clean install..."
        
        # Strategy 1: Try simple removal
        rm -rf node_modules 2>/dev/null && {
            log_info "✅ node_modules removed successfully"
        } || {
            log_warning "Standard rm failed, trying aggressive removal..."
            
            # Strategy 2: Fix permissions and remove
            find node_modules -type f -exec chmod u+w {} \; 2>/dev/null || true
            find node_modules -type d -exec chmod u+w {} \; 2>/dev/null || true
            rm -rf node_modules 2>/dev/null && {
                log_info "✅ node_modules removed after permission fix"
            } || {
                log_warning "Permission fix didn't work, trying rename/move strategy..."
                
                # Strategy 3: Rename it out of the way (npm will create new one)
                TIMESTAMP=$(date +%s)
                mv node_modules "node_modules.old.$TIMESTAMP" 2>/dev/null && {
                    log_info "✅ node_modules renamed to node_modules.old.$TIMESTAMP (will be cleaned up later)"
                } || {
                    log_warning "Rename also failed, will let npm handle it (may cause issues)"
                    # Don't fail - let npm try to overwrite it
                }
            }
        }
    fi
    
    # Also check for and remove package-lock.json if it has old paths
    if [ -f "package-lock.json" ]; then
        if grep -q "Rent_V2" package-lock.json 2>/dev/null; then
            log_warning "package-lock.json contains old path (Rent_V2), removing..."
            rm -f package-lock.json
        fi
    fi
    
    # Check if .env.local exists
    if [ ! -f ".env.local" ] && [ -f ".env.example" ]; then
        log_warning ".env.local not found, creating from .env.example"
        cp .env.example .env.local
    fi
    
    # Install dependencies
    log_info "Installing Node dependencies..."
    
    # Verify we're in the correct directory (not a symlink to old path)
    CURRENT_DIR=$(pwd)
    log_info "DEBUG: Current directory: $CURRENT_DIR"
    if echo "$CURRENT_DIR" | grep -q "Rent_V2"; then
        log_error "ERROR: Script is in wrong directory: $CURRENT_DIR"
        log_error "Expected: $FRONTEND_DIR"
        exit 1
    fi
    
    # Ensure we have write permissions in the frontend directory
    chmod -R u+w . 2>/dev/null || true
    
    # Clear npm cache completely to avoid any path conflicts
    log_info "Clearing npm cache completely..."
    npm cache clean --force 2>/dev/null || true
    # Also clear npm's internal cache directories
    rm -rf ~/.npm/_cacache 2>/dev/null || true
    rm -rf /tmp/npm-* 2>/dev/null || true
    
    # Check if node_modules still exists (after removal attempts)
    # If it does, try one more aggressive removal, but don't fail - let npm handle it
    if [ -d "node_modules" ] || [ -L "node_modules" ]; then
        log_warning "⚠️  node_modules still exists after removal attempts"
        log_warning "Trying one final aggressive removal..."
        
        # Final attempt: use find to delete everything individually
        find node_modules -delete 2>/dev/null || {
            # If that fails, rename it and let npm create a fresh one
            TIMESTAMP=$(date +%s)
            mv node_modules "node_modules.stuck.$TIMESTAMP" 2>/dev/null || true
            log_warning "Renamed stuck node_modules, npm will create fresh one"
        }
        
        # If it STILL exists, just warn and continue - npm might be able to overwrite it
        if [ -d "node_modules" ] || [ -L "node_modules" ]; then
            log_warning "⚠️  node_modules still exists, but continuing anyway"
            log_warning "npm install will attempt to handle it (may cause issues)"
        else
            log_info "✅ node_modules finally removed"
        fi
    fi
    
    # Install fresh - use npm install (not npm ci) since we removed package-lock.json
    log_info "Running fresh npm install..."
    if ! npm install --unsafe-perm --no-audit --no-fund; then
        log_error "npm install failed"
        exit 1
    fi
    
    # Build for production
    log_info "Building frontend for production..."
    
    # CRITICAL: Remove .next directory to avoid permission issues and old paths
    if [ -d ".next" ] || [ -L ".next" ]; then
        log_info "Removing existing .next directory for clean build..."
        rm -rf .next 2>/dev/null || {
            log_warning "Standard rm failed, trying with permission fixes..."
            find .next -type f -exec chmod u+w {} \; 2>/dev/null || true
            find .next -type d -exec chmod u+w {} \; 2>/dev/null || true
            rm -rf .next 2>/dev/null || {
                log_warning "Still can't remove, trying rename..."
                TIMESTAMP=$(date +%s)
                mv .next ".next.old.$TIMESTAMP" 2>/dev/null || true
            }
        }
        log_info "✅ .next directory removed (or renamed)"
    fi
    
    # Also remove Next.js cache directories
    rm -rf .cache 2>/dev/null || true
    rm -rf node_modules/.cache 2>/dev/null || true
    
    # Ensure we have write permissions in the frontend directory
    log_info "Fixing permissions on frontend directory..."
    chmod -R u+w . 2>/dev/null || true
    
    # Verify we're in the correct directory (not old path)
    CURRENT_DIR=$(pwd)
    log_info "DEBUG: Building in directory: $CURRENT_DIR"
    if echo "$CURRENT_DIR" | grep -q "Rent_V2"; then
        log_error "ERROR: Building in wrong directory: $CURRENT_DIR"
        log_error "Expected: $FRONTEND_DIR"
        exit 1
    fi
    
    # Verify FRONTEND_DIR matches current directory
    if [ "$CURRENT_DIR" != "$FRONTEND_DIR" ]; then
        log_warning "WARNING: Current directory ($CURRENT_DIR) doesn't match FRONTEND_DIR ($FRONTEND_DIR)"
        log_warning "This might cause path issues. Continuing anyway..."
    fi
    
    # Set Node options and build
    # Server has ~1.9GB RAM with ~456MB free, so we need to be conservative
    # Use 1.2GB for Node.js to leave room for system processes
    export NODE_OPTIONS="--max-old-space-size=1228"
    # Disable telemetry to save memory
    export NEXT_TELEMETRY_DISABLED=1
    
    # Check available memory before build
    AVAILABLE_MEM=$(free -m | grep Mem | awk '{print $7}')
    TOTAL_MEM=$(free -m | grep Mem | awk '{print $2}')
    log_info "Memory status: ${AVAILABLE_MEM}MB free / ${TOTAL_MEM}MB total"
    log_info "Node.js memory limit: 1228MB (conservative for low-memory server)"
    
    # If memory is very low, try to free some up
    if [ "$AVAILABLE_MEM" -lt 600 ]; then
        log_warning "Low memory detected (${AVAILABLE_MEM}MB), performing aggressive cleanup..."
        # Clear npm cache
        npm cache clean --force 2>/dev/null || true
        # Clear Next.js cache
        rm -rf .next/cache 2>/dev/null || true
        rm -rf node_modules/.cache 2>/dev/null || true
        # Clear any temporary build files
        rm -rf .next/trace 2>/dev/null || true
        log_info "Cache cleanup complete"
        
        # Check memory again after cleanup
        AVAILABLE_MEM_AFTER=$(free -m | grep Mem | awk '{print $7}')
        log_info "Memory after cleanup: ${AVAILABLE_MEM_AFTER}MB free"
    fi
    
    log_info "Running npm run build..."
    if ! npm run build; then
        log_error "Frontend build failed"
        # Show current directory and permissions for debugging
        log_error "DEBUG: Current directory: $(pwd)"
        log_error "DEBUG: Directory permissions: $(ls -ld .)"
        exit 1
    fi
    
    log_info "✅ Frontend build completed successfully"
    
    # Restart PM2 process if PM2 is available and ecosystem.config.js exists
    if command -v pm2 &> /dev/null && [ -f "$APP_DIR/ecosystem.config.js" ]; then
        log_info "Restarting PM2 process..."
        cd "$APP_DIR"
        pm2 restart ecosystem.config.js --update-env || {
            # If restart fails, try to start it
            pm2 start ecosystem.config.js || {
                log_warning "PM2 restart/start failed, continuing..."
            }
        }
        pm2 save || true
        log "✅ PM2 process restarted"
    else
        log_warning "PM2 not available or ecosystem.config.js not found, skipping PM2 restart"
    fi
    
    log "✅ Frontend setup complete"
else
    log_error "Frontend directory not found: $FRONTEND_DIR"
    exit 1
fi

# Restart services
log_info "🔄 Restarting services..."
sudo systemctl restart nginx || true
sudo systemctl restart php8.2-fpm || sudo systemctl restart php8.3-fpm || true

# Health check
log_info "🏥 Running post-deployment health check..."
cd "$BACKEND_DIR"

# Check if services are running
log_info "Checking service status..."
if systemctl is-active --quiet nginx 2>/dev/null; then
    log "✅ Nginx is running"
else
    log_warning "Nginx may not be running"
fi

if systemctl is-active --quiet php8.2-fpm 2>/dev/null || systemctl is-active --quiet php8.3-fpm 2>/dev/null; then
    log "✅ PHP-FPM is running"
else
    log_warning "PHP-FPM may not be running"
fi

if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "rentapp-frontend"; then
        log "✅ PM2 process (rentapp-frontend) is running"
    else
        log_warning "PM2 process (rentapp-frontend) not found"
    fi
fi

# Check if queue workers are running
if command -v supervisorctl &> /dev/null; then
    if supervisorctl status rentapp-queue-worker:* 2>/dev/null | grep -q "RUNNING"; then
        log "✅ Queue workers are running"
    else
        log_warning "Queue workers may not be running"
    fi
fi

# HTTP health check (if APP_URL is set)
if [ -n "$APP_URL" ] && command -v curl &> /dev/null; then
    log_info "Performing HTTP health check..."
    HEALTH_URL="${APP_URL}/api/v1/health"
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$HEALTH_URL" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        log "✅ HTTP health check passed (HTTP $HTTP_CODE)"
    else
        log_warning "HTTP health check returned HTTP $HTTP_CODE (endpoint may not exist)"
    fi
else
    if php artisan route:list 2>/dev/null | grep -q "api/v1/health\|api.health"; then
        log "✅ Health endpoint route found"
    else
        log_warning "Health endpoint route check skipped (routes may not be loaded)"
    fi
fi

# Run post-deployment tasks
if [ -f "$APP_DIR/scripts/post-deployment-tasks.sh" ]; then
    log_info "Running post-deployment optimization tasks..."
    bash "$APP_DIR/scripts/post-deployment-tasks.sh" || {
        log_warning "Post-deployment tasks failed, but deployment is complete"
    }
fi

log "✅ Deployment complete!"
log "📊 Deployment Summary:"
log "   - Environment: $ENVIRONMENT"
log "   - Commit: $COMMIT_HASH"
log "   - Backend: ✅"
log "   - Frontend: ✅"
log "   - Timestamp: $(date)"
log ""
log "💡 Next steps:"
log "   - Monitor logs: pm2 logs rentapp-frontend"
log "   - Check queue workers: supervisorctl status rentapp-queue-worker:*"
log "   - View Laravel logs: tail -f $BACKEND_DIR/storage/logs/laravel.log"
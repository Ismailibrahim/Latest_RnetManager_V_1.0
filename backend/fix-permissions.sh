#!/bin/bash
# Fix Laravel storage permissions
# This script ensures proper ownership and permissions for Laravel storage directories

STORAGE_PATH="/var/www/rentapplicaiton/backend/storage"
WWW_USER="www-data"
WWW_GROUP="www-data"

echo "Fixing Laravel storage permissions..."

# Set ownership for storage directory
chown -R ${WWW_USER}:${WWW_GROUP} ${STORAGE_PATH}

# Set directory permissions (775 = rwxrwxr-x)
find ${STORAGE_PATH} -type d -exec chmod 775 {} \;

# Set file permissions (664 = rw-rw-r--)
find ${STORAGE_PATH} -type f -exec chmod 664 {} \;

# Ensure log files are writable
chmod -R 775 ${STORAGE_PATH}/logs/

echo "Permissions fixed successfully!"
echo "Storage directory: ${STORAGE_PATH}"
ls -la ${STORAGE_PATH}/logs/ | head -5

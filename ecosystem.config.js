/**
 * PM2 Ecosystem Configuration for RentApplication
 * 
 * This file configures PM2 to manage the Next.js frontend process.
 * 
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 restart ecosystem.config.js
 *   pm2 stop ecosystem.config.js
 *   pm2 logs rentapp-frontend
 */

// PM2 Ecosystem Configuration
// This file should be placed in the root of the application directory (/var/www/rentapplicaiton)
// Run: pm2 start ecosystem.config.js (from /var/www/rentapplicaiton)

const path = require('path');

// Get the directory where this config file is located
const APP_DIR = path.resolve(__dirname);

module.exports = {
  apps: [
    {
      name: 'rentapp-frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: path.join(APP_DIR, 'frontend'),
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: path.join(APP_DIR, 'logs', 'pm2-error.log'),
      out_file: path.join(APP_DIR, 'logs', 'pm2-out.log'),
      log_file: path.join(APP_DIR, 'logs', 'pm2-combined.log'),
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      watch: false,
      ignore_watch: [
        'node_modules',
        '.next',
        'logs',
        '*.log',
      ],
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
};


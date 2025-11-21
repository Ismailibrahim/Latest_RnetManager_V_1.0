/**
 * Logger Utility
 * 
 * Provides environment-aware logging that respects NODE_ENV.
 * In production, console statements are suppressed to avoid
 * console pollution and potential information leakage.
 */

const isDev = process.env.NODE_ENV === 'development';

/**
 * Logger object with methods that mirror console API
 * but only log in development mode
 */
export const logger = {
  /**
   * Log informational messages (only in development)
   */
  log: (...args) => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * Log error messages (only in development)
   * In production, consider sending to error tracking service
   */
  error: (...args) => {
    if (isDev) {
      console.error(...args);
    }
    // TODO: In production, send to error tracking service (Sentry, etc.)
  },

  /**
   * Log warning messages (only in development)
   */
  warn: (...args) => {
    if (isDev) {
      console.warn(...args);
    }
  },

  /**
   * Log debug messages (only in development)
   */
  debug: (...args) => {
    if (isDev) {
      console.debug(...args);
    }
  },

  /**
   * Log info messages (only in development)
   */
  info: (...args) => {
    if (isDev) {
      console.info(...args);
    }
  },
};

export default logger;


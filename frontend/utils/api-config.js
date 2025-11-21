/**
 * API Configuration Utility
 * 
 * Centralized API URL configuration with environment-aware validation.
 * - Development: Allows localhost fallback for easier local development
 * - Production: Requires NEXT_PUBLIC_API_URL to be set
 */

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Get the API base URL with appropriate validation
 * @returns {string} API base URL
 * @throws {Error} If API URL is not set in production
 */
export function getApiBaseUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  
  // In development, allow localhost fallback for convenience
  if (isDevelopment) {
    return apiUrl || 'http://localhost:8000/api/v1';
  }
  
  // In production, require the environment variable
  if (!apiUrl) {
    throw new Error(
      'NEXT_PUBLIC_API_URL environment variable is required in production. ' +
      'Please set it in your environment configuration.'
    );
  }
  
  return apiUrl;
}

/**
 * API base URL (computed once at module load)
 */
export const API_BASE_URL = getApiBaseUrl();


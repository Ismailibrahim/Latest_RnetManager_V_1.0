/**
 * Centralized API request utility
 * Reduces code duplication across hooks
 */

import { API_BASE_URL } from "@/utils/api-config";
import { handleApiError } from "@/utils/api-error-handler";
import { logger } from "@/utils/logger";

/**
 * Get authentication token from localStorage
 * @returns {string|null} Auth token or null
 */
export function getAuthToken() {
  return localStorage.getItem("auth_token");
}

/**
 * Build query string from filters object
 * @param {object} filters - Filter object
 * @returns {string} Query string
 */
export function buildQueryString(filters = {}) {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  
  return params.toString();
}

/**
 * Build full API URL with optional query string
 * @param {string} endpoint - API endpoint (e.g., '/admin/landlords')
 * @param {object} filters - Optional query parameters
 * @returns {string} Full URL
 */
export function buildApiUrl(endpoint, filters = {}) {
  const queryString = buildQueryString(filters);
  const baseUrl = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Get default headers for API requests
 * @param {object} additionalHeaders - Additional headers to include
 * @returns {object} Headers object
 */
export function getApiHeaders(additionalHeaders = {}) {
  const token = getAuthToken();
  
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...additionalHeaders,
  };
}

/**
 * Make authenticated API request
 * @param {string} endpoint - API endpoint
 * @param {object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
export async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  
  if (!token && options.requireAuth !== false) {
    throw new Error("No API token found. Please log in.");
  }

  const url = buildApiUrl(endpoint, options.query);
  const headers = getApiHeaders(options.headers);
  
  if (process.env.NODE_ENV === 'development') {
    logger.debug('[API Request]', { method: options.method || 'GET', url });
  }

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    mode: "cors",
    credentials: "include",
    ...options,
    // Don't override headers
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });

  return response;
}

/**
 * Make authenticated API request and parse JSON response
 * @param {string} endpoint - API endpoint
 * @param {object} options - Fetch options
 * @returns {Promise<object>} Parsed JSON response
 */
export async function apiRequestJson(endpoint, options = {}) {
  const response = await apiRequest(endpoint, options);
  
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const error = new Error(
      payload?.message ?? `Request failed (HTTP ${response.status})`
    );
    error.status = response.status;
    error.errors = payload?.errors;
    error.data = payload;
    throw error;
  }

  const payload = await response.json();
  return payload?.data ?? payload;
}

/**
 * Make GET request
 * @param {string} endpoint - API endpoint
 * @param {object} query - Query parameters
 * @returns {Promise<object>} Response data
 */
export async function apiGet(endpoint, query = {}) {
  return apiRequestJson(endpoint, { method: 'GET', query });
}

/**
 * Make POST request
 * @param {string} endpoint - API endpoint
 * @param {object} data - Request body
 * @returns {Promise<object>} Response data
 */
export async function apiPost(endpoint, data = {}) {
  return apiRequestJson(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Make PATCH request
 * @param {string} endpoint - API endpoint
 * @param {object} data - Request body
 * @returns {Promise<object>} Response data
 */
export async function apiPatch(endpoint, data = {}) {
  return apiRequestJson(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Make PUT request
 * @param {string} endpoint - API endpoint
 * @param {object} data - Request body
 * @returns {Promise<object>} Response data
 */
export async function apiPut(endpoint, data = {}) {
  return apiRequestJson(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Make DELETE request
 * @param {string} endpoint - API endpoint
 * @returns {Promise<object>} Response data
 */
export async function apiDelete(endpoint) {
  return apiRequestJson(endpoint, { method: 'DELETE' });
}


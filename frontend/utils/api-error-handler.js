/**
 * API Error Handler Utility
 * 
 * Provides consistent error handling for API requests with proper error messages
 * and error logging.
 */

/**
 * Parse API error response
 * @param {Response} response - Fetch response object
 * @returns {Promise<{message: string, errors: object, status: number}>}
 */
export async function parseApiError(response) {
  let errorData = {};
  let message = "An error occurred";

  try {
    errorData = await response.json();
  } catch (e) {
    // Response is not JSON
    errorData = {};
  }

  // Extract error message
  if (errorData.message) {
    message = errorData.message;
  } else if (errorData.error) {
    message = errorData.error;
  } else if (errorData.errors && typeof errorData.errors === "object") {
    // Laravel validation errors
    const firstError = Object.values(errorData.errors)[0];
    if (Array.isArray(firstError) && firstError.length > 0) {
      message = firstError[0];
    } else if (typeof firstError === "string") {
      message = firstError;
    }
  } else {
    // Fallback to HTTP status text
    message = response.statusText || `HTTP ${response.status} Error`;
  }

  return {
    message,
    errors: errorData.errors || {},
    status: response.status,
    data: errorData,
  };
}

/**
 * Handle API error with consistent formatting
 * @param {Error|Response} error - Error object or fetch response
 * @param {object} options - Error handling options
 * @returns {Promise<Error>}
 */
export async function handleApiError(error, options = {}) {
  const { logError = true, defaultMessage = "An error occurred" } = options;

  // Network error or fetch failed
  if (error instanceof TypeError && error.message.includes("fetch")) {
    const networkError = new Error("Network error. Please check your connection.");
    networkError.name = "NetworkError";
    if (logError) {
      console.error("Network error:", error);
    }
    return networkError;
  }

  // Response error
  if (error instanceof Response) {
    const parsed = await parseApiError(error);
    const apiError = new Error(parsed.message || defaultMessage);
    apiError.name = "ApiError";
    apiError.status = parsed.status;
    apiError.errors = parsed.errors;
    apiError.data = parsed.data;

    if (logError) {
      console.error("API error:", {
        status: parsed.status,
        message: parsed.message,
        errors: parsed.errors,
      });
    }

    return apiError;
  }

  // Generic error
  if (error instanceof Error) {
    if (logError) {
      console.error("Error:", error);
    }
    return error;
  }

  // Unknown error type
  const unknownError = new Error(defaultMessage);
  unknownError.name = "UnknownError";
  if (logError) {
    console.error("Unknown error:", error);
  }
  return unknownError;
}

/**
 * Create a user-friendly error message
 * @param {Error} error - Error object
 * @returns {string}
 */
export function getUserFriendlyErrorMessage(error) {
  if (!error) {
    return "An unexpected error occurred";
  }

  // Network errors
  if (error.name === "NetworkError" || error.message.includes("fetch")) {
    return "Unable to connect to the server. Please check your internet connection and try again.";
  }

  // API errors with status codes
  if (error.status) {
    switch (error.status) {
      case 401:
        return "You are not authenticated. Please log in again.";
      case 403:
        return "You don't have permission to perform this action.";
      case 404:
        return "The requested resource was not found.";
      case 422:
        return error.message || "Validation failed. Please check your input.";
      case 429:
        return "Too many requests. Please wait a moment and try again.";
      case 500:
        return "Server error. Please try again later or contact support.";
      case 503:
        return "Service temporarily unavailable. Please try again later.";
      default:
        return error.message || `Error ${error.status}. Please try again.`;
    }
  }

  // Generic error message
  return error.message || "An unexpected error occurred. Please try again.";
}

/**
 * Enhanced fetch wrapper with error handling
 * @param {string} url - Request URL
 * @param {object} options - Fetch options
 * @returns {Promise<Response>}
 */
export async function apiFetch(url, options = {}) {
  const {
    handleErrors = true,
    throwOnError = true,
    ...fetchOptions
  } = options;

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...fetchOptions.headers,
      },
    });

    if (!response.ok && handleErrors) {
      const error = await handleApiError(response, { logError: true });
      if (throwOnError) {
        throw error;
      }
      return { error, response };
    }

    return response;
  } catch (error) {
    if (handleErrors) {
      const handledError = await handleApiError(error, { logError: true });
      if (throwOnError) {
        throw handledError;
      }
      return { error: handledError };
    }
    throw error;
  }
}


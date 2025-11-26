import { useCallback } from "react";

/**
 * Custom hook for making authenticated API requests
 * Automatically adds authentication token and standard headers to fetch requests
 * @returns {Function} authFetch - Function to make authenticated requests
 */
export function useAuthFetch() {
    /**
     * Make an authenticated fetch request
     * @param {string} url - The URL to fetch
     * @param {Object} options - Fetch options (method, body, headers, etc.)
     * @returns {Promise<Response>} Fetch response
     * @throws {Error} If no authentication token is found
     */
    const authFetch = useCallback(async (url, options = {}) => {
        const token = localStorage.getItem("auth_token");

        if (!token) {
            throw new Error("Authentication required. Please log in to continue.");
        }

        const headers = {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
            ...options.headers,
        };

        return fetch(url, {
            ...options,
            headers,
        });
    }, []);

    return authFetch;
}

/**
 * Extract error message from API response payload
 * @param {Object} payload - Response payload from API
 * @param {string} defaultMessage - Default message to use if payload doesn't contain one
 * @returns {string} Error message
 */
export function getApiErrorMessage(payload, defaultMessage) {
    return payload?.message ?? defaultMessage;
}

/**
 * Handle API response and throw error if not ok
 * @param {Response} response - Fetch API response object
 * @param {string} defaultMessage - Default error message
 * @throws {Error} Throws error with message from API or default message
 */
export async function handleApiError(response, defaultMessage) {
    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message = getApiErrorMessage(
            payload,
            defaultMessage ?? `Request failed with status ${response.status}`
        );
        throw new Error(message);
    }
}

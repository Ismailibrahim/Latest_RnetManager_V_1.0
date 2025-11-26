/**
 * File upload configuration constants
 */
export const FILE_UPLOAD = {
    // Maximum file size in bytes (10MB)
    MAX_SIZE_BYTES: 10 * 1024 * 1024,

    // Allowed MIME types for document uploads
    ALLOWED_MIME_TYPES: [
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],

    // Allowed file extensions (for input accept attribute)
    ALLOWED_EXTENSIONS: ".pdf,.jpg,.jpeg,.png,.doc,.docx",

    // Human-readable file type names for error messages
    ALLOWED_TYPES_LABEL: "PDF, JPG, PNG, DOC, or DOCX",
};

/**
 * Pagination configuration constants
 */
export const PAGINATION = {
    // Default number of lease records per page
    LEASES_PER_PAGE: 25,

    // Default items per page for general lists
    DEFAULT_PER_PAGE: 20,
};

/**
 * UI configuration constants
 */
export const UI = {
    // Debounce delay for search inputs (ms)
    SEARCH_DEBOUNCE_MS: 300,

    // Toast notification duration (ms)
    TOAST_DURATION_MS: 3000,
};

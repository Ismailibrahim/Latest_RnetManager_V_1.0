import { formatMVR } from "@/lib/currency";

/**
 * Format a date value to locale date string
 * @param {string|Date} value - Date value to format
 * @returns {string} Formatted date string or "N/A" if invalid
 */
export function formatDate(value) {
    if (!value) {
        return "N/A";
    }

    const date = new Date(value);

    if (Number.isNaN(date.valueOf())) {
        return "N/A";
    }

    return date.toLocaleDateString();
}

/**
 * Format a date value to locale date and time string
 * @param {string|Date} value - Date value to format
 * @returns {string} Formatted date/time string or "N/A" if invalid
 */
export function formatDateTime(value) {
    if (!value) {
        return "N/A";
    }

    const date = new Date(value);

    if (Number.isNaN(date.valueOf())) {
        return "N/A";
    }

    return date.toLocaleString();
}

/**
 * Format a currency value using MVR formatting
 * @param {number|string} value - Currency value to format
 * @returns {string} Formatted currency string or "—" if invalid
 */
export function formatCurrency(value) {
    const amount = Number(value);

    if (value === null || value === undefined || Number.isNaN(amount)) {
        return "—";
    }

    return formatMVR(amount);
}

/**
 * Format file size in bytes to human-readable format
 * @param {number|string} bytes - File size in bytes
 * @returns {string} Formatted size string (e.g., "1.5 MB") or "—" if invalid
 */
export function formatBytes(bytes) {
    const size = Number(bytes);

    if (!Number.isFinite(size) || size <= 0) {
        return "—";
    }

    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(
        Math.floor(Math.log(size) / Math.log(1024)),
        units.length - 1
    );
    const value = size / 1024 ** index;

    return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

/**
 * Format ID proof type to human-readable label
 * @param {string} value - ID proof type value
 * @returns {string} Formatted label
 */
export function formatIdProofType(value) {
    if (!value) {
        return "Not set";
    }

    const normalized = value.toString().toLowerCase();
    const labels = {
        aadhaar: "National ID",
        national_id: "National ID",
        passport: "Passport",
        other: "Other",
    };

    if (labels[normalized]) {
        return labels[normalized];
    }

    return value
        .toString()
        .split(/[_-]/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

/**
 * Capitalize the first letter of a string
 * @param {string} value - String to capitalize
 * @returns {string} Capitalized string or empty string if invalid
 */
export function capitalize(value) {
    if (!value) {
        return "";
    }

    return value.charAt(0).toUpperCase() + value.slice(1);
}

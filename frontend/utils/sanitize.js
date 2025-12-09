/**
 * Input sanitization utilities to prevent XSS attacks
 */

/**
 * Sanitize HTML content by escaping special characters
 * @param {string} input - The input string to sanitize
 * @returns {string} - Sanitized string safe for HTML display
 */
export function sanitizeHtml(input) {
  if (typeof input !== 'string') {
    return String(input || '');
  }

  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return input.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * Sanitize user input for display in text nodes
 * @param {string} input - The input string to sanitize
 * @returns {string} - Sanitized string
 */
export function sanitizeText(input) {
  if (input == null) {
    return '';
  }
  return String(input).replace(/[<>]/g, '');
}

/**
 * Sanitize URL to prevent javascript: and data: protocols
 * @param {string} url - The URL to sanitize
 * @returns {string|null} - Sanitized URL or null if invalid
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();

  // Block javascript: and data: protocols
  if (lower.startsWith('javascript:') || lower.startsWith('data:')) {
    return null;
  }

  // Allow http://, https://, mailto:, tel:, and relative URLs
  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('mailto:') ||
    lower.startsWith('tel:') ||
    lower.startsWith('/') ||
    lower.startsWith('#') ||
    lower.startsWith('?')
  ) {
    return trimmed;
  }

  // Default to https:// for URLs without protocol
  if (trimmed.includes('.') && !trimmed.includes(' ')) {
    return `https://${trimmed}`;
  }

  return null;
}

/**
 * Sanitize email address
 * @param {string} email - The email to sanitize
 * @returns {string|null} - Sanitized email or null if invalid
 */
export function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') {
    return null;
  }

  const trimmed = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (emailRegex.test(trimmed)) {
    return sanitizeText(trimmed);
  }

  return null;
}

/**
 * Sanitize phone number
 * @param {string} phone - The phone number to sanitize
 * @returns {string} - Sanitized phone number
 */
export function sanitizePhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return '';
  }

  // Remove all non-digit characters except +, -, spaces, and parentheses
  return phone.replace(/[^\d+\-() ]/g, '');
}


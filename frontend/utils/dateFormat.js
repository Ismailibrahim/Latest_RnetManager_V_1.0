/**
 * Centralized date formatting utilities
 */

/**
 * Format date to short format (MM/DD/YYYY)
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted date string
 */
export function formatDateShort(date) {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  return d.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format date to long format (Month Day, Year)
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted date string
 */
export function formatDateLong(date) {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format date to medium format (Mon DD, YYYY)
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted date string
 */
export function formatDateMedium(date) {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format date with time (MM/DD/YYYY HH:MM AM/PM)
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted date string with time
 */
export function formatDateTime(date) {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  return d.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format date to ISO string (YYYY-MM-DD)
 * @param {Date|string} date - Date to format
 * @returns {string} - ISO date string
 */
export function formatDateISO(date) {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  return d.toISOString().split('T')[0];
}

/**
 * Format relative time (e.g., "2 days ago", "in 3 hours")
 * @param {Date|string} date - Date to format
 * @returns {string} - Relative time string
 */
export function formatRelativeTime(date) {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const now = new Date();
  const diffMs = now - d;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 60) {
    return diffSecs < 0 ? 'in a few seconds' : 'just now';
  } else if (diffMins < 60) {
    return diffMins < 0 ? `in ${Math.abs(diffMins)} minutes` : `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return diffHours < 0 ? `in ${Math.abs(diffHours)} hours` : `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 30) {
    return diffDays < 0 ? `in ${Math.abs(diffDays)} days` : `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else if (diffMonths < 12) {
    return diffMonths < 0 ? `in ${Math.abs(diffMonths)} months` : `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
  } else {
    return diffYears < 0 ? `in ${Math.abs(diffYears)} years` : `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`;
  }
}

/**
 * Format date range (e.g., "Jan 1 - Jan 15, 2024")
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {string} - Formatted date range string
 */
export function formatDateRange(startDate, endDate) {
  if (!startDate || !endDate) return '';
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';
  
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const startYear = start.getFullYear();
  
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  const endDay = end.getDate();
  const endYear = end.getFullYear();
  
  if (startYear === endYear) {
    if (startMonth === endMonth && startDay === endDay) {
      return `${startMonth} ${startDay}, ${startYear}`;
    } else if (startMonth === endMonth) {
      return `${startMonth} ${startDay} - ${endDay}, ${startYear}`;
    } else {
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${startYear}`;
    }
  } else {
    return `${startMonth} ${startDay}, ${startYear} - ${endMonth} ${endDay}, ${endYear}`;
  }
}


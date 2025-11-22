/**
 * Currency Formatter Utility
 * Formats currency amounts using environment-configured currency
 */

import { getDefaultCurrency, getPrimaryCurrency } from '@/utils/currency-config';

/**
 * Format currency amount with currency code
 * @param {number|string} amount - Amount to format
 * @param {string|null} currency - Currency code (defaults to primary currency from env)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currency = null) {
  const numericAmount = Number(amount ?? 0);
  
  if (Number.isNaN(numericAmount)) {
    return '—';
  }
  
  const currencyCode = currency || getDefaultCurrency();
  
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  } catch (error) {
    // Fallback if currency code is invalid
    return `${numericAmount.toFixed(2)} ${currencyCode}`;
  }
}

/**
 * Format currency amount with currency code (no decimals)
 * @param {number|string} amount - Amount to format
 * @param {string|null} currency - Currency code (defaults to primary currency from env)
 * @returns {string} Formatted currency string
 */
export function formatCurrencyNoDecimals(amount, currency = null) {
  const numericAmount = Number(amount ?? 0);
  
  if (Number.isNaN(numericAmount)) {
    return '—';
  }
  
  const currencyCode = currency || getDefaultCurrency();
  
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numericAmount);
  } catch (error) {
    // Fallback if currency code is invalid
    return `${numericAmount.toFixed(0)} ${currencyCode}`;
  }
}

/**
 * Format MVR currency (legacy function - uses primary currency from env)
 * @param {number|string} amount - Amount to format
 * @returns {string} Formatted currency string
 */
export function formatMVR(amount) {
  const primaryCurrency = getPrimaryCurrency();
  const numericAmount = Number(amount ?? 0);
  
  if (Number.isNaN(numericAmount)) {
    return `${primaryCurrency} 0.00`;
  }
  
  const formatted = numericAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return `${primaryCurrency} ${formatted}`;
}


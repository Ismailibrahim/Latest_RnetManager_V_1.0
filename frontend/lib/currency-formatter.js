/**
 * Currency Formatter Utility
 * Formats currency amounts using environment-configured currency
 */

import { getDefaultCurrency, getPrimaryCurrency } from '@/utils/currency-config';

/**
 * Format currency amount with currency code
 * @param {number|string} amount - Amount to format
 * @param {string|null} currency - Currency code (defaults to primary currency from env)
 * @param {string|null} symbol - Optional currency symbol to use instead of Intl formatting
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currency = null, symbol = null) {
  const numericAmount = Number(amount ?? 0);
  
  if (Number.isNaN(numericAmount)) {
    return '—';
  }
  
  // Normalize currency code to uppercase for consistent matching
  const currencyCode = currency ? String(currency).toUpperCase().trim() : getDefaultCurrency().toUpperCase();
  
  /**
   * Official Maldivian Rufiyaa (MVR) Currency Symbol
   * 
   * Symbol: ރ (Thaana letter "Raa" with horizontal stroke)
   * Unicode: U+0783
   * Introduced: 3 July 2022 by Maldives Monetary Authority (MMA)
   * 
   * IMPORTANT: When user says "use MVR symbol" or "MVR symbol", this refers to ރ
   * 
   * Future: Proposed official codepoint U+20C2 (MALDIVIAN RUFIYAA SIGN) is under review (2025)
   * Once approved and widely supported, may update to U+20C2
   */
  const MVR_SYMBOL = '\u0783'; // Thaana letter "Raa" (ރ) - Official MVR symbol
  
  // Currency symbol mapping per official MMA specifications
  const currencySymbolMap = {
    'MVR': MVR_SYMBOL,  // Official Rufiyaa symbol (ރ) - "MVR symbol" refers to this
    'USD': '$',
  };
  
  // If symbol is provided, use it directly (preferred method)
  // Normalize common variations to official symbol
  if (symbol && String(symbol).trim() !== '') {
    let normalizedSymbol = String(symbol).trim();
    
    /**
     * Normalize MVR symbol variations to official Thaana symbol (ރ)
     * 
     * Recognized keywords that map to MVR symbol (ރ):
     * - "MVR symbol" → ރ
     * - "MVR" → ރ
     * - "RF" → ރ
     * - "Rf" → ރ
     * - "R.F" → ރ
     * - "R.F." → ރ
     */
    if (currencyCode === 'MVR') {
      const symbolUpper = normalizedSymbol.toUpperCase();
      // If it's RF, Rf, R.F, R.F., or MVR, use the official Thaana symbol (ރ)
      if (symbolUpper === 'RF' || symbolUpper === 'R.F' || symbolUpper === 'R.F.' || symbolUpper === 'MVR') {
        normalizedSymbol = MVR_SYMBOL;  // Official Rufiyaa symbol (ރ) - "MVR symbol"
      }
      // If it's already the Thaana symbol or another valid symbol, keep it
    }
    
    const formatted = numericAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${normalizedSymbol}${formatted}`;
  }
  
  // If we have a known symbol mapping, use it (check BEFORE Intl.NumberFormat)
  // This ensures MVR shows as ރ (official Thaana symbol - "MVR symbol") and USD shows as "$"
  if (currencySymbolMap[currencyCode]) {
    const formatted = numericAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${currencySymbolMap[currencyCode]}${formatted}`;
  }
  
  // Try Intl.NumberFormat for standard currencies
  try {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount);
    
    // Check if Intl returned a valid currency format (not just the code)
    // If it looks like it just appended the code, use a fallback
    // Include Thaana symbol ރ (U+0783) in the check
    if (formatted.includes(currencyCode) && !formatted.match(/[\$€£¥₹\u0783]/)) {
      // Intl didn't recognize the currency, use code as fallback
      const fallbackFormatted = numericAmount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return `${currencyCode} ${fallbackFormatted}`;
    }
    
    return formatted;
  } catch (error) {
    // Fallback if currency code is invalid
    const fallbackFormatted = numericAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${currencyCode} ${fallbackFormatted}`;
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


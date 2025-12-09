/**
 * Currency Configuration Utility
 * Reads currency settings from environment variables
 */

/**
 * Get primary currency code from environment
 * @returns {string} Primary currency code (default: MVR)
 */
export function getPrimaryCurrency() {
  return process.env.NEXT_PUBLIC_PRIMARY_CURRENCY || 'MVR';
}

/**
 * Get secondary currency code from environment
 * @returns {string} Secondary currency code (default: USD)
 */
export function getSecondaryCurrency() {
  return process.env.NEXT_PUBLIC_SECONDARY_CURRENCY || 'USD';
}

/**
 * Get currency options for dropdowns
 * @returns {Array<{value: string, label: string}>} Currency options
 */
export function getCurrencyOptions() {
  const primary = getPrimaryCurrency();
  const secondary = getSecondaryCurrency();
  
  // Currency labels mapping - Only MVR and USD are supported
  const currencyLabels = {
    MVR: 'Maldivian Rufiyaa',
    USD: 'US Dollar',
  };
  
  const getLabel = (code) => {
    return currencyLabels[code] || code;
  };
  
  const options = [
    { value: primary, label: `${primary} - ${getLabel(primary)}` },
  ];
  
  // Only add secondary if it's different from primary
  if (secondary !== primary) {
    options.push({ value: secondary, label: `${secondary} - ${getLabel(secondary)}` });
  }
  
  return options;
}

/**
 * Get default currency (primary)
 * @returns {string} Default currency code
 */
export function getDefaultCurrency() {
  return getPrimaryCurrency();
}

/**
 * Normalize currency to only MVR or USD, defaulting to MVR
 * @param {string|null|undefined} currency - Currency code to normalize
 * @returns {string} Normalized currency code (MVR or USD)
 */
export function normalizeCurrency(currency) {
  const defaultCurrency = getDefaultCurrency();
  const secondaryCurrency = getSecondaryCurrency();
  
  if (!currency) {
    return defaultCurrency; // Always default to MVR
  }
  
  const upperCurrency = String(currency).toUpperCase().trim();
  
  // Only allow MVR or USD
  if (upperCurrency === 'MVR' || upperCurrency === 'USD') {
    return upperCurrency;
  }
  
  // If currency is not MVR or USD, default to MVR
  return defaultCurrency;
}


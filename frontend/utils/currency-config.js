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
  
  // Currency labels mapping
  const currencyLabels = {
    MVR: 'Maldivian Rufiyaa',
    USD: 'US Dollar',
    AED: 'UAE Dirham',
    EUR: 'Euro',
    GBP: 'British Pound',
    INR: 'Indian Rupee',
    SAR: 'Saudi Riyal',
    QAR: 'Qatari Riyal',
    KWD: 'Kuwaiti Dinar',
    OMR: 'Omani Rial',
    BHD: 'Bahraini Dinar',
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


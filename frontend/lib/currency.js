import { getPrimaryCurrency } from '@/utils/currency-config';

export function formatMVR(amount) {
  const numericAmount = Number(amount ?? 0);
  const primaryCurrency = getPrimaryCurrency();
  const formatted = numericAmount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${primaryCurrency} ${formatted}`;
}



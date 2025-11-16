export function formatMVR(amount) {
  const numericAmount = Number(amount ?? 0);
  const formatted = numericAmount.toLocaleString("en-MV", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `MVR ${formatted}`;
}



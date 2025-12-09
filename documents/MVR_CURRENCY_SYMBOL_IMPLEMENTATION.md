# MVR Currency Symbol Implementation Guide

## Official Symbol Specification

**Currency:** Maldivian Rufiyaa (MVR)  
**Official Symbol:** ރ (Thaana letter "Raa" with horizontal stroke)  
**Unicode:** U+0783  
**Introduced:** 3 July 2022 by Maldives Monetary Authority (MMA)  
**Status:** Official currency symbol

## Implementation Details

### Code Location
- **File:** `frontend/lib/currency-formatter.js`
- **Constant:** `MVR_SYMBOL = '\u0783'`
- **Function:** `formatCurrency(amount, currency, symbol)`

### How It Works

1. **Primary Method:** If `currency_symbol` is provided from API/database, it's used directly
2. **Normalization:** Common variations (RF, Rf, R.F, R.F., MVR) are automatically converted to ރ
3. **Fallback:** If no symbol provided and currency is MVR, uses ރ automatically

### Recognized Keywords/Variations

The system recognizes these as referring to the MVR symbol (ރ):
- "MVR symbol" → ރ
- "MVR" → ރ
- "RF" → ރ
- "Rf" → ރ
- "R.F" → ރ
- "R.F." → ރ

## Usage Examples

```javascript
// Automatic - uses symbol from API
formatCurrency(1500, 'MVR', 'RF')  // Returns: ރ1,500.00

// Automatic - uses default MVR symbol
formatCurrency(1500, 'MVR')  // Returns: ރ1,500.00

// With currency code only
formatCurrency(1500, 'MVR', null)  // Returns: ރ1,500.00
```

## Future Unicode Support

**Note:** A proposed official codepoint U+20C2 (MALDIVIAN RUFIYAA SIGN) is under review by Unicode Consortium (2025). Once approved and widely supported, the implementation may be updated to use U+20C2 instead of U+0783.

## Font Support

The Thaana symbol (ރ) requires font support for proper rendering. If the symbol doesn't display correctly:
- Ensure the browser/system has Thaana font support
- Consider using SVG fallback (MMA provides official SVG)
- Fallback to "MVR" text if Thaana is unavailable

## How to Reference in Future Prompts

When asking to use the MVR symbol, you can say:
- ✅ "Use the MVR symbol" → Will use ރ
- ✅ "Use MVR currency symbol" → Will use ރ
- ✅ "Display MVR with its symbol" → Will use ރ
- ✅ "Show the Rufiyaa symbol" → Will use ރ

The system automatically understands these refer to the official symbol ރ.

## Files Using This Implementation

- `frontend/lib/currency-formatter.js` - Core formatter
- `frontend/app/(dashboard)/units/page.jsx` - Units list page
- `frontend/app/(dashboard)/units/[id]/page.jsx` - Unit detail page
- All other pages using `formatCurrency()` from currency-formatter

## Maintenance Notes

- **Last Updated:** 2025-01-21
- **Symbol Source:** Official MMA specification (3 July 2022)
- **Implementation Status:** ✅ Complete and active

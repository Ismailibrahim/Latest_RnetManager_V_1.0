# How to Prompt for MVR Currency Symbol

## Quick Reference

When you want to use the official Maldivian Rufiyaa symbol (ރ) in the application, use any of these phrases:

### ✅ Correct Ways to Ask

1. **"Use the MVR symbol"** → Will use ރ
2. **"Use MVR currency symbol"** → Will use ރ
3. **"Display MVR with its symbol"** → Will use ރ
4. **"Show the Rufiyaa symbol"** → Will use ރ
5. **"Add MVR symbol to [page/component]"** → Will use ރ
6. **"Use the correct MVR symbol"** → Will use ރ

### What Happens Automatically

The system automatically recognizes these keywords and maps them to the official symbol:
- "MVR symbol" → ރ (Unicode U+0783)
- "MVR" → ރ
- "RF" / "Rf" → ރ
- "R.F" / "R.F." → ރ

## Example Prompts

### ✅ Good Examples

```
"Add MVR symbol to the Units page"
"Use the MVR symbol for all currency displays"
"Show MVR currency symbol on the invoice"
"Use MVR symbol instead of MVR text"
"Display amounts with the MVR symbol"
```

### ❌ Avoid These (They Work But Are Less Clear)

```
"Use Rf" (works but not the official term)
"Use RF" (works but not the official term)
"Use .?" (incorrect - this is not the symbol)
```

## Technical Details

- **Official Symbol:** ރ (Thaana letter "Raa")
- **Unicode:** U+0783
- **Implementation:** `frontend/lib/currency-formatter.js`
- **Documentation:** See `MVR_CURRENCY_SYMBOL_IMPLEMENTATION.md`

## What the System Does

1. When you say "use MVR symbol", the system:
   - Recognizes "MVR symbol" as referring to ރ
   - Updates the currency formatter to use ރ
   - Ensures all MVR amounts display with ރ

2. The formatter automatically:
   - Converts variations (RF, Rf, MVR) to ރ
   - Uses ރ when currency is MVR and no symbol provided
   - Preserves ރ if already present

## For Developers

The symbol is defined in `currency-formatter.js`:
```javascript
const MVR_SYMBOL = '\u0783'; // Thaana letter "Raa" (ރ) - Official MVR symbol
```

When implementing new features, use:
```javascript
import { formatCurrency } from '@/lib/currency-formatter';
formatCurrency(amount, 'MVR', null); // Automatically uses ރ
```

## Summary

**Just say "use MVR symbol" or "MVR symbol" and the system will automatically use the correct official symbol ރ.**

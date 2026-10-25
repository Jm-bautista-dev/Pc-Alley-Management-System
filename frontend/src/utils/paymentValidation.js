// ─────────────────────────────────────────────────────────────────
// PC Alley POS — Financial Calculation & Payment Validation Utilities
// ─────────────────────────────────────────────────────────────────

export const MAX_CASH_LIMIT = 10000000; // ₱10,000,000.00 (10 Million Pesos hard ceiling)
export const MAX_INPUT_LENGTH = 12;      // Prevents string/digit overflow in inputs

/**
 * Convert standard currency amount to integer centavos to prevent IEEE-754 float inaccuracies.
 * E.g., 154.50 -> 15450 centavos
 */
export function toCentavos(amount) {
  if (amount === null || amount === undefined || isNaN(Number(amount))) return 0;
  return Math.round(Number(amount) * 100);
}

/**
 * Convert integer centavos back to exact two-decimal float representation.
 * E.g., 15450 centavos -> 154.50
 */
export function fromCentavos(centavos) {
  return Number((centavos / 100).toFixed(2));
}

/**
 * Format monetary amount with standard Philippine Peso comma separators and 2 decimal places.
 */
export function formatPeso(amount) {
  const num = typeof amount === "number" ? amount : Number(amount) || 0;
  return num.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Exact subtraction for change calculation using integer centavos.
 * Change = Cash Received - Total Due
 */
export function calculateChange(cashReceived, totalDue) {
  const cashCents = toCentavos(cashReceived);
  const totalCents = toCentavos(totalDue);
  const diffCents = cashCents - totalCents;
  return fromCentavos(Math.max(0, diffCents));
}

/**
 * Dynamic Quick-Payment Denomination Generator
 * Generates practical cash payment amounts based dynamically on current total due.
 * Always includes Exact Amount, followed by up to 3 practical Philippine cash denominations.
 */
export function generateQuickPaymentOptions(totalDue) {
  if (!totalDue || totalDue <= 0 || isNaN(Number(totalDue))) return [];

  const exact = Number(Number(totalDue).toFixed(2));
  const result = [
    {
      label: "Exact Amount",
      amount: exact,
      isExact: true
    }
  ];

  const candidates = new Set();
  const numTotal = Number(totalDue);

  if (numTotal < 1000) {
    // Standard Philippine banknotes: 20, 50, 100, 200, 500, 1000
    const standardBills = [20, 50, 100, 200, 500, 1000];
    for (const bill of standardBills) {
      if (bill > numTotal) {
        candidates.add(bill);
      }
    }
    candidates.add(Math.ceil(numTotal / 50) * 50);
    candidates.add(Math.ceil(numTotal / 100) * 100);
    candidates.add(Math.ceil(numTotal / 500) * 500);
    candidates.add(Math.ceil(numTotal / 1000) * 1000);
  } else if (numTotal < 10000) {
    const next1k = Math.ceil(numTotal / 1000) * 1000;
    candidates.add(next1k > numTotal ? next1k : next1k + 1000);
    candidates.add(Math.ceil(numTotal / 500) * 500);
    candidates.add(Math.ceil(numTotal / 1000) * 1000 + 1000);
    candidates.add(Math.ceil(numTotal / 2000) * 2000);
    candidates.add(Math.ceil(numTotal / 5000) * 5000);
    candidates.add(Math.ceil(numTotal / 10000) * 10000);
  } else if (numTotal < 50000) {
    const next1k = Math.ceil(numTotal / 1000) * 1000;
    candidates.add(next1k > numTotal ? next1k : next1k + 1000);
    candidates.add(Math.ceil(numTotal / 5000) * 5000 > numTotal ? Math.ceil(numTotal / 5000) * 5000 : Math.ceil(numTotal / 5000) * 5000 + 5000);
    candidates.add(Math.ceil(numTotal / 10000) * 10000 > numTotal ? Math.ceil(numTotal / 10000) * 10000 : Math.ceil(numTotal / 10000) * 10000 + 10000);
  } else {
    // High-value totals (e.g. ₱135,000)
    const next1k = Math.ceil(numTotal / 1000) * 1000;
    candidates.add(next1k > numTotal ? next1k : next1k + 1000);

    const next5k = Math.ceil(numTotal / 5000) * 5000;
    candidates.add(next5k > numTotal ? next5k : next5k + 5000);

    const next10k = Math.ceil(numTotal / 10000) * 10000;
    candidates.add(next10k > numTotal ? next10k : next10k + 10000);

    candidates.add(numTotal + 5000);
    candidates.add(numTotal + 10000);
  }

  const sorted = Array.from(candidates)
    .filter(c => c > numTotal && c <= MAX_CASH_LIMIT)
    .sort((a, b) => a - b)
    .slice(0, 3);

  sorted.forEach(amt => {
    result.push({
      label: `₱${amt.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`,
      amount: amt,
      isExact: false
    });
  });

  return result;
}

/**
 * Validate Cash Received input strictly against financial and business rules.
 */
export function validateCashInput(rawInput, totalDue) {
  const trimmed = typeof rawInput === "string" ? rawInput.trim() : String(rawInput ?? "").trim();
  const numTotal = Number(Number(totalDue || 0).toFixed(2));

  // 1. Missing or empty input
  if (!trimmed) {
    return {
      isValid: false,
      parsedAmount: 0,
      error: "Please enter cash received.",
      warning: null,
      remainingBalance: numTotal,
      changeAmount: 0,
      isSuspiciousOverpayment: false,
      exceedsMaxLimit: false
    };
  }

  // 2. Prevent excessively long raw input strings
  if (trimmed.length > MAX_INPUT_LENGTH) {
    return {
      isValid: false,
      parsedAmount: 0,
      error: `Input too long. Cash amount cannot exceed ${MAX_INPUT_LENGTH} characters.`,
      warning: null,
      remainingBalance: numTotal,
      changeAmount: 0,
      isSuspiciousOverpayment: false,
      exceedsMaxLimit: true
    };
  }

  // 3. Negative check
  if (trimmed.startsWith("-") || Number(trimmed) < 0) {
    return {
      isValid: false,
      parsedAmount: 0,
      error: "Cash amount cannot be negative.",
      warning: null,
      remainingBalance: numTotal,
      changeAmount: 0,
      isSuspiciousOverpayment: false,
      exceedsMaxLimit: false
    };
  }

  // 4. Decimal precision: max 2 decimal places
  if (/^\d+\.\d{3,}$/.test(trimmed)) {
    return {
      isValid: false,
      parsedAmount: 0,
      error: "Cash amount cannot have more than 2 decimal places.",
      warning: null,
      remainingBalance: numTotal,
      changeAmount: 0,
      isSuspiciousOverpayment: false,
      exceedsMaxLimit: false
    };
  }

  // 5. Strict numeric format check (only digits and at most one decimal point)
  const validNumberRegex = /^(0|[1-9]\d*)(\.\d{1,2})?$/;
  if (!validNumberRegex.test(trimmed)) {
    return {
      isValid: false,
      parsedAmount: 0,
      error: "Invalid amount. Please enter a valid number (e.g. 500 or 150.50).",
      warning: null,
      remainingBalance: numTotal,
      changeAmount: 0,
      isSuspiciousOverpayment: false,
      exceedsMaxLimit: false
    };
  }

  const num = Number(trimmed);
  if (isNaN(num) || !isFinite(num)) {
    return {
      isValid: false,
      parsedAmount: 0,
      error: "Malformed numeric format.",
      warning: null,
      remainingBalance: numTotal,
      changeAmount: 0,
      isSuspiciousOverpayment: false,
      exceedsMaxLimit: false
    };
  }

  // 6. Zero or negative amount
  if (num <= 0) {
    return {
      isValid: false,
      parsedAmount: 0,
      error: "Cash received must be greater than zero.",
      warning: null,
      remainingBalance: numTotal,
      changeAmount: 0,
      isSuspiciousOverpayment: false,
      exceedsMaxLimit: false
    };
  }

  // 7. Absolute upper limit check
  if (num > MAX_CASH_LIMIT) {
    return {
      isValid: false,
      parsedAmount: num,
      error: `Cash amount exceeds maximum allowable limit of ₱${MAX_CASH_LIMIT.toLocaleString("en-PH")}.00.`,
      warning: null,
      remainingBalance: 0,
      changeAmount: 0,
      isSuspiciousOverpayment: false,
      exceedsMaxLimit: true
    };
  }

  const cashCents = toCentavos(num);
  const totalCents = toCentavos(numTotal);

  // 8. Insufficient cash
  if (cashCents < totalCents) {
    const remainingCents = totalCents - cashCents;
    const remaining = fromCentavos(remainingCents);
    return {
      isValid: false,
      parsedAmount: num,
      error: `Insufficient cash. Remaining balance: ₱${formatPeso(remaining)}`,
      warning: null,
      remainingBalance: remaining,
      changeAmount: 0,
      isSuspiciousOverpayment: false,
      exceedsMaxLimit: false
    };
  }

  // 9. Sufficient cash -> calculate change
  const changeCents = cashCents - totalCents;
  const change = fromCentavos(changeCents);

  // 10. Suspicious / Unusually Large Overpayment Check
  // Trigger warning if change is unusually large relative to total:
  // - Change >= ₱50,000 AND Cash >= Total * 2
  // - OR Change >= ₱100,000
  // - OR for small orders (<= ₱5,000), Change >= ₱20,000
  const isSuspicious =
    (change >= 50000 && num >= numTotal * 2) ||
    change >= 100000 ||
    (numTotal <= 5000 && change >= 20000);

  return {
    isValid: true,
    parsedAmount: num,
    error: null,
    warning: isSuspicious
      ? `Unusually large cash amount entered (Change to return: ₱${formatPeso(change)}). Please confirm the cash amount before proceeding.`
      : null,
    remainingBalance: 0,
    changeAmount: change,
    isSuspiciousOverpayment: isSuspicious,
    exceedsMaxLimit: false
  };
}

// ─────────────────────────────────────────────────────────────────
// PC Alley POS — Server Financial & Cash Payment Validation Utilities
// ─────────────────────────────────────────────────────────────────

const MAX_CASH_LIMIT = 10000000; // ₱10,000,000.00 hard limit
const MAX_INPUT_LENGTH = 12;

function toCentavos(amount) {
  if (amount === null || amount === undefined || isNaN(Number(amount))) return 0;
  return Math.round(Number(amount) * 100);
}

function fromCentavos(centavos) {
  return Number((centavos / 100).toFixed(2));
}

function validateCashPayment(rawInput, totalDue) {
  const trimmed = typeof rawInput === 'string' ? rawInput.trim() : String(rawInput ?? '').trim();
  const numTotal = Number(Number(totalDue || 0).toFixed(2));

  if (!trimmed) {
    return { isValid: false, error: 'Cash amount received is required for cash payments.' };
  }

  if (trimmed.length > MAX_INPUT_LENGTH) {
    return { isValid: false, error: `Cash amount exceeds maximum input length of ${MAX_INPUT_LENGTH} characters.` };
  }

  if (trimmed.startsWith('-') || Number(trimmed) < 0) {
    return { isValid: false, error: 'Cash amount cannot be negative.' };
  }

  if (/^\d+\.\d{3,}$/.test(trimmed)) {
    return { isValid: false, error: 'Cash amount cannot have more than 2 decimal places.' };
  }

  const validNumberRegex = /^(0|[1-9]\d*)(\.\d{1,2})?$/;
  if (!validNumberRegex.test(trimmed)) {
    return { isValid: false, error: 'Invalid cash amount format.' };
  }

  const num = Number(trimmed);
  if (isNaN(num) || !isFinite(num)) {
    return { isValid: false, error: 'Malformed numeric cash amount.' };
  }

  if (num <= 0) {
    return { isValid: false, error: 'Cash received must be greater than zero.' };
  }

  if (num > MAX_CASH_LIMIT) {
    return { isValid: false, error: `Cash amount exceeds maximum permitted limit of ₱${MAX_CASH_LIMIT.toLocaleString('en-PH')}.00.` };
  }

  const cashCents = toCentavos(num);
  const totalCents = toCentavos(numTotal);

  if (cashCents < totalCents) {
    const remaining = fromCentavos(totalCents - cashCents);
    return {
      isValid: false,
      error: `Insufficient cash received. Remaining balance: ₱${remaining.toFixed(2)}`
    };
  }

  const changeCents = cashCents - totalCents;
  const change = fromCentavos(changeCents);

  return {
    isValid: true,
    amountPaid: fromCentavos(cashCents),
    changeAmount: change
  };
}

module.exports = {
  MAX_CASH_LIMIT,
  MAX_INPUT_LENGTH,
  toCentavos,
  fromCentavos,
  validateCashPayment
};

const assert = require('assert');
const {
  toCentavos,
  fromCentavos,
  validateCashPayment,
  MAX_CASH_LIMIT,
  MAX_INPUT_LENGTH
} = require('./src/utils/paymentValidation');

// We also test the frontend algorithm directly in Node
function generateQuickPaymentOptions(totalDue) {
  if (!totalDue || totalDue <= 0 || isNaN(Number(totalDue))) return [];

  const exact = Number(Number(totalDue).toFixed(2));
  const result = [{ label: "Exact Amount", amount: exact, isExact: true }];
  const candidates = new Set();
  const numTotal = Number(totalDue);

  if (numTotal < 1000) {
    const standardBills = [20, 50, 100, 200, 500, 1000];
    for (const bill of standardBills) {
      if (bill > numTotal) candidates.add(bill);
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

console.log("=================================================================");
console.log("Running PC Alley POS Cash Payment & Dynamic Quick-Payment Tests");
console.log("=================================================================\n");

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    console.log(`[PASS] Test ${total}: ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] Test ${total}: ${name}\n       Error: ${err.message}`);
    throw err;
  }
}

// 1. Total ₱154.50; select Exact Amount -> Cash ₱154.50; change ₱0.00
runTest("Total ₱154.50; select Exact Amount", () => {
  const opts = generateQuickPaymentOptions(154.50);
  assert.strictEqual(opts[0].label, "Exact Amount");
  assert.strictEqual(opts[0].amount, 154.50);

  const res = validateCashPayment("154.50", 154.50);
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.amountPaid, 154.50);
  assert.strictEqual(res.changeAmount, 0.00);
});

// 2. Total ₱154.50; select ₱200 -> Change ₱45.50
runTest("Total ₱154.50; select ₱200", () => {
  const opts = generateQuickPaymentOptions(154.50);
  const opt200 = opts.find(o => o.amount === 200);
  assert(opt200, "₱200 option should be present in suggested denominations");

  const res = validateCashPayment("200", 154.50);
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.amountPaid, 200.00);
  assert.strictEqual(res.changeAmount, 45.50);
});

// 3. Total ₱154.50; select ₱500 -> Change ₱345.50
runTest("Total ₱154.50; select ₱500", () => {
  const opts = generateQuickPaymentOptions(154.50);
  const opt500 = opts.find(o => o.amount === 500);
  assert(opt500, "₱500 option should be present in suggested denominations");

  const res = validateCashPayment("500", 154.50);
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.changeAmount, 345.50);
});

// 4. Total ₱154.50; select ₱1,000 -> Change ₱845.50
runTest("Total ₱154.50; select ₱1,000", () => {
  const opts = generateQuickPaymentOptions(154.50);
  const opt1000 = opts.find(o => o.amount === 1000);
  assert(opt1000, "₱1,000 option should be present in suggested denominations");

  const res = validateCashPayment("1000", 154.50);
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.changeAmount, 845.50);
});

// 5. Total ₱135,000; select Exact Amount -> Change ₱0.00
runTest("Total ₱135,000; select Exact Amount and practical high denominations", () => {
  const opts = generateQuickPaymentOptions(135000);
  assert.strictEqual(opts[0].amount, 135000);
  assert.strictEqual(opts[1].amount, 136000);
  assert.strictEqual(opts[2].amount, 140000);
  assert.strictEqual(opts[3].amount, 145000);

  const res = validateCashPayment("135000", 135000);
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.changeAmount, 0.00);
});

// 6. Cash received is below the total -> Show remaining balance; block completion
runTest("Cash received is below the total", () => {
  const res = validateCashPayment("100", 154.50);
  assert.strictEqual(res.isValid, false);
  assert(res.error.includes("Insufficient cash"), "Error must state insufficient cash");
  assert(res.error.includes("54.50"), "Error must report exact remaining balance ₱54.50");
});

// 7. Empty input -> Block completion
runTest("Empty or missing input", () => {
  const res1 = validateCashPayment("", 500);
  assert.strictEqual(res1.isValid, false);
  const res2 = validateCashPayment("   ", 500);
  assert.strictEqual(res2.isValid, false);
});

// 8. Zero or negative input -> Reject
runTest("Zero or negative input", () => {
  const resZero = validateCashPayment("0", 500);
  assert.strictEqual(resZero.isValid, false);
  const resNeg = validateCashPayment("-50", 500);
  assert.strictEqual(resNeg.isValid, false);
});

// 9. Malformed numeric input -> Reject
runTest("Malformed numeric input", () => {
  const resAlpha = validateCashPayment("100abc", 100);
  assert.strictEqual(resAlpha.isValid, false);
  const resSymbol = validateCashPayment("100$$", 100);
  assert.strictEqual(resSymbol.isValid, false);
  const resDoubleDot = validateCashPayment("100.5.5", 100);
  assert.strictEqual(resDoubleDot.isValid, false);
});

// 10. Valid amount with two decimal places -> Accept
runTest("Valid amount with two decimal places", () => {
  const res = validateCashPayment("200.75", 154.50);
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.amountPaid, 200.75);
  assert.strictEqual(res.changeAmount, 46.25);
});

// 11. Amount with more than two decimal places -> Reject
runTest("Amount with more than two decimal places", () => {
  const res = validateCashPayment("200.755", 154.50);
  assert.strictEqual(res.isValid, false);
  assert(res.error.includes("more than 2 decimal places"), "Must reject more than 2 decimals");
});

// 12. Excessively long repeated digits -> Reject
runTest("Excessively long repeated digits", () => {
  const crazyDigits = "1355555555555555555555555555555555555555555555";
  const res = validateCashPayment(crazyDigits, 154.50);
  assert.strictEqual(res.isValid, false);
  assert(res.error.includes("maximum input length"), "Must reject oversized strings");
});

// 13. Overpayment above absolute monetary limit -> Reject
runTest("Overpayment above absolute limit (₱10,000,000)", () => {
  const res = validateCashPayment("10000001", 100);
  assert.strictEqual(res.isValid, false);
  assert(res.error.includes("exceeds maximum permitted limit"), "Must enforce absolute cap");
});

// 14. Integer Centavo precision check
runTest("Centavo precision: no floating point rounding error (0.1 + 0.2)", () => {
  assert.strictEqual(toCentavos(0.1) + toCentavos(0.2), 30);
  assert.strictEqual(fromCentavos(30), 0.30);
  
  const res = validateCashPayment("100.10", 70.07);
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.changeAmount, 30.03);
});

console.log(`\n=================================================================`);
console.log(`Test Execution Completed: ${passed}/${total} Passed Successfully!`);
console.log(`=================================================================\n`);

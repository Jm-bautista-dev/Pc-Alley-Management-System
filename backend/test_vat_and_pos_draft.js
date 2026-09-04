const assert = require('assert');

console.log("=== Testing VAT Calculation (Philippine Retail VAT-Inclusive) & POS Draft Persistence ===");

// 1. VAT Extraction Math Tests
function calculateVatBreakdown(subtotal, discountAmount = 0) {
  const grandTotal = Math.max(0, subtotal - discountAmount);
  const vatableSales = grandTotal / 1.12;
  const vatAmount = grandTotal - vatableSales;
  return {
    grandTotal: parseFloat(grandTotal.toFixed(2)),
    vatableSales: parseFloat(vatableSales.toFixed(2)),
    vatAmount: parseFloat(vatAmount.toFixed(2))
  };
}

// Test Case 1: Simple ₱100 item (Standard shelf price)
const test1 = calculateVatBreakdown(100);
console.log("\n[Test 1] ₱100 item:");
console.log(`- Grand Total: ₱${test1.grandTotal}`);
console.log(`- VATable Sales: ₱${test1.vatableSales}`);
console.log(`- VAT (12%): ₱${test1.vatAmount}`);
assert.strictEqual(test1.grandTotal, 100.00, "Grand total must equal shelf price 100.00");
assert.strictEqual(test1.vatableSales, 89.29, "VATable sales should be 89.29");
assert.strictEqual(test1.vatAmount, 10.71, "VAT amount should be 10.71");
assert.strictEqual(parseFloat((test1.vatableSales + test1.vatAmount).toFixed(2)), 100.00, "Sum of VATable + VAT must equal grand total");
console.log("✔ Test 1 Passed");

// Test Case 2: ₱1,120 transaction
const test2 = calculateVatBreakdown(1120);
console.log("\n[Test 2] ₱1,120 transaction:");
console.log(`- Grand Total: ₱${test2.grandTotal}`);
console.log(`- VATable Sales: ₱${test2.vatableSales}`);
console.log(`- VAT (12%): ₱${test2.vatAmount}`);
assert.strictEqual(test2.grandTotal, 1120.00);
assert.strictEqual(test2.vatableSales, 1000.00, "VATable sales for 1120 should be exactly 1000.00");
assert.strictEqual(test2.vatAmount, 120.00, "VAT for 1120 should be exactly 120.00");
console.log("✔ Test 2 Passed");

// Test Case 3: Discounted transaction (₱1,000 subtotal, 10% discount)
const test3 = calculateVatBreakdown(1000, 100);
console.log("\n[Test 3] ₱1,000 subtotal with ₱100 discount:");
console.log(`- Grand Total: ₱${test3.grandTotal}`);
console.log(`- VATable Sales: ₱${test3.vatableSales}`);
console.log(`- VAT (12%): ₱${test3.vatAmount}`);
assert.strictEqual(test3.grandTotal, 900.00);
assert.strictEqual(test3.vatableSales, 803.57);
assert.strictEqual(test3.vatAmount, 96.43);
console.log("✔ Test 3 Passed");

// 2. POS Cart Draft Persistence Simulation
console.log("\n[Test 4] POS Cart Draft State Persistence Simulation:");
const mockLocalStorage = {};

function savePosDraft(state) {
  if (state.cart && state.cart.length > 0) {
    mockLocalStorage["pc_alley_pos_cart_draft"] = JSON.stringify({
      cart: state.cart,
      selectedCustomer: state.selectedCustomer,
      customerQuery: state.customerQuery,
      customNotes: state.customNotes,
      selectedDiscount: state.selectedDiscount,
      selectedBranchId: state.selectedBranchId,
      paymentMethod: state.paymentMethod,
      cashPaid: state.cashPaid,
      updatedAt: new Date().toISOString()
    });
  } else {
    delete mockLocalStorage["pc_alley_pos_cart_draft"];
  }
}

function restorePosDraft() {
  const raw = mockLocalStorage["pc_alley_pos_cart_draft"];
  if (!raw) return null;
  return JSON.parse(raw);
}

// User adds items
const mockState = {
  cart: [
    { id: 1, name: "RTX 4070", price: 38000, quantity: 1, item_type: "product" },
    { id: 2, name: "OS Installation", price: 500, quantity: 1, item_type: "service" }
  ],
  selectedCustomer: { id: 10, name: "Maria Santos" },
  customerQuery: "Maria Santos",
  customNotes: "Please test bench before handover",
  selectedDiscount: { id: 1, name: "Promo 5%", type: "Percentage (%)", value: 5 },
  selectedBranchId: 1,
  paymentMethod: "GCash",
  cashPaid: ""
};

savePosDraft(mockState);
assert.ok(mockLocalStorage["pc_alley_pos_cart_draft"], "Draft must be saved to storage");

// Simulate page reload / restoration
const restored = restorePosDraft();
assert.ok(restored, "Draft should be restored");
assert.strictEqual(restored.cart.length, 2);
assert.strictEqual(restored.cart[0].name, "RTX 4070");
assert.strictEqual(restored.selectedCustomer.name, "Maria Santos");
assert.strictEqual(restored.customNotes, "Please test bench before handover");
assert.strictEqual(restored.selectedDiscount.value, 5);
console.log("✔ Cart draft serialization, persistence, and restoration verified.");

// User completes sale -> cart is emptied
savePosDraft({ cart: [] });
assert.strictEqual(mockLocalStorage["pc_alley_pos_cart_draft"], undefined, "Draft should be purged when cart is emptied");
console.log("✔ Cart draft cleanup on checkout verified.");

console.log("\n=== ALL VAT & POS DRAFT TESTS PASSED SUCCESSFULLY ===");

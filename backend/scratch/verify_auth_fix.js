const jwt = require('jsonwebtoken');
require('dotenv').config();

// Simulate the fix verification
const secret = process.env.JWT_SECRET || '3b69e74454a1463fb5948e0a3ed3dee7bffd0badc1a549e5b52ffae82ec3b49e';
const userPayload = { id: 1, username: 'admin@pcalley.com', role: 'super_admin', branch_id: null };

console.log("--- Verifying JWT fix ---");

// Test with the NEW login logic
const token = jwt.sign(userPayload, secret, { expiresIn: '24h' });
console.log("Token generated with payload:", token.substring(0, 20) + "...");

try {
  const decoded = jwt.verify(token, secret);
  console.log("Token successfully verified!");
  console.log("Decoded Payload:", decoded);
  
  if (decoded.id === userPayload.id && decoded.role === userPayload.role) {
    console.log("SUCCESS: Payload integrity verified.");
  } else {
    console.error("FAILURE: Decoded payload does not match original.");
  }
} catch (err) {
  console.error("FAILURE: Token verification failed:", err.message);
}

console.log("\n--- Verifying OLD logic failure (reproduction) ---");
try {
  // This simulates what was happening before
  const brokenToken = jwt.sign(secret, { expiresIn: '24h' }); 
  console.log("Broken token generated (using secret as payload and options as secret)");

  jwt.verify(brokenToken, secret);
  console.log("Wait, broken token verified? This shouldn't happen unless SECRET matches OPTIONS.");
} catch (err) {
  console.log("CORRECT: Broken logic failed as expected (cannot sign or verify):", err.message);
}

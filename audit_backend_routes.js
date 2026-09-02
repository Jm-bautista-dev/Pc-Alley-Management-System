const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'backend', 'src', 'routes');
const files = fs.readdirSync(routesDir);

console.log(`Auditing ${files.length} route files in backend/src/routes...`);

let errors = 0;
files.forEach(file => {
  if (file.endsWith('.js')) {
    try {
      const route = require(path.join(routesDir, file));
      console.log(`✓ ${file} loaded cleanly.`);
    } catch (e) {
      console.error(`✗ ERROR in ${file}:`, e.message);
      errors++;
    }
  }
});

console.log(`\nRoute Audit Finished. Total Errors: ${errors}`);

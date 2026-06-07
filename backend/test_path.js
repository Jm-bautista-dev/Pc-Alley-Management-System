const path = require('path');
const fs = require('fs');

const fileToFind = 'product_1780840679810_bim9_thumbnail.webp';
const relativeToDirname = path.join(__dirname, '../uploads/products', fileToFind);

console.log('__dirname:', __dirname);
console.log('Expected path:', relativeToDirname);
console.log('Exists?', fs.existsSync(relativeToDirname));

const staticRoot = path.join(__dirname, '../uploads');
console.log('Static root path served by server.js:', staticRoot);
console.log('Static root exists?', fs.existsSync(staticRoot));

const filesInProducts = fs.readdirSync(path.join(staticRoot, 'products'));
console.log('Files in products folder:', filesInProducts);

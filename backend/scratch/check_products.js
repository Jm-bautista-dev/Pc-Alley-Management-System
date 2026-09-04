const { Product } = require('../src/models');

async function checkProducts() {
  const products = await Product.findAll();
  console.log('Total products:', products.length);
  const suspicious = products.filter(p => 
    /test/i.test(p.name) || 
    /junk/i.test(p.name) || 
    /asdf/i.test(p.name) || 
    /wqd/i.test(p.name) || 
    /wqdewd/i.test(p.name) ||
    /jm bautista/i.test(p.name) ||
    p.name.length < 3
  );
  console.log('Suspicious products:', suspicious.map(p => ({ id: p.id, name: p.name, sku: p.sku, price: p.price, stock: p.stock })));
}

checkProducts().catch(console.error).finally(() => process.exit());

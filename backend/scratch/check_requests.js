const { RestockRequest, Product, User, Branch } = require('../src/models');

async function checkRequests() {
  try {
    const requests = await RestockRequest.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5,
      include: [
        { model: Product, attributes: ['name'] },
        { model: Branch, attributes: ['name'] }
      ]
    });
    
    if (requests.length === 0) {
      console.log('NO RESTOCK REQUESTS FOUND IN DATABASE.');
    } else {
      console.log('--- LATEST RESTOCK REQUESTS ---');
      requests.forEach(r => {
        console.log(`[${r.createdAt}] ID: ${r.id} Status: ${r.status}`);
        console.log(`Product: ${r.Product.name} Qty: ${r.quantity}`);
        console.log(`Branch: ${r.Branch.name}`);
        console.log('---');
      });
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkRequests();

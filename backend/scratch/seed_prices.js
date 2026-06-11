require('dotenv').config({ path: './backend/.env' });
const { Product } = require('../src/models');
const sequelize = require('../src/db');

const marketPrices = {
  'GPU-NV-4090': { price: 115000, cost: 105000 },
  'GPU-NV-4080S': { price: 68000, cost: 62000 },
  'GPU-AMD-7900XTX': { price: 62000, cost: 56000 },
  'CPU-INT-14900K': { price: 38000, cost: 34000 },
  'CPU-AMD-7950X3D': { price: 42000, cost: 38000 },
  'CPU-INT-14700K': { price: 28000, cost: 24000 },
  'MB-AS-Z790H': { price: 45000, cost: 40000 },
  'MB-MSI-X670EC': { price: 28000, cost: 24000 },
  'RAM-GS-32D5': { price: 9500, cost: 8000 },
  'RAM-CR-32D5': { price: 8500, cost: 7000 },
  'SSD-SS-990P2': { price: 12000, cost: 10000 },
  'SSD-WD-SN850X': { price: 11000, cost: 9000 },
  'PSU-CR-RM1000X': { price: 14000, cost: 12000 },
  'PSU-SS-GX850': { price: 9500, cost: 8000 },
};

async function seedPrices() {
  try {
    await sequelize.authenticate();
    const products = await Product.findAll();
    
    for (const p of products) {
      const data = marketPrices[p.sku];
      if (data) {
        p.price = data.price;
        p.last_purchase_price = data.cost;
        await p.save();
        console.log(`Updated ${p.name}: Price=₱${p.price}, Cost=₱${p.last_purchase_price}`);
      } else {
         // Default if not in list
         if (!p.price || p.price === 0) {
            p.price = 5000;
            p.last_purchase_price = 4000;
            await p.save();
            console.log(`Updated ${p.name} with DEFAULT prices.`);
         }
      }
    }
    console.log('Price seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seedPrices();

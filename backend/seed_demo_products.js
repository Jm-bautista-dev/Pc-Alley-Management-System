const { Category, Product } = require('./src/models');
const sequelize = require('./src/db');

const seed = async () => {
  try {
    await sequelize.sync();

    // 1. Create Categories
    const categories = await Promise.all([
      Category.findOrCreate({ where: { name: 'GPU' } }),
      Category.findOrCreate({ where: { name: 'CPU' } }),
      Category.findOrCreate({ where: { name: 'Motherboard' } }),
      Category.findOrCreate({ where: { name: 'RAM' } }),
      Category.findOrCreate({ where: { name: 'Storage' } }),
      Category.findOrCreate({ where: { name: 'Power Supply' } }),
    ]);

    const catMap = {};
    categories.forEach(([cat, created]) => {
      catMap[cat.name] = cat.id;
    });

    // 2. Create Products
    const demoProducts = [
      { name: 'NVIDIA RTX 4090 OC', sku: 'GPU-NV-4090', price: 112000, category_id: catMap['GPU'], min_request_quantity: 1, max_request_quantity: 5, available_quantity: 100, reserved_quantity: 0 },
      { name: 'NVIDIA RTX 4080 Super', sku: 'GPU-NV-4080S', price: 68500, category_id: catMap['GPU'], min_request_quantity: 1, max_request_quantity: 10, available_quantity: 100, reserved_quantity: 0 },
      { name: 'AMD Radeon RX 7900 XTX', sku: 'GPU-AMD-7900XTX', price: 62400, category_id: catMap['GPU'], min_request_quantity: 1, max_request_quantity: 10, available_quantity: 100, reserved_quantity: 0 },
      { name: 'Intel Core i9-14900K', sku: 'CPU-INT-14900K', price: 38200, category_id: catMap['CPU'], min_request_quantity: 1, max_request_quantity: 20, available_quantity: 100, reserved_quantity: 0 },
      { name: 'AMD Ryzen 9 7950X3D', sku: 'CPU-AMD-7950X3D', price: 45200, category_id: catMap['CPU'], min_request_quantity: 1, max_request_quantity: 20, available_quantity: 100, reserved_quantity: 0 },
      { name: 'Intel Core i7-14700K', sku: 'CPU-INT-14700K', price: 26500, category_id: catMap['CPU'], min_request_quantity: 2, max_request_quantity: 30, available_quantity: 100, reserved_quantity: 0 },
      { name: 'ASUS ROG Maximus Z790 Hero', sku: 'MB-AS-Z790H', price: 42800, category_id: catMap['Motherboard'], min_request_quantity: 1, max_request_quantity: 15, available_quantity: 100, reserved_quantity: 0 },
      { name: 'MSI MPG X670E Carbon WiFi', sku: 'MB-MSI-X670EC', price: 32500, category_id: catMap['Motherboard'], min_request_quantity: 1, max_request_quantity: 15, available_quantity: 100, reserved_quantity: 0 },
      { name: 'G.Skill Trident Z5 RGB 32GB DDR5-6000', sku: 'RAM-GS-32D5', price: 12500, category_id: catMap['RAM'], min_request_quantity: 5, max_request_quantity: 100, available_quantity: 100, reserved_quantity: 0 },
      { name: 'Corsair Vengeance RGB 32GB DDR5-5200', sku: 'RAM-CR-32D5', price: 9800, category_id: catMap['RAM'], min_request_quantity: 5, max_request_quantity: 100, available_quantity: 100, reserved_quantity: 0 },
      { name: 'Samsung 990 Pro 2TB NVMe', sku: 'SSD-SS-990P2', price: 14800, category_id: catMap['Storage'], min_request_quantity: 2, max_request_quantity: 50, available_quantity: 100, reserved_quantity: 0 },
      { name: 'Western Digital Black SN850X 2TB', sku: 'SSD-WD-SN850X', price: 10500, category_id: catMap['Storage'], min_request_quantity: 2, max_request_quantity: 50, available_quantity: 100, reserved_quantity: 0 },
      { name: 'Corsair RM1000x 1000W Gold', sku: 'PSU-CR-RM1000X', price: 11200, category_id: catMap['Power Supply'], min_request_quantity: 2, max_request_quantity: 25, available_quantity: 100, reserved_quantity: 0 },
      { name: 'Seasonic Focus GX-850 850W Gold', sku: 'PSU-SS-GX850', price: 8400, category_id: catMap['Power Supply'], min_request_quantity: 2, max_request_quantity: 25, available_quantity: 100, reserved_quantity: 0 },
    ];

    for (const p of demoProducts) {
      const [product, created] = await Product.findOrCreate({
        where: { sku: p.sku },
        defaults: p
      });
      if (!created) {
        await product.update(p);
      }
    }

    console.log('✅ DATABASE: Products and Categories seeded successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ SEED ERROR:', error);
    process.exit(1);
  }
};

seed();

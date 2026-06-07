const { Order, OrderItem, Product, Branch, User } = require('../src/models');
const sequelize = require('../src/db');

const seedOrders = async () => {
  try {
    await sequelize.sync();

    const branches = await Branch.findAll();
    const products = await Product.findAll();
    let user = await User.findOne({ where: { role: 'staff' } });
    if (!user) {
      user = await User.findOne();
    }

    if (branches.length === 0 || products.length === 0 || !user) {
      console.log('Ensure branches, products, and users exist before seeding orders.');
      process.exit(1);
    }

    const customers = ["Maria Santos", "Jose Reyes", "Ana Cruz", "John Doe", "Jane Smith", "Tech Solutions Inc.", "NextGen Corp", "Alex Johnson"];
    
    let orderCount = 0;

    // Create a couple of orders for every month in the past year to fill the line chart
    for (let month = 0; month < 12; month++) {
      const ordersInMonth = Math.floor(Math.random() * 5) + 3; // 3 to 7 orders per month

      for (let i = 0; i < ordersInMonth; i++) {
        const branch = branches[Math.floor(Math.random() * branches.length)];
        const customer = customers[Math.floor(Math.random() * customers.length)];
        
        // Random date in the given month (2025/2026 depending on the current year context usually. Let's just use 2026)
        const date = new Date(2026, month, Math.floor(Math.random() * 28) + 1);
        
        let total = 0;
        const orderProducts = [];
        const numItems = Math.floor(Math.random() * 3) + 1; // 1 to 3 items
        
        for (let j = 0; j < numItems; j++) {
           const prod = products[Math.floor(Math.random() * products.length)];
           const qty = Math.floor(Math.random() * 2) + 1;
           orderProducts.push({ product: prod, qty});
           total += prod.price * qty;
        }

        const transaction = await sequelize.transaction();
        try {
          const order = await Order.create({
            branch_id: branch.id,
            user_id: user.id,
            customer_name: customer,
            total_amount: total,
            payment_method: 'card',
            status: 'completed',
            createdAt: date,
            updatedAt: date
          }, { transaction });

          for (const op of orderProducts) {
             await OrderItem.create({
               order_id: order.id,
               product_id: op.product.id,
               quantity: op.qty,
               price_at_sale: op.product.price
             }, { transaction });
          }

          await transaction.commit();
          orderCount++;
        } catch (err) {
          await transaction.rollback();
          console.error(err);
        }
      }
    }

    console.log(`✅ DATABASE: Successfully seeded ${orderCount} dummy orders for the dashboard.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ ERROR SEEDING ORDERS:', err);
    process.exit(1);
  }
};

seedOrders();

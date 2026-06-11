const sequelize = require('../db');
const { Sale, SaleItem, Customer, Inventory, Product, StockMovement, AuditLog } = require('../models');

/**
 * Creates a Sale and SaleItems, updates Inventory and Customer stats,
 * and logs StockMovement and AuditLog within a single transaction.
 */
const createSale = async ({ customerId, customerName, branchId, staffId, staffName, paymentMethod, notes, items, ipAddress }) => {
  const transaction = await sequelize.transaction();
  try {
    // Generate Invoice Number (e.g. INV-1780601955000)
    const invoiceNumber = `INV-${Date.now()}`;

    // 1. Create the Sale record
    const sale = await Sale.create({
      invoiceNumber,
      customerId: customerId || null,
      customerName: customerName || 'Walk-in Customer',
      branchId,
      staffId,
      staffName,
      totalAmount: 0, // calculated below
      paymentMethod,
      status: 'completed',
      notes
    }, { transaction });

    let totalAmount = 0;

    // 2. Loop and validate/process items
    for (const item of items) {
      const product = await Product.findByPk(item.product_id);
      if (!product) {
        throw new Error(`Product ID ${item.product_id} not found in catalog.`);
      }

      // Check stock at this branch
      const inventory = await Inventory.findOne({
        where: { product_id: product.id, branch_id: branchId }
      });

      if (!inventory || inventory.quantity < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name} at this branch.`);
      }

      const subtotal = Number(product.price) * parseInt(item.quantity);
      totalAmount += subtotal;

      // Create SaleItem
      await SaleItem.create({
        saleId: sale.id,
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        quantity: item.quantity,
        unitPrice: product.price,
        subtotal
      }, { transaction });

      // Deduct stock in inventory
      const previous_stock = inventory.quantity;
      inventory.quantity -= item.quantity;
      await inventory.save({ transaction });

      // Log StockMovement
      await StockMovement.create({
        product_id: product.id,
        type: 'SALE',
        quantity: -item.quantity,
        previous_stock,
        new_stock: inventory.quantity,
        user_id: staffId,
        note: `Sale processed: ${invoiceNumber}`
      }, { transaction });
    }

    // Update Sale total
    sale.totalAmount = totalAmount;
    await sale.save({ transaction });

    // 3. Update Customer profile stats if customerId is mapped
    if (customerId) {
      const customer = await Customer.findByPk(customerId);
      if (customer) {
        customer.totalSpent = Number(customer.totalSpent) + totalAmount;
        customer.totalOrders = parseInt(customer.totalOrders) + 1;
        await customer.save({ transaction });
      }
    }

    // 4. Log checkout operation to AuditLog
    await AuditLog.create({
      action: 'CREATE_SALE',
      user_id: staffId,
      details: `Sale ${invoiceNumber} created for branch ${branchId}. Total: ₱${totalAmount.toLocaleString()}`,
      ip_address: ipAddress || null
    }, { transaction });

    await transaction.commit();
    return sale;
  } catch (error) {
    if (transaction) await transaction.rollback();
    throw error;
  }
};

module.exports = { createSale };

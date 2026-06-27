const sequelize = require('../db');
const { PurchaseOrder, PurchaseOrderItem, Inventory, Product, StockMovement, Notification, AuditLog } = require('../models');

/**
 * Marks a PurchaseOrder as Received, adds items to Inventory,
 * logs StockMovements and creates notifications and audit logs.
 */
const receivePurchaseOrder = async (poId, userId, ipAddress) => {
  const transaction = await sequelize.transaction();
  try {
    const po = await PurchaseOrder.findByPk(poId, {
      include: [PurchaseOrderItem]
    });

    if (!po) {
      throw new Error(`Purchase Order ID ${poId} not found.`);
    }

    if (po.status === 'Received') {
      throw new Error('Purchase Order has already been received.');
    }

    // 1. Update PO Status
    po.status = 'Received';
    await po.save({ transaction });

    // 2. Loop and update inventory for each item
    for (const item of po.PurchaseOrderItems) {
      const product = await Product.findByPk(item.productId);
      if (!product) continue;

      // Find or initialize inventory record
      let inventory = await Inventory.findOne({
        where: { product_id: product.id, branch_id: po.branchId }
      });

      let previous_stock = 0;
      if (!inventory) {
        inventory = await Inventory.create({
          product_id: product.id,
          branch_id: po.branchId,
          quantity: item.quantity,
          low_stock_threshold: 5
        }, { transaction });
      } else {
        previous_stock = inventory.quantity;
        inventory.quantity += item.quantity;
        await inventory.save({ transaction });
      }

      // Log StockMovement
      await StockMovement.create({
        product_id: product.id,
        type: 'RESTOCK',
        quantity: item.quantity,
        previous_stock,
        new_stock: inventory.quantity,
        user_id: userId,
        note: `PO Ingestion: ${po.poNumber}`
      }, { transaction });

      // Update Product's last purchase price
      product.last_purchase_price = item.unitCost;
      await product.save({ transaction });
    }

    // 3. Create Notification for the receiving user
    await Notification.create({
      user_id: userId,
      title: 'Purchase Order Received',
      message: `Purchase Order ${po.poNumber} has been received and added to inventory.`,
      type: 'purchase_order',
      link: '/purchases'
    }, { transaction });

    // 4. Log to AuditLog
    await AuditLog.create({
      action: 'RECEIVE_PURCHASE_ORDER',
      user_id: userId,
      details: `Purchase Order ${po.poNumber} marked as Received. Branch: ${po.branchId}`,
      ip_address: ipAddress || null
    }, { transaction });

    await transaction.commit();
    return po;
  } catch (error) {
    if (transaction) await transaction.rollback();
    throw error;
  }
};

module.exports = { receivePurchaseOrder };

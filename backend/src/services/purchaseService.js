const sequelize = require('../db');
const { PurchaseOrder, PurchaseOrderItem, Inventory, Product, StockMovement, Notification, AuditLog } = require('../models');

/**
 * Marks a PurchaseOrder as Received, adds items to Inventory,
 * logs StockMovements and creates notifications and audit logs.
 */
const receivePurchaseOrder = async (poId, userId, ipAddress) => {
  const transaction = await sequelize.transaction();
  let po;
  try {
    po = await PurchaseOrder.findByPk(poId, {
      include: [PurchaseOrderItem]
    });

    if (!po) {
      throw new Error(`Purchase Order ID ${poId} not found.`);
    }

    if (po.status === 'Received') {
      throw new Error('Purchase Order has already been marked as Received.');
    }

    // 1. Update PO status
    po.status = 'Received';
    po.receivedDate = new Date();
    await po.save({ transaction });

    // 2. Iterate over items, update Inventory and create StockMovements
    for (const item of po.PurchaseOrderItems) {
      const product = await Product.findByPk(item.productId);
      if (!product) continue;

      let inventory = await Inventory.findOne({
        where: { product_id: product.id, branch_id: po.branchId }
      });

      let prevStock = 0;
      if (!inventory) {
        inventory = await Inventory.create({
          product_id: product.id,
          branch_id: po.branchId,
          quantity: item.quantity,
          low_stock_threshold: 5
        }, { transaction });
      } else {
        prevStock = inventory.quantity;
        inventory.quantity += item.quantity;
        await inventory.save({ transaction });
      }

      // Log StockMovement
      await StockMovement.create({
        product_id: product.id,
        type: 'RESTOCK',
        quantity: item.quantity,
        previous_stock: prevStock,
        new_stock: inventory.quantity,
        user_id: userId,
        note: `Purchase Order Received (PO: ${po.poNumber})`
      }, { transaction });

      // Update unit cost if provided
      if (item.unitCost > 0) {
        product.cost_price = item.unitCost;
      }
      await product.save({ transaction });
    }

    // 3. Log to AuditLog
    if (userId) {
      await AuditLog.create({
        action: 'RECEIVE_PURCHASE_ORDER',
        user_id: userId,
        details: `Purchase Order ${po.poNumber} marked as Received. Branch: ${po.branchId}`,
        ip_address: ipAddress || null
      }, { transaction });
    }

    await transaction.commit();
  } catch (error) {
    if (transaction) await transaction.rollback();
    throw error;
  }

  // 4. Post-commit: Create Notification for the receiving user
  try {
    if (userId) {
      await Notification.create({
        userId: userId,
        branchId: po.branchId,
        title: 'Purchase Order Received',
        message: `Purchase Order ${po.poNumber} has been received and added to inventory.`,
        type: 'purchase_order',
        link: '/purchases'
      });
    }
  } catch (notifErr) {
    console.warn('[Notification Warning in PO Receive]:', notifErr.message);
  }

  return po;
};

module.exports = { receivePurchaseOrder };

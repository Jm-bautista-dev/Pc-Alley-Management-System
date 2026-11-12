const sequelize = require('../db');
const { StockTransfer, StockTransferItem, Inventory, Product, StockMovement, Notification, AuditLog, User } = require('../models');

/**
 * Approves and completes a StockTransfer, deducting stock from the source
 * branch and adding it to the destination branch.
 */
const completeStockTransfer = async (transferId, userId, ipAddress) => {
  const transaction = await sequelize.transaction();
  let transfer;
  try {
    transfer = await StockTransfer.findByPk(transferId, {
      include: [StockTransferItem]
    });

    if (!transfer) {
      throw new Error(`Stock Transfer ID ${transferId} not found.`);
    }

    if (transfer.status === 'Completed') {
      throw new Error('Stock Transfer has already been completed.');
    }

    // Update status to Completed
    transfer.status = 'Completed';
    await transfer.save({ transaction });

    // Loop and adjust inventory for each item
    for (const item of transfer.StockTransferItems) {
      const product = await Product.findByPk(item.productId);
      if (!product) continue;

      // 1. Source Branch stock deduction
      const sourceInv = await Inventory.findOne({
        where: { product_id: product.id, branch_id: transfer.fromBranchId }
      });

      if (!sourceInv || sourceInv.quantity < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name} at the source branch.`);
      }

      const prevSourceStock = sourceInv.quantity;
      sourceInv.quantity -= item.quantity;
      await sourceInv.save({ transaction });

      // Log StockMovement for source deduction
      await StockMovement.create({
        product_id: product.id,
        type: 'TRANSFER',
        quantity: -item.quantity,
        previous_stock: prevSourceStock,
        new_stock: sourceInv.quantity,
        user_id: userId,
        note: `Stock Transfer Out to Branch #${transfer.toBranchId} (ID: ${transfer.id})`
      }, { transaction });

      // 2. Destination Branch stock addition
      let destInv = await Inventory.findOne({
        where: { product_id: product.id, branch_id: transfer.toBranchId }
      });

      let prevDestStock = 0;
      if (!destInv) {
        destInv = await Inventory.create({
          product_id: product.id,
          branch_id: transfer.toBranchId,
          quantity: item.quantity,
          low_stock_threshold: 5
        }, { transaction });
      } else {
        prevDestStock = destInv.quantity;
        destInv.quantity += item.quantity;
        await destInv.save({ transaction });
      }

      // Log StockMovement for destination addition
      await StockMovement.create({
        product_id: product.id,
        type: 'TRANSFER',
        quantity: item.quantity,
        previous_stock: prevDestStock,
        new_stock: destInv.quantity,
        user_id: userId,
        note: `Stock Transfer In from Branch #${transfer.fromBranchId} (ID: ${transfer.id})`
      }, { transaction });
    }

    // 3. Log Audit Log
    if (userId) {
      await AuditLog.create({
        action: 'COMPLETE_STOCK_TRANSFER',
        user_id: userId,
        details: `Stock Transfer #${transfer.id} completed. Source branch ${transfer.fromBranchId} -> Dest branch ${transfer.toBranchId}`,
        ip_address: ipAddress || null
      }, { transaction });
    }

    await transaction.commit();
  } catch (error) {
    if (transaction) await transaction.rollback();
    throw error;
  }

  // 4. Post-commit: Notify Branch Admins of completed transfer
  try {
    const branchAdmins = await User.findAll({
      where: { role: 'branch_admin', branch_id: [transfer.fromBranchId, transfer.toBranchId] }
    });

    const notifications = branchAdmins
      .filter(admin => admin && admin.id)
      .map(admin => ({
        userId: admin.id,
        branchId: admin.branch_id,
        title: 'Stock Transfer Completed',
        message: `Stock Transfer #${transfer.id} has been processed and completed successfully.`,
        type: 'stock_transfer',
        link: '/inventory'
      }));

    if (notifications.length > 0) {
      await Notification.bulkCreate(notifications);
    }
  } catch (notifErr) {
    console.warn('[Notification Warning in Transfer Complete]:', notifErr.message);
  }

  return transfer;
};

module.exports = { completeStockTransfer };

const sequelize = require('../db');
const { StockTransfer, StockTransferItem, Inventory, Product, StockMovement, Notification, AuditLog, User } = require('../models');

/**
 * Dispatches a transfer (moves from Pending to In Transit),
 * deducting stock from the source branch ONCE.
 */
const dispatchStockTransfer = async (transferId, userId, ipAddress) => {
  const transaction = await sequelize.transaction();
  try {
    const transfer = await StockTransfer.findByPk(transferId, {
      include: [StockTransferItem]
    });

    if (!transfer) {
      throw new Error(`Stock Transfer ID ${transferId} not found.`);
    }

    if (transfer.status === 'In Transit') {
      throw new Error('Stock Transfer has already been dispatched.');
    }
    if (transfer.status === 'Completed') {
      throw new Error('Stock Transfer is already completed.');
    }
    if (transfer.status === 'Cancelled') {
      throw new Error('Cannot dispatch a cancelled stock transfer.');
    }

    // Verify source stock for all items
    for (const item of transfer.StockTransferItems) {
      const product = await Product.findByPk(item.productId, { transaction });
      if (!product) continue;

      const sourceInv = await Inventory.findOne({
        where: { product_id: product.id, branch_id: transfer.fromBranchId },
        transaction
      });

      if (!sourceInv || sourceInv.quantity < item.quantity) {
        throw new Error(`Insufficient stock for "${product.name}" at source branch (available: ${sourceInv?.quantity ?? 0}, required: ${item.quantity}).`);
      }
    }

    // Deduct source stock once
    for (const item of transfer.StockTransferItems) {
      const product = await Product.findByPk(item.productId, { transaction });
      if (!product) continue;

      const sourceInv = await Inventory.findOne({
        where: { product_id: product.id, branch_id: transfer.fromBranchId },
        transaction
      });

      const prevStock = sourceInv.quantity;
      sourceInv.quantity -= item.quantity;
      await sourceInv.save({ transaction });

      await StockMovement.create({
        product_id: product.id,
        type: 'SALE',
        quantity: -item.quantity,
        previous_stock: prevStock,
        new_stock: sourceInv.quantity,
        user_id: userId,
        note: `Stock Transfer Out (${transfer.reference_number || '#' + transfer.id})`
      }, { transaction });
    }

    transfer.status = 'In Transit';
    transfer.dispatched_by = userId;
    transfer.dispatched_at = new Date();
    await transfer.save({ transaction });

    await AuditLog.create({
      action: 'DISPATCH_STOCK_TRANSFER',
      user_id: userId,
      details: `Stock Transfer #${transfer.id} (${transfer.reference_number}) dispatched from branch ${transfer.fromBranchId} to ${transfer.toBranchId}`,
      ip_address: ipAddress || null
    }, { transaction });

    await transaction.commit();
    return transfer;
  } catch (error) {
    if (transaction) await transaction.rollback();
    throw error;
  }
};

/**
 * Receives an in-transit transfer at destination branch,
 * adding stock to the destination branch ONCE.
 */
const receiveStockTransfer = async (transferId, userId, ipAddress) => {
  const transaction = await sequelize.transaction();
  try {
    const transfer = await StockTransfer.findByPk(transferId, {
      include: [StockTransferItem]
    });

    if (!transfer) {
      throw new Error(`Stock Transfer ID ${transferId} not found.`);
    }

    if (transfer.status === 'Completed') {
      throw new Error('Stock Transfer has already been received/completed.');
    }
    if (transfer.status === 'Cancelled') {
      throw new Error('Cannot receive a cancelled stock transfer.');
    }

    // If it was still Pending (not yet dispatched), deduct from source branch first
    if (transfer.status === 'Pending') {
      for (const item of transfer.StockTransferItems) {
        const product = await Product.findByPk(item.productId, { transaction });
        if (!product) continue;

        const sourceInv = await Inventory.findOne({
          where: { product_id: product.id, branch_id: transfer.fromBranchId },
          transaction
        });

        if (!sourceInv || sourceInv.quantity < item.quantity) {
          throw new Error(`Insufficient stock for "${product.name}" at source branch.`);
        }

        const prevStock = sourceInv.quantity;
        sourceInv.quantity -= item.quantity;
        await sourceInv.save({ transaction });

        await StockMovement.create({
          product_id: product.id,
          type: 'SALE',
          quantity: -item.quantity,
          previous_stock: prevStock,
          new_stock: sourceInv.quantity,
          user_id: userId,
          note: `Stock Transfer Out (${transfer.reference_number || '#' + transfer.id})`
        }, { transaction });
      }
      transfer.dispatched_by = transfer.dispatched_by || userId;
      transfer.dispatched_at = transfer.dispatched_at || new Date();
    }

    // Add stock to destination branch
    for (const item of transfer.StockTransferItems) {
      const product = await Product.findByPk(item.productId, { transaction });
      if (!product) continue;

      let destInv = await Inventory.findOne({
        where: { product_id: product.id, branch_id: transfer.toBranchId },
        transaction
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

      await StockMovement.create({
        product_id: product.id,
        type: 'RESTOCK',
        quantity: item.quantity,
        previous_stock: prevDestStock,
        new_stock: destInv.quantity,
        user_id: userId,
        note: `Stock Transfer In (${transfer.reference_number || '#' + transfer.id})`
      }, { transaction });
    }

    transfer.status = 'Completed';
    transfer.received_by = userId;
    transfer.received_at = new Date();
    await transfer.save({ transaction });

    await AuditLog.create({
      action: 'COMPLETE_STOCK_TRANSFER',
      user_id: userId,
      details: `Stock Transfer #${transfer.id} (${transfer.reference_number}) received and completed at branch ${transfer.toBranchId}`,
      ip_address: ipAddress || null
    }, { transaction });

    await transaction.commit();
    return transfer;
  } catch (error) {
    if (transaction) await transaction.rollback();
    throw error;
  }
};

/**
 * Backward compatibility alias for completeStockTransfer
 */
const completeStockTransfer = async (transferId, userId, ipAddress) => {
  return receiveStockTransfer(transferId, userId, ipAddress);
};

module.exports = {
  dispatchStockTransfer,
  receiveStockTransfer,
  completeStockTransfer
};

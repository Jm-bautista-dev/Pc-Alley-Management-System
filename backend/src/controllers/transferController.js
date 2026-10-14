const { StockTransfer, StockTransferItem, Branch, Product, Inventory } = require('../models');
const { completeStockTransfer } = require('../services/transferService');

const getAllTransfers = async (req, res) => {
  try {
    const branchId = req.user.role !== 'super_admin' ? req.user.branch_id : req.query.branchId;
    const where = {};
    
    if (branchId) {
      const { Op } = require('sequelize');
      where[Op.or] = [
        { fromBranchId: branchId },
        { toBranchId: branchId }
      ];
    }

    const transfers = await StockTransfer.findAll({
      where,
      include: [
        { model: Branch, as: 'SourceBranch', attributes: ['id', 'name', 'location'] },
        { model: Branch, as: 'DestBranch', attributes: ['id', 'name', 'location'] },
        {
          model: StockTransferItem,
          include: [{ model: Product, attributes: ['id', 'name', 'sku', 'price'] }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(transfers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getTransferById = async (req, res) => {
  try {
    const transfer = await StockTransfer.findByPk(req.params.id, {
      include: [
        { model: Branch, as: 'SourceBranch', attributes: ['id', 'name', 'location'] },
        { model: Branch, as: 'DestBranch', attributes: ['id', 'name', 'location'] },
        {
          model: StockTransferItem,
          include: [{ model: Product, attributes: ['id', 'name', 'sku', 'price'] }]
        }
      ]
    });
    if (!transfer) return res.status(404).json({ message: 'Stock Transfer not found.' });

    // Validate branch authorization
    if (req.user.role !== 'super_admin' && transfer.fromBranchId !== req.user.branch_id && transfer.toBranchId !== req.user.branch_id) {
      return res.status(403).json({ message: 'Forbidden: You cannot access stock transfers outside your branch.' });
    }

    res.json(transfer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createTransfer = async (req, res) => {
  try {
    const { fromBranchId, toBranchId, transferDate, items, notes, autoReceive } = req.body;
    
    if (!fromBranchId || !toBranchId) {
      return res.status(400).json({ message: 'Both source and destination branches are required.' });
    }

    if (parseInt(fromBranchId) === parseInt(toBranchId)) {
      return res.status(400).json({ message: 'Source and destination branches cannot be the same.' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'At least one product item is required.' });
    }

    // Validate sector authorization
    if (req.user.role !== 'super_admin' && parseInt(fromBranchId) !== req.user.branch_id) {
      return res.status(403).json({ message: 'Forbidden: You cannot transfer stock out of another branch.' });
    }

    // Pre-validate stock availability at source branch including reserve buffer
    for (const item of items) {
      const inv = await Inventory.findOne({
        where: { product_id: item.productId, branch_id: fromBranchId }
      });
      const available = inv ? inv.quantity : 0;
      const reserve = Math.max(1, inv?.low_stock_threshold || 10);
      const maxTransferable = Math.max(0, available - reserve);
      const prod = await Product.findByPk(item.productId);
      const name = prod ? prod.name : `Product #${item.productId}`;

      if (available <= reserve) {
        return res.status(400).json({
          message: `Cannot transfer "${name}". Source branch only has ${available} units in stock, which is required as safety reserve (${reserve} units) so the branch does not run out of stock.`
        });
      }

      if (item.quantity > maxTransferable) {
        return res.status(400).json({
          message: `Cannot transfer ${item.quantity} units of "${name}". Available stock is ${available}, and a safety reserve of ${reserve} units must be retained so the branch does not run out of stock. Maximum transferable is ${maxTransferable} units.`
        });
      }
    }

    const adminFullName = [req.user.first_name, req.user.last_name].filter(Boolean).join(' ') || req.user.username;
    const transfer = await StockTransfer.create({
      fromBranchId,
      toBranchId,
      transferDate: transferDate || new Date().toISOString().split('T')[0],
      dispatchedBy: req.body.dispatchedBy || adminFullName,
      status: 'Pending',
      notes
    });

    for (const item of items) {
      await StockTransferItem.create({
        transferId: transfer.id,
        productId: item.productId,
        quantity: item.quantity
      });
    }

    // If autoReceive is selected or immediate transfer requested
    if (autoReceive) {
      const completed = await completeStockTransfer(
        transfer.id,
        req.user.id,
        req.ip || req.connection.remoteAddress
      );
      return res.status(201).json({ message: 'Stock transfer dispatched and completed successfully.', transfer: completed });
    }

    // Return transfer with full Branch and Product items for immediate Transmittal printing
    const fullTransfer = await StockTransfer.findByPk(transfer.id, {
      include: [
        { model: Branch, as: 'SourceBranch', attributes: ['id', 'name', 'location'] },
        { model: Branch, as: 'DestBranch', attributes: ['id', 'name', 'location'] },
        {
          model: StockTransferItem,
          include: [{ model: Product, attributes: ['id', 'name', 'sku', 'price'] }]
        }
      ]
    });

    res.status(201).json(fullTransfer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const completeTransferRoute = async (req, res) => {
  try {
    const transfer = await StockTransfer.findByPk(req.params.id);
    if (!transfer) return res.status(404).json({ message: 'Stock Transfer not found.' });

    if (transfer.status === 'Completed') {
      return res.status(400).json({ message: 'This stock transfer is already completed.' });
    }

    // Validate branch authorization: only destination branch where goods are delivered can confirm receipt
    if (req.user.role !== 'branch_admin' || transfer.toBranchId !== req.user.branch_id) {
      return res.status(403).json({ message: 'Forbidden: Only the destination branch where products are delivered can confirm and receive this stock transfer.' });
    }

    const completedTransfer = await completeStockTransfer(
      req.params.id,
      req.user.id,
      req.ip || req.connection.remoteAddress
    );
    res.json({ message: 'Stock Transfer received and completed successfully.', transfer: completedTransfer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteTransferRoute = async (req, res) => {
  try {
    const transfer = await StockTransfer.findByPk(req.params.id);
    if (!transfer) return res.status(404).json({ message: 'Stock Transfer not found.' });

    if (transfer.status === 'Completed') {
      return res.status(400).json({ message: 'Completed stock transfers cannot be deleted.' });
    }

    // Only source branch or super admin can delete a pending transfer
    if (req.user.role !== 'super_admin' && transfer.fromBranchId !== req.user.branch_id) {
      return res.status(403).json({ message: 'Forbidden: You cannot delete transfers from another branch.' });
    }

    await StockTransferItem.destroy({ where: { transferId: transfer.id } });
    await transfer.destroy();

    res.json({ message: 'Pending stock transfer cancelled and deleted.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateTransfer = async (req, res) => {
  try {
    const transfer = await StockTransfer.findByPk(req.params.id, {
      include: [{ model: StockTransferItem }]
    });
    if (!transfer) return res.status(404).json({ message: 'Stock Transfer not found.' });

    // Validate branch authorization
    if (req.user.role !== 'super_admin' && transfer.fromBranchId !== req.user.branch_id && transfer.toBranchId !== req.user.branch_id) {
      return res.status(403).json({ message: 'Forbidden: You cannot modify stock transfers outside your branch.' });
    }

    const { transferDate, dispatchedBy, status, notes, fromBranchId, toBranchId, items } = req.body;

    if (transferDate !== undefined) transfer.transferDate = transferDate;
    if (dispatchedBy !== undefined) transfer.dispatchedBy = dispatchedBy;
    if (notes !== undefined) transfer.notes = notes;
    if (status !== undefined && ['Pending', 'In-Transit', 'Completed'].includes(status)) {
      transfer.status = status;
    }
    if (req.user.role === 'super_admin') {
      if (fromBranchId !== undefined) transfer.fromBranchId = fromBranchId;
      if (toBranchId !== undefined) transfer.toBranchId = toBranchId;
    }

    await transfer.save();

    // If items were provided and updated
    if (items && Array.isArray(items) && items.length > 0) {
      await StockTransferItem.destroy({ where: { transferId: transfer.id } });
      for (const item of items) {
        await StockTransferItem.create({
          transferId: transfer.id,
          productId: item.productId,
          quantity: item.quantity
        });
      }
    }

    const updated = await StockTransfer.findByPk(transfer.id, {
      include: [
        { model: Branch, as: 'SourceBranch', attributes: ['id', 'name', 'location'] },
        { model: Branch, as: 'DestBranch', attributes: ['id', 'name', 'location'] },
        {
          model: StockTransferItem,
          include: [{ model: Product, attributes: ['id', 'name', 'sku', 'price'] }]
        }
      ]
    });

    res.json({ message: 'Stock Transfer updated successfully.', transfer: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllTransfers,
  getTransferById,
  createTransfer,
  updateTransfer,
  completeTransferRoute,
  deleteTransferRoute
};

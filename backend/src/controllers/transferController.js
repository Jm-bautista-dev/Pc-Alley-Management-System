const { StockTransfer, StockTransferItem, Branch, Product } = require('../models');
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
        { model: Branch, as: 'SourceBranch', attributes: ['name'] },
        { model: Branch, as: 'DestBranch', attributes: ['name'] }
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
        { model: Branch, as: 'SourceBranch', attributes: ['name'] },
        { model: Branch, as: 'DestBranch', attributes: ['name'] },
        {
          model: StockTransferItem,
          include: [{ model: Product, attributes: ['name', 'sku'] }]
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
    const { fromBranchId, toBranchId, items, notes } = req.body;
    
    // Validate sector authorization
    if (req.user.role !== 'super_admin' && parseInt(fromBranchId) !== req.user.branch_id) {
      return res.status(403).json({ message: 'Forbidden: You cannot transfer stock out of another branch.' });
    }

    const transfer = await StockTransfer.create({
      fromBranchId,
      toBranchId,
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

    res.status(201).json(transfer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const completeTransferRoute = async (req, res) => {
  try {
    const transfer = await StockTransfer.findByPk(req.params.id);
    if (!transfer) return res.status(404).json({ message: 'Stock Transfer not found.' });

    // Validate branch authorization: only the destination branch can accept the transfer (or super admin)
    if (req.user.role !== 'super_admin' && transfer.toBranchId !== req.user.branch_id) {
      return res.status(403).json({ message: 'Forbidden: Only the destination branch can complete this stock transfer.' });
    }

    const completedTransfer = await completeStockTransfer(
      req.params.id,
      req.user.id,
      req.ip || req.connection.remoteAddress
    );
    res.json({ message: 'Stock Transfer completed successfully.', transfer: completedTransfer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllTransfers,
  getTransferById,
  createTransfer,
  completeTransferRoute
};

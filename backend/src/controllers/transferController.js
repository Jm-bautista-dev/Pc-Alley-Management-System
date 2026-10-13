const { StockTransfer, StockTransferItem, Branch, Product, User } = require('../models');
const { dispatchStockTransfer, receiveStockTransfer, completeStockTransfer } = require('../services/transferService');

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
          include: [{ model: Product, attributes: ['id', 'name', 'sku'] }]
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
        { model: Branch, as: 'SourceBranch', attributes: ['id', 'name', 'location', 'phone'] },
        { model: Branch, as: 'DestBranch', attributes: ['id', 'name', 'location', 'phone'] },
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
    const { fromBranchId, toBranchId, items, notes } = req.body;
    
    if (parseInt(fromBranchId) === parseInt(toBranchId)) {
      return res.status(400).json({ message: 'Source and destination branch cannot be the same.' });
    }

    // Validate sector authorization
    if (req.user.role !== 'super_admin' && parseInt(fromBranchId) !== req.user.branch_id) {
      return res.status(403).json({ message: 'Forbidden: You cannot transfer stock out of another branch.' });
    }

    const refNumber = `TRF-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;

    const transfer = await StockTransfer.create({
      reference_number: refNumber,
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

    const created = await StockTransfer.findByPk(transfer.id, {
      include: [
        { model: Branch, as: 'SourceBranch' },
        { model: Branch, as: 'DestBranch' },
        { model: StockTransferItem, include: [Product] }
      ]
    });

    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const dispatchTransferRoute = async (req, res) => {
  try {
    const transfer = await StockTransfer.findByPk(req.params.id);
    if (!transfer) return res.status(404).json({ message: 'Stock Transfer not found.' });

    // Only source branch or super admin can dispatch
    if (req.user.role !== 'super_admin' && transfer.fromBranchId !== req.user.branch_id) {
      return res.status(403).json({ message: 'Forbidden: Only the source branch can dispatch this transfer.' });
    }

    const dispatched = await dispatchStockTransfer(
      req.params.id,
      req.user.id,
      req.ip || req.connection.remoteAddress
    );
    res.json({ message: 'Stock Transfer dispatched successfully.', transfer: dispatched });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const completeTransferRoute = async (req, res) => {
  try {
    const transfer = await StockTransfer.findByPk(req.params.id);
    if (!transfer) return res.status(404).json({ message: 'Stock Transfer not found.' });

    // Validate branch authorization: only the destination branch can accept the transfer (or super admin)
    if (req.user.role !== 'super_admin' && transfer.toBranchId !== req.user.branch_id) {
      return res.status(403).json({ message: 'Forbidden: Only the destination branch can receive this stock transfer.' });
    }

    const completedTransfer = await completeStockTransfer(
      req.params.id,
      req.user.id,
      req.ip || req.connection.remoteAddress
    );
    res.json({ message: 'Stock Transfer completed successfully.', transfer: completedTransfer });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getTransmittalRoute = async (req, res) => {
  try {
    const transfer = await StockTransfer.findByPk(req.params.id, {
      include: [
        { model: Branch, as: 'SourceBranch' },
        { model: Branch, as: 'DestBranch' },
        {
          model: StockTransferItem,
          include: [{ model: Product, attributes: ['id', 'name', 'sku'] }]
        }
      ]
    });
    if (!transfer) return res.status(404).json({ message: 'Stock Transfer not found.' });

    const dispatchedByUser = transfer.dispatched_by ? await User.findByPk(transfer.dispatched_by, { attributes: ['id', 'username', 'first_name', 'last_name'] }) : null;
    const receivedByUser = transfer.received_by ? await User.findByPk(transfer.received_by, { attributes: ['id', 'username', 'first_name', 'last_name'] }) : null;

    res.json({
      transmittalTitle: 'INTER-BRANCH STOCK TRANSMITTAL RECEIPT',
      transmittalNumber: transfer.reference_number || `TRF-${transfer.id}`,
      referenceNumber: transfer.reference_number || `TRF-${transfer.id}`,
      date: transfer.createdAt,
      status: transfer.status,
      sourceBranch: transfer.SourceBranch,
      destinationBranch: transfer.DestBranch,
      notes: transfer.notes,
      items: (transfer.StockTransferItems || []).map(item => ({
        productId: item.productId,
        name: item.Product?.name || 'Unknown Item',
        sku: item.Product?.sku || 'N/A',
        quantity: item.quantity
      })),
      dispatchedBy: dispatchedByUser ? `${dispatchedByUser.first_name || ''} ${dispatchedByUser.last_name || ''}`.trim() || dispatchedByUser.username : 'Pending Dispatch',
      dispatchedAt: transfer.dispatched_at,
      receivedBy: receivedByUser ? `${receivedByUser.first_name || ''} ${receivedByUser.last_name || ''}`.trim() || receivedByUser.username : (transfer.status === 'Completed' ? 'Received' : 'Pending Receipt'),
      receivedAt: transfer.received_at
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllTransfers,
  getTransferById,
  createTransfer,
  dispatchTransferRoute,
  completeTransferRoute,
  getTransmittalRoute
};

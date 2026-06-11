const { PurchaseOrder, PurchaseOrderItem, Supplier, Branch, Product } = require('../models');
const { receivePurchaseOrder } = require('../services/purchaseService');

const getAllPurchaseOrders = async (req, res) => {
  try {
    const branchId = req.user.role !== 'super_admin' ? req.user.branch_id : req.query.branchId;
    const where = {};
    if (branchId) where.branchId = branchId;

    const pos = await PurchaseOrder.findAll({
      where,
      include: [
        { model: Supplier, attributes: ['name'] },
        { model: Branch, attributes: ['name'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(pos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getPurchaseOrderById = async (req, res) => {
  try {
    const po = await PurchaseOrder.findByPk(req.params.id, {
      include: [
        { model: Supplier, attributes: ['name'] },
        { model: Branch, attributes: ['name'] },
        {
          model: PurchaseOrderItem,
          include: [{ model: Product, attributes: ['name', 'sku'] }]
        }
      ]
    });
    if (!po) return res.status(404).json({ message: 'Purchase Order not found.' });

    // Validate branch authorization
    if (req.user.role !== 'super_admin' && po.branchId !== req.user.branch_id) {
      return res.status(403).json({ message: 'Forbidden: You cannot access purchase orders outside your branch.' });
    }

    res.json(po);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createPurchaseOrder = async (req, res) => {
  try {
    const { supplierId, branchId, items } = req.body;
    
    const resolvedBranchId = req.user.role !== 'super_admin' ? req.user.branch_id : (branchId || 1);
    const poNumber = `PO-${Date.now()}`;

    let totalAmount = 0;
    const poItems = [];

    for (const item of items) {
      const product = await Product.findByPk(item.productId);
      if (!product) continue;
      
      const subtotal = Number(item.unitCost) * parseInt(item.quantity);
      totalAmount += subtotal;

      poItems.push({
        productId: product.id,
        quantity: item.quantity,
        unitCost: item.unitCost,
        subtotal
      });
    }

    const po = await PurchaseOrder.create({
      poNumber,
      supplierId,
      branchId: resolvedBranchId,
      status: 'Ordered',
      totalAmount,
      dueAmount: totalAmount
    });

    for (const item of poItems) {
      await PurchaseOrderItem.create({
        poId: po.id,
        ...item
      });
    }

    res.status(201).json(po);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const receivePurchaseOrderRoute = async (req, res) => {
  try {
    const po = await PurchaseOrder.findByPk(req.params.id);
    if (!po) return res.status(404).json({ message: 'Purchase Order not found.' });

    // Validate branch authorization
    if (req.user.role !== 'super_admin' && po.branchId !== req.user.branch_id) {
      return res.status(403).json({ message: 'Forbidden: You cannot modify purchase orders outside your branch.' });
    }

    const updatedPo = await receivePurchaseOrder(
      req.params.id,
      req.user.id,
      req.ip || req.connection.remoteAddress
    );
    res.json({ message: 'Purchase Order completed successfully.', po: updatedPo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  receivePurchaseOrderRoute
};

const { RestockRequest, Product, Inventory, User, Branch, Notification, StockMovement } = require('../models');

const createRequest = async (req, res) => {
  try {
    const { product_id, quantity, notes, cost_price, supplier_id, branch_id: body_branch_id } = req.body;
    const branch_id = body_branch_id || req.user.branch_id;

    if (!branch_id) {
      return res.status(400).json({ message: 'User must be assigned to a branch to make restock requests.' });
    }

    // Validate quantity
    if (!quantity || parseInt(quantity) < 1) {
      return res.status(400).json({ message: 'Quantity must be at least 1.' });
    }

    const request = await RestockRequest.create({
      product_id,
      branch_id,
      manager_id: req.user.id,
      quantity: parseInt(quantity),
      cost_price,
      supplier_id,
      notes,
      status: 'Pending'
    });

    // Notify all Super Admins and the branch admins for this branch
    const { Op } = require('sequelize');
    const admins = await User.findAll({
      where: {
        [Op.or]: [
          { role: 'super_admin' },
          { role: 'branch_admin', branch_id }
        ]
      }
    });
    const product = await Product.findByPk(product_id);
    const branch = await Branch.findByPk(branch_id);

    if (admins.length > 0 && product && branch) {
      const notifications = admins.map(admin => ({
        userId: admin.id,
        branchId: branch_id,
        title: 'New Restock Request',
        message: `${req.user.username} requested ${quantity} units of ${product.name} for ${branch.name}.`,
        type: 'restock_request',
        link: `/admin?tab=restock&id=${request.id}`
      }));
      await Notification.bulkCreate(notifications);
    }

    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const listRequests = async (req, res) => {
  try {
    const { status, branch_id, from, to } = req.query;
    const { Op } = require('sequelize');

    let where = {};

    // Role-based branch filter
    if (req.user.role === 'branch_admin' || req.user.role === 'employee') {
      where.branch_id = req.user.branch_id;
    } else if (branch_id) {
      where.branch_id = branch_id;
    }

    // Status filter
    if (status && ['Pending', 'Approved', 'Rejected'].includes(status)) {
      where.status = status;
    }

    // Date range filter
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt[Op.gte] = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt[Op.lte] = toDate;
      }
    }

    const requests = await RestockRequest.findAll({
      where,
      include: [
        { model: Product, attributes: ['name', 'sku'] },
        { model: Branch, attributes: ['name'] },
        { model: User, as: 'Manager', attributes: ['username'] },
        { model: User, as: 'Admin', attributes: ['username'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(requests);
  } catch (error) {
    console.error('ERROR in listRequests:', error);
    res.status(500).json({ error: error.message });
  }
};

const approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await RestockRequest.findByPk(id, {
      include: [Product, Branch]
    });

    if (!request) return res.status(404).json({ message: 'Request not found.' });
    if (request.status !== 'Pending') return res.status(400).json({ message: 'Request already processed.' });

    // Security check for branch admins (Managers)
    if (req.user.role === 'branch_admin' && request.branch_id !== req.user.branch_id) {
      return res.status(403).json({ message: 'Forbidden: You can only approve restock requests for your assigned branch.' });
    }

    // Update inventory
    const inventory = await Inventory.findOne({ 
      where: { product_id: request.product_id, branch_id: request.branch_id } 
    });

    if (!inventory) return res.status(404).json({ message: 'Inventory record not found.' });

    const previous_stock = inventory.quantity;
    const new_stock = previous_stock + parseInt(request.quantity);
    inventory.quantity = new_stock;
    await inventory.save();

    // Log movement
    await StockMovement.create({
      product_id: request.product_id,
      type: 'RESTOCK',
      quantity: parseInt(request.quantity),
      previous_stock,
      new_stock,
      user_id: req.user.id,
      note: `Approved restock request #${request.id}`
    });

    // Update request
    request.status = 'Approved';
    request.admin_id = req.user.id;
    request.processed_at = new Date();
    await request.save();

    // Notify Manager
    await Notification.create({
      userId: request.manager_id,
      branchId: request.branch_id,
      title: 'Restock Request Approved',
      message: `Your restock request for ${request.Product.name} has been approved.`,
      type: 'success',
      link: '/inventory'
    });

    // Remove the original request notification
    await Notification.destroy({ where: { link: `/admin?tab=restock&id=${request.id}` } });

    if (req.app.get('io')) {
      req.app.get('io').emit('dashboard_update', { type: 'RESTOCK_APPROVED' });
    }

    res.json({ message: 'Restock request approved and inventory updated', request });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const request = await RestockRequest.findByPk(id, {
      include: [Product, Branch]
    });

    if (!request) return res.status(404).json({ message: 'Request not found.' });
    if (request.status !== 'Pending') return res.status(400).json({ message: 'Request already processed.' });

    // Security check for branch admins (Managers)
    if (req.user.role === 'branch_admin' && request.branch_id !== req.user.branch_id) {
      return res.status(403).json({ message: 'Forbidden: You can only reject restock requests for your assigned branch.' });
    }

    request.status = 'Rejected';
    request.admin_id = req.user.id;
    request.rejection_reason = reason;
    request.processed_at = new Date();
    await request.save();

    // Notify Manager
    await Notification.create({
      userId: request.manager_id,
      branchId: request.branch_id,
      title: 'Restock Request Rejected',
      message: `Your request for ${request.Product.name} was rejected. Reason: ${reason || 'No reason provided.'}`,
      type: 'error',
      link: '/inventory'
    });

    // Remove the original request notification
    await Notification.destroy({ where: { link: `/admin?tab=restock&id=${request.id}` } });

    res.json({ message: 'Request rejected.', request });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createRequest,
  listRequests,
  approveRequest,
  rejectRequest
};

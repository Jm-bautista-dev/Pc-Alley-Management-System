const { ProductRequest, Product, Inventory, User, Branch, Notification, StockMovement } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../db');

// helper to generate request number: PR-YYYYMMDD-XXXX
async function generateRequestNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  const count = await ProductRequest.count({
    where: {
      createdAt: {
        [Op.gte]: new Date().setHours(0,0,0,0)
      }
    }
  });
  const seq = String(count + 1).padStart(4, '0');
  return `PR-${datePart}-${seq}`;
}

const createRequest = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { items, notes, priority } = req.body;
    const branch_id = req.user.branch_id;

    if (!branch_id) {
      await transaction.rollback();
      return res.status(400).json({ message: 'User must be assigned to a branch to make product requests.' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Items list is required and cannot be empty.' });
    }

    const requestNumber = await generateRequestNumber();
    const createdRequests = [];

    for (const item of items) {
      const { product_id, quantity_requested } = item;

      if (!quantity_requested || parseInt(quantity_requested) < 1) {
        await transaction.rollback();
        return res.status(400).json({ message: 'Quantity requested must be at least 1.' });
      }

      const product = await Product.findByPk(product_id);
      if (!product) {
        await transaction.rollback();
        return res.status(404).json({ message: `Product not found for ID: ${product_id}.` });
      }

      // Validate quantity limits
      const minLimit = product.min_request_quantity || 1;
      if (parseInt(quantity_requested) < minLimit) {
        await transaction.rollback();
        return res.status(400).json({ message: `Quantity for ${product.name} must be at least ${minLimit}.` });
      }

      if (product.max_request_quantity !== null && parseInt(quantity_requested) > product.max_request_quantity) {
        await transaction.rollback();
        return res.status(400).json({ message: `Quantity for ${product.name} cannot exceed max request limit of ${product.max_request_quantity}.` });
      }

      // Check duplicate pending request
      const existingPending = await ProductRequest.findOne({
        where: {
          branch_id,
          product_id,
          status: 'Pending'
        }
      });

      if (existingPending) {
        await transaction.rollback();
        return res.status(400).json({ message: `You already have a pending request for product: ${product.name}.` });
      }

      const reqRecord = await ProductRequest.create({
        request_number: requestNumber,
        branch_id,
        product_id,
        requested_by: req.user.id,
        quantity_requested: parseInt(quantity_requested),
        notes,
        priority: priority || 'normal',
        status: 'Pending'
      }, { transaction });

      createdRequests.push(reqRecord);
    }

    await transaction.commit();

    // Send in-app notification to all Super Admins
    const branch = await Branch.findByPk(branch_id);
    const admins = await User.findAll({ where: { role: 'super_admin' } });
    if (admins.length > 0 && branch) {
      const notifications = admins.map(admin => ({
        userId: admin.id,
        title: 'New Product Request',
        message: `Branch ${branch.name} submitted a request for ${items.length} product(s) (Ref: ${requestNumber}).`,
        type: 'product_request',
        link: `/admin/requests`
      }));
      await Notification.bulkCreate(notifications);
    }

    res.status(201).json({ message: 'Product request submitted successfully.', request_number: requestNumber, requests: createdRequests });
  } catch (error) {
    console.error('[createRequest Error]', error);
    if (transaction && !transaction.finished) await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
};

const listRequests = async (req, res) => {
  try {
    const { status, branch_id, from, to } = req.query;
    let where = {};

    if (req.user.role === 'branch_admin' || req.user.role === 'employee') {
      where.branch_id = req.user.branch_id;
    } else if (branch_id) {
      where.branch_id = branch_id;
    }

    if (status) {
      where.status = status;
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt[Op.gte] = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt[Op.lte] = toDate;
      }
    }

    const requests = await ProductRequest.findAll({
      where,
      include: [
        { model: Product, attributes: ['id', 'name', 'sku', 'price', 'available_quantity', 'reserved_quantity', 'min_request_quantity', 'max_request_quantity'] },
        { model: Branch, attributes: ['id', 'name'] },
        { model: User, as: 'Requester', attributes: ['id', 'username'] },
        { model: User, as: 'Approver', attributes: ['id', 'username'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await ProductRequest.findByPk(id, {
      include: [
        { model: Product },
        { model: Branch },
        { model: User, as: 'Requester', attributes: ['id', 'username'] },
        { model: User, as: 'Approver', attributes: ['id', 'username'] }
      ]
    });

    if (!request) {
      return res.status(404).json({ message: 'Product request not found.' });
    }

    // Role check
    if (req.user.role !== 'super_admin' && request.branch_id !== req.user.branch_id) {
      return res.status(403).json({ message: 'Forbidden: You cannot access this request.' });
    }

    res.json(request);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const approveRequest = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { quantity_approved } = req.body;

    const request = await ProductRequest.findByPk(id, {
      include: [Product, Branch],
      transaction
    });

    if (!request) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Request not found.' });
    }

    if (request.status !== 'Pending') {
      await transaction.rollback();
      return res.status(400).json({ message: `Request is already in status: ${request.status}.` });
    }

    const approvedQty = parseInt(quantity_approved);
    if (!approvedQty || approvedQty < 1 || approvedQty > request.quantity_requested) {
      await transaction.rollback();
      return res.status(400).json({ message: `Approved quantity must be between 1 and the requested quantity (${request.quantity_requested}).` });
    }

    const product = request.Product;
    if (product.available_quantity < approvedQty) {
      await transaction.rollback();
      return res.status(400).json({ message: `Limited warehouse stock. Only ${product.available_quantity} available.` });
    }

    // Reserve stock: decrease available, increase reserved
    product.available_quantity -= approvedQty;
    product.reserved_quantity += approvedQty;
    await product.save({ transaction });

    // Update request
    const isPartial = approvedQty < request.quantity_requested;
    request.quantity_approved = approvedQty;
    request.status = isPartial ? 'Partially Approved' : 'Approved';
    request.approved_by = req.user.id;
    request.approved_at = new Date();
    await request.save({ transaction });

    await transaction.commit();

    // Notify Branch Admin
    await Notification.create({
      userId: request.requested_by,
      title: isPartial ? 'Request Partially Approved' : 'Request Approved',
      message: `Your request ${request.request_number} for ${product.name} was approved for ${approvedQty} units.`,
      type: 'success',
      link: '/requests'
    });

    res.json({ message: 'Request approved and stock reserved.', request });
  } catch (error) {
    console.error('[approveRequest Error]', error);
    if (transaction && !transaction.finished) await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
};

const rejectRequest = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim() === '') {
      await transaction.rollback();
      return res.status(400).json({ message: 'Rejection reason is required.' });
    }

    const request = await ProductRequest.findByPk(id, {
      include: [Product],
      transaction
    });

    if (!request) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Request not found.' });
    }

    // A request can be rejected from Pending, Approved, Partially Approved, or Scheduled (which releases stock reservations)
    if (['Completed', 'Rejected', 'Cancelled'].includes(request.status)) {
      await transaction.rollback();
      return res.status(400).json({ message: `Cannot reject request with status: ${request.status}.` });
    }

    // Release stock reservation if previously approved
    if (['Approved', 'Partially Approved', 'Scheduled'].includes(request.status) && request.quantity_approved) {
      const product = request.Product;
      product.available_quantity += request.quantity_approved;
      product.reserved_quantity = Math.max(0, product.reserved_quantity - request.quantity_approved);
      await product.save({ transaction });
    }

    request.status = 'Rejected';
    request.rejection_reason = reason;
    request.processed_at = new Date();
    await request.save({ transaction });

    await transaction.commit();

    // Notify Branch Admin
    await Notification.create({
      userId: request.requested_by,
      title: 'Request Rejected',
      message: `Your request ${request.request_number} for ${request.Product.name} was rejected. Reason: ${reason}`,
      type: 'error',
      link: '/requests'
    });

    res.json({ message: 'Request rejected.', request });
  } catch (error) {
    console.error('[rejectRequest Error]', error);
    if (transaction && !transaction.finished) await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
};

const scheduleRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduled_date, scheduled_time } = req.body;

    if (!scheduled_date || !scheduled_time) {
      return res.status(400).json({ message: 'Scheduled date and time are required.' });
    }

    const request = await ProductRequest.findByPk(id, {
      include: [Product]
    });

    if (!request) {
      return res.status(404).json({ message: 'Request not found.' });
    }

    // Can only schedule approved requests
    if (!['Approved', 'Partially Approved'].includes(request.status)) {
      return res.status(400).json({ message: `Only approved or partially approved requests can be scheduled. Current status: ${request.status}` });
    }

    request.scheduled_date = scheduled_date;
    request.scheduled_time = scheduled_time;
    request.status = 'Scheduled';
    await request.save();

    // Notify Branch Admin
    await Notification.create({
      userId: request.requested_by,
      title: 'Request Scheduled',
      message: `Your request ${request.request_number} for ${request.Product.name} is scheduled for delivery on ${scheduled_date} at ${scheduled_time}.`,
      type: 'info',
      link: '/requests'
    });

    res.json({ message: 'Delivery scheduled successfully.', request });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const completeRequest = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;

    const request = await ProductRequest.findByPk(id, {
      include: [Product, Branch],
      transaction
    });

    if (!request) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Request not found.' });
    }

    if (request.status !== 'Scheduled') {
      await transaction.rollback();
      return res.status(400).json({ message: `Only scheduled requests can be completed. Current status: ${request.status}` });
    }

    const product = request.Product;
    const approvedQty = request.quantity_approved;

    // Deduct stock from warehouse reservation
    product.reserved_quantity = Math.max(0, product.reserved_quantity - approvedQty);
    await product.save({ transaction });

    // Add stock to branch inventory
    const [branchInventory, created] = await Inventory.findOrCreate({
      where: { product_id: request.product_id, branch_id: request.branch_id },
      defaults: { quantity: 0 },
      transaction
    });

    const previous_stock = branchInventory.quantity;
    const new_stock = previous_stock + approvedQty;
    branchInventory.quantity = new_stock;
    await branchInventory.save({ transaction });

    // Log Stock Movement
    await StockMovement.create({
      product_id: request.product_id,
      type: 'TRANSFER',
      quantity: approvedQty,
      previous_stock,
      new_stock,
      user_id: req.user.id,
      note: `Completed Product Request transfer ${request.request_number}`
    }, { transaction });

    // Update request status
    request.status = 'Completed';
    request.processed_at = new Date();
    await request.save({ transaction });

    await transaction.commit();

    // Notify Branch Admin
    await Notification.create({
      userId: request.requested_by,
      title: 'Request Completed',
      message: `Your request ${request.request_number} for ${product.name} has been completed and delivered to your branch.`,
      type: 'success',
      link: '/inventory'
    });

    res.json({ message: 'Transfer completed and inventory updated.', request });
  } catch (error) {
    console.error('[completeRequest Error]', error);
    if (transaction && !transaction.finished) await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
};

const cancelRequest = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const request = await ProductRequest.findByPk(id, { transaction });

    if (!request) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Request not found.' });
    }

    // Branch Admin can only cancel pending requests
    if (request.status !== 'Pending') {
      await transaction.rollback();
      return res.status(400).json({ message: `Cannot cancel request with status: ${request.status}` });
    }

    if (request.branch_id !== req.user.branch_id) {
      await transaction.rollback();
      return res.status(403).json({ message: 'Forbidden: You can only cancel requests for your own branch.' });
    }

    request.status = 'Cancelled';
    request.processed_at = new Date();
    await request.save({ transaction });

    await transaction.commit();

    res.json({ message: 'Product request cancelled successfully.', request });
  } catch (error) {
    console.error('[cancelRequest Error]', error);
    if (transaction && !transaction.finished) await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createRequest,
  listRequests,
  getRequest,
  approveRequest,
  rejectRequest,
  scheduleRequest,
  completeRequest,
  cancelRequest
};

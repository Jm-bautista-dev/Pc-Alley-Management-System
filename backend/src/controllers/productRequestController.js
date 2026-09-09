const { ProductRequest, Product, BranchProduct, Inventory, User, Branch, Notification, StockMovement, AuditLog } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../db');

// Helper to generate professional request number: SR-YYYYMMDD-XXXX
async function generateRequestNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  const count = await ProductRequest.count({
    where: {
      createdAt: {
        [Op.gte]: new Date().setHours(0, 0, 0, 0)
      }
    }
  });
  const seq = String(count + 1).padStart(4, '0');
  return `SR-${datePart}-${seq}`;
}

/**
 * Normalizes status strings (handles uppercase and legacy title case)
 */
function normalizeStatus(status) {
  if (!status) return null;
  const s = status.trim().toUpperCase();
  if (s === 'PENDING') return ['PENDING', 'Pending'];
  if (s === 'APPROVED') return ['APPROVED', 'Approved'];
  if (s === 'PARTIALLY_APPROVED' || s === 'PARTIALLY APPROVED') return ['PARTIALLY_APPROVED', 'Partially Approved'];
  if (s === 'PROCESSING') return ['PROCESSING', 'Scheduled', 'In Transit'];
  if (s === 'FULFILLED') return ['FULFILLED', 'Completed'];
  if (s === 'REJECTED') return ['REJECTED', 'Rejected'];
  if (s === 'CANCELLED') return ['CANCELLED', 'Cancelled'];
  return [status];
}

/**
 * 1. Create Stock Request
 * Authorized for: super_admin, branch_admin, employee
 */
const createRequest = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { items, notes, priority, source_branch_id } = req.body;
    let branch_id = req.user.branch_id;

    // Super Admin can specify destination branch or fallback to user's branch
    if (req.user.role === 'super_admin') {
      branch_id = req.body.branch_id || req.user.branch_id || 1;
    }

    if (!branch_id) {
      await transaction.rollback();
      return res.status(400).json({ message: 'User must be assigned to a branch to make stock requests.' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Items list is required and cannot be empty.' });
    }

    const destBranch = await Branch.findByPk(branch_id);
    if (!destBranch) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Destination branch not found.' });
    }

    let sourceBranch = null;
    if (source_branch_id) {
      sourceBranch = await Branch.findByPk(source_branch_id);
      if (!sourceBranch) {
        await transaction.rollback();
        return res.status(404).json({ message: 'Source branch not found.' });
      }
      if (parseInt(source_branch_id) === parseInt(branch_id)) {
        await transaction.rollback();
        return res.status(400).json({ message: 'Source branch and destination branch cannot be the same.' });
      }
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
        return res.status(400).json({
          message: `Quantity for ${product.name} cannot exceed max request limit of ${product.max_request_quantity}.`
        });
      }

      // Check duplicate pending request
      const existingPending = await ProductRequest.findOne({
        where: {
          branch_id,
          product_id,
          status: { [Op.in]: ['PENDING', 'Pending'] }
        }
      });

      if (existingPending) {
        await transaction.rollback();
        return res.status(400).json({ message: `You already have an active pending request for product: ${product.name}.` });
      }

      // Strict security: do not trust client input for approval/status fields
      const reqRecord = await ProductRequest.create({
        request_number: requestNumber,
        branch_id,
        source_branch_id: source_branch_id || null,
        product_id,
        requested_by: req.user.id,
        quantity_requested: parseInt(quantity_requested),
        notes: notes ? String(notes).trim().slice(0, 500) : null,
        priority: priority && ['low', 'normal', 'urgent'].includes(priority) ? priority : 'normal',
        status: 'PENDING',
        requested_at: new Date()
      }, { transaction });

      // Audit Log for creation
      await AuditLog.create({
        action: 'CREATE_STOCK_REQUEST',
        user_id: req.user.id,
        details: `Stock request ${requestNumber} created for product '${product.name}' (SKU: ${product.sku}, Qty: ${quantity_requested}) by ${req.user.username} [${req.user.role}] for branch '${destBranch.name}'.`,
        ip_address: req.ip || req.connection?.remoteAddress || null
      }, { transaction });

      createdRequests.push(reqRecord);
    }

    await transaction.commit();

    // In-app Notification to all Super Admins
    try {
      const superAdmins = await User.findAll({ where: { role: 'super_admin' } });
      if (superAdmins.length > 0) {
        const notifications = superAdmins.map(admin => ({
          userId: admin.id,
          title: 'New Stock Request Pending Review',
          message: `Branch '${destBranch.name}' submitted stock request ${requestNumber} for ${items.length} item(s).`,
          type: 'stock_request',
          link: '/admin/product-requests'
        }));
        await Notification.bulkCreate(notifications);
      }
    } catch (notifErr) {
      console.warn('[Notification Warning]', notifErr.message);
    }

    return res.status(201).json({
      message: 'Stock request submitted successfully. Pending Super Admin review.',
      request_number: requestNumber,
      requests: createdRequests
    });
  } catch (error) {
    console.error('[createRequest Error]', error);
    if (transaction && !transaction.finished) await transaction.rollback();
    return res.status(500).json({ error: error.message });
  }
};

/**
 * 2. List Stock Requests
 * Roles:
 * - super_admin: views all requests, can filter by branch, requester, status, dates, priority, search
 * - branch_admin: views requests for their branch
 * - employee: views their own requests or branch requests
 */
const listRequests = async (req, res) => {
  try {
    const { status, branch_id, source_branch_id, from, to, priority, requester_id, search } = req.query;
    const where = {};

    // Role-based scope
    if (req.user.role === 'branch_admin') {
      where.branch_id = req.user.branch_id;
    } else if (req.user.role === 'employee') {
      // Employee views their own or their branch requests
      if (req.query.my_only === 'true') {
        where.requested_by = req.user.id;
      } else {
        where.branch_id = req.user.branch_id;
      }
    } else if (branch_id) {
      where.branch_id = branch_id;
    }

    if (requester_id) {
      where.requested_by = requester_id;
    }

    if (source_branch_id) {
      where.source_branch_id = source_branch_id;
    }

    if (priority) {
      where.priority = priority;
    }

    // Status filter
    if (status) {
      const normalized = normalizeStatus(status);
      where.status = { [Op.in]: normalized };
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

    // Free text search
    let productWhere = {};
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where[Op.or] = [
        { request_number: { [Op.like]: q } },
        { notes: { [Op.like]: q } },
        { '$Product.name$': { [Op.like]: q } },
        { '$Product.sku$': { [Op.like]: q } },
        { '$Branch.name$': { [Op.like]: q } },
        { '$Requester.username$': { [Op.like]: q } }
      ];
    }

    const requests = await ProductRequest.findAll({
      where,
      include: [
        {
          model: Product,
          attributes: ['id', 'name', 'sku', 'price', 'available_quantity', 'reserved_quantity', 'min_request_quantity', 'max_request_quantity', 'product_image']
        },
        { model: Branch, as: 'Branch', attributes: ['id', 'name', 'location'] },
        { model: Branch, as: 'DestinationBranch', attributes: ['id', 'name', 'location'] },
        { model: Branch, as: 'SourceBranch', attributes: ['id', 'name', 'location'] },
        { model: User, as: 'Requester', attributes: ['id', 'username', 'first_name', 'last_name', 'role'] },
        { model: User, as: 'Approver', attributes: ['id', 'username', 'first_name', 'last_name', 'role'] },
        { model: User, as: 'Fulfiller', attributes: ['id', 'username', 'first_name', 'last_name', 'role'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    return res.json(requests);
  } catch (error) {
    console.error('[listRequests Error]', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * 3. Get Single Stock Request Details
 */
const getRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await ProductRequest.findByPk(id, {
      include: [
        { model: Product },
        { model: Branch, as: 'Branch' },
        { model: Branch, as: 'DestinationBranch' },
        { model: Branch, as: 'SourceBranch' },
        { model: User, as: 'Requester', attributes: ['id', 'username', 'first_name', 'last_name', 'role'] },
        { model: User, as: 'Approver', attributes: ['id', 'username', 'first_name', 'last_name', 'role'] },
        { model: User, as: 'Fulfiller', attributes: ['id', 'username', 'first_name', 'last_name', 'role'] }
      ]
    });

    if (!request) {
      return res.status(404).json({ message: 'Stock request not found.' });
    }

    // Role-based authorization
    if (req.user.role !== 'super_admin') {
      if (request.branch_id !== req.user.branch_id && request.requested_by !== req.user.id) {
        return res.status(403).json({ message: 'Forbidden: You cannot access this stock request.' });
      }
    }

    // Also fetch audit logs for this request
    const auditLogs = await AuditLog.findAll({
      where: {
        details: { [Op.like]: `%${request.request_number}%` }
      },
      include: [{ model: User, attributes: ['id', 'username', 'first_name', 'last_name', 'role'] }],
      order: [['createdAt', 'ASC']]
    });

    return res.json({
      request,
      audit_trail: auditLogs
    });
  } catch (error) {
    console.error('[getRequest Error]', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * 4. Approve Stock Request
 * ONLY Super Admin can approve.
 * Requesters can NEVER approve their own or other requests.
 * Supports partial quantity approval and approval notes.
 */
const approveRequest = async (req, res) => {
  // Defensive server-side role check
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Forbidden: ONLY Super Admin can approve stock requests.' });
  }

  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { quantity_approved, approval_notes } = req.body;

    const request = await ProductRequest.findByPk(id, {
      include: [
        { model: Product },
        { model: Branch, as: 'Branch' },
        { model: Branch, as: 'SourceBranch' },
        { model: User, as: 'Requester' }
      ],
      transaction
    });

    if (!request) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Stock request not found.' });
    }

    const currentStatus = (request.status || '').toUpperCase();
    if (currentStatus !== 'PENDING') {
      await transaction.rollback();
      return res.status(400).json({ message: `Cannot approve request with current status: '${request.status}'. Only PENDING requests can be approved.` });
    }

    const approvedQty = parseInt(quantity_approved, 10);
    if (!approvedQty || approvedQty < 1 || approvedQty > request.quantity_requested) {
      await transaction.rollback();
      return res.status(400).json({
        message: `Approved quantity must be between 1 and the requested quantity (${request.quantity_requested}).`
      });
    }

    const product = request.Product;
    if (!product) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Requested product record not found.' });
    }

    // Check inventory availability
    if (request.source_branch_id) {
      // Branch-to-branch request: check source branch inventory
      const sourceInv = await BranchProduct.findOne({
        where: { product_id: product.id, branch_id: request.source_branch_id },
        transaction
      });
      const sourceStock = sourceInv ? sourceInv.stock : 0;
      if (sourceStock < approvedQty) {
        await transaction.rollback();
        return res.status(400).json({
          message: `Insufficient stock at source branch '${request.SourceBranch?.name || request.source_branch_id}'. Only ${sourceStock} available.`
        });
      }
    } else {
      // Central Warehouse / HQ: check Product.available_quantity
      if (product.available_quantity < approvedQty) {
        await transaction.rollback();
        return res.status(400).json({
          message: `Insufficient central warehouse stock. Only ${product.available_quantity} available.`
        });
      }

      // Reserve warehouse stock
      product.available_quantity -= approvedQty;
      product.reserved_quantity += approvedQty;
      await product.save({ transaction });
    }

    // Update request record
    const isPartial = approvedQty < request.quantity_requested;
    const newStatus = isPartial ? 'PARTIALLY_APPROVED' : 'APPROVED';

    request.quantity_approved = approvedQty;
    request.status = newStatus;
    request.approved_by = req.user.id;
    request.approved_at = new Date();
    request.approval_notes = approval_notes ? String(approval_notes).trim() : null;
    await request.save({ transaction });

    // Create Audit Log
    await AuditLog.create({
      action: 'APPROVE_STOCK_REQUEST',
      user_id: req.user.id,
      details: `Stock request ${request.request_number} ${newStatus} by Super Admin ${req.user.username}. Authorized ${approvedQty} of ${request.quantity_requested} unit(s). Notes: ${request.approval_notes || 'None'}.`,
      ip_address: req.ip || req.connection?.remoteAddress || null
    }, { transaction });

    await transaction.commit();

    // In-app Notification to requester
    try {
      await Notification.create({
        userId: request.requested_by,
        title: isPartial ? 'Stock Request Partially Approved' : 'Stock Request Approved',
        message: `Your stock request ${request.request_number} for '${product.name}' was approved for ${approvedQty} unit(s) by HQ Super Admin.`,
        type: 'success',
        link: '/products/my-requests'
      });
    } catch (notifErr) {
      console.warn('[Notification Warning]', notifErr.message);
    }

    return res.json({
      message: `Stock request ${request.request_number} approved successfully. Stock reserved for fulfillment.`,
      request
    });
  } catch (error) {
    console.error('[approveRequest Error]', error);
    if (transaction && !transaction.finished) await transaction.rollback();
    return res.status(500).json({ error: error.message });
  }
};

/**
 * 5. Reject Stock Request
 * ONLY Super Admin can reject.
 * Rejection reason is strictly mandatory.
 * Releases any reserved inventory.
 */
const rejectRequest = async (req, res) => {
  // Defensive server-side role check
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Forbidden: ONLY Super Admin can reject stock requests.' });
  }

  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || String(reason).trim() === '') {
      await transaction.rollback();
      return res.status(400).json({ message: 'Rejection reason is strictly required.' });
    }

    const request = await ProductRequest.findByPk(id, {
      include: [
        { model: Product },
        { model: Branch, as: 'Branch' },
        { model: User, as: 'Requester' }
      ],
      transaction
    });

    if (!request) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Stock request not found.' });
    }

    const currentStatus = (request.status || '').toUpperCase();
    if (['FULFILLED', 'COMPLETED', 'REJECTED', 'CANCELLED'].includes(currentStatus)) {
      await transaction.rollback();
      return res.status(400).json({ message: `Cannot reject a request that is already ${request.status}.` });
    }

    // Release stock reservation if previously approved at HQ
    if (['APPROVED', 'PARTIALLY_APPROVED', 'PROCESSING', 'SCHEDULED'].includes(currentStatus) && !request.source_branch_id && request.quantity_approved) {
      const product = request.Product;
      if (product) {
        product.available_quantity += request.quantity_approved;
        product.reserved_quantity = Math.max(0, product.reserved_quantity - request.quantity_approved);
        await product.save({ transaction });
      }
    }

    request.status = 'REJECTED';
    request.rejection_reason = String(reason).trim();
    request.processed_at = new Date();
    await request.save({ transaction });

    // Create Audit Log
    await AuditLog.create({
      action: 'REJECT_STOCK_REQUEST',
      user_id: req.user.id,
      details: `Stock request ${request.request_number} REJECTED by Super Admin ${req.user.username}. Reason: ${request.rejection_reason}. Previous status was ${currentStatus}.`,
      ip_address: req.ip || req.connection?.remoteAddress || null
    }, { transaction });

    await transaction.commit();

    // In-app Notification to requester
    try {
      await Notification.create({
        userId: request.requested_by,
        title: 'Stock Request Rejected',
        message: `Your stock request ${request.request_number} for '${request.Product?.name}' was rejected by HQ Super Admin. Reason: ${request.rejection_reason}`,
        type: 'error',
        link: '/products/my-requests'
      });
    } catch (notifErr) {
      console.warn('[Notification Warning]', notifErr.message);
    }

    return res.json({
      message: `Stock request ${request.request_number} has been rejected.`,
      request
    });
  } catch (error) {
    console.error('[rejectRequest Error]', error);
    if (transaction && !transaction.finished) await transaction.rollback();
    return res.status(500).json({ error: error.message });
  }
};

/**
 * 6. Transition to Processing
 * Marks approved request as actively being prepared / packed / dispatched.
 */
const processRequest = async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Forbidden: ONLY Super Admin can transition requests to processing.' });
  }

  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const request = await ProductRequest.findByPk(id, {
      include: [{ model: Product }, { model: Branch, as: 'Branch' }],
      transaction
    });

    if (!request) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Stock request not found.' });
    }

    const currentStatus = (request.status || '').toUpperCase();
    if (!['APPROVED', 'PARTIALLY_APPROVED', 'SCHEDULED'].includes(currentStatus)) {
      await transaction.rollback();
      return res.status(400).json({ message: `Only approved requests can be set to PROCESSING. Current status: ${request.status}` });
    }

    request.status = 'PROCESSING';
    await request.save({ transaction });

    await AuditLog.create({
      action: 'PROCESS_STOCK_REQUEST',
      user_id: req.user.id,
      details: `Stock request ${request.request_number} set to PROCESSING by Super Admin ${req.user.username}.`,
      ip_address: req.ip || req.connection?.remoteAddress || null
    }, { transaction });

    await transaction.commit();

    try {
      await Notification.create({
        userId: request.requested_by,
        title: 'Stock Request Processing',
        message: `Stock request ${request.request_number} for '${request.Product?.name}' is now being prepared and packed for transit.`,
        type: 'info',
        link: '/products/my-requests'
      });
    } catch (notifErr) {}

    return res.json({ message: 'Request status updated to PROCESSING.', request });
  } catch (error) {
    console.error('[processRequest Error]', error);
    if (transaction && !transaction.finished) await transaction.rollback();
    return res.status(500).json({ error: error.message });
  }
};

/**
 * 7. Schedule Request Delivery
 */
const scheduleRequest = async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Forbidden: ONLY Super Admin can schedule deliveries.' });
  }

  try {
    const { id } = req.params;
    const { scheduled_date, scheduled_time } = req.body;

    if (!scheduled_date || !scheduled_time) {
      return res.status(400).json({ message: 'Scheduled delivery date and time slot are required.' });
    }

    const request = await ProductRequest.findByPk(id, {
      include: [{ model: Product }, { model: Branch, as: 'Branch' }]
    });

    if (!request) {
      return res.status(404).json({ message: 'Stock request not found.' });
    }

    const currentStatus = (request.status || '').toUpperCase();
    if (!['APPROVED', 'PARTIALLY_APPROVED', 'PROCESSING', 'SCHEDULED'].includes(currentStatus)) {
      return res.status(400).json({ message: `Only approved requests can be scheduled. Current status: ${request.status}` });
    }

    request.scheduled_date = scheduled_date;
    request.scheduled_time = scheduled_time;
    request.status = 'PROCESSING'; // keep standard or schedule
    await request.save();

    await AuditLog.create({
      action: 'SCHEDULE_STOCK_REQUEST',
      user_id: req.user.id,
      details: `Stock request ${request.request_number} scheduled for dispatch on ${scheduled_date} at ${scheduled_time} by Super Admin ${req.user.username}.`,
      ip_address: req.ip || req.connection?.remoteAddress || null
    });

    try {
      await Notification.create({
        userId: request.requested_by,
        title: 'Stock Delivery Scheduled',
        message: `Your stock request ${request.request_number} is scheduled for dispatch on ${scheduled_date} at ${scheduled_time}.`,
        type: 'info',
        link: '/products/my-requests'
      });
    } catch (e) {}

    return res.json({ message: 'Stock delivery scheduled successfully.', request });
  } catch (error) {
    console.error('[scheduleRequest Error]', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * 8. Fulfill Stock Request
 * ONLY Super Admin can fulfill.
 * ATOMIC DATABASE TRANSACTION:
 * - Prevents duplicate fulfillment
 * - Validates source inventory
 * - Deducts from source (warehouse or branch)
 * - Increments destination branch inventory
 * - Records StockMovement for both source and destination
 * - Marks request as FULFILLED
 * - Records AuditLog and notifies requester
 */
const fulfillRequest = async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Forbidden: ONLY Super Admin can fulfill stock requests.' });
  }

  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;

    const request = await ProductRequest.findByPk(id, {
      include: [
        { model: Product },
        { model: Branch, as: 'Branch' },
        { model: Branch, as: 'DestinationBranch' },
        { model: Branch, as: 'SourceBranch' }
      ],
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!request) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Stock request not found.' });
    }

    const currentStatus = (request.status || '').toUpperCase();

    // 1. Check duplicate fulfillment
    if (['FULFILLED', 'COMPLETED'].includes(currentStatus)) {
      await transaction.rollback();
      return res.status(400).json({ message: `Security violation: Stock request ${request.request_number} has ALREADY been fulfilled. Duplicate fulfillment is strictly blocked.` });
    }

    // 2. Validate current status allows fulfillment
    if (!['APPROVED', 'PARTIALLY_APPROVED', 'PROCESSING', 'SCHEDULED'].includes(currentStatus)) {
      await transaction.rollback();
      return res.status(400).json({
        message: `Only approved or processing stock requests can be fulfilled. Current status is: ${request.status}`
      });
    }

    const product = request.Product;
    if (!product) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Product record associated with request was not found.' });
    }

    const fulfillQty = request.quantity_approved || request.quantity_requested;
    if (fulfillQty <= 0) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Invalid approved quantity for fulfillment.' });
    }

    const destBranch = request.DestinationBranch || request.Branch;
    let sourceName = 'HQ Central Warehouse';

    // 3. Deduct from source branch or HQ Central Warehouse
    if (request.source_branch_id) {
      sourceName = request.SourceBranch?.name || `Branch #${request.source_branch_id}`;
      const sourceInv = await BranchProduct.findOne({
        where: { product_id: product.id, branch_id: request.source_branch_id },
        lock: transaction.LOCK.UPDATE,
        transaction
      });

      if (!sourceInv || sourceInv.stock < fulfillQty) {
        await transaction.rollback();
        return res.status(400).json({
          message: `Insufficient stock at source branch '${sourceName}'. Available: ${sourceInv ? sourceInv.stock : 0}, Required: ${fulfillQty}.`
        });
      }

      const prevSourceStock = sourceInv.stock;
      sourceInv.stock -= fulfillQty;
      await sourceInv.save({ transaction });

      // Log source StockMovement
      await StockMovement.create({
        product_id: product.id,
        type: 'TRANSFER',
        quantity: -fulfillQty,
        previous_stock: prevSourceStock,
        new_stock: sourceInv.stock,
        user_id: req.user.id,
        note: `Stock Requisition Out (${request.request_number}) to Branch: ${destBranch.name}`
      }, { transaction });

    } else {
      // HQ Warehouse: deduct from reserved quantity
      const prevReserved = product.reserved_quantity;
      product.reserved_quantity = Math.max(0, product.reserved_quantity - fulfillQty);
      await product.save({ transaction });

      // Log StockMovement for warehouse dispatch
      await StockMovement.create({
        product_id: product.id,
        type: 'TRANSFER',
        quantity: -fulfillQty,
        previous_stock: prevReserved,
        new_stock: product.reserved_quantity,
        user_id: req.user.id,
        note: `Warehouse Requisition Dispatch (${request.request_number}) to Branch: ${destBranch.name}`
      }, { transaction });
    }

    // 4. Add stock to destination branch inventory
    const [destInv, created] = await BranchProduct.findOrCreate({
      where: { product_id: product.id, branch_id: request.branch_id },
      defaults: {
        stock: 0,
        enabled: true,
        low_stock_threshold: 5
      },
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    const prevDestStock = destInv.stock;
    destInv.stock = prevDestStock + fulfillQty;
    await destInv.save({ transaction });

    // Log destination StockMovement
    await StockMovement.create({
      product_id: product.id,
      type: 'RESTOCK',
      quantity: fulfillQty,
      previous_stock: prevDestStock,
      new_stock: destInv.stock,
      user_id: req.user.id,
      note: `Stock Requisition Fulfilled (${request.request_number}) from ${sourceName}`
    }, { transaction });

    // 5. Update Request Record
    request.status = 'FULFILLED';
    request.fulfilled_by = req.user.id;
    request.fulfilled_at = new Date();
    request.quantity_fulfilled = fulfillQty;
    request.processed_at = new Date();
    await request.save({ transaction });

    // 6. Record Audit Log
    await AuditLog.create({
      action: 'FULFILL_STOCK_REQUEST',
      user_id: req.user.id,
      details: `Stock request ${request.request_number} FULFILLED by Super Admin ${req.user.username}. Transferred ${fulfillQty} units of '${product.name}' from ${sourceName} to Branch '${destBranch.name}'. New branch stock: ${destInv.stock}.`,
      ip_address: req.ip || req.connection?.remoteAddress || null
    }, { transaction });

    await transaction.commit();

    // 7. Send In-app Notification to Requester
    try {
      await Notification.create({
        userId: request.requested_by,
        title: 'Stock Request Fulfilled',
        message: `Your stock request ${request.request_number} for '${product.name}' (${fulfillQty} units) has been fulfilled and delivered to your branch inventory.`,
        type: 'success',
        link: '/products/my-requests'
      });
    } catch (notifErr) {
      console.warn('[Notification Warning]', notifErr.message);
    }

    return res.json({
      message: `Stock request ${request.request_number} successfully fulfilled. Inventory updated.`,
      request,
      transferred_quantity: fulfillQty,
      destination_stock: destInv.stock
    });
  } catch (error) {
    console.error('[fulfillRequest Error]', error);
    if (transaction && !transaction.finished) await transaction.rollback();
    return res.status(500).json({ error: error.message });
  }
};

/**
 * 9. Cancel Stock Request
 * Authorized for: Requester or Branch Admin of that branch.
 * Allowed ONLY when status is PENDING.
 */
const cancelRequest = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const request = await ProductRequest.findByPk(id, { transaction });

    if (!request) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Stock request not found.' });
    }

    const currentStatus = (request.status || '').toUpperCase();
    if (currentStatus !== 'PENDING') {
      await transaction.rollback();
      return res.status(400).json({
        message: `Cannot cancel request with status '${request.status}'. Only PENDING requests can be cancelled by requester.`
      });
    }

    // Role check: requester or branch admin of branch
    if (req.user.role !== 'super_admin') {
      if (request.requested_by !== req.user.id && request.branch_id !== req.user.branch_id) {
        await transaction.rollback();
        return res.status(403).json({ message: 'Forbidden: You can only cancel your own pending requests.' });
      }
    }

    request.status = 'CANCELLED';
    request.processed_at = new Date();
    await request.save({ transaction });

    await AuditLog.create({
      action: 'CANCEL_STOCK_REQUEST',
      user_id: req.user.id,
      details: `Stock request ${request.request_number} cancelled by ${req.user.username} [${req.user.role}].`,
      ip_address: req.ip || req.connection?.remoteAddress || null
    }, { transaction });

    await transaction.commit();

    return res.json({ message: 'Stock request cancelled successfully.', request });
  } catch (error) {
    console.error('[cancelRequest Error]', error);
    if (transaction && !transaction.finished) await transaction.rollback();
    return res.status(500).json({ error: error.message });
  }
};

/**
 * 10. Get Audit Trail / Lifecycle History for a Request
 */
const getRequestAudit = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await ProductRequest.findByPk(id);
    if (!request) {
      return res.status(404).json({ message: 'Stock request not found.' });
    }

    if (req.user.role !== 'super_admin' && request.branch_id !== req.user.branch_id && request.requested_by !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden.' });
    }

    const logs = await AuditLog.findAll({
      where: {
        details: { [Op.like]: `%${request.request_number}%` }
      },
      include: [{ model: User, attributes: ['id', 'username', 'first_name', 'last_name', 'role'] }],
      order: [['createdAt', 'ASC']]
    });

    return res.json(logs);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createRequest,
  listRequests,
  getRequest,
  approveRequest,
  rejectRequest,
  processRequest,
  scheduleRequest,
  fulfillRequest,
  completeRequest: fulfillRequest, // Backward-compatible alias
  cancelRequest,
  getRequestAudit
};

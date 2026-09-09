const { ProductRequest, Product, BranchProduct, Inventory, User, Branch, Notification, StockMovement, AuditLog } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../db');

// Helper to generate professional request number: SR-YYYYMMDD-XXXX-RAND
async function generateRequestNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const count = await ProductRequest.count({
    where: {
      createdAt: {
        [Op.gte]: startOfDay
      }
    }
  });
  const rand = Math.floor(1000 + Math.random() * 9000);
  const seq = String(count + 1).padStart(4, '0');
  return `SR-${datePart}-${seq}-${rand}`;
}

/**
 * Normalizes status strings (handles uppercase and legacy title case)
 */
function normalizeStatus(status) {
  if (!status) return null;
  const s = status.trim().toUpperCase();
  if (s === 'PENDING_ADMIN') return ['PENDING_ADMIN', 'Pending Admin', 'Pending Branch Admin'];
  if (s === 'PENDING_SUPERADMIN' || s === 'PENDING_HQ') return ['PENDING_SUPERADMIN', 'Pending Super Admin', 'Pending HQ', 'FORWARDED_TO_HQ'];
  if (s === 'PENDING') return ['PENDING', 'Pending', 'PENDING_ADMIN', 'PENDING_SUPERADMIN'];
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
 * - If employee (staff) submits: status = 'PENDING_ADMIN' -> routed to Branch Admin
 * - If branch_admin / super_admin submits: status = 'PENDING_SUPERADMIN' -> routed directly to Super Admin
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

    const createdRequests = [];

    // Determine initial status based on creator's role
    const isStaff = req.user.role === 'employee';
    const initialStatus = isStaff ? 'PENDING_ADMIN' : 'PENDING_SUPERADMIN';

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
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
          status: { [Op.in]: ['PENDING', 'Pending', 'PENDING_ADMIN', 'PENDING_SUPERADMIN'] }
        }
      });

      if (existingPending) {
        await transaction.rollback();
        return res.status(400).json({ message: `You already have an active pending request for product: ${product.name}.` });
      }

      const itemRequestNumber = await generateRequestNumber();

      const reqRecord = await ProductRequest.create({
        request_number: itemRequestNumber,
        branch_id,
        source_branch_id: source_branch_id || null,
        product_id,
        requested_by: req.user.id,
        quantity_requested: parseInt(quantity_requested),
        notes: notes ? String(notes).trim().slice(0, 500) : null,
        priority: priority && ['low', 'normal', 'urgent'].includes(priority) ? priority : 'normal',
        status: initialStatus,
        requested_at: new Date()
      }, { transaction });

      // Audit Log for creation
      await AuditLog.create({
        action: 'CREATE_STOCK_REQUEST',
        user_id: req.user.id,
        details: `Stock request ${itemRequestNumber} created for product '${product.name}' (SKU: ${product.sku}, Qty: ${quantity_requested}) by ${req.user.username} [${req.user.role}] for branch '${destBranch.name}'. Initial status: ${initialStatus}.`,
        ip_address: req.ip || req.connection?.remoteAddress || null
      }, { transaction });

      createdRequests.push(reqRecord);
    }

    await transaction.commit();

    // In-app Notification routing:
    // - If Staff: notify Branch Admin(s) of that branch
    // - If Admin/Super Admin: notify Super Admin(s)
    try {
      const summaryNumbers = createdRequests.map(r => r.request_number).join(', ');
      if (isStaff) {
        const branchAdmins = await User.findAll({
          where: { role: 'branch_admin', branch_id }
        });
        if (branchAdmins.length > 0) {
          const notifications = branchAdmins.map(admin => ({
            userId: admin.id,
            branchId: branch_id,
            title: 'Staff Restock Request Pending Review',
            message: `Staff member ${req.user.username} submitted restock request (${summaryNumbers}) for ${items.length} item(s) awaiting your endorsement.`,
            type: 'restock_request',
            link: `/purchases/restock?staff_id=${req.user.id}`
          }));
          await Notification.bulkCreate(notifications);
        }
      } else {
        const superAdmins = await User.findAll({ where: { role: 'super_admin' } });
        if (superAdmins.length > 0) {
          const notifications = superAdmins.map(admin => ({
            userId: admin.id,
            title: 'New Branch Stock Request Pending HQ Review',
            message: `Branch '${destBranch.name}' submitted stock request (${summaryNumbers}) for ${items.length} item(s).`,
            type: 'stock_request',
            link: `/purchases/restock?branch_id=${branch_id}`
          }));
          await Notification.bulkCreate(notifications);
        }
      }
    } catch (notifErr) {
      console.warn('[Notification Warning]', notifErr.message);
    }

    return res.status(201).json({
      message: isStaff
        ? 'Stock request submitted to Branch Admin for initial review.'
        : 'Stock request submitted to Super Admin for fulfillment.',
      request_number: createdRequests[0]?.request_number || null,
      requests: createdRequests
    });
  } catch (error) {
    console.error('[createRequest Error]', error);
    if (transaction && !transaction.finished) await transaction.rollback();
    return res.status(500).json({ error: error.message });
  }
};

/**
 * 2. Branch Admin Approves & Endorses Request (Tier 1 -> Tier 2)
 * Transitions status from PENDING_ADMIN to PENDING_SUPERADMIN.
 * Authorized for: branch_admin (for their own branch) and super_admin.
 */
const branchAdminApprove = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { approval_notes } = req.body;

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

    if (req.user.role !== 'super_admin' && request.branch_id !== req.user.branch_id) {
      await transaction.rollback();
      return res.status(403).json({ message: 'Forbidden: You can only approve requests for your assigned branch.' });
    }

    const currentStatus = (request.status || '').toUpperCase();
    if (!['PENDING_ADMIN', 'PENDING'].includes(currentStatus)) {
      await transaction.rollback();
      return res.status(400).json({
        message: `Cannot branch-approve request with current status '${request.status}'. Only PENDING_ADMIN requests can be endorsed.`
      });
    }

    request.status = 'PENDING_SUPERADMIN';
    request.branch_approved_by = req.user.id;
    request.branch_approved_at = new Date();
    request.branch_approval_notes = approval_notes ? String(approval_notes).trim() : null;
    await request.save({ transaction });

    await AuditLog.create({
      action: 'BRANCH_APPROVE_STOCK_REQUEST',
      user_id: req.user.id,
      details: `Stock request ${request.request_number} endorsed by Branch Admin ${req.user.username} for Branch '${request.Branch?.name}'. Forwarded to Super Admin. Notes: ${request.branch_approval_notes || 'None'}.`,
      ip_address: req.ip || req.connection?.remoteAddress || null
    }, { transaction });

    await transaction.commit();

    // In-app Notifications:
    // 1. Notify Super Admins that branch approved request is ready for HQ review
    try {
      const superAdmins = await User.findAll({ where: { role: 'super_admin' } });
      if (superAdmins.length > 0) {
        const notifications = superAdmins.map(admin => ({
          userId: admin.id,
          title: 'Branch-Endorsed Stock Request Awaiting HQ',
          message: `Branch Admin ${req.user.username} approved request ${request.request_number} for '${request.Product?.name}' (${request.quantity_requested} units). Ready for HQ review.`,
          type: 'stock_request',
          link: `/purchases/restock?branch_id=${request.branch_id}`
        }));
        await Notification.bulkCreate(notifications);
      }
      // 2. Notify Requester (Staff)
      await Notification.create({
        userId: request.requested_by,
        title: 'Restock Request Endorsed by Branch Admin',
        message: `Your restock request ${request.request_number} was endorsed by your Branch Admin and forwarded to Super Admin for fulfillment.`,
        type: 'info',
        link: '/products/my-requests'
      });
    } catch (notifErr) {
      console.warn('[Notification Warning]', notifErr.message);
    }

    return res.json({
      message: `Stock request ${request.request_number} endorsed and forwarded to Super Admin.`,
      request
    });
  } catch (error) {
    console.error('[branchAdminApprove Error]', error);
    if (transaction && !transaction.finished) await transaction.rollback();
    return res.status(500).json({ error: error.message });
  }
};

/**
 * 3. Branch Admin Rejects Request
 * Authorized for: branch_admin (for their branch) and super_admin.
 */
const branchAdminReject = async (req, res) => {
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

    if (req.user.role !== 'super_admin' && request.branch_id !== req.user.branch_id) {
      await transaction.rollback();
      return res.status(403).json({ message: 'Forbidden: You can only reject requests for your assigned branch.' });
    }

    const currentStatus = (request.status || '').toUpperCase();
    if (!['PENDING_ADMIN', 'PENDING', 'PENDING_SUPERADMIN'].includes(currentStatus)) {
      await transaction.rollback();
      return res.status(400).json({ message: `Cannot reject request with status '${request.status}'.` });
    }

    request.status = 'REJECTED';
    request.rejection_reason = String(reason).trim();
    request.branch_approved_by = req.user.id;
    request.processed_at = new Date();
    await request.save({ transaction });

    await AuditLog.create({
      action: 'BRANCH_REJECT_STOCK_REQUEST',
      user_id: req.user.id,
      details: `Stock request ${request.request_number} REJECTED by Branch Admin ${req.user.username}. Reason: ${request.rejection_reason}.`,
      ip_address: req.ip || req.connection?.remoteAddress || null
    }, { transaction });

    await transaction.commit();

    try {
      await Notification.create({
        userId: request.requested_by,
        title: 'Restock Request Rejected by Branch Admin',
        message: `Your restock request ${request.request_number} for '${request.Product?.name}' was rejected by Branch Admin. Reason: ${request.rejection_reason}`,
        type: 'error',
        link: '/products/my-requests'
      });
    } catch (notifErr) {}

    return res.json({
      message: `Stock request ${request.request_number} rejected.`,
      request
    });
  } catch (error) {
    console.error('[branchAdminReject Error]', error);
    if (transaction && !transaction.finished) await transaction.rollback();
    return res.status(500).json({ error: error.message });
  }
};

/**
 * 4. Batch Branch Admin Approve & Reject
 */
const batchBranchApprove = async (req, res) => {
  try {
    const { ids, approval_notes } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Array of request IDs is required.' });
    }

    let approvedCount = 0;
    const errors = [];

    for (const id of ids) {
      try {
        const request = await ProductRequest.findByPk(id);
        if (!request) continue;
        if (req.user.role !== 'super_admin' && request.branch_id !== req.user.branch_id) continue;
        const s = (request.status || '').toUpperCase();
        if (s === 'PENDING_ADMIN' || s === 'PENDING') {
          request.status = 'PENDING_SUPERADMIN';
          request.branch_approved_by = req.user.id;
          request.branch_approved_at = new Date();
          request.branch_approval_notes = approval_notes ? String(approval_notes).trim() : null;
          await request.save();
          approvedCount++;
        }
      } catch (err) {
        errors.push({ id, error: err.message });
      }
    }

    return res.json({
      message: `${approvedCount} request(s) approved and forwarded to Super Admin.`,
      approvedCount,
      errors
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const batchBranchReject = async (req, res) => {
  try {
    const { ids, reason } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Array of request IDs is required.' });
    }
    if (!reason || String(reason).trim() === '') {
      return res.status(400).json({ message: 'Rejection reason is required.' });
    }

    let rejectedCount = 0;
    for (const id of ids) {
      const request = await ProductRequest.findByPk(id);
      if (!request) continue;
      if (req.user.role !== 'super_admin' && request.branch_id !== req.user.branch_id) continue;
      const s = (request.status || '').toUpperCase();
      if (['PENDING_ADMIN', 'PENDING', 'PENDING_SUPERADMIN'].includes(s)) {
        request.status = 'REJECTED';
        request.rejection_reason = String(reason).trim();
        request.branch_approved_by = req.user.id;
        request.processed_at = new Date();
        await request.save();
        rejectedCount++;
      }
    }

    return res.json({
      message: `${rejectedCount} request(s) rejected.`,
      rejectedCount
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * 5. Super Admin Batch Approve & Batch Reject
 */
const batchSuperAdminApprove = async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Forbidden: ONLY Super Admin can batch approve stock requests.' });
  }

  const { ids, approval_notes } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'Array of request IDs is required.' });
  }

  const results = { approved: [], failed: [] };

  for (const id of ids) {
    const transaction = await sequelize.transaction();
    try {
      const request = await ProductRequest.findByPk(id, {
        include: [{ model: Product }, { model: Branch, as: 'Branch' }],
        transaction
      });

      if (!request) {
        await transaction.rollback();
        results.failed.push({ id, error: 'Not found' });
        continue;
      }

      const currentStatus = (request.status || '').toUpperCase();
      if (!['PENDING_SUPERADMIN', 'PENDING', 'PENDING_ADMIN'].includes(currentStatus)) {
        await transaction.rollback();
        results.failed.push({ id, error: `Invalid status '${request.status}'` });
        continue;
      }

      const product = request.Product;
      const approvedQty = request.quantity_requested;

      // Warehouse stock validation
      if (!request.source_branch_id) {
        if (product.available_quantity < approvedQty) {
          await transaction.rollback();
          results.failed.push({ id, error: `Insufficient warehouse stock (Available: ${product.available_quantity}, Required: ${approvedQty})` });
          continue;
        }
        product.available_quantity -= approvedQty;
        product.reserved_quantity += approvedQty;
        await product.save({ transaction });
      }

      request.quantity_approved = approvedQty;
      request.status = 'APPROVED';
      request.approved_by = req.user.id;
      request.approved_at = new Date();
      request.approval_notes = approval_notes ? String(approval_notes).trim() : null;
      await request.save({ transaction });

      await AuditLog.create({
        action: 'APPROVE_STOCK_REQUEST',
        user_id: req.user.id,
        details: `Stock request ${request.request_number} APPROVED (batch) by Super Admin ${req.user.username}. Authorized ${approvedQty} units of '${product.name}'.`,
        ip_address: req.ip || req.connection?.remoteAddress || null
      }, { transaction });

      await transaction.commit();
      results.approved.push(request.id);
    } catch (err) {
      if (transaction && !transaction.finished) await transaction.rollback();
      results.failed.push({ id, error: err.message });
    }
  }

  return res.json({
    message: `Batch approve completed. ${results.approved.length} approved, ${results.failed.length} failed.`,
    results
  });
};

const batchSuperAdminReject = async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Forbidden: ONLY Super Admin can batch reject stock requests.' });
  }

  const { ids, reason } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'Array of request IDs is required.' });
  }
  if (!reason || String(reason).trim() === '') {
    return res.status(400).json({ message: 'Rejection reason is required.' });
  }

  const results = { rejected: [], failed: [] };

  for (const id of ids) {
    const transaction = await sequelize.transaction();
    try {
      const request = await ProductRequest.findByPk(id, {
        include: [{ model: Product }],
        transaction
      });

      if (!request) {
        await transaction.rollback();
        results.failed.push({ id, error: 'Not found' });
        continue;
      }

      const currentStatus = (request.status || '').toUpperCase();
      if (['FULFILLED', 'COMPLETED', 'REJECTED', 'CANCELLED'].includes(currentStatus)) {
        await transaction.rollback();
        results.failed.push({ id, error: `Cannot reject request with status '${request.status}'` });
        continue;
      }

      // Release stock reservation if needed
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

      await AuditLog.create({
        action: 'REJECT_STOCK_REQUEST',
        user_id: req.user.id,
        details: `Stock request ${request.request_number} REJECTED (batch) by Super Admin ${req.user.username}. Reason: ${request.rejection_reason}.`,
        ip_address: req.ip || req.connection?.remoteAddress || null
      }, { transaction });

      await transaction.commit();
      results.rejected.push(request.id);
    } catch (err) {
      if (transaction && !transaction.finished) await transaction.rollback();
      results.failed.push({ id, error: err.message });
    }
  }

  return res.json({
    message: `Batch reject completed. ${results.rejected.length} rejected, ${results.failed.length} failed.`,
    results
  });
};

/**
 * 6. Super Admin Branch Summary Aggregation
 * Returns list of branches with aggregated stock request metrics.
 */
const getBranchSummary = async (req, res) => {
  try {
    const branches = await Branch.findAll({
      order: [['name', 'ASC']]
    });

    const requests = await ProductRequest.findAll({
      attributes: ['id', 'branch_id', 'status', 'quantity_requested', 'quantity_approved', 'priority', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    const summary = branches.map(branch => {
      const branchReqs = requests.filter(r => r.branch_id === branch.id);
      
      const pendingSuperAdminReqs = branchReqs.filter(r => {
        const s = (r.status || '').toUpperCase();
        return s === 'PENDING_SUPERADMIN' || s === 'PENDING';
      });

      const pendingAdminReqs = branchReqs.filter(r => (r.status || '').toUpperCase() === 'PENDING_ADMIN');
      const approvedReqs = branchReqs.filter(r => ['APPROVED', 'PARTIALLY_APPROVED'].includes((r.status || '').toUpperCase()));
      const processingReqs = branchReqs.filter(r => ['PROCESSING', 'SCHEDULED'].includes((r.status || '').toUpperCase()));
      const fulfilledReqs = branchReqs.filter(r => ['FULFILLED', 'COMPLETED'].includes((r.status || '').toUpperCase()));
      const rejectedReqs = branchReqs.filter(r => (r.status || '').toUpperCase() === 'REJECTED');

      const totalPendingUnits = pendingSuperAdminReqs.reduce((sum, r) => sum + (r.quantity_requested || 0), 0);
      const hasUrgent = pendingSuperAdminReqs.some(r => r.priority === 'urgent');

      return {
        branch_id: branch.id,
        branch_name: branch.name,
        branch_location: branch.location,
        branch_phone: branch.phone,
        total_requests: branchReqs.length,
        pending_superadmin_count: pendingSuperAdminReqs.length,
        pending_admin_count: pendingAdminReqs.length,
        approved_count: approvedReqs.length,
        processing_count: processingReqs.length,
        fulfilled_count: fulfilledReqs.length,
        rejected_count: rejectedReqs.length,
        total_pending_units: totalPendingUnits,
        has_urgent: hasUrgent,
        latest_request_at: branchReqs.length > 0 ? branchReqs[0].createdAt : null
      };
    });

    return res.json(summary);
  } catch (error) {
    console.error('[getBranchSummary Error]', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * 7. List Stock Requests
 * Roles:
 * - super_admin: views all requests, can filter by branch, requester, status, dates, priority, search
 * - branch_admin: views requests for their branch
 * - employee: views their own requests or branch requests
 */
const listRequests = async (req, res) => {
  try {
    const { status, branch_id, source_branch_id, from, to, priority, requester_id, search, stage } = req.query;
    const where = {};

    // Role-based scope
    if (req.user.role === 'branch_admin') {
      where.branch_id = req.user.branch_id;
    } else if (req.user.role === 'employee') {
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

    // Stage filter (e.g. stage=superadmin vs stage=branch_admin)
    if (stage === 'superadmin') {
      where.status = { [Op.in]: ['PENDING_SUPERADMIN', 'PENDING', 'APPROVED', 'PARTIALLY_APPROVED', 'PROCESSING', 'SCHEDULED', 'FULFILLED', 'REJECTED'] };
    } else if (stage === 'branch_admin') {
      where.status = { [Op.in]: ['PENDING_ADMIN', 'PENDING'] };
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
        { model: User, as: 'BranchApprover', attributes: ['id', 'username', 'first_name', 'last_name', 'role'] },
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
 * 8. Get Single Stock Request Details
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
        { model: User, as: 'BranchApprover', attributes: ['id', 'username', 'first_name', 'last_name', 'role'] },
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
 * 9. Approve Stock Request (Super Admin Final Authorization)
 */
const approveRequest = async (req, res) => {
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
    if (!['PENDING_SUPERADMIN', 'PENDING', 'PENDING_ADMIN'].includes(currentStatus)) {
      await transaction.rollback();
      return res.status(400).json({
        message: `Cannot approve request with status '${request.status}'. Only pending requests can be approved by HQ.`
      });
    }

    const approvedQty = parseInt(quantity_approved, 10);
    if (!approvedQty || approvedQty < 1 || approvedQty > request.quantity_requested) {
      await transaction.rollback();
      return res.status(400).json({
        message: `Approved quantity must be between 1 and requested quantity (${request.quantity_requested}).`
      });
    }

    const product = request.Product;
    if (!product) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Requested product record not found.' });
    }

    // Check inventory availability
    if (request.source_branch_id) {
      const sourceInv = await BranchProduct.findOne({
        where: { product_id: product.id, branch_id: request.source_branch_id },
        transaction
      });
      const sourceStock = sourceInv ? sourceInv.stock : 0;
      if (sourceStock < approvedQty) {
        await transaction.rollback();
        return res.status(400).json({
          message: `Insufficient stock at source branch. Only ${sourceStock} available.`
        });
      }
    } else {
      if (product.available_quantity < approvedQty) {
        await transaction.rollback();
        return res.status(400).json({
          message: `Insufficient central warehouse stock. Only ${product.available_quantity} available.`
        });
      }

      product.available_quantity -= approvedQty;
      product.reserved_quantity += approvedQty;
      await product.save({ transaction });
    }

    const isPartial = approvedQty < request.quantity_requested;
    const newStatus = isPartial ? 'PARTIALLY_APPROVED' : 'APPROVED';

    request.quantity_approved = approvedQty;
    request.status = newStatus;
    request.approved_by = req.user.id;
    request.approved_at = new Date();
    request.approval_notes = approval_notes ? String(approval_notes).trim() : null;
    await request.save({ transaction });

    await AuditLog.create({
      action: 'APPROVE_STOCK_REQUEST',
      user_id: req.user.id,
      details: `Stock request ${request.request_number} ${newStatus} by Super Admin ${req.user.username}. Authorized ${approvedQty} of ${request.quantity_requested} unit(s). Notes: ${request.approval_notes || 'None'}.`,
      ip_address: req.ip || req.connection?.remoteAddress || null
    }, { transaction });

    await transaction.commit();

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
 * 10. Reject Stock Request (Super Admin Rejection)
 */
const rejectRequest = async (req, res) => {
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

    await AuditLog.create({
      action: 'REJECT_STOCK_REQUEST',
      user_id: req.user.id,
      details: `Stock request ${request.request_number} REJECTED by Super Admin ${req.user.username}. Reason: ${request.rejection_reason}. Previous status was ${currentStatus}.`,
      ip_address: req.ip || req.connection?.remoteAddress || null
    }, { transaction });

    await transaction.commit();

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
 * 11. Transition to Processing
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
 * 12. Schedule Delivery
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
    request.status = 'PROCESSING';
    await request.save();

    await AuditLog.create({
      action: 'SCHEDULE_STOCK_REQUEST',
      user_id: req.user.id,
      details: `Stock request ${request.request_number} scheduled for dispatch on ${scheduled_date} at ${scheduled_time} by Super Admin ${req.user.username}.`,
      ip_address: req.ip || req.connection?.remoteAddress || null
    });

    return res.json({ message: 'Stock delivery scheduled successfully.', request });
  } catch (error) {
    console.error('[scheduleRequest Error]', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * 13. Fulfill Stock Request
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

    if (['FULFILLED', 'COMPLETED'].includes(currentStatus)) {
      await transaction.rollback();
      return res.status(400).json({ message: `Security violation: Stock request ${request.request_number} has ALREADY been fulfilled.` });
    }

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
      const prevReserved = product.reserved_quantity;
      product.reserved_quantity = Math.max(0, product.reserved_quantity - fulfillQty);
      await product.save({ transaction });

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

    const [destInv] = await BranchProduct.findOrCreate({
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

    await StockMovement.create({
      product_id: product.id,
      type: 'RESTOCK',
      quantity: fulfillQty,
      previous_stock: prevDestStock,
      new_stock: destInv.stock,
      user_id: req.user.id,
      note: `Stock Requisition Fulfilled (${request.request_number}) from ${sourceName}`
    }, { transaction });

    request.status = 'FULFILLED';
    request.fulfilled_by = req.user.id;
    request.fulfilled_at = new Date();
    request.quantity_fulfilled = fulfillQty;
    request.processed_at = new Date();
    await request.save({ transaction });

    await AuditLog.create({
      action: 'FULFILL_STOCK_REQUEST',
      user_id: req.user.id,
      details: `Stock request ${request.request_number} FULFILLED by Super Admin ${req.user.username}. Transferred ${fulfillQty} units of '${product.name}' from ${sourceName} to Branch '${destBranch.name}'. New branch stock: ${destInv.stock}.`,
      ip_address: req.ip || req.connection?.remoteAddress || null
    }, { transaction });

    await transaction.commit();

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
 * 14. Cancel Stock Request
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
    if (!['PENDING', 'PENDING_ADMIN', 'PENDING_SUPERADMIN'].includes(currentStatus)) {
      await transaction.rollback();
      return res.status(400).json({
        message: `Cannot cancel request with status '${request.status}'. Only pending requests can be cancelled by requester.`
      });
    }

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
 * 15. Get Audit Trail
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
  branchAdminApprove,
  branchAdminReject,
  batchBranchApprove,
  batchBranchReject,
  batchSuperAdminApprove,
  batchSuperAdminReject,
  getBranchSummary,
  listRequests,
  getRequest,
  approveRequest,
  rejectRequest,
  processRequest,
  scheduleRequest,
  fulfillRequest,
  completeRequest: fulfillRequest,
  cancelRequest,
  getRequestAudit
};

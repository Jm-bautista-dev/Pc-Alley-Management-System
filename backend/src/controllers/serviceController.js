const { Op } = require('sequelize');
const { Service, ServiceJob, Customer, Branch, User, AuditLog } = require('../models');

// ─────────────────────────────────────────────────────────────────────────────
// 1. SERVICE CATALOG CONTROLLERS
// ─────────────────────────────────────────────────────────────────────────────

const getServices = async (req, res) => {
  try {
    const { category, status, search } = req.query;
    const where = {};

    if (category && category !== 'all') {
      where.category = category;
    }

    if (status && status !== 'all') {
      where.status = status;
    } else {
      // By default return active services for POS/listing
      where.status = { [Op.ne]: 'archived' };
    }

    if (search && search.trim()) {
      const q = search.trim();
      where[Op.or] = [
        { name: { [Op.like]: `%${q}%` } },
        { description: { [Op.like]: `%${q}%` } },
        { category: { [Op.like]: `%${q}%` } }
      ];
    }

    const services = await Service.findAll({
      where,
      order: [['category', 'ASC'], ['name', 'ASC']]
    });

    res.json(services);
  } catch (error) {
    console.error('[GET_SERVICES_ERROR]', error);
    res.status(500).json({ error: error.message });
  }
};

const getServiceById = async (req, res) => {
  try {
    const service = await Service.findByPk(req.params.id);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createService = async (req, res) => {
  try {
    const {
      name,
      category,
      description,
      pricing_type,
      base_price,
      estimated_duration_mins,
      requires_device_info,
      status
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Service name is required' });
    }

    const basePriceVal = base_price ? parseFloat(base_price) : 0;
    if (isNaN(basePriceVal) || basePriceVal < 0) {
      return res.status(400).json({ error: 'Base price must be a non-negative number' });
    }

    const validPricingTypes = ['fixed', 'variable', 'custom'];
    if (pricing_type && !validPricingTypes.includes(pricing_type)) {
      return res.status(400).json({ error: `Invalid pricing type. Must be one of: ${validPricingTypes.join(', ')}` });
    }

    const service = await Service.create({
      name: name.trim(),
      category: category || 'Other',
      description: description || null,
      pricing_type: pricing_type || 'fixed',
      base_price: basePriceVal,
      estimated_duration_mins: estimated_duration_mins ? parseInt(estimated_duration_mins) : 60,
      requires_device_info: requires_device_info !== undefined ? !!requires_device_info : true,
      status: status || 'active',
      created_by: req.user?.id || null,
      updated_by: req.user?.id || null
    });

    // Audit log
    await AuditLog.create({
      action: 'SERVICE_CREATED',
      user_id: req.user?.id || null,
      details: `Created service: ${service.name} (Pricing: ${service.pricing_type}, Base: ₱${service.base_price})`,
      ip_address: req.ip
    });

    res.status(201).json(service);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'A service with this name already exists' });
    }
    res.status(500).json({ error: error.message });
  }
};

const updateService = async (req, res) => {
  try {
    const service = await Service.findByPk(req.params.id);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const {
      name,
      category,
      description,
      pricing_type,
      base_price,
      estimated_duration_mins,
      requires_device_info,
      status
    } = req.body;

    const oldPrice = service.base_price;

    if (name !== undefined) service.name = name.trim();
    if (category !== undefined) service.category = category;
    if (description !== undefined) service.description = description;
    if (pricing_type !== undefined) service.pricing_type = pricing_type;
    if (base_price !== undefined) {
      const p = parseFloat(base_price);
      if (isNaN(p) || p < 0) return res.status(400).json({ error: 'Invalid base price' });
      service.base_price = p;
    }
    if (estimated_duration_mins !== undefined) service.estimated_duration_mins = parseInt(estimated_duration_mins);
    if (requires_device_info !== undefined) service.requires_device_info = !!requires_device_info;
    if (status !== undefined) service.status = status;
    service.updated_by = req.user?.id || null;

    await service.save();

    // Audit log
    await AuditLog.create({
      action: 'SERVICE_UPDATED',
      user_id: req.user?.id || null,
      details: `Updated service #${service.id} (${service.name}): Price changed from ₱${oldPrice} to ₱${service.base_price}`,
      ip_address: req.ip
    });

    res.json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteService = async (req, res) => {
  try {
    const service = await Service.findByPk(req.params.id);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    await service.destroy(); // Soft delete via paranoid

    await AuditLog.create({
      action: 'SERVICE_DELETED',
      user_id: req.user?.id || null,
      details: `Archived/Deleted service #${service.id} (${service.name})`,
      ip_address: req.ip
    });

    res.json({ message: 'Service archived successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getServiceCategories = async (req, res) => {
  try {
    const categories = await Service.findAll({
      attributes: ['category'],
      group: ['category'],
      order: [['category', 'ASC']]
    });
    const defaultList = ['Diagnostics', 'Repair', 'Installation', 'Maintenance', 'Assembly', 'Software', 'Other'];
    const foundList = categories.map(c => c.category).filter(Boolean);
    const combined = Array.from(new Set([...defaultList, ...foundList]));

    res.json(combined);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. SERVICE JOBS / WORK ORDERS CONTROLLERS
// ─────────────────────────────────────────────────────────────────────────────

const generateJobNumber = () => {
  const dateStr = new Date().toISOString().substring(2, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SJ-${dateStr}-${rand}`;
};

const getServiceJobs = async (req, res) => {
  try {
    const { branchId, status, search, customerId } = req.query;
    const branchFilter = req.user.role !== 'super_admin' ? req.user.branch_id : (branchId && branchId !== 'all' ? branchId : null);

    const where = {};
    if (branchFilter) where.branch_id = branchFilter;
    if (status && status !== 'all') where.status = status;
    if (customerId) where.customer_id = customerId;

    if (search && search.trim()) {
      const q = search.trim();
      where[Op.or] = [
        { job_number: { [Op.like]: `%${q}%` } },
        { customer_name: { [Op.like]: `%${q}%` } },
        { service_name: { [Op.like]: `%${q}%` } },
        { device_type: { [Op.like]: `%${q}%` } },
        { reported_issue: { [Op.like]: `%${q}%` } }
      ];
    }

    const jobs = await ServiceJob.findAll({
      where,
      include: [
        { model: Branch, attributes: ['id', 'name'] },
        { model: Service, attributes: ['id', 'name', 'pricing_type', 'base_price'] }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json(jobs);
  } catch (error) {
    console.error('[GET_SERVICE_JOBS_ERROR]', error);
    res.status(500).json({ error: error.message });
  }
};

const getServiceJobById = async (req, res) => {
  try {
    const job = await ServiceJob.findByPk(req.params.id, {
      include: [
        { model: Branch, attributes: ['id', 'name'] },
        { model: Service, attributes: ['id', 'name', 'category', 'pricing_type', 'base_price'] },
        { model: Customer, attributes: ['id', 'name', 'phone', 'email'] }
      ]
    });
    if (!job) return res.status(404).json({ error: 'Service job not found' });
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createServiceJob = async (req, res) => {
  try {
    const {
      service_id,
      customer_id,
      customer_name,
      customer_phone,
      branch_id,
      device_type,
      device_specs,
      serial_number,
      reported_issue,
      estimated_price,
      technician_id
    } = req.body;

    const userBranch = req.user.role !== 'super_admin' ? req.user.branch_id : (branch_id || req.user.branch_id || 1);

    if (!service_id) return res.status(400).json({ error: 'Service is required' });
    const service = await Service.findByPk(service_id);
    if (!service) return res.status(404).json({ error: 'Selected service does not exist' });

    const trimmedName = (customer_name || '').trim();
    if (!trimmedName) return res.status(400).json({ error: 'Customer name is required' });
    if (/\d/.test(trimmedName)) return res.status(400).json({ error: 'Customer name cannot contain numbers' });
    if (!/^[A-Za-z\s.\'-]+$/.test(trimmedName)) return res.status(400).json({ error: 'Customer name can only contain letters, spaces, hyphens, and dots' });
    if (trimmedName.length < 2 || trimmedName.length > 100) return res.status(400).json({ error: 'Customer name must be between 2 and 100 characters' });

    let cleanPhone = null;
    if (customer_phone && customer_phone.trim()) {
      cleanPhone = customer_phone.trim();
      if (!/^09\d{9}$/.test(cleanPhone)) {
        return res.status(400).json({ error: 'Customer phone must be exactly 11 digits starting with 09' });
      }
      if (/^(.)\1+$/.test(cleanPhone)) {
        return res.status(400).json({ error: 'Customer phone cannot consist of only repeating identical digits' });
      }
    }

    let techName = null;
    if (technician_id) {
      const tech = await User.findByPk(technician_id);
      if (tech) techName = tech.username || `${tech.first_name || ''} ${tech.last_name || ''}`.trim();
    }

    const estPrice = estimated_price !== undefined && estimated_price !== '' ? parseFloat(estimated_price) : parseFloat(service.base_price || 0);
    if (isNaN(estPrice) || estPrice < 0 || estPrice > 1000000) {
      return res.status(400).json({ error: 'Estimated price must be between ₱0.00 and ₱1,000,000.00' });
    }

    const jobNumber = generateJobNumber();

    const job = await ServiceJob.create({
      job_number: jobNumber,
      customer_id: customer_id || null,
      customer_name: trimmedName,
      customer_phone: cleanPhone,
      service_id: service.id,
      service_name: service.name,
      branch_id: userBranch,
      device_type: (device_type || 'Desktop PC').trim().slice(0, 100),
      device_specs: device_specs ? device_specs.trim().slice(0, 500) : null,
      serial_number: serial_number ? serial_number.trim().slice(0, 100) : null,
      reported_issue: reported_issue ? reported_issue.trim().slice(0, 1000) : null,
      status: 'received',
      estimated_price: estPrice,
      final_price: estPrice,
      technician_id: technician_id || null,
      technician_name: techName,
      received_at: new Date()
    });

    await AuditLog.create({
      action: 'SERVICE_JOB_CREATED',
      user_id: req.user?.id || null,
      details: `Created Work Order #${job.job_number} for customer ${job.customer_name} (${service.name}) at branch #${userBranch}`,
      ip_address: req.ip
    });

    res.status(201).json(job);
  } catch (error) {
    console.error('[CREATE_SERVICE_JOB_ERROR]', error);
    res.status(500).json({ error: error.message });
  }
};

const updateServiceJobStatus = async (req, res) => {
  try {
    const job = await ServiceJob.findByPk(req.params.id);
    if (!job) return res.status(404).json({ error: 'Service job not found' });

    const { status, diagnosis, final_price, price_override_reason, customer_approved } = req.body;
    const validStatuses = ['received', 'diagnosing', 'waiting_for_approval', 'in_progress', 'ready_for_release', 'completed', 'cancelled'];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    if (final_price !== undefined && final_price !== '') {
      const fp = parseFloat(final_price);
      if (isNaN(fp) || fp < 0 || fp > 1000000) {
        return res.status(400).json({ error: 'Final price must be between ₱0.00 and ₱1,000,000.00' });
      }
      job.final_price = fp;
    }

    const prevStatus = job.status;
    if (status) job.status = status;
    if (diagnosis !== undefined) job.diagnosis = diagnosis ? diagnosis.trim().slice(0, 1000) : null;
    if (price_override_reason !== undefined) job.price_override_reason = price_override_reason ? price_override_reason.trim().slice(0, 500) : null;
    if (customer_approved !== undefined) {
      job.customer_approved = !!customer_approved;
      if (job.customer_approved && !job.approved_at) job.approved_at = new Date();
    }

    if (status === 'completed' && !job.completed_at) {
      job.completed_at = new Date();
    }

    await job.save();

    await AuditLog.create({
      action: 'SERVICE_JOB_STATUS_UPDATED',
      user_id: req.user?.id || null,
      details: `Updated Work Order #${job.job_number} status from ${prevStatus} to ${job.status}`,
      ip_address: req.ip
    });

    res.json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  getServiceCategories,
  getServiceJobs,
  getServiceJobById,
  createServiceJob,
  updateServiceJobStatus
};

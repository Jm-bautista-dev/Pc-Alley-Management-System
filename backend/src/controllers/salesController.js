const sequelize = require('../db');
const { Op } = require('sequelize');
const {
  Sale, SaleItem, Customer,
  Order, OrderItem,
  Product, Inventory, Category, StockMovement, Branch, User,
  Service, ServiceJob, AuditLog,
  ProductBundle, Warranty, Return
} = require('../models');

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

/** Generate a human-readable invoice number */
function generateInvoice() {
  const ts   = Date.now().toString().slice(-6);
  const rand = Math.floor(Math.random() * 900 + 100);
  return `INV-${ts}-${rand}`;
}

// ─────────────────────────────────────────────────────────────────
// POST /api/sales  — Create a Sale (Supports Products, Services, Mixed)
// ─────────────────────────────────────────────────────────────────
const createSale = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    let { customer_name, customer_id, items, payment_method, notes, amount_paid, change_amount } = req.body;
    const branch_id = req.user.role !== 'super_admin' ? req.user.branch_id : (req.body.branch_id || req.user.branch_id || 1);
    const user_id   = req.user.id;

    if (typeof items === 'string') {
      try { items = JSON.parse(items); } catch (e) { items = []; }
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Transaction must contain at least one item.');
    }

    // Resolve customer ─────────────────────────────────────────────
    let customerId   = customer_id || null;
    let customerName = customer_name || 'Walk-in Customer';

    if (customerId) {
      const found = await Customer.findByPk(customerId);
      if (found) customerName = found.name;
    } else if (customerName && customerName !== 'Walk-in Customer') {
      const found = await Customer.findOne({ where: { name: customerName } });
      if (found) customerId = found.id;
    }

    // Build Sale shell ─────────────────────────────────────────────
    const invoiceNumber = generateInvoice();
    const staffName     = req.user.username || req.user.name || `User #${user_id}`;

    const amountPaidVal = amount_paid ? parseFloat(amount_paid) : 0;
    const changeAmountVal = change_amount ? parseFloat(change_amount) : 0;

    const sale = await Sale.create({
      invoiceNumber,
      customerId,
      customerName,
      branchId: branch_id,
      staffId:  user_id,
      staffName,
      totalAmount: 0,
      product_amount: 0,
      service_amount: 0,
      sale_type: 'product',
      paymentMethod: payment_method || 'cash',
      amountPaid: amountPaidVal,
      changeAmount: changeAmountVal,
      status: 'completed',
      notes: notes || null
    }, { transaction });

    let totalProductAmount = 0;
    let totalServiceAmount = 0;
    const qualifyingProductItems = [];

    // Process each item ────────────────────────────────────────────
    for (const item of items) {
      const itemType = (item.item_type || (item.service_id ? 'service' : 'product')).toLowerCase();
      const qty = parseInt(item.quantity) || 1;
      if (qty <= 0) throw new Error('Quantity must be greater than zero');

      if (itemType === 'service') {
        // ── SERVICE LINE ITEM (ZERO INVENTORY IMPACT) ───────────────
        const serviceId = item.service_id || item.id;
        const service = await Service.findByPk(serviceId, { transaction });
        if (!service) throw new Error(`Service #${serviceId} not found or inactive`);

        let unitPrice = parseFloat(service.base_price || 0);

        // Check if variable / custom price is supplied
        if (service.pricing_type === 'variable' || service.pricing_type === 'custom' || item.unit_price !== undefined) {
          const customPrice = parseFloat(item.unit_price !== undefined ? item.unit_price : item.price);
          if (isNaN(customPrice) || customPrice < 0) {
            throw new Error(`Invalid price for service "${service.name}"`);
          }
          unitPrice = customPrice;
        }

        const subtotal = parseFloat((unitPrice * qty).toFixed(2));

        // Create SaleItem for service
        await SaleItem.create({
          saleId:              sale.id,
          item_type:           'service',
          serviceId:           service.id,
          serviceJobId:        item.service_job_id || null,
          productName:         service.name,
          productSku:          null,
          quantity:            qty,
          unitPrice,
          subtotal,
          priceOverrideReason: item.price_override_reason || item.reason || null,
          approvedBy:          req.user.id
        }, { transaction });

        // If linked to a ServiceJob, complete the work order
        if (item.service_job_id) {
          const job = await ServiceJob.findByPk(item.service_job_id, { transaction });
          if (job) {
            job.status = 'completed';
            job.sale_id = sale.id;
            job.invoice_number = invoiceNumber;
            job.final_price = subtotal;
            job.completed_at = new Date();
            await job.save({ transaction });
          }
        }

        totalServiceAmount += subtotal;

      } else {
        // ── PHYSICAL PRODUCT LINE ITEM (DECREMENTS INVENTORY) ───────
        const productId = item.product_id || item.id;
        const product = await Product.findByPk(productId, { transaction });
        if (!product) throw new Error(`Product #${productId} not found`);

        // Authoritative server-side price check (Finding D)
        const unitPrice = parseFloat(product.price);
        if (product.is_bundle) {
          if (isNaN(unitPrice) || unitPrice <= 0) {
            throw new Error(`Bundle "${product.name}" has no valid configured price. Checkout cannot proceed.`);
          }
        } else {
          if (isNaN(unitPrice) || unitPrice < 0) {
            throw new Error(`Product "${product.name}" has an invalid price.`);
          }
        }

        const subtotal = parseFloat((unitPrice * qty).toFixed(2));

        // Create SaleItem with authoritative database price/name snapshot
        await SaleItem.create({
          saleId:      sale.id,
          item_type:   'product',
          productId:   product.id,
          productName: product.name,
          productSku:  product.sku || null,
          quantity:    qty,
          unitPrice,
          subtotal
        }, { transaction });

        // Track qualifying product items for automatic warranty creation
        qualifyingProductItems.push({
          productId:   product.id,
          productName: product.name,
          productSku:  product.sku || null,
          quantity:    qty,
          unitPrice,
          subtotal
        });

        // Stock checks & deductions
        if (product.is_bundle) {
          // If product is a bundle, check component stock in ProductBundle table
          const bundleComponents = await ProductBundle.findAll({
            where: { bundle_id: product.id },
            transaction
          });

          if (bundleComponents && bundleComponents.length > 0) {
            // Verify all components have sufficient stock first
            for (const comp of bundleComponents) {
              const neededQty = (parseInt(comp.quantity) || 1) * qty;
              const compInv = await Inventory.findOne({
                where: { product_id: comp.product_id, branch_id },
                transaction
              });
              if (!compInv || compInv.quantity < neededQty) {
                const compProduct = await Product.findByPk(comp.product_id, { transaction });
                throw new Error(`Insufficient stock for bundle component "${compProduct?.name || comp.product_id}" (needed: ${neededQty}, available: ${compInv?.quantity ?? 0})`);
              }
            }

            // Deduct each component's inventory
            for (const comp of bundleComponents) {
              const compDeductQty = (parseInt(comp.quantity) || 1) * qty;
              const compInv = await Inventory.findOne({
                where: { product_id: comp.product_id, branch_id },
                transaction
              });
              const prevCompStock = compInv.quantity;
              compInv.quantity -= compDeductQty;
              await compInv.save({ transaction });

              await StockMovement.create({
                product_id:     comp.product_id,
                type:           'SALE',
                quantity:       -compDeductQty,
                previous_stock: prevCompStock,
                new_stock:      compInv.quantity,
                user_id,
                note: `Sale ${invoiceNumber} (Bundle: ${product.name})`
              }, { transaction });
            }
          } else {
            // Standalone bundle product
            const inventory = await Inventory.findOne({
              where: { product_id: product.id, branch_id },
              transaction
            });
            if (!inventory || inventory.quantity < qty) {
              throw new Error(`Insufficient stock for "${product.name}" (available: ${inventory?.quantity ?? 0})`);
            }
            const prevStock = inventory.quantity;
            inventory.quantity -= qty;
            await inventory.save({ transaction });

            await StockMovement.create({
              product_id:     product.id,
              type:           'SALE',
              quantity:       -qty,
              previous_stock: prevStock,
              new_stock:      inventory.quantity,
              user_id,
              note: `Sale ${invoiceNumber}`
            }, { transaction });
          }
        } else {
          // Standard product inventory check
          const inventory = await Inventory.findOne({
            where: { product_id: product.id, branch_id },
            transaction
          });
          if (!inventory || inventory.quantity < qty) {
            throw new Error(`Insufficient stock for "${product.name}" (available: ${inventory?.quantity ?? 0})`);
          }

          const prevStock = inventory.quantity;
          inventory.quantity -= qty;
          await inventory.save({ transaction });

          await StockMovement.create({
            product_id:     product.id,
            type:           'SALE',
            quantity:       -qty,
            previous_stock: prevStock,
            new_stock:      inventory.quantity,
            user_id,
            note: `Sale ${invoiceNumber}`
          }, { transaction });
        }

        totalProductAmount += subtotal;
      }
    }

    // Determine Sale Type Classification
    let saleType = 'product';
    if (totalProductAmount > 0 && totalServiceAmount > 0) {
      saleType = 'mixed';
    } else if (totalServiceAmount > 0 && totalProductAmount === 0) {
      saleType = 'service';
    } else {
      saleType = 'product';
    }

    const totalAmount = parseFloat((totalProductAmount + totalServiceAmount).toFixed(2));

    // Update Sale total and classification ─────────────────────────
    sale.product_amount = totalProductAmount;
    sale.service_amount = totalServiceAmount;
    sale.totalAmount    = totalAmount;
    sale.sale_type      = saleType;
    
    // Set fallback payment summary for non-cash if not specified by frontend
    const grandTotal = parseFloat((totalAmount * 1.12).toFixed(2));
    if (payment_method !== 'cash' || !amount_paid) {
      sale.amountPaid = grandTotal;
      sale.changeAmount = 0.00;
    }
    await sale.save({ transaction });

    // Automatic Warranty Linking (Finding H) ──────────────────────
    if (qualifyingProductItems.length > 0) {
      const existingWarranty = await Warranty.findOne({
        where: { sale_id: sale.id },
        transaction
      });
      if (!existingWarranty) {
        const validUntil = new Date();
        validUntil.setFullYear(validUntil.getFullYear() + 1); // 1-year warranty coverage
        await Warranty.create({
          customer_id:   customerId || null,
          sale_id:       sale.id,
          customer_name: customerName,
          valid_until:   validUntil.toISOString().split('T')[0],
          items:         qualifyingProductItems,
          note:          `Automated warranty for Sale ${invoiceNumber}`,
          subtotal:      totalProductAmount,
          status:        'Accepted',
          createdBy:     user_id
        }, { transaction });
      }
    }

    // Audit log
    await AuditLog.create({
      action: 'SALE_COMPLETED',
      user_id,
      details: `Invoice ${invoiceNumber}: ${saleType.toUpperCase()} sale total ₱${totalAmount} (Products: ₱${totalProductAmount}, Services: ₱${totalServiceAmount})`,
      ip_address: req.ip
    }, { transaction });

    await transaction.commit();

    // Emit real-time dashboard update event
    if (req.app.get('io')) {
      req.app.get('io').emit('dashboard_update', { type: 'SALE', invoiceNumber, saleType });
    }

    // Post-commit: update Customer stats (non-fatal if it fails) ───
    if (customerId) {
      try {
        await Customer.increment(
          { totalSpent: totalAmount, totalOrders: 1 },
          { where: { id: customerId } }
        );
      } catch (statErr) {
        console.warn('[SALES] Could not update customer stats:', statErr.message);
      }
    }

    // Return full sale with items and relations
    const result = await Sale.findByPk(sale.id, {
      include: [
        { model: SaleItem, include: [{ model: Service, attributes: ['id', 'name', 'category'] }] },
        { model: Branch },
        { model: Customer, attributes: ['name', 'email', 'phone', 'address'] },
        { model: User, attributes: ['first_name', 'last_name', 'username'] }
      ]
    });
    res.status(201).json(result);

  } catch (error) {
    await transaction.rollback();
    console.error('[createSale] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────
const getSalesHistory = async (req, res) => {
  try {
    const { days, startDate, endDate, saleType, page = 1, limit = 20, search = '' } = req.query;
    const pagination = require('../utils/pagination');
    const { offset, where, order } = pagination({ page, limit, search, searchableFields: ['customerName', 'invoiceNumber'] });
    const branchId = req.user.role === 'super_admin' ? req.query.branch_id : req.user.branch_id;
    if (branchId) where.branchId = branchId;

    if (saleType && saleType !== 'all') {
      where.sale_type = saleType;
    }
    
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [
          new Date(startDate),
          new Date(new Date(endDate).setHours(23, 59, 59, 999))
        ]
      };
    } else if (days) {
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() - parseInt(days));
      where.createdAt = { [Op.gte]: limitDate };
    }
    const sales = await Sale.findAll({
      where,
      include: [
        { model: SaleItem, include: [{ model: Service, attributes: ['id', 'name', 'category'] }] },
        { model: Branch, attributes: ['name'] },
        { model: Customer, attributes: ['name', 'email'] }
      ],
      order,
      offset,
      limit: Number(limit)
    });
    const total = await Sale.count({ where });
    res.json({
      data: sales,
      pagination: { page: Number(page), limit: Number(limit), total }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────
// GET /api/sales/comparative  — Per-branch revenue summary
// ─────────────────────────────────────────────────────────────────
const getComparativeSales = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { days, startDate, endDate } = req.query;
    const whereSale = { status: 'completed' };

    if (startDate && endDate) {
      whereSale.createdAt = {
        [Op.between]: [
          new Date(startDate),
          new Date(new Date(endDate).setHours(23, 59, 59, 999))
        ]
      };
    } else if (days) {
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() - parseInt(days));
      whereSale.createdAt = { [Op.gte]: limitDate };
    }

    const branches = await Branch.findAll();
    const results  = [];

    for (const branch of branches) {
      const stats = await Sale.findOne({
        where: { ...whereSale, branchId: branch.id },
        attributes: [
          [sequelize.fn('SUM', sequelize.col('totalAmount')), 'total_revenue'],
          [sequelize.fn('COUNT', sequelize.col('Sale.id')),   'order_count']
        ],
        raw: true
      });

      const topItem = await SaleItem.findOne({
        attributes: [
          'productName',
          [sequelize.fn('SUM', sequelize.col('quantity')), 'total_sold']
        ],
        include: [{
          model: Sale,
          attributes: [],
          where: { ...whereSale, branchId: branch.id }
        }],
        group: ['productName'],
        order: [[sequelize.literal('total_sold'), 'DESC']],
        raw: true
      });

      results.push({
        branch_id:    branch.id,
        branch_name:  branch.name,
        total_revenue: parseFloat(stats?.total_revenue || 0),
        order_count:  parseInt(stats?.order_count || 0),
        top_product:  topItem ? `${topItem.productName}` : 'N/A'
      });
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────
// GET /api/sales/trends  — Monthly revenue aggregate
// ─────────────────────────────────────────────────────────────────
const getSalesTrends = async (req, res) => {
  try {
    const branchId = req.user.role === 'super_admin' ? req.query.branch_id : req.user.branch_id;
    const { days, startDate, endDate }  = req.query;
    const where = { status: 'completed' };
    if (branchId) where.branchId = branchId;
    
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [
          new Date(startDate),
          new Date(new Date(endDate).setHours(23, 59, 59, 999))
        ]
      };
    } else if (days) {
      const limit = new Date();
      limit.setDate(limit.getDate() - parseInt(days));
      where.createdAt = { [Op.gte]: limit };
    }

    const stats = await Sale.findAll({
      where,
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'revenue'],
        [sequelize.fn('COUNT', sequelize.col('Sale.id')), 'orders']
      ],
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
      limit: 30
    });

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────
// GET /api/sales/daily-trends  — Last 30 days revenue per day
// ─────────────────────────────────────────────────────────────────
const getDailyTrends = async (req, res) => {
  try {
    const branchId = req.user.role === 'super_admin' ? req.query.branch_id : req.user.branch_id;
    const { days, startDate, endDate } = req.query;
    const where  = { status: 'completed' };
    if (branchId) where.branchId = branchId;

    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [
          new Date(startDate),
          new Date(new Date(endDate).setHours(23, 59, 59, 999))
        ]
      };
    } else if (days) {
      const limit = new Date();
      limit.setDate(limit.getDate() - parseInt(days));
      where.createdAt = { [Op.gte]: limit };
    } else {
      const limit = new Date();
      limit.setDate(limit.getDate() - 30);
      where.createdAt = { [Op.gte]: limit };
    }

    const stats = await Sale.findAll({
      where,
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'revenue'],
        [sequelize.fn('COUNT', sequelize.col('Sale.id')), 'orders']
      ],
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']]
    });

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────
// GET /api/sales/performance  — Top products by qty sold
// ─────────────────────────────────────────────────────────────────
const getProductPerformance = async (req, res) => {
  try {
    const branchId = req.user.role === 'super_admin' ? req.query.branch_id : req.user.branch_id;
    const { days, startDate, endDate }  = req.query;
    const saleWhere = { status: 'completed' };
    if (branchId) saleWhere.branchId = branchId;
    
    if (startDate && endDate) {
      saleWhere.createdAt = {
        [Op.between]: [
          new Date(startDate),
          new Date(new Date(endDate).setHours(23, 59, 59, 999))
        ]
      };
    } else if (days) {
      const limit = new Date();
      limit.setDate(limit.getDate() - parseInt(days));
      saleWhere.createdAt = { [Op.gte]: limit };
    }

    const stats = await SaleItem.findAll({
      attributes: [
        'productId', 'productName', 'productSku',
        [sequelize.fn('SUM', sequelize.col('SaleItem.quantity')), 'total_sold'],
        [sequelize.fn('SUM', sequelize.col('subtotal')),           'total_revenue']
      ],
      include: [{ model: Sale, attributes: [], where: saleWhere }],
      group: ['productId', 'productName', 'productSku'],
      order: [[sequelize.literal('total_sold'), 'DESC']],
      limit: 10
    });

    res.json(stats.map(s => ({
      product_id:    s.productId,
      name:          s.productName,
      sku:           s.productSku,
      total_sold:    parseInt(s.getDataValue('total_sold') || 0),
      total_revenue: parseFloat(s.getDataValue('total_revenue') || 0)
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────
// RETURNS MANAGEMENT (Finding J)
// ─────────────────────────────────────────────────────────────────

const getReturns = async (req, res) => {
  try {
    const branchId = req.user.role !== 'super_admin' ? req.user.branch_id : req.query.branch_id;
    const where = {};
    if (branchId) where.branch_id = branchId;
    if (req.query.status) where.status = req.query.status;

    const returns = await Return.findAll({
      where,
      include: [
        { model: Sale, attributes: ['id', 'invoiceNumber', 'totalAmount', 'createdAt'] },
        { model: Branch, attributes: ['id', 'name'] },
        { model: Customer, attributes: ['id', 'name', 'email', 'phone'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(returns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createReturn = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { sale_id, items, disposition, reason, condition_note, notes } = req.body;
    const branch_id = req.user.role !== 'super_admin' ? req.user.branch_id : (req.body.branch_id || req.user.branch_id);

    if (!sale_id) throw new Error('Original sale ID is required.');
    const sale = await Sale.findByPk(sale_id, {
      include: [SaleItem],
      transaction
    });
    if (!sale) throw new Error('Original completed sale record not found.');
    if (sale.status !== 'completed') throw new Error('Only completed sales can be returned.');

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('At least one item must be specified for return.');
    }

    // Fetch previously non-rejected returns for this sale to compute remaining returnable quantity
    const existingReturns = await Return.findAll({
      where: { sale_id: sale.id, status: { [Op.ne]: 'Rejected' } },
      transaction
    });

    const previouslyReturned = {};
    existingReturns.forEach(ret => {
      const retItems = Array.isArray(ret.items) ? ret.items : [];
      retItems.forEach(ri => {
        const pid = ri.product_id || ri.productId;
        previouslyReturned[pid] = (previouslyReturned[pid] || 0) + (parseInt(ri.quantity) || 0);
      });
    });

    // Validate each item
    const validatedItems = [];
    let estimatedRefund = 0;

    for (const item of items) {
      const pid = item.product_id || item.productId || item.id;
      const qty = parseInt(item.quantity) || 0;
      if (qty <= 0) throw new Error('Return quantity must be greater than zero.');

      const saleItem = sale.SaleItems.find(si => si.productId === pid || si.product_id === pid);
      if (!saleItem) {
        throw new Error(`Product #${pid} was not found in the original sale.`);
      }

      const soldQty = saleItem.quantity;
      const prevQty = previouslyReturned[pid] || 0;
      const returnableQty = soldQty - prevQty;

      if (qty > returnableQty) {
        throw new Error(`Cannot return ${qty} units of "${saleItem.productName}". Maximum returnable quantity is ${returnableQty}.`);
      }

      const unitPrice = parseFloat(saleItem.unitPrice || 0);
      const lineRefund = parseFloat((unitPrice * qty).toFixed(2));
      estimatedRefund += lineRefund;

      validatedItems.push({
        product_id: pid,
        product_name: saleItem.productName,
        product_sku: saleItem.productSku,
        quantity: qty,
        unit_price: unitPrice,
        subtotal: lineRefund,
        reason: item.reason || reason || 'Defective/Return',
        condition: item.condition || condition_note || 'Inspected'
      });
    }

    const returnNumber = `RET-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;

    const newReturn = await Return.create({
      return_number: returnNumber,
      sale_id: sale.id,
      branch_id: branch_id || sale.branchId,
      customer_id: sale.customerId || null,
      customer_name: sale.customerName || 'Walk-in Customer',
      status: 'Requested',
      disposition: disposition || 'restock_review',
      items: validatedItems,
      reason: reason || 'Return for review',
      condition_note: condition_note || null,
      notes: notes || null,
      restock_resellable: false,
      refund_amount: estimatedRefund,
      requested_by: req.user.id
    }, { transaction });

    await AuditLog.create({
      action: 'RETURN_REQUESTED',
      user_id: req.user.id,
      details: `Return ${returnNumber} requested for Sale ${sale.invoiceNumber} (${validatedItems.length} items)`,
      ip_address: req.ip
    }, { transaction });

    await transaction.commit();
    res.status(201).json(newReturn);
  } catch (err) {
    await transaction.rollback();
    res.status(400).json({ error: err.message });
  }
};

const reviewReturn = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    // Only super_admin, admin, or branch_admin (Manager) can review returns
    if (!['super_admin', 'branch_admin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to approve or reject returns.' });
    }

    const ret = await Return.findByPk(req.params.id, { transaction });
    if (!ret) throw new Error('Return record not found.');

    if (ret.status === 'Approved' || ret.status === 'Rejected') {
      return res.status(400).json({ error: `Return has already been ${ret.status.toLowerCase()}.` });
    }

    const { status, restock_resellable, refund_amount, notes } = req.body;
    if (!['Approved', 'Rejected'].includes(status)) {
      throw new Error('Review status must be either Approved or Rejected.');
    }

    ret.status = status;
    ret.reviewed_by = req.user.id;
    ret.reviewed_at = new Date();
    if (notes) ret.notes = notes;
    if (refund_amount !== undefined) ret.refund_amount = parseFloat(refund_amount);

    if (status === 'Approved') {
      const shouldRestock = !!restock_resellable;
      ret.restock_resellable = shouldRestock;

      if (shouldRestock) {
        const items = Array.isArray(ret.items) ? ret.items : [];
        for (const item of items) {
          const pid = item.product_id || item.productId;
          const qty = parseInt(item.quantity) || 0;
          if (!pid || qty <= 0) continue;

          let inv = await Inventory.findOne({
            where: { product_id: pid, branch_id: ret.branch_id },
            transaction
          });

          let prevStock = 0;
          if (!inv) {
            inv = await Inventory.create({
              product_id: pid,
              branch_id: ret.branch_id,
              quantity: qty,
              low_stock_threshold: 5
            }, { transaction });
          } else {
            prevStock = inv.quantity;
            inv.quantity += qty;
            await inv.save({ transaction });
          }

          await StockMovement.create({
            product_id: pid,
            type: 'RESTOCK',
            quantity: qty,
            previous_stock: prevStock,
            new_stock: inv.quantity,
            user_id: req.user.id,
            note: `Return Approved (${ret.return_number})`
          }, { transaction });
        }
      }
    }

    await ret.save({ transaction });

    await AuditLog.create({
      action: status === 'Approved' ? 'RETURN_APPROVED' : 'RETURN_REJECTED',
      user_id: req.user.id,
      details: `Return ${ret.return_number} ${status.toLowerCase()} by User #${req.user.id} (Restocked: ${ret.restock_resellable})`,
      ip_address: req.ip
    }, { transaction });

    await transaction.commit();
    res.json({ message: `Return ${status.toLowerCase()} successfully`, status: ret.status, returnRecord: ret });
  } catch (err) {
    await transaction.rollback();
    res.status(400).json({ error: err.message });
  }
};

module.exports = {
  createSale,
  // keep old name alias so any other import doesn't break
  createOrder: createSale,
  getSalesHistory,
  getComparativeSales,
  getSalesTrends,
  getDailyTrends,
  getProductPerformance,
  getReturns,
  createReturn,
  reviewReturn
};

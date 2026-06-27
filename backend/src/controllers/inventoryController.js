const { Branch, Inventory, Product, Category, Supplier, StockMovement } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../db');
const imageService = require('../services/imageService');
const { generateUniqueSku } = require('../utils/skuGenerator');

// Product Management
const getAllProducts = async (req, res) => {
  try {
    const products = await Product.findAll();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createProduct = async (req, res) => {
  try {
    const { name, sku: bodySku, description, category_id, price, branch_id, initial_stock } = req.body;
    let image_url = null;

    if (req.file) {
      try {
        image_url = await imageService.processProductImage(req.file.buffer);
      } catch (imgError) {
        console.error('[IMAGE PROCESS ERROR]', imgError);
        return res.status(400).json({ error: 'Image processing failed: ' + imgError.message });
      }
    }

    let product;
    let retries = 10;
    let sku = bodySku;

    while (retries > 0) {
      try {
        if (!sku) {
          sku = await generateUniqueSku(category_id);
        }
        product = await Product.create({ 
          name, 
          sku, 
          description, 
          category_id: category_id || null, 
          price, 
          last_purchase_price: price,
          image_url
        });
        break; // success!
      } catch (err) {
        const isSkuConflict = err.name === 'SequelizeUniqueConstraintError' && 
                             err.errors && 
                             err.errors.some(e => e.path === 'sku');
        if (isSkuConflict && !bodySku) {
          retries--;
          sku = null; // force regeneration
          if (retries === 0) {
            throw new Error('Failed to generate a unique SKU after 10 attempts.');
          }
          await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
        } else {
          throw err;
        }
      }
    }

    // Handle role checks for branch assignment
    const userRole = req.user?.role;
    const userBranchId = req.user?.branch_id;
    let targetBranchId = branch_id;
    if (userRole === 'branch_admin') {
      targetBranchId = userBranchId;
    }
    
    // Automatically initialize inventory for all branches
    const branches = await Branch.findAll();
    const inventoryData = branches.map(branch => ({
      product_id: product.id,
      branch_id: branch.id,
      quantity: (targetBranchId && String(branch.id) === String(targetBranchId)) ? parseInt(initial_stock || 0) : 0
    }));
    await Inventory.bulkCreate(inventoryData);

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateStock = async (req, res) => {
  try {
    const { product_id, branch_id, quantity, low_stock_threshold } = req.body;
    
    // Security Enforcement
    if (req.user.role === 'branch_admin' && parseInt(branch_id) !== req.user.branch_id) {
      return res.status(403).json({ message: 'Forbidden: You can only manage inventory for your assigned sector.' });
    }

    const inventory = await Inventory.findOne({ where: { product_id, branch_id } });
    if (!inventory) return res.status(404).json({ message: 'Inventory record not found for this sector.' });

    if (quantity !== undefined) inventory.quantity = quantity;
    if (low_stock_threshold !== undefined) inventory.low_stock_threshold = low_stock_threshold;
    
    await inventory.save();

    // Trigger low-stock notification to branch admin if stock falls below threshold
    if (quantity !== undefined && inventory.quantity <= inventory.low_stock_threshold) {
      const { Notification, User, Product } = require('../models');
      const branchAdmins = await User.findAll({
        where: { role: 'branch_admin', branch_id: inventory.branch_id }
      });
      const product = await Product.findByPk(inventory.product_id, { attributes: ['name'] });
      if (branchAdmins.length > 0 && product) {
        const alerts = branchAdmins.map(admin => ({
          userId: admin.id,
          branchId: inventory.branch_id,
          title: 'Low Stock Alert',
          message: `${product.name} is running low (${inventory.quantity} units left). Consider submitting a restock request.`,
          type: 'low_stock',
          link: `/inventory`
        }));
        await Notification.bulkCreate(alerts);
      }
    }

    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getInventory = async (req, res) => {
  try {
    const { branch_id, search, sortField = 'id', sortDir = 'ASC', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = {};
    let productWhere = {};

    if (req.user.role === 'branch_admin' || req.user.role === 'employee') {
      where.branch_id = req.user.branch_id;
    } else if (branch_id) {
      where.branch_id = branch_id;
    }

    if (search) {
      productWhere = {
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { sku: { [Op.like]: `%${search}%` } }
        ]
      };
    }

    const order = sortField === 'product_name' 
      ? [[Product, 'name', sortDir]] 
      : [[sortField, sortDir]];

    const { count, rows } = await Inventory.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: offset,
      order,
      include: [
        { 
          model: Product,
          where: productWhere,
          attributes: ['id', 'name', 'sku', 'price', 'last_purchase_price', 'description', 'category_id', 'supplier_id', 'product_image', 'image_url'],
          include: [{ model: Category }, { model: Supplier }]
        },
        { model: Branch }
      ]
    });

    res.json({
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const restockInventory = async (req, res) => {
  try {
    const { product_id, branch_id, quantity, supplier_id, cost_price } = req.body;
    
    // Security Enforcement
    if (req.user.role === 'employee' || (req.user.role === 'branch_admin' && parseInt(branch_id) !== req.user.branch_id)) {
      return res.status(403).json({ message: 'Forbidden: You cannot perform procurement for this sector.' });
    }

    const inventory = await Inventory.findOne({ where: { product_id, branch_id } });
    if (!inventory) return res.status(404).json({ message: 'Inventory record not found.' });

    const previous_stock = inventory.quantity;
    const new_stock = previous_stock + parseInt(quantity);
    inventory.quantity = new_stock;
    await inventory.save();

    // Log the event
    await StockMovement.create({
      product_id,
      type: 'RESTOCK',
      quantity: parseInt(quantity),
      previous_stock,
      new_stock,
      user_id: req.user.id,
      supplier_id,
      note: 'Procurement processed'
    });

    // Update Product Cost/Supplier
    const product = await Product.findByPk(product_id);
    if (product) {
      if (supplier_id) product.supplier_id = supplier_id;
      if (cost_price) product.last_purchase_price = cost_price;
      await product.save();
    }

    res.json({ message: 'Restock processed successfully', new_stock });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getStockHistory = async (req, res) => {
  try {
    const { id } = req.params; // product_id
    const history = await StockMovement.findAll({
      where: { product_id: id },
      include: [
        { model: require('../models/User'), attributes: ['name', 'role'] },
        { model: Supplier, attributes: ['name'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getLowStock = async (req, res) => {
  try {
    const { branch_id } = req.query;
    let where = {};
    if (req.user.role === 'branch_admin' || req.user.role === 'employee') {
      where.branch_id = req.user.branch_id;
    } else if (branch_id) {
      where.branch_id = branch_id;
    }

    const inventory = await Inventory.findAll({
      where: {
        ...where,
        quantity: { [Op.lte]: sequelize.col('low_stock_threshold') }
      },
      include: [
        { 
          model: Product, 
          attributes: ['id', 'name', 'sku', 'price', 'last_purchase_price', 'product_image', 'image_url'],
          include: [{ model: Category }] 
        },
        { model: Branch }
      ]
    });
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getGlobalInventoryStatus = async (req, res) => {
  try {
    const isSuperAdmin = req.user.role === 'super_admin';
    const branches = await Branch.findAll(isSuperAdmin ? {} : { where: { id: req.user.branch_id } });
    const products = await Product.findAll({
      attributes: ['id', 'name', 'sku']
    });

    const status = [];
    for (const product of products) {
      const stockPerBranch = {};
      for (const branch of branches) {
        const inv = await Inventory.findOne({
          where: { product_id: product.id, branch_id: branch.id }
        });
        stockPerBranch[branch.name] = inv ? inv.quantity : 0;
      }
      status.push({
        id: product.id,
        name: product.name,
        sku: product.sku,
        stock: stockPerBranch
      });
    }

    res.json({
      branches: branches.map(b => b.name),
      data: status
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getProductRestockAnalytics = async (req, res) => {
  try {
    const { product_id, branch_id } = req.query;
    const resolvedBranchId = req.user.role !== 'super_admin' ? req.user.branch_id : branch_id;
    const { Order, OrderItem } = require('../models');
    const { Op } = require('sequelize');

    // Get sales for the last 30 days
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - 30);

    const sales = await OrderItem.findAll({
      where: { product_id },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('OrderItem.quantity')), 'total_sold']
      ],
      include: [{
        model: Order,
        attributes: [],
        where: {
          branch_id: resolvedBranchId,
          createdAt: { [Op.gte]: dateLimit }
        }
      }],
      raw: true
    });

    const totalSold = parseInt(sales[0]?.total_sold || 0);
    const dailySales = parseFloat((totalSold / 30).toFixed(2));

    res.json({
      totalSold30Days: totalSold,
      dailySales,
      suggestedQuantity: Math.max(0, Math.ceil(dailySales * 14)) // 2 weeks of stock
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const adjustStock = async (req, res) => {
  try {
    const { product_id, branch_id, quantity, note } = req.body;
    
    // Security Enforcement
    if (req.user.role === 'employee' || (req.user.role === 'branch_admin' && parseInt(branch_id) !== req.user.branch_id)) {
      return res.status(403).json({ message: 'Forbidden: You cannot perform stock adjustments for this sector.' });
    }

    const inventory = await Inventory.findOne({ where: { product_id, branch_id } });
    if (!inventory) return res.status(404).json({ message: 'Inventory record not found.' });

    const previous_stock = inventory.quantity;
    const new_stock = previous_stock + parseInt(quantity);
    
    if (new_stock < 0) {
      return res.status(400).json({ error: 'Adjustment would result in negative stock level.' });
    }

    inventory.quantity = new_stock;
    await inventory.save();

    await StockMovement.create({
      product_id,
      type: 'ADJUSTMENT',
      quantity: parseInt(quantity),
      previous_stock,
      new_stock,
      user_id: req.user.id,
      note: note || 'Manual adjustment'
    });

    res.json({ message: 'Inventory adjusted successfully', new_stock });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id);
    if (!product) return res.status(404).json({ message: 'Product not found.' });

    // Verify transaction history to prevent DB constraint crashes
    const { SaleItem, PurchaseOrderItem, StockTransferItem, OrderItem, RestockRequest, ProductRequest } = require('../models');
    
    const [hasSales, hasPurchase, hasTransfer, hasLegacySales, hasRestock, hasProductReq] = await Promise.all([
      SaleItem.findOne({ where: { productId: id } }),
      PurchaseOrderItem.findOne({ where: { productId: id } }),
      StockTransferItem.findOne({ where: { productId: id } }),
      OrderItem.findOne({ where: { product_id: id } }),
      RestockRequest.findOne({ where: { product_id: id } }),
      ProductRequest.findOne({ where: { product_id: id } })
    ]);

    const isSoftDelete = !!(hasSales || hasPurchase || hasTransfer || hasLegacySales || hasRestock || hasProductReq);

    if (isSoftDelete) {
      // Soft-delete using standard destroy
      await product.destroy();
      return res.json({ message: 'Product contains transaction history. It has been safely archived (soft-deleted) to maintain data integrity.' });
    }

    // Safely clear assets now that we know there's no transaction history dependency
    await Inventory.destroy({ where: { product_id: id } });
    await StockMovement.destroy({ where: { product_id: id } });

    // Delete image files from disk if they exist
    if (product.image_url && product.image_url.startsWith('/uploads/products/')) {
      imageService.deleteProductImageFiles(product.image_url);
    }

    await product.destroy({ force: true }); // Force: true bypasses paranoid and hard-deletes
    res.json({ message: 'Product and associated inventory assets have been purged from the system.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product: ' + error.message });
  }
};

module.exports = { 
  getAllProducts, 
  createProduct, 
  updateStock, 
  getInventory, 
  getStockHistory, 
  getLowStock,
  getGlobalInventoryStatus,
  getProductRestockAnalytics,
  adjustStock,
  deleteProduct
};

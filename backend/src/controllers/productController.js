const { Product, Category, ProductBundle, Branch, Inventory } = require('../models');
const imageService = require('../services/imageService');
const { getPaginationParams } = require('../utils/pagination');
const { Op } = require('sequelize');
const { generateUniqueSku } = require('../utils/skuGenerator');

const getProducts = async (req, res) => {
  try {
    const { page, limit, offset, search, filter, sort } = getPaginationParams(req.query, 20);

    const where = {};
    const conditions = [];

    if (search) {
      conditions.push({
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { sku: { [Op.like]: `%${search}%` } }
        ]
      });
    }
    if (filter) {
      conditions.push({ category_id: filter });
    }

    const userRole = req.user?.role;
    const userBranchId = req.user?.branch_id;
    if (userRole === 'employee' || userRole === 'branch_admin') {
      conditions.push({
        [Op.or]: [
          { branch_id: userBranchId },
          { branch_id: null }
        ]
      });
    }

    if (conditions.length > 0) {
      where[Op.and] = conditions;
    }

    let order = [['name', 'ASC']];
    if (sort === 'name-asc') order = [['name', 'ASC']];
    if (sort === 'name-desc') order = [['name', 'DESC']];
    if (sort === 'price-asc') order = [['price', 'ASC']];
    if (sort === 'price-desc') order = [['price', 'DESC']];
    if (sort === 'newest') order = [['createdAt', 'DESC']];
    if (sort === 'oldest') order = [['createdAt', 'ASC']];

    const include = [
      Category,
      {
        model: Product,
        as: 'BundleItems',
        through: { attributes: ['quantity'] }
      }
    ];

    if (req.query.page || req.query.limit) {
      const { rows, count } = await Product.findAndCountAll({
        where,
        include,
        order,
        limit,
        offset,
        distinct: true // Ensure count is correct when using associations
      });
      res.json({
        data: rows,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit),
          hasMore: page * limit < count
        }
      });
    } else {
      const products = await Product.findAll({
        where,
        include,
        order
      });
      res.json(products);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createProduct = async (req, res) => {
  try {
    const { name, sku: bodySku, description, price, category_id, supplier_id, branch_id, initial_stock } = req.body;
    let image_url = null;

    if (req.file) {
      try {
        image_url = await imageService.processProductImage(req.file.buffer);
      } catch (imgError) {
        console.error('[IMAGE PROCESS ERROR]', imgError);
        return res.status(400).json({ error: 'Image processing failed: ' + imgError.message });
      }
    }

    // Handle role checks for branch assignment
    const userRole = req.user?.role;
    const userBranchId = req.user?.branch_id;
    let targetBranchId = branch_id;
    if (userRole === 'branch_admin' || userRole === 'employee') {
      targetBranchId = userBranchId;
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
          price,
          category_id: category_id || null,
          supplier_id: supplier_id || null,
          image_url,
          branch_id: targetBranchId ? parseInt(targetBranchId) : null
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
    res.status(400).json({ error: error.message });
  }
};

const createBundle = async (req, res) => {
  try {
    const { name, sku: bodySku, price, items, category_id } = req.body;
    
    let bundleProduct;
    let retries = 10;
    let sku = bodySku;

    while (retries > 0) {
      try {
        if (!sku) {
          sku = await generateUniqueSku(category_id, true);
        }
        bundleProduct = await Product.create({
          name,
          sku,
          price,
          is_bundle: true,
          category_id: category_id || null
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

    // Create associations in ProductBundle table
    if (items && items.length > 0) {
      const bundleItems = items.map(item => ({
        bundle_id: bundleProduct.id,
        product_id: item.product_id,
        quantity: item.quantity
      }));
      await ProductBundle.bulkCreate(bundleItems);
    }

    res.status(201).json(bundleProduct);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, sku, price, category_id, description, remove_image } = req.body;
    
    const product = await Product.findByPk(id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Validate sector authorization
    if (req.user.role !== 'super_admin' && product.branch_id !== req.user.branch_id) {
      return res.status(403).json({ message: 'Forbidden: You do not have permissions to modify this product.' });
    }

    if (name) product.name = name;
    if (sku) product.sku = sku;
    if (price !== undefined) product.price = price;
    if (category_id !== undefined) product.category_id = category_id;
    if (description !== undefined) product.description = description;

    // Handle Image upload / replacement / removal
    if (req.file) {
      // Delete old file if it exists
      if (product.image_url && product.image_url.startsWith('/uploads/products/')) {
        imageService.deleteProductImageFiles(product.image_url);
      }

      try {
        product.image_url = await imageService.processProductImage(req.file.buffer);
      } catch (imgError) {
        console.error('[IMAGE PROCESS ERROR]', imgError);
        return res.status(400).json({ error: 'Image processing failed: ' + imgError.message });
      }
    } else if (remove_image === 'true' || remove_image === true) {
      if (product.image_url && product.image_url.startsWith('/uploads/products/')) {
        imageService.deleteProductImageFiles(product.image_url);
      }
      product.image_url = null;
    }

    await product.save();
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = { getProducts, createProduct, createBundle, updateProduct };


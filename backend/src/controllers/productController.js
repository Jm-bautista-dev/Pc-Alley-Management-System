const { Product, Category, ProductBundle } = require('../models');
const imageService = require('../services/imageService');
const { getPaginationParams } = require('../utils/pagination');
const { Op } = require('sequelize');

const getProducts = async (req, res) => {
  try {
    const { page, limit, offset, search, filter, sort } = getPaginationParams(req.query, 20);

    const where = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { sku: { [Op.like]: `%${search}%` } }
      ];
    }
    if (filter) {
      where.category_id = filter;
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
    const { name, sku, description, price, category_id, supplier_id } = req.body;
    let image_url = null;
    let product_image = null;

    if (req.file) {
      try {
        product_image = await imageService.processProductImage(req.file.buffer);
        image_url = product_image; // Sync for backward compatibility
      } catch (imgError) {
        console.error('[IMAGE PROCESS ERROR]', imgError);
        return res.status(400).json({ error: 'Image processing failed: ' + imgError.message });
      }
    }

    const product = await Product.create({
      name,
      sku,
      description,
      price,
      category_id: category_id || null,
      supplier_id: supplier_id || null,
      image_url,
      product_image
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const createBundle = async (req, res) => {
  try {
    const { name, sku, price, items, category_id } = req.body;
    
    // Create the bundle product
    const bundleProduct = await Product.create({
      name,
      sku,
      price,
      is_bundle: true,
      category_id: category_id || null
    });

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

    if (name) product.name = name;
    if (sku) product.sku = sku;
    if (price !== undefined) product.price = price;
    if (category_id !== undefined) product.category_id = category_id;
    if (description !== undefined) product.description = description;

    // Handle Image upload / replacement / removal
    if (req.file) {
      // Delete old files if they exist
      if (product.product_image) {
        imageService.deleteProductImageFiles(product.product_image);
      } else if (product.image_url && product.image_url.startsWith('/uploads/products/')) {
        imageService.deleteProductImageFiles(product.image_url);
      }

      try {
        const newImagePath = await imageService.processProductImage(req.file.buffer);
        product.product_image = newImagePath;
        product.image_url = newImagePath; // Sync for backward compatibility
      } catch (imgError) {
        console.error('[IMAGE PROCESS ERROR]', imgError);
        return res.status(400).json({ error: 'Image processing failed: ' + imgError.message });
      }
    } else if (remove_image === 'true' || remove_image === true) {
      // Delete old files
      if (product.product_image) {
        imageService.deleteProductImageFiles(product.product_image);
      } else if (product.image_url && product.image_url.startsWith('/uploads/products/')) {
        imageService.deleteProductImageFiles(product.image_url);
      }
      product.product_image = null;
      product.image_url = null;
    }

    await product.save();
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = { getProducts, createProduct, createBundle, updateProduct };


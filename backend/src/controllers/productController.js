const { Product, Category, Brand, ProductBundle, Branch, Inventory } = require('../models');
const imageService = require('../services/imageService');
const { getPaginationParams } = require('../utils/pagination');
const { Op } = require('sequelize');
const { generateUniqueSku } = require('../utils/skuGenerator');
const sequelize = require('../db');

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
    if (req.query.brand_id) {
      conditions.push({ brand_id: req.query.brand_id });
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
      Brand,
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
    const { name, sku: bodySku, description, price, category_id, supplier_id, branch_id, initial_stock, brand_id, barcode, specifications, status } = req.body;
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
          brand_id: brand_id || null,
          barcode: barcode || null,
          specifications: specifications || null,
          status: status || 'active',
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
    const { name, sku, price, category_id, description, remove_image, brand_id, barcode, specifications, status } = req.body;
    
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
    if (brand_id !== undefined) product.brand_id = brand_id;
    if (barcode !== undefined) product.barcode = barcode;
    if (specifications !== undefined) product.specifications = specifications;
    if (status !== undefined) product.status = status;
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

const bulkImportProducts = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { products, options } = req.body;
    const { create_missing_categories, create_missing_brands, update_existing_products, skip_duplicates, merge_stock, dry_run, branch_assignment, branch_ids, auto_publish } = options || {};

    const summary = {
      imported: 0,
      updated: 0,
      skipped: 0,
      createdCategories: 0,
      createdBrands: 0,
      warnings: [],
      createdIds: []
    };

    let categoriesCache = await Category.findAll({ transaction: t });
    let brandsCache = await Brand.findAll({ transaction: t });
    const branches = await Branch.findAll({ transaction: t });

    // Determine which branches to distribute products to
    let targetBranches = [];
    if (branch_assignment === 'all') {
      targetBranches = branches;
    } else if (branch_assignment === 'selected' && Array.isArray(branch_ids) && branch_ids.length > 0) {
      targetBranches = branches.filter(b => branch_ids.map(String).includes(String(b.id)));
    } else {
      // 'catalog_only' or default — still distribute to all branches for backward compat
      targetBranches = branches;
    }

    const shouldEnable = auto_publish !== false; // default true

    let uncategorizedCategory = categoriesCache.find(c => c.name.toLowerCase() === 'uncategorized');
    if (!uncategorizedCategory) {
      uncategorizedCategory = await Category.create({ name: 'Uncategorized', slug: 'uncategorized' }, { transaction: t });
      categoriesCache.push(uncategorizedCategory);
      summary.createdCategories++;
    }

    let unassignedBrand = brandsCache.find(b => b.name.toLowerCase() === 'unassigned');
    if (!unassignedBrand) {
      unassignedBrand = await Brand.create({ name: 'Unassigned', slug: 'unassigned', status: 'active' }, { transaction: t });
      brandsCache.push(unassignedBrand);
      summary.createdBrands++;
    }

    for (let index = 0; index < products.length; index++) {
      const row = products[index];
      const rowNum = index + 2;

      let { category, brand, sku, name, variant, price, stock, specifications } = row;

      const categoryName = category ? category.toString().trim() : '';
      const brandName = brand ? brand.toString().trim() : '';
      const productName = name ? name.toString().trim() : '';
      const variationName = variant ? variant.toString().trim() : '';

      let parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        summary.warnings.push({ row: rowNum, error: `Invalid price "${price}", default to 0` });
        parsedPrice = 0;
      }
      let parsedStock = parseInt(stock);
      if (isNaN(parsedStock) || parsedStock < 0) {
        summary.warnings.push({ row: rowNum, error: `Invalid stock "${stock}", default to 0` });
        parsedStock = 0;
      }

      if (!productName) {
        summary.warnings.push({ row: rowNum, error: 'Product name missing, skipped row.' });
        summary.skipped++;
        continue;
      }

      let finalProductName = productName;
      if (variationName) {
        finalProductName = `${productName} - ${variationName}`;
      }

      let targetCategoryId = null;
      if (categoryName) {
        let cat = categoriesCache.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
        if (!cat) {
          if (create_missing_categories) {
            cat = await Category.create({ name: categoryName, slug: categoryName.toLowerCase().replace(/\s+/g, '-') }, { transaction: t });
            categoriesCache.push(cat);
            summary.createdCategories++;
            targetCategoryId = cat.id;
          } else {
            summary.warnings.push({ row: rowNum, error: `Category "${categoryName}" missing. Fallback to Uncategorized.` });
            targetCategoryId = uncategorizedCategory.id;
          }
        } else {
          targetCategoryId = cat.id;
        }
      } else {
        summary.warnings.push({ row: rowNum, error: 'Category missing. Assigned to Uncategorized Category.' });
        targetCategoryId = uncategorizedCategory.id;
      }

      let targetBrandId = unassignedBrand.id;
      if (brandName) {
        let br = brandsCache.find(b => b.name.toLowerCase() === brandName.toLowerCase());
        if (!br) {
          if (create_missing_brands) {
            br = await Brand.create({ name: brandName, slug: brandName.toLowerCase().replace(/\s+/g, '-'), status: 'active' }, { transaction: t });
            brandsCache.push(br);
            summary.createdBrands++;
            targetBrandId = br.id;
          } else {
            summary.warnings.push({ row: rowNum, error: `Brand "${brandName}" missing. Fallback to Unassigned Brand.` });
          }
        } else {
          targetBrandId = br.id;
        }
      } else {
        summary.warnings.push({ row: rowNum, error: 'Brand missing. Assigned to Unassigned Brand.' });
      }

      let existingProduct = null;
      if (sku) {
        existingProduct = await Product.findOne({ where: { sku: sku.toString().trim() }, transaction: t });
      }

      if (!existingProduct) {
        existingProduct = await Product.findOne({ where: { name: finalProductName }, transaction: t });
      }

      if (existingProduct) {
        if (skip_duplicates) {
          summary.skipped++;
          continue;
        }

        if (update_existing_products) {
          existingProduct.price = parsedPrice;
          existingProduct.category_id = targetCategoryId;
          if (targetBrandId) existingProduct.brand_id = targetBrandId;
          if (specifications) existingProduct.specifications = specifications.toString().trim();
          await existingProduct.save({ transaction: t });

          for (const branch of targetBranches) {
            const inventory = await Inventory.findOne({ where: { product_id: existingProduct.id, branch_id: branch.id }, transaction: t });
            if (inventory) {
              if (merge_stock) {
                inventory.stock += parsedStock;
              } else {
                inventory.stock = parsedStock;
              }
              // Set/sync details if updating existing
              inventory.price = parsedPrice || null;
              inventory.enabled = shouldEnable;
              await inventory.save({ transaction: t });
            } else {
              await Inventory.create({
                product_id: existingProduct.id,
                branch_id: branch.id,
                stock: parsedStock,
                price: parsedPrice || null,
                enabled: shouldEnable,
                low_stock_threshold: 10
              }, { transaction: t });
            }
          }
          summary.updated++;
          continue;
        } else {
          summary.warnings.push({ row: rowNum, error: `Duplicate product "${finalProductName}" found. Skipping.` });
          summary.skipped++;
          continue;
        }
      }

      let finalSku = sku ? sku.toString().trim() : null;
      if (!finalSku) {
        finalSku = await generateUniqueSku(targetCategoryId);
        summary.warnings.push({ row: rowNum, error: `SKU missing. Generated SKU: ${finalSku}` });
      }

      const newProduct = await Product.create({
        name: finalProductName,
        sku: finalSku,
        price: parsedPrice,
        category_id: targetCategoryId,
        brand_id: targetBrandId,
        specifications: specifications ? specifications.toString().trim() : null,
        status: 'active'
      }, { transaction: t });

      const inventories = targetBranches.map(branch => ({
        product_id: newProduct.id,
        branch_id: branch.id,
        stock: parsedStock,
        price: parsedPrice || null,
        enabled: shouldEnable,
        low_stock_threshold: 10
      }));
      await Inventory.bulkCreate(inventories, { transaction: t });

      summary.imported++;
      summary.createdIds.push(newProduct.id);
    }

    if (dry_run) {
      await t.rollback();
      res.json({ ...summary, dryRunCommitted: false, message: 'Dry Run Complete. No data saved.' });
    } else {
      await t.commit();

      // Trigger automatic Post-Import Repair to verify and enforce visibility defaults
      try {
        const [uncat] = await Category.findOrCreate({
          where: { name: 'Uncategorized' },
          defaults: { slug: 'uncategorized' }
        });
        const [unassignedBr] = await Brand.findOrCreate({
          where: { name: 'Unassigned' },
          defaults: { slug: 'unassigned', status: 'active' }
        });

        await Product.update({ category_id: uncat.id }, { where: { category_id: null, deleted_at: null } });
        await Product.update({ brand_id: unassignedBr.id }, { where: { brand_id: null, deleted_at: null } });
        await Product.update({ status: 'active' }, { where: { status: { [Op.or]: [null, ''] }, deleted_at: null } });

        const activeBranches = await Branch.findAll();
        const activeProducts = await Product.findAll({ where: { deleted_at: null } });

        for (const prod of activeProducts) {
          for (const br of activeBranches) {
            await Inventory.findOrCreate({
              where: { product_id: prod.id, branch_id: br.id },
              defaults: {
                stock: 0,
                price: null,
                enabled: true,
                low_stock_threshold: 10
              }
            });
          }
        }
        await Inventory.update({ enabled: true }, { where: { enabled: null } });
      } catch (repairErr) {
        console.error("Automatic post-import recovery skipped/failed:", repairErr);
      }

      res.json({ ...summary, dryRunCommitted: true, message: 'Bulk Product Import Complete!' });
    }
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: error.message });
  }
};

const undoBulkImport = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { createdIds } = req.body;
    if (!createdIds || !Array.isArray(createdIds) || createdIds.length === 0) {
      return res.status(400).json({ error: 'No created IDs provided to rollback.' });
    }

    await Inventory.destroy({ where: { product_id: { [Op.in]: createdIds } }, transaction: t });
    await Product.destroy({ where: { id: { [Op.in]: createdIds } }, force: true, transaction: t });

    await t.commit();
    res.json({ message: `Successfully reverted ${createdIds.length} imported products and clean inventories.` });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getProducts, createProduct, createBundle, updateProduct, bulkImportProducts, undoBulkImport };


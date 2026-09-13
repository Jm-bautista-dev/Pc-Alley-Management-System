const { Bundle, BundleItem, BundleBranch, Product, Branch } = require('../models');
const sequelize = require('../db');
const { Op } = require('sequelize');

/**
 * Get all bundles with item details and available branches
 * Role-aware:
 * - super_admin: can view all bundles or filter by ?branch_id=X
 * - branch_admin & staff: automatically scoped to their branch (req.user.branch_id)
 */
const getBundles = async (req, res) => {
  try {
    const { branch_id, status, search } = req.query;
    const userRole = (req.user?.role || '').toLowerCase();
    const userBranchId = req.user?.branch_id;

    // Determine target branch filter
    let targetBranchId = null;
    if (userRole === 'super_admin') {
      if (branch_id) targetBranchId = parseInt(branch_id, 10);
    } else {
      // Non-super_admin users are strictly restricted to their assigned branch
      targetBranchId = userBranchId ? parseInt(userBranchId, 10) : null;
      if (!targetBranchId && branch_id) {
        targetBranchId = parseInt(branch_id, 10);
      }
    }

    const whereClause = {};
    if (status) {
      whereClause.status = status;
    }
    if (search) {
      whereClause.name = { [Op.like]: `%${search.trim()}%` };
    }

    const branchInclude = {
      model: Branch,
      as: 'branches',
      attributes: ['id', 'name', 'location'],
      through: { attributes: [] }
    };

    if (targetBranchId) {
      branchInclude.where = { id: targetBranchId };
    }

    const bundles = await Bundle.findAll({
      where: whereClause,
      include: [
        {
          model: BundleItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'Product',
              attributes: ['id', 'name', 'sku', 'price', 'product_image', 'image_url', 'description']
            }
          ]
        },
        branchInclude
      ],
      order: [['createdAt', 'DESC']]
    });

    // If targetBranchId was filtered, also fetch full branches list for each bundle if super_admin
    if (targetBranchId && userRole === 'super_admin') {
      const bundleIds = bundles.map(b => b.id);
      const allBranchesForBundles = await BundleBranch.findAll({
        where: { bundle_id: { [Op.in]: bundleIds } },
        include: [{ model: Branch, as: 'Branch', attributes: ['id', 'name', 'location'] }]
      });

      const branchesByBundle = {};
      allBranchesForBundles.forEach(bb => {
        if (!branchesByBundle[bb.bundle_id]) branchesByBundle[bb.bundle_id] = [];
        if (bb.Branch) branchesByBundle[bb.bundle_id].push(bb.Branch);
      });

      bundles.forEach(b => {
        b.setDataValue('branches', branchesByBundle[b.id] || b.branches || []);
      });
    }

    return res.status(200).json(bundles);
  } catch (error) {
    console.error('Error fetching bundles:', error);
    return res.status(500).json({ message: 'Failed to retrieve bundles', error: error.message });
  }
};

/**
 * Get a single bundle by ID
 */
const getBundleById = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = (req.user?.role || '').toLowerCase();
    const userBranchId = req.user?.branch_id;

    const bundle = await Bundle.findByPk(id, {
      include: [
        {
          model: BundleItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'Product',
              attributes: ['id', 'name', 'sku', 'price', 'product_image', 'image_url', 'description']
            }
          ]
        },
        {
          model: Branch,
          as: 'branches',
          attributes: ['id', 'name', 'location'],
          through: { attributes: [] }
        }
      ]
    });

    if (!bundle) {
      return res.status(404).json({ message: 'Bundle not found' });
    }

    // Branch Admin isolation check
    if (userRole !== 'super_admin' && userBranchId) {
      const isAvailableInBranch = bundle.branches.some(b => Number(b.id) === Number(userBranchId));
      if (!isAvailableInBranch) {
        return res.status(403).json({ message: 'Forbidden: Bundle not available in your branch' });
      }
    }

    return res.status(200).json(bundle);
  } catch (error) {
    console.error('Error fetching bundle:', error);
    return res.status(500).json({ message: 'Failed to retrieve bundle', error: error.message });
  }
};

/**
 * Create a new bundle (Super Admin only)
 */
const createBundle = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { name, description, price, status = 'active', items, branch_ids } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ message: 'At least one product must be included in the bundle.' });
    }

    if (!branch_ids || !Array.isArray(branch_ids) || branch_ids.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ message: 'At least one branch must be selected for the bundle.' });
    }

    // Calculate fallback price if none specified
    let finalPrice = parseFloat(price);
    if (isNaN(finalPrice) || finalPrice < 0) {
      const productIds = items.map(i => i.product_id);
      const products = await Product.findAll({ where: { id: productIds }, transaction });
      const priceMap = new Map(products.map(p => [p.id, parseFloat(p.price || 0)]));
      finalPrice = items.reduce((sum, item) => {
        const pPrice = priceMap.get(item.product_id) || 0;
        const qty = parseInt(item.quantity, 10) || 1;
        return sum + (pPrice * qty);
      }, 0);
    }

    // 1. Create Bundle
    const bundle = await Bundle.create({
      name: name.trim(),
      description: description ? description.trim() : null,
      price: finalPrice,
      status: status || 'active'
    }, { transaction });

    // 2. Create Bundle Items
    const bundleItemsData = items.map(item => ({
      bundle_id: bundle.id,
      product_id: parseInt(item.product_id, 10),
      quantity: Math.max(1, parseInt(item.quantity, 10) || 1)
    }));
    await BundleItem.bulkCreate(bundleItemsData, { transaction });

    // 3. Create Bundle Branch Associations
    const uniqueBranchIds = Array.from(new Set(branch_ids.map(b => parseInt(b, 10)))).filter(Boolean);
    const bundleBranchesData = uniqueBranchIds.map(branchId => ({
      bundle_id: bundle.id,
      branch_id: branchId
    }));
    await BundleBranch.bulkCreate(bundleBranchesData, { transaction });

    await transaction.commit();

    // Fetch and return complete created bundle
    const createdBundle = await Bundle.findByPk(bundle.id, {
      include: [
        {
          model: BundleItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'Product',
              attributes: ['id', 'name', 'sku', 'price', 'product_image', 'image_url']
            }
          ]
        },
        {
          model: Branch,
          as: 'branches',
          attributes: ['id', 'name', 'location'],
          through: { attributes: [] }
        }
      ]
    });

    return res.status(201).json(createdBundle);
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating bundle:', error);
    return res.status(500).json({ message: 'Failed to create bundle', error: error.message });
  }
};

/**
 * Update an existing bundle (Super Admin only)
 */
const updateBundle = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { name, description, price, status, items, branch_ids } = req.body;

    const bundle = await Bundle.findByPk(id, { transaction });
    if (!bundle) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Bundle not found' });
    }

    if (name) bundle.name = name.trim();
    if (description !== undefined) bundle.description = description ? description.trim() : null;
    if (price !== undefined) {
      const p = parseFloat(price);
      if (!isNaN(p) && p >= 0) bundle.price = p;
    }
    if (status) bundle.status = status;

    await bundle.save({ transaction });

    // Update items if provided
    if (items && Array.isArray(items)) {
      await BundleItem.destroy({ where: { bundle_id: bundle.id }, transaction });
      if (items.length > 0) {
        const bundleItemsData = items.map(item => ({
          bundle_id: bundle.id,
          product_id: parseInt(item.product_id, 10),
          quantity: Math.max(1, parseInt(item.quantity, 10) || 1)
        }));
        await BundleItem.bulkCreate(bundleItemsData, { transaction });
      }
    }

    // Update branches if provided
    if (branch_ids && Array.isArray(branch_ids)) {
      await BundleBranch.destroy({ where: { bundle_id: bundle.id }, transaction });
      const uniqueBranchIds = Array.from(new Set(branch_ids.map(b => parseInt(b, 10)))).filter(Boolean);
      if (uniqueBranchIds.length > 0) {
        const bundleBranchesData = uniqueBranchIds.map(branchId => ({
          bundle_id: bundle.id,
          branch_id: branchId
        }));
        await BundleBranch.bulkCreate(bundleBranchesData, { transaction });
      }
    }

    await transaction.commit();

    const updatedBundle = await Bundle.findByPk(bundle.id, {
      include: [
        {
          model: BundleItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'Product',
              attributes: ['id', 'name', 'sku', 'price', 'product_image', 'image_url']
            }
          ]
        },
        {
          model: Branch,
          as: 'branches',
          attributes: ['id', 'name', 'location'],
          through: { attributes: [] }
        }
      ]
    });

    return res.status(200).json(updatedBundle);
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating bundle:', error);
    return res.status(500).json({ message: 'Failed to update bundle', error: error.message });
  }
};

/**
 * Delete a bundle (Super Admin only)
 */
const deleteBundle = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const bundle = await Bundle.findByPk(id, { transaction });
    if (!bundle) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Bundle not found' });
    }

    await BundleItem.destroy({ where: { bundle_id: bundle.id }, transaction });
    await BundleBranch.destroy({ where: { bundle_id: bundle.id }, transaction });
    await bundle.destroy({ transaction });

    await transaction.commit();
    return res.status(200).json({ message: 'Bundle deleted successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting bundle:', error);
    return res.status(500).json({ message: 'Failed to delete bundle', error: error.message });
  }
};

module.exports = {
  getBundles,
  getBundleById,
  createBundle,
  updateBundle,
  deleteBundle
};

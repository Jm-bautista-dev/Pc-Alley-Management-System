const { Notification } = require('../models');

const getNotifications = async (req, res) => {
  try {
    const where = {};
    if (req.user.role === 'super_admin') {
      if (req.query.branchId) {
        where.branchId = req.query.branchId;
      }
    } else {
      const { Op } = require('sequelize');
      where.userId = req.user.id;
      where[Op.or] = [
        { branchId: req.user.branch_id },
        { branchId: null }
      ];
    }

    const notifications = await Notification.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const markRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOne({
      where: { id, userId: req.user.id }
    });
    if (!notification) return res.status(404).json({ message: 'Notification not found.' });
    notification.isRead = true;
    await notification.save();
    res.json({ message: 'Marked as read.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const markAllRead = async (req, res) => {
  try {
    await Notification.update(
      { isRead: true },
      { where: { userId: req.user.id, isRead: false } }
    );
    res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteOne = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOne({
      where: { id, userId: req.user.id }
    });
    if (!notification) return res.status(404).json({ message: 'Notification not found.' });
    
    if (notification.type === 'restock_request') {
      return res.status(400).json({ message: 'Pending restock requests cannot be dismissed. They must be approved or rejected.' });
    }

    await notification.destroy();
    res.json({ message: 'Notification deleted.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const clearAll = async (req, res) => {
  try {
    const { Op } = require('sequelize');
    await Notification.destroy({ 
      where: { 
        userId: req.user.id,
        type: { [Op.ne]: 'restock_request' }
      } 
    });
    res.json({ message: 'All dismissible notifications cleared.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getNotifications, markRead, markAllRead, deleteOne, clearAll };

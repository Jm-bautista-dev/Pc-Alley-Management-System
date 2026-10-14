const { Notification } = require('../models');
const { Op } = require('sequelize');

// Helper to determine what notifications a user can see
const getRoleNotificationFilter = (user, query = {}) => {
  if (user.role === 'super_admin') {
    if (query.branchId) {
      return { branchId: query.branchId };
    }
    // Super admin sees all notifications or notifications intended for super admin / all branches
    return {};
  }

  // Branch Admin: sees notifications for their own branch or specifically assigned to their user
  if (user.role === 'branch_admin') {
    return {
      [Op.or]: [
        { branchId: user.branch_id },
        { userId: user.id }
      ]
    };
  }

  // Staff (employee): sees notifications assigned to them or to their branch
  return {
    [Op.or]: [
      { userId: user.id },
      { branchId: user.branch_id }
    ]
  };
};

const getNotifications = async (req, res) => {
  try {
    const where = getRoleNotificationFilter(req.user, req.query);

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
    const filter = getRoleNotificationFilter(req.user);
    const where = {
      id,
      ...filter
    };

    const notification = await Notification.findOne({ where });
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
    const filter = getRoleNotificationFilter(req.user);
    const where = {
      ...filter,
      isRead: false
    };

    await Notification.update(
      { isRead: true },
      { where }
    );
    res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteOne = async (req, res) => {
  try {
    const { id } = req.params;
    const filter = getRoleNotificationFilter(req.user);
    const where = {
      id,
      ...filter
    };

    const notification = await Notification.findOne({ where });
    if (!notification) return res.status(404).json({ message: 'Notification not found.' });

    await notification.destroy();
    res.json({ message: 'Notification deleted.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const clearAll = async (req, res) => {
  try {
    const filter = getRoleNotificationFilter(req.user);
    await Notification.destroy({ where: filter });
    res.json({ message: 'All notifications cleared.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getNotifications, markRead, markAllRead, deleteOne, clearAll };

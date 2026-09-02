const express = require('express');
const router = express.Router();
const { param } = require('express-validator');
const validate = require('../middleware/validate');
const { getNotifications, markRead, markAllRead, deleteOne, clearAll } = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/', getNotifications);
router.patch('/read-all', markAllRead);
router.delete('/clear-all', clearAll);

router.patch('/:id/read', [
  param('id').isInt().withMessage('Invalid notification ID.'),
  validate
], markRead);

router.delete('/:id', [
  param('id').isInt().withMessage('Invalid notification ID.'),
  validate
], deleteOne);

module.exports = router;

const express = require('express');
const router = express.Router();
const { getNotifications, markRead, markAllRead, deleteOne, clearAll } = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/',              getNotifications);
router.patch('/read-all',    markAllRead);   // MUST be before /:id
router.delete('/clear-all',  clearAll);      // MUST be before /:id
router.patch('/:id/read',    markRead);
router.delete('/:id',        deleteOne);     // single delete

module.exports = router;

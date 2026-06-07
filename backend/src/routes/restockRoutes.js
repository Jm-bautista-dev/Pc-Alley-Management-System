const express = require('express');
const router = express.Router();
const { createRequest, listRequests, approveRequest, rejectRequest } = require('../controllers/restockController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.post('/', authorizeRoles('super_admin', 'branch_admin'), createRequest);
router.get('/', authorizeRoles('super_admin', 'branch_admin'), listRequests);
router.patch('/:id/approve', authorizeRoles('super_admin'), approveRequest);
router.patch('/:id/reject', authorizeRoles('super_admin'), rejectRequest);

module.exports = router;

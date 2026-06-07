const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const {
  getAllTransfers,
  getTransferById,
  createTransfer,
  completeTransferRoute
} = require('../controllers/transferController');

router.use(authenticateToken);

router.get('/', getAllTransfers);
router.get('/:id', getTransferById);
router.post('/', createTransfer);
router.post('/:id/complete', completeTransferRoute);

module.exports = router;

const express = require('express');
const router = express.Router();
const borrowingController = require('../controllers/borrowingController');
const { auth } = require('../middleware/auth');

router.get('/overdue', borrowingController.getOverdueBooks);
router.get('/', auth, borrowingController.getAllBorrowings);
router.get('/user/:userId', auth, borrowingController.getUserBorrowings);
router.post('/', auth, borrowingController.borrowBook);
router.put('/:id/return', auth, borrowingController.returnBook);

module.exports = router;
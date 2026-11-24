const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notificationController');
const { auth } = require('../middleware/auth');

router.get('/', auth, NotificationController.getMyNotifications);
router.put('/mark-all-read', auth, NotificationController.markAllRead);
router.put('/:id/mark-read', auth, NotificationController.markRead);

module.exports = router;

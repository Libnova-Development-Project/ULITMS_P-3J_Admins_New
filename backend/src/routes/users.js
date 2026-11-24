const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', auth, userController.getAllUsers);
router.post('/', auth, adminOnly, userController.createUser);
router.put('/:id/status', auth, adminOnly, userController.updateUserStatus);
router.get('/:id', auth, userController.getUserProfile);
router.put('/:id', auth, userController.updateUserProfile);
router.put('/:id/password', auth, userController.changePassword);
router.delete('/:id', auth, userController.deleteUser);

// Avatar upload route
router.post('/:id/avatar', auth, upload.single('avatar'), userController.uploadAvatar);

module.exports = router;

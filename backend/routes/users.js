const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth } = require('../middleware/auth');

router.get('/', auth, userController.getAllUsers);
router.get('/profile/:id', auth, userController.getUserProfile);
router.put('/:id', auth, userController.updateUserProfile);
router.put('/:id/password', auth, userController.changePassword);
router.delete('/:id', auth, userController.deleteUser);

module.exports = router;
const express = require('express');
const router = express.Router();
const peripheralController = require('../controllers/peripheralController');
const { auth } = require('../middleware/auth');

router.get('/', peripheralController.getAllPeripherals);
router.get('/categories', peripheralController.getCategories);
router.get('/:id', peripheralController.getPeripheralById);
router.post('/', auth, peripheralController.createPeripheral);
router.post('/categories', auth, peripheralController.createCategory);
router.put('/:id', auth, peripheralController.updatePeripheral);
router.put('/:id/condition', auth, peripheralController.updateCondition);
router.delete('/:id', auth, peripheralController.deletePeripheral);

module.exports = router;
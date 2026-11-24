const express = require('express');
const router = express.Router();
const damageReportController = require('../controllers/damageReportController');
const { auth } = require('../middleware/auth');

router.get('/', damageReportController.getAllReports);
router.get('/stats', damageReportController.getStats);
router.get('/:id', damageReportController.getReportById);
router.post('/', auth, damageReportController.createReport);
router.put('/:id/resolve', auth, damageReportController.resolveReport);

module.exports = router;
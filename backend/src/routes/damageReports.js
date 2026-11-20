const express = require('express');
const router = express.Router();
const damageReportController = require('../controllers/damageReportController');
const { auth, adminOnly } = require('../middleware/auth');

router.get('/', auth, adminOnly, damageReportController.getAllReports);
router.get('/stats', auth, adminOnly, damageReportController.getStats);
router.get('/:id', auth, adminOnly, damageReportController.getReportById);
router.post('/', auth, damageReportController.createReport);
router.put('/:id/resolve', auth, damageReportController.resolveReport);

module.exports = router;

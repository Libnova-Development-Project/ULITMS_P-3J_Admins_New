const express = require('express');
const router = express.Router();
const elibraryController = require('../controllers/elibraryController');
const { auth } = require('../middleware/auth');

router.get('/units', auth, elibraryController.getAllUnits);
router.get('/units/:id', auth, elibraryController.getUnitById);
router.post('/units', auth, elibraryController.createUnit);
router.put('/units/:id', auth, elibraryController.updateUnit);
router.delete('/units/:id', auth, elibraryController.deleteUnit);

router.get('/sessions', auth, elibraryController.getAllSessions);
router.get('/sessions/active', auth, elibraryController.getActiveSessions);
router.get('/sessions/user/:userId', auth, elibraryController.getUserSessions);
router.post('/sessions/start', auth, elibraryController.startSession);
router.put('/sessions/:id/end', auth, elibraryController.endSession);

module.exports = router;
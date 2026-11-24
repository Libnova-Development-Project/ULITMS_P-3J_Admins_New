const router = require('express').Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const rate = require('../middleware/rateLimit');
const s = require('../validators/schemas');

const auth = require('../controllers/authController');
const book = require('../controllers/bookController');
const borrow = require('../controllers/borrowController');
const lib = require('../controllers/elibraryController');
const dmg = require('../controllers/damageController');
const admin = require('../controllers/adminController');

const admins = [authenticate, authorize('admin')];
const user = [authenticate];
const id = validate(s.idParam, 'params');

router.post('/auth/register', validate(s.register), auth.register);
router.post('/auth/login', rate.login, validate(s.login), auth.login);
router.get('/auth/me', user, auth.me);

router.get('/books', user, validate(s.bookSearch, 'query'), book.search);
router.get('/books/:id', user, id, book.getOne);
router.post('/books', admins, validate(s.bookCreate), book.create);
router.put('/books/:id', admins, id, validate(s.bookUpdate), book.update);
router.delete('/books/:id', admins, id, book.remove);

router.post('/borrowings', user, validate(s.borrowCreate), borrow.submit);
router.get('/borrowings/mine', user, borrow.mine);
router.get('/borrowings/pending', admins, borrow.pending);
router.get('/borrowings/active', admins, borrow.active);
router.post('/borrowings/mark-overdue', admins, borrow.markOverdue);
router.put('/borrowings/:id/decision', admins, id, validate(s.decision), borrow.decide);
router.put('/borrowings/:id/issue', admins, id, borrow.issue);
router.put('/borrowings/:id/return-request', user, id, borrow.requestReturn);
router.put('/borrowings/:id/confirm-return', admins, id, borrow.confirmReturn);

router.get('/elibrary/units', user, lib.units);
router.post('/elibrary/sessions', user, validate(s.sessionStart), lib.start);
router.put('/elibrary/sessions/:id/end', user, id, lib.end);

router.post('/damage-reports', user, validate(s.damageCreate), dmg.create);
router.get('/damage-reports', admins, dmg.open);
router.put('/damage-reports/:id/resolve', admins, id, validate(s.damageResolve), dmg.resolve);

router.get('/users', admins, admin.listUsers);
router.put('/users/:id', admins, id, validate(s.userUpdate), admin.updateUser);
router.delete('/users/:id', admins, id, admin.removeUser);

router.get('/notifications', user, admin.notifications);
router.put('/notifications/:id/read', user, id, admin.markRead);

router.get('/dashboard', admins, admin.dashboard);
router.get('/reports/inventory', admins, admin.inventoryReport);
router.get('/audit-logs', admins, validate(s.auditQuery, 'query'), admin.audit);

module.exports = router;

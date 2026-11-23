const router=require('express').Router();
const c=require('../controllers/notificationController');
const {auth}=require('../middleware/auth');
const {idParam}=require('../middleware/validate');
router.get('/',auth,c.list);
router.put('/mark-all-read',auth,c.markAllRead);
router.put('/:id/mark-read',auth,idParam,c.markRead);
module.exports=router;

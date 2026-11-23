const router=require('express').Router();
const c=require('../controllers/bookController');
const {auth,adminOnly}=require('../middleware/auth');
const {idParam}=require('../middleware/validate');
router.get('/all',auth,adminOnly,c.categoriesAdmin);
router.get('/',c.categories);
router.post('/',auth,adminOnly,c.createCategory);
router.put('/:id/status',auth,adminOnly,idParam,c.setCategoryStatus);
module.exports=router;

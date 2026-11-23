const router=require('express').Router();
const authController=require('../controllers/authController');
const userController=require('../controllers/userController');
const {auth}=require('../middleware/auth');
router.get('/',auth,authController.me);
router.put('/password',auth,(req,res,next)=>{req.params.id=String(req.user.user_id);next();},userController.changePassword);
module.exports=router;

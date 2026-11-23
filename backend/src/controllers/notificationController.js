const Model=require('../models/notificationModel');
exports.list=async(req,res,next)=>{try{res.json({success:true,data:await Model.list(req.user.user_id)});}catch(e){next(e);}};
exports.markRead=async(req,res,next)=>{try{if(!await Model.markRead(req.params.id,req.user.user_id))return res.status(404).json({success:false,message:'Notification not found.'});res.json({success:true,message:'Notification marked as read.'});}catch(e){next(e);}};
exports.markAllRead=async(req,res,next)=>{try{const count=await Model.markAllRead(req.user.user_id);res.json({success:true,data:{updated:count}});}catch(e){next(e);}};

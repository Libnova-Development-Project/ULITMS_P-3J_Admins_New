const Model=require('../models/elibraryModel');
exports.units=async(req,res,next)=>{try{res.json({success:true,data:{units:await Model.units()}});}catch(e){next(e);}};
exports.unit=async(req,res,next)=>{try{const unit=await Model.unit(req.params.id);if(!unit)return res.status(404).json({success:false,message:'Unit not found.'});res.json({success:true,data:{unit}});}catch(e){next(e);}};
exports.createUnit=async(req,res,next)=>{try{req.body.unit_code=req.body.unit_code||req.body.unit_number;
if(!req.body.specifications&&req.body.specs)req.body.specifications=req.body.specs;
if(req.body.specifications!==undefined&&(!req.body.specifications||typeof req.body.specifications!=='object'||Array.isArray(req.body.specifications)))return res.status(400).json({success:false,message:'specifications must be a JSON object.'});
if(!req.body.unit_code?.trim())return res.status(400).json({success:false,message:'unit_code is required.'});const unit=await Model.createUnit(req.body,req.user.user_id);res.status(201).json({success:true,data:{unit}});}catch(e){next(e);}};
exports.updateUnit=async(req,res,next)=>{try{const updates={...req.body,unit_code:req.body.unit_code||req.body.unit_number,specifications:req.body.specifications||req.body.specs};
const unit=await Model.updateUnit(req.params.id,updates,req.user.user_id);if(!unit)return res.status(404).json({success:false,message:'Unit not found.'});res.json({success:true,data:{unit}});}catch(e){next(e);}};
exports.deleteUnit=async(req,res,next)=>{try{if(!await Model.deleteUnit(req.params.id,req.user.user_id))return res.status(404).json({success:false,message:'Unit not found.'});res.json({success:true,message:'Unit deactivated.'});}catch(e){next(e);}};
exports.startSession=async(req,res,next)=>{try{if(!req.body.unit_id)return res.status(400).json({success:false,message:'unit_id is required.'});const session=await Model.startSession(req.user.user_id,Number(req.body.unit_id),req.body.purpose);res.status(201).json({success:true,data:{session}});}catch(e){next(e);}};
exports.endSession=async(req,res,next)=>{try{const session=await Model.endSession(req.params.id,req.user.user_id,req.user.role==='admin');if(!session)return res.status(404).json({success:false,message:'Active session not found.'});res.json({success:true,data:{session}});}catch(e){next(e);}};
exports.sessions=async(req,res,next)=>{try{const requestedUserId=req.query.user_id?Number(req.query.user_id):undefined;
const userId=req.user.role==='admin'?requestedUserId:req.user.user_id;
if(requestedUserId&&req.user.role!=='admin'&&requestedUserId!==req.user.user_id)return res.status(403).json({success:false,message:'Access denied.'});
const rows=await Model.sessions({userId,limit:req.pagination.limit,offset:req.pagination.offset,activeOnly:req.query.active==='true'});res.json({success:true,data:{sessions:rows}});}catch(e){next(e);}};
exports.userSessions=async(req,res,next)=>{try{const userId=Number(req.params.userId);if(req.user.role!=='admin'&&userId!==req.user.user_id)return res.status(403).json({success:false,message:'Access denied.'});const sessions=await Model.sessions({userId,limit:req.pagination.limit,offset:req.pagination.offset});res.json({success:true,data:{sessions}});}catch(e){next(e);}};

exports.activeSessions=async(req,res,next)=>{try{const userId=req.user.role==='admin'?undefined:req.user.user_id;const sessions=await Model.sessions({userId,limit:200,offset:0,activeOnly:true});res.json({success:true,data:{sessions}});}catch(e){next(e);}};

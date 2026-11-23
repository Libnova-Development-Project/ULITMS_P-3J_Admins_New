const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');
const UserModel=require('../models/userModel');
function tokenFor(user){
  return jwt.sign({sub:String(user.user_id),role:user.role},process.env.JWT_SECRET,{expiresIn:process.env.JWT_EXPIRES_IN||'8h',algorithm:'HS256'});
}
exports.register=async(req,res,next)=>{
  try{
    const {first_name,last_name,email,password,contact_number,course,year_level}=req.body;
    const student_number=req.body.student_number || req.body.student_id;
    if(!student_number||!first_name||!last_name||!email||!password)
      return res.status(400).json({success:false,message:'Student number, name, email and password are required.'});
    if(year_level!==undefined&&year_level!==null&&year_level!==''&&(!Number.isInteger(Number(year_level))||Number(year_level)<1||Number(year_level)>6))return res.status(400).json({success:false,message:'year_level must be an integer from 1 to 6.'});
    if(String(password).length<8)return res.status(400).json({success:false,message:'Password must be at least 8 characters.'});
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({success:false,message:'A valid email is required.'});
    const hash=await bcrypt.hash(password,12);
    const user=await UserModel.create({student_number:String(student_number).trim(),first_name:String(first_name).trim(),last_name:String(last_name).trim(),email,password_hash:hash,contact_number,course,year_level:year_level?Number(year_level):null});
    return res.status(201).json({success:true,message:'Student account created.',data:{user,token:tokenFor(user)}});
  }catch(e){next(e);}
};
exports.login=async(req,res,next)=>{
  try{
    const {email,password}=req.body;
    if(!email||!password)return res.status(400).json({success:false,message:'Email and password are required.'});
    const authRecord=await UserModel.loginRecord(email);
    if(!authRecord||authRecord.out_status!=='active'||!(await bcrypt.compare(password,authRecord.out_password_hash)))
      return res.status(401).json({success:false,message:'Invalid credentials or account unavailable.'});
    const safe=await UserModel.findById(authRecord.out_user_id);
    if(!safe)return res.status(401).json({success:false,message:'Invalid credentials or account unavailable.'});
    return res.json({success:true,message:'Login successful.',data:{user:safe,token:tokenFor(safe)}});
  }catch(e){next(e);}
};
exports.logout=(req,res)=>res.json({success:true,message:'Remove the bearer token on the client to sign out.'});
exports.forgotPassword=async(req,res)=>{
  // Reset tokens are deliberately not stored in the supplied database schema.
  return res.status(501).json({success:false,message:'Password reset is not configured in the current database. Use the authenticated change-password endpoint or implement a verified reset-token table and delivery provider.'});
};
exports.resetPassword=async(req,res)=>{
  return res.status(501).json({success:false,message:'Password reset is not configured in the current database.'});
};
exports.me=async(req,res,next)=>{
  try{const user=await UserModel.findById(req.user.user_id);res.json({success:true,data:{user}});}catch(e){next(e);}
};

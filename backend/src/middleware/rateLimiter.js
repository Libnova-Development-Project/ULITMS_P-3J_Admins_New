const rateLimit=require('express-rate-limit');
const apiLimiter=rateLimit({windowMs:15*60*1000,max:500,standardHeaders:true,legacyHeaders:false,
  handler:(req,res)=>res.status(429).json({success:false,message:'Too many requests. Please try again later.'})});
const authLimiter=rateLimit({windowMs:15*60*1000,max:10,standardHeaders:true,legacyHeaders:false,skipSuccessfulRequests:true,
  handler:(req,res)=>res.status(429).json({success:false,message:'Too many authentication attempts. Try again later.'})});
module.exports={apiLimiter,authLimiter};

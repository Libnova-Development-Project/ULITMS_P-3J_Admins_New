require('dotenv').config();
const express=require('express');
const cors=require('cors');
const helmet=require('helmet');
const path=require('path');
const fs=require('fs');
const pool=require('./config/database');
const {apiLimiter}=require('./middleware/rateLimiter');
const {notFound,errorHandler}=require('./middleware/errorHandler');

const app=express();
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com', 'https://cdn.tailwindcss.com', 'https://cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com', 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'http://localhost:*', 'http://127.0.0.1:*', 'ws://localhost:*']
    }
  }
}));
const origins=(process.env.CORS_ORIGIN||'http://localhost:3000,http://localhost:5173').split(',').map(v=>v.trim()).filter(Boolean);
app.use(cors({origin(origin,cb){if(!origin||origins.includes(origin))return cb(null,true);const error=new Error('Origin is not allowed by CORS.'); error.status=403; return cb(error);},credentials:true}));
app.use(express.json({limit:'1mb'}));
app.use(express.urlencoded({extended:false,limit:'1mb'}));
app.use('/api',apiLimiter);

app.get('/api/health',async(req,res,next)=>{
  try{
    const r=await pool.query('SELECT CURRENT_TIMESTAMP AS time, current_schema() AS schema');
    res.json({success:true,status:'healthy',database:'connected',schema:r.rows[0].schema,time:r.rows[0].time,uptime_seconds:Math.floor(process.uptime())});
  }catch(e){next(e);}
});

app.use('/api/auth',require('./routes/auth'));
app.use('/api/books',require('./routes/books'));
app.use('/api/book-categories',require('./routes/bookcategories'));
app.use('/api/borrowings',require('./routes/borrowings'));
app.use('/api/users',require('./routes/users'));
app.use('/api/profile',require('./routes/profile'));
app.use('/api/elibrary',require('./routes/elibrary'));
app.use('/api/peripherals',require('./routes/peripherals'));
app.use('/api/damage-reports',require('./routes/damageReports'));
app.use('/api/notifications',require('./routes/notifications'));

// Optional frontend hosting; backend remains independently deployable.
const frontendPath=path.resolve(__dirname,'../../frontend');
if(fs.existsSync(path.join(frontendPath,'index.html'))){
  app.use(express.static(frontendPath));
  app.get('*',(req,res,next)=>req.path.startsWith('/api/')?next():res.sendFile(path.join(frontendPath,'index.html')));
}
app.use('/api',notFound);
app.use(errorHandler);
module.exports=app;

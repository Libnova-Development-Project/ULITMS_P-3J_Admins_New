require('dotenv').config();
const app=require('./src/app');
const PORT=Number(process.env.PORT||5000);
const server=app.listen(PORT,()=>console.log(`ULITMS API listening on port ${PORT}`));
async function shutdown(signal){
  console.log(`${signal} received; shutting down.`);
  server.close(async()=>{try{await require('./src/config/database').end();process.exit(0);}catch(e){console.error(e);process.exit(1);}});
  setTimeout(()=>process.exit(1),10000).unref();
}
process.on('SIGTERM',()=>shutdown('SIGTERM'));
process.on('SIGINT',()=>shutdown('SIGINT'));

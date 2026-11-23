const fs=require('fs');
const path=require('path');
const {spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..');
function walk(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
    const p=path.join(dir,e.name);
    if(e.isDirectory())return walk(p);
    return p.endsWith('.js')?[p]:[];
  });
}
const files=[path.join(root,'server.js'),...walk(path.join(root,'src'))];
let failed=0;
for(const file of files){
  const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  if(r.status!==0){failed++;console.error(`FAIL ${path.relative(root,file)}\n${r.stderr}`);}
}
console.log(`${files.length-failed}/${files.length} JavaScript files passed syntax checks.`);
process.exitCode=failed?1:0;

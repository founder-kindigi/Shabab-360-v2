// Refresh only the already isolated source snapshot, preserving its private generated client.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root=process.cwd(), file='docs/reviews/ui-restoration-2026-09-10/astra-build-sqlite-results.json';
const report=JSON.parse(fs.readFileSync(file));
if(report.build?.exitCode!==0) throw Error('Successful initial isolated build required');
fs.copyFileSync(file,'docs/reviews/ui-restoration-2026-09-10/initial-build-results.json');
report.finalRefresh=[];
for(const entry of report.files.filter(f=>f.path.startsWith('src/'))) {
  const content=fs.readFileSync(entry.path),sha256=createHash('sha256').update(content).digest('hex');
  if(sha256!==entry.sha256) {fs.writeFileSync(path.join(report.directory,entry.path),content);report.finalRefresh.push(entry.path);entry.sha256=sha256;}
}
report.sourceCopiedAt=new Date().toISOString();
const log=fs.openSync(path.join(report.directory,'final-build-output.log'),'w');
const result=spawnSync(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'build','--webpack'],{cwd:report.directory,env:{...process.env,DATABASE_URL:'file:./synthetic-build.db',DIRECT_URL:'postgresql://synthetic:synthetic@127.0.0.1:65439/synthetic',NEXTAUTH_SECRET:'synthetic-isolated-build-secret-no-real-accounts',NEXTAUTH_URL:'http://localhost:4319',NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore',log,log],timeout:1200000,windowsHide:true});
fs.closeSync(log);report.build={exitCode:result.status,signal:result.signal,error:result.error?.message??null};
fs.writeFileSync(file,JSON.stringify(report,null,2));console.log(JSON.stringify({build:report.build,refreshed:report.finalRefresh}));process.exitCode=result.status===0?0:1;

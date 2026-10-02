// Isolated component browser fixture. Synthetic responses only; never runs application APIs.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import { chromium } from '../../../.next/astra-browser-runtime/node_modules/playwright-core/index.mjs';
const root = process.cwd(), output = path.join(root, 'docs/reviews/ui-restoration-2026-09-10');
const temp = fs.mkdtempSync(path.join(root, '.next/ui-visual-'));
const imports = {
  more: ['admin/mobile-more-page', 'MobileMorePage'], fees: ['admin/fees-page', 'FeesPage'],
  calling: ['admin/mobile-calling-page', 'MobileCallingPage'], procurement: ['admin/procurement-page', 'ProcurementPage'],
  certificates: ['admin/certificates-page', 'CertificatesPage'], community: ['admin/community-page', 'CommunityPage'],
  islah: ['admin/islah-mamulat-page', 'IslahMamulatPage'], reports: ['admin/custom-report-builder-page', 'CustomReportBuilderPage'],
  sync: ['admin/sync-conflicts-page', 'SyncConflictsPage'], profiles: ['student/mobile-student-profile-view', 'MobileStudentProfileView'],
};
const entry = `import React from 'react'; import {createRoot} from 'react-dom/client';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {ThemeProvider} from '@/components/providers/theme-provider';
${Object.entries(imports).map(([id, [file, name]]) => `import {${name} as ${id}} from '@/components/modules/${file}';`).join('\n')}
const choices={${Object.keys(imports).join(',')}};const params=new URLSearchParams(location.search);const View=choices[params.get('screen')];
createRoot(document.getElementById('root')).render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><ThemeProvider defaultTheme={params.get('theme')||'light'}><View mobile={params.get('desktop')!=='1'} onBack={()=>{}} onNavigate={()=>{}} effectiveRole="city_head" /></ThemeProvider></QueryClientProvider>);`;
fs.writeFileSync(path.join(temp, 'entry.tsx'), entry);
await build({ entryPoints: [path.join(temp, 'entry.tsx')], outfile: path.join(temp, 'bundle.js'), bundle: true, jsx: 'automatic', platform: 'browser', alias: { '@': path.join(root, 'src') }, define: { 'process.env.NODE_ENV': '"development"' }, plugins: [{ name: 'synthetic-session', setup(b) {
  b.onResolve({filter:/^next-auth\/react$/}, () => ({path:'session', namespace:'fixture'}));
  b.onLoad({filter:/.*/,namespace:'fixture'}, () => ({contents:`export const useSession=()=>({status:'authenticated',data:{user:{id:'ui-review',role:'city_head',name:'Synthetic reviewer',email:'review@example.invalid'}}});export const signOut=async()=>{};export const signIn=async()=>{};`, loader:'js'}));
} }] });
const css = await postcss([tailwind()]).process(fs.readFileSync('src/app/globals.css', 'utf8'), {from:path.join(root,'src/app/globals.css')});
fs.writeFileSync(path.join(temp, 'style.css'), css.css);
const server = http.createServer((req,res) => {
  if(req.url.startsWith('/bundle.js') || req.url.startsWith('/style.css')) { const file=req.url.split('?')[0].slice(1);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':'text/css');res.end(fs.readFileSync(path.join(temp,file))); }
  else if(req.url.startsWith('/?')) {res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');}
  else {res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const people=[0,1,2].map(i=>({id:'person-'+i,name:'Synthetic participant '+(i+1),remaining:100,totalPaid:0,group:{name:'Review group',batch:{park:{id:'park',name:'Review park',city:{id:'city'}}}}}));
const report={date:new Date().toISOString(),limits:'Rendered real components with real compiled Tailwind CSS and synthetic API responses; separate compiled-PWA checks verify actual routes and SQLite. Screenshots are not a pixel-diff proof against historical UI.',screens:[],errors:[],writes:[]};
let browser, mode='normal';
try {
  browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844}});
  await context.route('**/api/**', async route=>{
    const request=route.request(),url=new URL(request.url()),p=url.pathname;
    if(request.method()!=='GET') {report.writes.push({path:p,method:request.method()});return route.fulfill({status:503,json:{error:'Fixture writes unavailable'}});}
    if(mode==='denied' && p==='/api/auth/capabilities') return route.fulfill({json:{userId:'ui-review',capabilities:[]}});
    if(mode==='error' && p==='/api/admin/fees') return route.fulfill({status:503,json:{error:'Synthetic read failure'}});
    if(mode==='empty' && p==='/api/admin/fees') return route.fulfill({json:{data:[],pagination:{totalPages:1}}});
    let data={data:[],pagination:{totalPages:1}};
    if(p==='/api/auth/capabilities') data={userId:'ui-review',capabilities:['fees.manage','calling.view','calling.manage','organisation.view','organisation.manage','students.profile.view','reports.view']};
    else if(p==='/api/admin/fees') data={data:[{id:'fee',title:'Synthetic programme fee',amount:100,totalPaid:100,totalExpected:400}],pagination:{totalPages:1}};
    else if(p.endsWith('/fee/payments')) data={payments:[{id:'receipt',receiptNo:'SYN-001',amount:100,method:'cash',participant:{name:'Synthetic participant 4'}}],unpaidParticipants:people};
    else if(p==='/api/admin/students') data={data:people,pagination:{totalPages:1}};
    else if(p==='/api/park/attendance/parks') data=[{id:'park',name:'Review park'}];
    else if(p.startsWith('/api/admin/certificates/')) data={participant:people[0].name,group:'Review group',batch:'Review batch',park:'Review park',city:'Synthetic city',attendanceRate:80,totalEvents:10,batchEndDate:null};
    else if(p==='/api/calling/campaigns') data=[{id:'campaign',name:'Synthetic outreach',cityId:'city',status:'active'}];
    else if(p.endsWith('/campaign/leads')) data=people.map((person,i)=>({id:person.id,status:'pending',notes:null,application:{applicantName:person.name,guardianPhone:null},callerName:'Synthetic caller '+i}));
    else if(p==='/api/calling/templates') data=[{id:'script',title:'Synthetic approved script',body:'Confirm programme interest and record the agreed outcome.',status:'approved'}];
    else if(p==='/api/admin/procurement/stock') data=[{id:'stock',parkId:'park',itemId:'item',quantity:3,minThreshold:5,park:{name:'Review park'},item:{name:'Training cones',unit:'pieces'}}];
    else if(p==='/api/admin/procurement/requests') data=[{id:'request',quantity:10,reason:'Synthetic training request',status:'pending',park:{name:'Review park'},item:{name:'Training cones'}}];
    else if(p==='/api/admin/procurement/orders') data=[];
    return route.fulfill({json:data});
  });
  const page=await context.newPage(); page.on('pageerror',e=>report.errors.push(e.message));page.setDefaultTimeout(10000);
  async function shot(name) {
    await page.screenshot({path:path.join(temp,name+'.png'),fullPage:true});
    const size=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth}));
    report.screens.push({name,path:path.join(temp,name+'.png'),...size});
    assert(size.document<=size.viewport+1, name+' has horizontal overflow');
  }
  for(const theme of ['light','dark']) for(const screen of Object.keys(imports)) {
    await page.goto(`${origin}/?screen=${screen}&theme=${theme}`);await page.locator('h1').waitFor();
    if(screen==='fees') {await page.getByLabel('Fee event').selectOption('fee');await page.getByText(people[0].name,{exact:true}).first().waitFor();}
    if(screen==='calling') {await page.getByLabel('Calling campaign',{exact:true}).selectOption('campaign');await page.getByText(people[0].name,{exact:true}).waitFor();}
    if(screen==='procurement') await page.getByText('Training cones',{exact:true}).waitFor();
    if(screen==='profiles'||screen==='certificates') await page.getByText(people[0].name,{exact:true}).first().waitFor();
    await shot(screen+'-'+theme);
    if(screen==='fees') {await page.getByRole('tab',{name:'Record payment',exact:true}).click();await page.getByLabel('Participant',{exact:true}).selectOption('person-0');await shot(screen+'-form-'+theme);}
    if(screen==='procurement') {await page.getByRole('button',{name:'Request refill',exact:true}).click();await page.getByRole('dialog').waitFor();await shot(screen+'-sheet-'+theme);}
    if(screen==='calling') {await page.getByText(people[0].name,{exact:true}).click();await page.getByRole('button',{name:'Log result',exact:true}).click();await page.getByRole('dialog').waitFor();await shot(screen+'-sheet-'+theme);}
    if(screen==='certificates') {await page.getByText(people[0].name,{exact:true}).click();await page.getByText('Draft — not issued').waitFor();await shot(screen+'-preview-'+theme);}
    if(screen==='community') assert(await page.getByRole('button',{name:'Post',exact:true}).isDisabled());
    if(screen==='reports') {assert(await page.getByRole('button',{name:'Export report',exact:true}).isDisabled());assert(await page.getByRole('button',{name:'Save preset',exact:true}).isDisabled());}
  }
  await page.setViewportSize({width:1280,height:900});
  for(const screen of ['fees','procurement','certificates','community','reports']) {
    await page.goto(`${origin}/?screen=${screen}&desktop=1`);await page.locator('h1').waitFor();
    if(screen==='fees') {await page.getByLabel('Fee event').selectOption('fee');await page.getByText(people[0].name,{exact:true}).first().waitFor();}
    if(screen==='procurement') await page.getByText('Training cones',{exact:true}).waitFor();
    await shot(screen+'-desktop');
  }
  await page.setViewportSize({width:390,height:844});
  for(const [state, text] of [['denied','Fee management is unavailable for this account.'],['empty','No fee events in your scope.'],['error','Fee records could not be loaded.']]) {
    mode=state;await page.goto(`${origin}/?screen=fees`);await page.getByText(text,{exact:false}).waitFor();await shot('fees-'+state);
  }
  mode='normal';await page.goto(`${origin}/?screen=fees`);await page.getByLabel('Fee event').selectOption('fee');await page.getByRole('tab',{name:'Record payment',exact:true}).click();await page.getByLabel('Participant',{exact:true}).selectOption('person-0');
  await context.setOffline(true);await page.getByText('Payment recording requires a connection.').waitFor();assert(await page.getByRole('button',{name:'Record payment',exact:true}).isDisabled());await shot('fees-offline');await context.setOffline(false);
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.writes,[]);report.passed=true;
} catch(error) {report.passed=false;report.failure=error.stack;process.exitCode=1;}
finally {await browser?.close();await new Promise(resolve=>server.close(resolve));fs.writeFileSync(path.join(output,'visual-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}

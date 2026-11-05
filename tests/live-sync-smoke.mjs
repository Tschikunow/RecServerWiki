import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';

const port=18735;
const http=createServer(async(req,res)=>{
 const pathname=new URL(req.url,'http://127.0.0.1').pathname;
 if(pathname==='/cloud-config.js'){
  res.writeHead(200,{'content-type':'application/javascript'});
  res.end('window.RECSERVERWIKI_CONFIG={};');return;
 }
 const file=pathname==='/'?'index.html':pathname.slice(1);
 if(!['index.html','premium-theme.css'].includes(file)){res.writeHead(404);res.end();return}
 try{
  const contents=await readFile(resolve(process.cwd(),file));
  res.writeHead(200,{'content-type':extname(file)==='.css'?'text/css':'text/html'});res.end(contents);
 }catch{res.writeHead(404);res.end()}
});
await new Promise(done=>http.listen(port,'127.0.0.1',done));
const browser=await chromium.launch({headless:true});
const errors=[];
const remote={key:'main',revision:1,file_name:'base.json',previous_file_name:null,checksum:'initial',updated_at:new Date().toISOString()};
const files=new Map([['base.json',{exhibits:[],categories:[],biographyPresets:{birthplace:[],occupation:[],significance:[]}}]]);
let retries=0;
async function api(route){
 const req=route.request(),u=new URL(req.url()),method=req.method(),p=u.pathname;
 const json=(v,status=200)=>route.fulfill({status,headers:{'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'*'},body:JSON.stringify(v)});
 if(method==='OPTIONS')return json({});
 if(p==='/rest/v1/recserverwiki_shared'){
  if(method==='GET')return json([{...remote}]);
  if(method==='PATCH'){
   const expected=Number((u.searchParams.get('revision')||'').replace('eq.',''));
   if(expected!==remote.revision){retries++;return json([])}
   Object.assign(remote,JSON.parse(req.postData()||'{}'));
   return json([{...remote}]);
  }
 }
 if(p==='/rest/v1/recserverwiki_editors')return json([{role:'admin'}]);
 if(p.startsWith('/storage/v1/object/public/recserverwiki-public/snapshots/')&&method==='GET'){
  const file=p.split('/').pop();
  if(!files.has(file))return json({message:'Not found'},404);
  return json(files.get(file));
 }
 if(p.startsWith('/storage/v1/object/recserverwiki-public/snapshots/')&&method==='POST'){
  const file=p.split('/').pop();files.set(file,JSON.parse(req.postData()||'{}'));return json({});
 }
 if(p==='/storage/v1/object/recserverwiki-public'&&method==='DELETE'){
  for(const prefix of JSON.parse(req.postData()||'{}').prefixes||[])files.delete(prefix.split('/').pop());
  return json({});
 }
 return json({message:'Unexpected API '+method+' '+p},404);
}
async function makePage(role='admin'){
 const page=await browser.newPage({acceptDownloads:true});
 page.on('pageerror',error=>errors.push(error.stack||error.message));
 await page.route('https://example.supabase.co/**',api);
 await page.goto('http://127.0.0.1:'+port+'/',{waitUntil:'domcontentloaded'});
 await page.evaluate(async role=>{
  cloud.config={url:'https://example.supabase.co',key:'sb_publishable_browser_smoke_test'};
  cloud.session=role==='admin'?{user:{id:'admin-id',email:'admin@example.invalid'},access_token:'dummy',refresh_token:'dummy',expires_at:Math.floor(Date.now()/1000)+100000}:null;
  cloud.role=role;
  // The test uses HTTP polling; the actual production app also uses WebSocket notifications.
  liveConnect=()=>{};
  const loaded=await cloudReconcile();
  if(!loaded)throw Error('Shared archive did not load');
 },role);
 return page;
}
async function saveNew(page,type,title){
 await page.locator('[data-act="new"]').first().click();
 await page.locator('#chooserOverlay [data-new-type="'+type+'"]').click();
 await page.locator('.drawer [data-field="title"]').fill(title);
 await page.locator('.drawer [data-act="save-exhibit"]').click();
 await page.waitForFunction(()=>!document.querySelector('.drawer'),{timeout:15000});
}
try{
 const a=await makePage(),b=await makePage(),reader=await makePage('reader');
 assert.equal(await a.evaluate(()=>cloud.blocked),false);

 // Both editors start from the same public revision. Their changes must merge.
 await saveNew(a,'person','McDuckyman');
 await b.locator('[data-act="new"]').first().click();
 await b.locator('#chooserOverlay [data-new-type="server"]').click();
 await b.locator('.drawer [data-field="title"]').fill('Neusenat');
 await b.locator('.drawer [data-detail-field="serverVisits"]').fill('125');
 await b.locator('.drawer [data-detail-field="serverClubMembers"]').fill('50');
 await b.locator('.drawer [data-act="save-exhibit"]').click();
 await b.waitForFunction(()=>!document.querySelector('.drawer'),{timeout:15000});
 assert.equal(files.get(remote.file_name).exhibits.length,2,'An old editor overwrote a new public article');
 assert.equal(files.get(remote.file_name).exhibits.filter(x=>x.type==='server').length,1);

 // Both roles see precisely the same public records after an update.
 await Promise.all([a.evaluate(()=>cloudCheck()),b.evaluate(()=>cloudCheck()),reader.evaluate(()=>cloudCheck())]);
 const counts=await Promise.all([a,b,reader].map(p=>p.evaluate(()=>state.exhibits.map(x=>x.title).sort())));
 assert.deepEqual(counts[0],counts[1]);assert.deepEqual(counts[1],counts[2]);
 assert.deepEqual(counts[0],['McDuckyman','Neusenat']);

 const server=files.get(remote.file_name).exhibits.find(x=>x.type==='server');
 await a.evaluate(id=>openArticle(id),server.id);
 await b.evaluate(id=>openArticle(id),server.id);
 await a.locator('[data-edit="'+server.id+'"]').first().click();
 await b.locator('[data-edit="'+server.id+'"]').first().click();
 await a.locator('.drawer [data-detail-field="serverVisits"]').fill('400');
 await b.locator('.drawer [data-detail-field="serverDescription"]').fill('Ein Server mit Geschichte');
 await a.locator('.drawer [data-act="save-exhibit"]').click();
 await a.waitForFunction(()=>!document.querySelector('.drawer'),{timeout:15000});
 // Editor B retains the old draft, but should merge only changed fields.
 await b.locator('.drawer [data-act="save-exhibit"]').click();
 await b.waitForFunction(()=>!document.querySelector('.drawer'),{timeout:15000});
 const updated=files.get(remote.file_name).exhibits.find(x=>x.id===server.id);
 assert.equal(updated.details.serverVisits,'400','Other editor visits were lost');
 assert.equal(updated.details.serverDescription,'Ein Server mit Geschichte','Other editor description was lost');

 // A refresh for the guest pulls the same public content, without any conflict UI.
 await reader.evaluate(()=>cloudCheck());
 assert.equal(await reader.evaluate(id=>getEntry(id)?.details.serverVisits,server.id),'400');
 assert.equal(await reader.locator('.cloud-conflict-actions').count(),0);
 assert.equal(await b.evaluate(()=>cloud.blocked),false);

 // Concurrent category creation is merged into the latest public categories.
 await Promise.all([a.evaluate(()=>cloudCheck()),b.evaluate(()=>cloudCheck())]);
 await Promise.all([
  a.evaluate(()=>createCategory('Großer Server','#dd2222','server')),
  b.evaluate(()=>createCategory('Kleiner Server','#22dd22','server'))
 ]);
 const publishedCategories=files.get(remote.file_name).categories.map(x=>x.name);
 assert.ok(publishedCategories.includes('Großer Server')&&publishedCategories.includes('Kleiner Server'),'Concurrent categories were overwritten');

 await reader.evaluate(()=>cloudCheck());
 assert.equal(await reader.evaluate(()=>state.categories.length),2);
 assert.deepEqual(errors,[],'Browser JS errors: '+errors.join('\n'));
 console.log('SUCCESS: two editors, public reader, same-entry field merge, concurrent categories, no version-conflict UI. Retries='+retries);
} finally {
 await browser.close();
 await new Promise(done=>http.close(done));
}

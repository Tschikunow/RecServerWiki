import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';

const port = 18735;
const app = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/cloud-config.js') {
    res.writeHead(200, {'content-type':'application/javascript'});
    res.end('window.RECSERVERWIKI_CONFIG={};');
    return;
  }
  const path = pathname === '/' ? 'index.html' : pathname.slice(1);
  if (!['index.html','premium-theme.css'].includes(path)) {
    res.writeHead(404); res.end('Not found'); return;
  }
  try {
    const data = await readFile(resolve(process.cwd(),path));
    res.writeHead(200, {'content-type':extname(path)==='.css'?'text/css':'text/html'});
    res.end(data);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
});
await new Promise(resolve=>app.listen(port,'127.0.0.1',resolve));
const browser = await chromium.launch({headless:true});
const errors=[];
try {
  const page=await browser.newPage();
  page.on('pageerror',err=>errors.push(err.stack||err.message));
  await page.goto('http://127.0.0.1:'+port+'/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof window.RECSERVERWIKI_CONFIG==='object');
  await page.evaluate(()=>{
    cloud.config={url:'https://example.supabase.co',key:'sb_publishable_smoketest'};
    cloud.session={user:{id:'local-test',email:'test@example.invalid'},access_token:'test'};
    cloud.role='admin';
    cloud.blocked=true;
    render();
  });

  // Real clicks, real inputs, real IndexedDB storage. No production API calls.
  await page.locator('[data-act="new"]').first().click();
  await page.locator('#chooserOverlay [data-new-type="person"]').click();
  await page.locator('.drawer [data-field="title"]').fill('McDuckyman');
  await page.locator('.drawer [data-act="save-exhibit"]').click();
  await page.waitForFunction(()=>!document.querySelector('.drawer'));
  let persisted=await page.evaluate(async()=>await readState());
  assert.equal(persisted.exhibits.length,1);
  assert.equal(persisted.exhibits[0].title,'McDuckyman');

  await page.locator('[data-act="new"]').first().click();
  await page.locator('#chooserOverlay [data-new-type="server"]').click();
  await page.locator('.drawer [data-field="title"]').fill('Neusenat');
  await page.locator('.drawer [data-detail-field="serverVisits"]').fill('1500');
  await page.locator('.drawer [data-detail-field="serverClubMembers"]').fill('50');
  await page.locator('.drawer [data-detail-field="serverOwnerId"]').selectOption(persisted.exhibits[0].id);
  await page.locator('.drawer [data-server-moderator="'+persisted.exhibits[0].id+'"]').check();
  await page.locator('.drawer [data-act="save-exhibit"]').click();
  await page.waitForFunction(()=>!document.querySelector('.drawer'));
  persisted=await page.evaluate(async()=>await readState());
  const server=persisted.exhibits.find(e=>e.type==='server'&&e.title==='Neusenat');
  assert.ok(server,'Server was not saved to IndexedDB');
  assert.equal(server.details.serverVisits,'1500');
  assert.equal(server.details.serverClubMembers,'50');
  assert.equal(server.details.serverOwnerId,persisted.exhibits.find(e=>e.type==='person').id);
  assert.ok(server.details.serverModeratorIds.includes(persisted.exhibits.find(e=>e.type==='person').id));

  // Existing server can be re-edited and saved with all bio references.
  await page.locator('[data-edit="'+server.id+'"]').first().click();
  await page.locator('.drawer [data-detail-field="serverRegularVisitors"]').fill('85');
  await page.locator('.drawer [data-act="save-exhibit"]').click();
  await page.waitForFunction(()=>!document.querySelector('.drawer'));
  persisted=await page.evaluate(async()=>await readState());
  assert.equal(persisted.exhibits.find(e=>e.id===server.id).details.serverRegularVisitors,'85');
  assert.ok((await page.locator('.server-person-link').count())>0,'Owner link missing');

  // Confirm why a saved local Server is invisible on another device.
  await page.evaluate(()=>{
    cloudGetMeta=async()=>({revision:99,file_name:'fake-public.json'});
    cloudDownloadFile=async()=>({exhibits:state.exhibits.filter(x=>x.type==='person'),categories:[]});
  });
  await page.locator('#cloudIndicator').click();
  await page.locator('[data-cloud-action="diagnose"]').click();
  await page.waitForFunction(()=>document.querySelector('.cloud-diagnostic')?.textContent.includes('ÖFFENTLICH:'));
  const report=await page.locator('.cloud-diagnostic').textContent();
  assert.ok(report.includes('NUR AUF DIESEM GERÄT: 1'),'Missing unpublished-server warning');
  assert.ok(report.includes('VERSIONSKONFLIKT'),'Blocked sync warning missing');

  // An IndexedDB write outage must preserve the Server via persistent fallback.
  const recovery=await page.evaluate(async()=>{
    dbPromise=Promise.reject(new Error('Injected IndexedDB write failure'));
    await saveState();
    const saved=await readState();
    return {marker:localStorage.getItem('recserverwiki_shared_v1_fallback'),hasServer:saved.exhibits.some(x=>x.type==='server'&&x.title==='Neusenat')};
  });
  assert.equal(recovery.marker,'1','Fallback marker missing');
  assert.ok(recovery.hasServer,'Server missing from fallback storage');

  // A legacy localStorage fallback must migrate into IndexedDB and stop enforcing 5-MB limits.
  const migrated=await page.evaluate(async()=>{
    dbPromise=null;
    const saved=await readState();
    return {marker:localStorage.getItem('recserverwiki_shared_v1_fallback'),hasServer:saved.exhibits.some(x=>x.id===app.detailId),fallback:memoryFallback};
  });
  assert.equal(migrated.marker,null,'Old localStorage fallback marker was not cleared');
  assert.equal(migrated.fallback,false,'Successful IndexedDB migration still forces fallback');
  assert.ok(migrated.hasServer,'Migration lost server data');

  // Simulate both storage systems full. A conflict-free cloud upload can still save safely.
  await page.locator('[data-cloud-action="close"]').click();
  await page.evaluate(()=>{
    cloud.blocked=false;
    cloud.busy=false;
    cloud.revision=99;
    cloud.dirty=false;
    window.__postedArchives=[];
    cloudGetMeta=async()=>({revision:99,file_name:'fake-public.json',previous_file_name:null,checksum:'old'});
    cloudFetch=async(path,options)=>{
      if(path.startsWith('/storage/v1/object/')){window.__postedArchives.push(JSON.parse(options.body));return {};}
      if(path.startsWith('/rest/v1/'))return [{revision:100,file_name:'smoke-public.json',previous_file_name:'fake-public.json',checksum:'mock'}];
      throw Error('Unexpected network request in smoke test');
    };
    storeInIndexedDb=async()=>{throw Error('Injected IndexedDB write failure')};
    window.__originalSetItem=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){
      if(key==='recserverwiki_shared_v1')throw new DOMException('Stored value exceeds the quota','QuotaExceededError');
      return window.__originalSetItem.call(this,key,value);
    };
  });
  await page.locator('[data-act="new"]').first().click();
  await page.locator('#chooserOverlay [data-new-type="server"]').click();
  await page.locator('.drawer [data-field="title"]').fill('Neuer Server trotz Speicherlimit');
  await page.locator('.drawer [data-detail-field="serverVisits"]').fill('980');
  await page.locator('.drawer [data-act="save-exhibit"]').click();
  await page.waitForFunction(()=>!document.querySelector('.drawer'));
  const cloudRecovery=await page.evaluate(()=>({
    archives:window.__postedArchives.length,
    saved:window.__postedArchives.at(-1)?.exhibits.some(x=>x.title==='Neuer Server trotz Speicherlimit'&&x.details.serverVisits==='980'),
    revision:cloud.revision
  }));
  assert.equal(cloudRecovery.archives,1,'Expected a single safe cloud upload');
  assert.ok(cloudRecovery.saved,'Cloud recovery lost the new server');
  assert.equal(cloudRecovery.revision,100,'Public revision did not advance');

  // With a version conflict, never overwrite the cloud: preserve the open draft and offer JSON.
  await page.evaluate(()=>{cloud.blocked=true;});
  await page.locator('[data-act="new"]').first().click();
  await page.locator('#chooserOverlay [data-new-type="server"]').click();
  await page.locator('.drawer [data-field="title"]').fill('Noch unveröffentlichter Testserver');
  await page.locator('.drawer [data-act="save-exhibit"]').click();
  await page.waitForFunction(()=>document.getElementById('draftStatus')?.textContent.includes('Fehler'));
  assert.equal(await page.locator('.drawer [data-field="title"]').inputValue(),'Noch unveröffentlichter Testserver');
  assert.equal(await page.locator('[data-act="download-draft"]').count(),1,'Emergency backup missing');
  const [backup]=await Promise.all([
    page.waitForEvent('download'),
    page.locator('[data-act="download-draft"]').click()
  ]);
  assert.ok(backup.suggestedFilename().startsWith('RecServerWiki_Entwurf_'),'Draft backup filename wrong');
  const noOverwrite=await page.evaluate(()=>window.__postedArchives.length);
  assert.equal(noOverwrite,1,'Conflict must not publish a second archive');
  await page.evaluate(()=>{Storage.prototype.setItem=window.__originalSetItem;});

  assert.deepEqual(errors,[],'Browser JavaScript errors: '+errors.join('\n'));
  console.log('SUCCESS: Biography + new Server + owner/moderator links + re-edit + IndexedDB save');
} finally {
  await browser.close();
  await new Promise(resolve=>app.close(resolve));
}

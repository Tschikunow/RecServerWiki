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
  assert.deepEqual(errors,[],'Browser JavaScript errors: '+errors.join('\n'));
  console.log('SUCCESS: Biography + new Server + owner/moderator links + re-edit + IndexedDB save');
} finally {
  await browser.close();
  await new Promise(resolve=>app.close(resolve));
}

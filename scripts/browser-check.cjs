// Optional: npm install --no-save --package-lock=false playwright
// Run against a local server: BASE_URL=http://localhost:3000 node scripts/browser-check.cjs
const path = require('node:path');
const base = process.env.BASE_URL || 'http://localhost:3000';
const { chromium } = require('playwright');
(async()=>{
const browser=await chromium.launch({headless:true,channel:"chrome"});
const desktop=await browser.newContext({viewport:{width:1440,height:1100}});const a=await desktop.newPage();
a.setDefaultTimeout(8000); const errors=[];a.on('pageerror',e=>errors.push(e.message));await a.goto(base);await a.screenshot({path:path.resolve('docs/screenshots/desktop-home.png'),fullPage:true});
await a.getByLabel('YOUR NAME').fill('Robin');await a.getByRole('button',{name:'Create a table'}).click();await a.getByRole('button',{name:/Copy table code/}).waitFor();const code=(await a.locator('.room-code').innerText()).replace(/\D/g,'');
const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const b=await mobile.newPage();b.on('pageerror',e=>errors.push(e.message));await b.goto(base);await b.getByRole('tab',{name:/Join friends/}).click();await b.getByLabel('YOUR NAME').fill('Jules');await b.getByLabel('TABLE CODE').fill(code);await b.getByRole('button',{name:'Take a seat'}).click();await b.getByText('Waiting for the host to start').waitFor();
await a.getByText('Jules',{exact:true}).waitFor();await a.getByRole('button',{name:/Everyone’s here/}).click();await a.getByRole('button',{name:'Roll the dice'}).click();await a.locator('.number.available').first().waitFor();
// Selection must not submit; confirm only after second click.
const first=a.locator('.number.available').first();await first.click();if(await a.locator('.number.crossed').count())throw Error('Cross submitted on first click');await a.getByRole('button',{name:'Confirm cross'}).click();await a.getByText('Your choice is in.',{exact:true}).waitFor();
await b.getByText('A little something for everyone.',{exact:true}).waitFor();await b.locator('.number.available').first().click();await b.getByRole('button',{name:'Confirm cross'}).click();await a.getByText('Add a little color.',{exact:true}).waitFor();await a.screenshot({path:path.resolve('docs/screenshots/desktop-game.png'),fullPage:true});
await a.getByRole('button',{name:'Pass this step'}).click();await b.getByRole('button',{name:'Roll the dice'}).waitFor();await b.getByRole('button',{name:'Roll the dice'}).click();await b.locator('.number.available').first().waitFor();await b.locator('.number.available').first().click();await b.screenshot({path:path.resolve('docs/screenshots/mobile-game.png'),fullPage:true});
const overflow=await b.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(overflow)throw Error('Page overflow on mobile');
await b.reload();await b.getByText('Jules',{exact:false}).first().waitFor();await b.getByRole('button',{name:'How to play'}).click();await b.locator('dialog[open]').waitFor();await b.getByRole('button',{name:'Close rules'}).click();
const c=await mobile.newPage();await c.goto(base);await c.screenshot({path:path.resolve('docs/screenshots/mobile-home.png'),fullPage:true});
if(errors.length)throw Error(errors.join('\n'));console.log('PASS: two independent browser seats; host/join; white barrier; two-click cross; color step; turn handoff; reconnect; rules dialog; mobile overflow; screenshots');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});

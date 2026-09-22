import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const url=process.env.CHECK_URL || 'http://127.0.0.1:4174/qiniandian-web/';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const failures=[];page.on('response',r=>{if(r.status()>=400)failures.push([r.url(),r.status()])});
try{
 await page.goto(url);
 await page.waitForFunction(()=>window.__qinian?.state().loaded,null,{timeout:90000});
 assert.equal((await page.evaluate(()=>window.__qinian.state())).meshCount,110);
 await page.locator('nav a[href="#explore"]').click();
 await page.waitForTimeout(2200);
 const personal=page.locator('.personal-link');
 assert.equal(await personal.getAttribute('href'),'https://www.aigcdavid.cn/');
 assert.ok(await personal.isVisible());
 const bg=await page.locator('.environment.dawn').evaluate(el=>getComputedStyle(el).backgroundImage);
 assert.ok(bg.includes('/qiniandian-web/assets/'));
 assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({url,modelLoaded:true,meshCount:110,background:bg,footerLink:true,errors,failures}));
}finally{await browser.close()}

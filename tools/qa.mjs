import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
await fs.mkdir('qa',{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const report={date:new Date().toISOString(),checks:[],consoleErrors:[],desktop:[],mobile:[]};
const record=(name,value=true)=>{assert.ok(value,name);report.checks.push({name,passed:true});console.log('PASS',name)};
const watch=page=>page.on('pageerror',e=>report.consoleErrors.push(e.message));
const state=page=>page.evaluate(()=>window.__qinian.state());
async function ready(page){await page.waitForFunction(()=>window.__qinian?.state().loaded,{},{timeout:60000});await page.waitForTimeout(1500);}
async function chapter(page,index){await page.evaluate(i=>window.scrollTo({top:document.querySelectorAll('.chapter')[i].offsetTop,behavior:'instant'}),index);await page.waitForFunction(i=>Math.abs(window.__qinian.state().progress-i)<.002, index,{timeout:20000});await page.waitForTimeout(900);}
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});watch(page);
 await page.goto('http://127.0.0.1:4173/');await ready(page);
 let s=await state(page);record('Desktop real GLB with 110 textured meshes',s.meshCount===110&&s.mappedMeshes===110);record('Desktop model dimensions in meters',Math.abs(s.bounds[1]-38.12)<.03);
 for(let i=0;i<6;i++){await chapter(page,i);s=await state(page);record(`Forward chapter ${i+1}`,s.active===i&&!s.error);await page.screenshot({path:`qa/desktop-${String(i+1).padStart(2,'0')}.png`});report.desktop.push(s);}
 await page.locator('#explore-model').click();record('Free exploration enters',(await state(page)).exploring);
 await page.mouse.move(950,430);await page.mouse.down();await page.mouse.move(1150,430,{steps:12});await page.mouse.up();await page.waitForTimeout(1000);await page.locator('#reset-view').click();await page.keyboard.press('Escape');record('Free exploration exits',!(await state(page)).exploring);
 for(let i=4;i>=0;i--){await chapter(page,i);s=await state(page);record(`Reverse chapter ${i+1}`,s.active===i&&!s.error);if(i!==2)record(`Assembly restored at chapter ${i+1}`,s.roots.Roofs_Root.position[1]===s.roots.Roofs_Root.base[1]);}
 await page.locator('nav a[href="#structure"]').click();await page.waitForFunction(()=>window.__qinian.state().active===2);await page.waitForTimeout(1700);
 s=await state(page);record('Navigation jumps to structure',Math.abs(s.progress-2)<.002);record('Exact exploded root offsets',Math.abs(s.roots.Roofs_Root.position[1]-12)<.002&&Math.abs(s.roots.Timber_Root.position[1]-5)<.002);
 await page.locator('#assemble').click();await page.waitForFunction(()=>window.__qinian.state().explosion===0);s=await state(page);record('Manual assembly returns exactly to origin',s.roots.Roofs_Root.position[1]===0&&s.roots.Timber_Root.position[1]===0);
 await page.locator('#explode').click();await page.waitForFunction(()=>window.__qinian.state().explosion===1);record('Manual explode works',(await state(page)).explosion===1);
 await chapter(page,3);for(let d=0;d<4;d++){await page.locator(`[data-detail="${d}"]`).click();await page.waitForTimeout(900);record(`Material focus ${d+1}`,(await state(page)).detail===d);}
 const unzoomed=(await state(page)).fov;await page.locator('#detail-zoom').click();await page.waitForTimeout(1300);record('Detail zoom changes actual camera lens',(await state(page)).fov<unzoomed-5);
 // Native wheel movement includes fractional states, then reverses.
 await chapter(page,1);await page.mouse.wheel(0,360);await page.waitForTimeout(1200);s=await state(page);record('Continuous intermediate scrolling',s.progress>1.05&&s.progress<1.9);
 await page.mouse.wheel(0,-360);await page.waitForTimeout(1200);record('Reverse wheel restores progress',Math.abs((await state(page)).progress-1)<.01);
 const phone=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});watch(phone);
 await phone.goto('http://127.0.0.1:4173/');await ready(phone);record('Mobile optimized model',(await state(phone)).modelVariant==='mobile');
 for(let i=0;i<6;i++){await chapter(phone,i);s=await state(phone);const layout=await phone.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,canvas:document.querySelector('canvas').getBoundingClientRect().toJSON(),title:document.querySelector('.chapter.active h1,.chapter.active h2').getBoundingClientRect().toJSON(),buttons:[...document.querySelectorAll('.chapter.active button')].map(b=>b.getBoundingClientRect().toJSON())}));record(`Mobile ${i+1} no horizontal overflow`,!layout.overflow);record(`Mobile ${i+1} title stays above scene`,layout.title.bottom<layout.canvas.top+5);await phone.screenshot({path:`qa/mobile-${String(i+1).padStart(2,'0')}.png`});report.mobile.push({...s,layout});}
 record('Mobile can reach footer',await phone.locator('footer').isVisible());
 await phone.locator('.menu-toggle').tap();await phone.locator('nav a[href="#structure"]').tap();await phone.waitForTimeout(2000);record('Mobile menu navigation',(await state(phone)).active===2&&!(await phone.locator('nav').isVisible()));
 const cdp=await phone.context().newCDPSession(phone);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:190,y:600}]});for(let y=560;y>=240;y-=40)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:190,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await phone.waitForTimeout(1500);record('Native touch scroll continues document',(await state(phone)).progress>2.1);
 await phone.setViewportSize({width:360,height:740});await chapter(phone,2);await phone.screenshot({path:'qa/mobile-small-structure.png'});record('Small phone no overflow',await phone.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
 const fail=await browser.newPage({viewport:{width:1280,height:800}});watch(fail);
 await fail.route('**/qiniandian-*.glb',route=>route.fulfill({status:503,body:'Temporary failure'}));await fail.goto('http://127.0.0.1:4173/');await fail.locator('.model-error').waitFor({state:'visible'});record('Failed load shows recoverable UI',await fail.locator('#retry-model').isVisible());record('Failure retains readable page',await fail.locator('h1').isVisible());await fail.screenshot({path:'qa/loading-failure.png'});await fail.unroute('**/qiniandian-*.glb');await fail.locator('#retry-model').click();await ready(fail);record('Retry recovers live model',(await state(fail)).loaded);await fail.close();
 const reduced=await browser.newPage({viewport:{width:1280,height:800},reducedMotion:'reduce'});watch(reduced);await reduced.goto('http://127.0.0.1:4173/#structure');await ready(reduced);record('Deep link and reduced-motion preference',(await state(reduced)).active===2);await reduced.close();
 record('No uncaught JavaScript errors',report.consoleErrors.length===0);
 report.passed=true;
}catch(error){report.passed=false;report.failure=error.stack;console.error(error);process.exitCode=1;}
finally{await fs.writeFile('qa/report.json',JSON.stringify(report,null,2));await browser.close();}

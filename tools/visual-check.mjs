import {chromium} from 'playwright';
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
for(const [name,viewport]of [['desktop',{width:1440,height:900}],['mobile',{width:390,height:844}]]){
const p=await b.newPage({viewport,deviceScaleFactor:1,isMobile:name==='mobile',hasTouch:name==='mobile'});await p.goto('http://127.0.0.1:4173/');await p.waitForFunction(()=>window.__qinian?.state().loaded,{},{timeout:60000});
for(const i of [3,4]){await p.evaluate(i=>scrollTo({top:document.querySelectorAll('.chapter')[i].offsetTop,behavior:'instant'}),i);await p.waitForFunction(i=>Math.abs(window.__qinian.state().progress-i)<.001,i);await p.waitForTimeout(1500);await p.screenshot({path:`qa/${name}-${String(i+1).padStart(2,'0')}.png`});console.log(name,i,'captured');}
await p.close();}
await b.close();

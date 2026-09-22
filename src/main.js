import './style.css';
import './atmosphere.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const $=s=>document.querySelector(s);
const chapters=[...document.querySelectorAll('.chapter')];
const panels=chapters.map(s=>s.querySelector('.panel'));
const mobile=()=>matchMedia('(max-width:760px)').matches;
const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
const clamp=THREE.MathUtils.clamp, lerp=THREE.MathUtils.lerp;
const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x)};
let active=0, rawProgress=0, progress=0, detail=0, zoomed=false, structureOverride=null;
let exploring=false, rotating=false, yaw=0, targetYaw=0, model, roots={}, bases={}, loaded=false;
let renderer,scene,camera,key,fill,environment,ground,halo,modelGroup,composer,bloom;
let renderNeeded=true, sizeChanged=true, fetchController, loadId=0, lastTime=0;
const stage=$('#stage');
const debug={loaded:false,active:0,progress:0,error:null,modelVariant:null,frames:0};
window.__qinian={state:()=>({...debug,progress,scrollY:scrollY,detail,exploring,rotating,roots:Object.fromEntries(Object.entries(roots).map(([k,v])=>[k,{position:v.position.toArray(),base:bases[k].toArray(),quaternion:v.quaternion.toArray()}])),camera:camera?.position.toArray(),fov:camera?.fov,drawCalls:renderer?.info.render.calls,triangles:renderer?.info.render.triangles,textures:renderer?.info.memory.textures}),model:()=>model};

document.documentElement.classList.add('enhanced');
function activate(index){
 active=index;debug.active=index;document.body.dataset.chapter=String(index);
 chapters.forEach((s,i)=>{s.classList.toggle('active',i===index);panels[i].inert=i!==index;panels[i].setAttribute('aria-hidden',String(i!==index));});
 document.querySelectorAll('nav a').forEach(a=>{if(a.hash===`#${chapters[index].id}`)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current')});
 $('#chapter-number').textContent=String(index+1).padStart(2,'0');
 $('.progress-track i').style.width=`${(index+1)/6*100}%`;
 $('.scroll-cue').href=`#${chapters[Math.min(index+1,5)].id}`;
 structureOverride=null;rotating=false;targetYaw=0;
 $('#assemble').setAttribute('aria-pressed','false');$('#explode').setAttribute('aria-pressed','true');
 $('#assemble').classList.remove('selected');$('#explode').classList.add('selected');
 $('#rotate-structure').setAttribute('aria-pressed','false');
 if(index!==5&&exploring)setExplore(false);
 sizeChanged=true;renderNeeded=true;
}
function measureProgress(){
 const y=window.scrollY;
 let i=0;while(i<chapters.length-1&&y>=chapters[i+1].offsetTop)i++;
 rawProgress=clamp(i+(y-chapters[i].offsetTop)/chapters[i].offsetHeight,0,5);
 const nearest=Math.min(5,Math.floor(rawProgress+.5));
 if(nearest!==active)activate(nearest);
 // Text dissolves as the same persistent model moves between chapters.
 panels[active].style.opacity=String(1-.72*smooth((Math.abs(rawProgress-active)-.14)/.36));
 renderNeeded=true;
}
activate(0);measureProgress();
window.addEventListener('scroll',measureProgress,{passive:true});
window.addEventListener('resize',()=>{measureProgress();sizeChanged=true;renderNeeded=true},{passive:true});
window.visualViewport?.addEventListener('resize',()=>{sizeChanged=true;renderNeeded=true});
new ResizeObserver(()=>{sizeChanged=true;renderNeeded=true}).observe(stage);
$('.menu-toggle').addEventListener('click',()=>{const isOpen=$('#navigation').classList.toggle('open');$('.menu-toggle').setAttribute('aria-expanded',String(isOpen));$('.menu-toggle').setAttribute('aria-label',isOpen?'关闭章节导航':'打开章节导航')});
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',event=>{
 const target=document.querySelector(a.hash);if(!target)return;
 event.preventDefault();$('#navigation').classList.remove('open');$('.menu-toggle').setAttribute('aria-expanded','false');$('.menu-toggle').setAttribute('aria-label','打开章节导航');
 history.replaceState(null,'',a.hash);window.scrollTo({top:target.offsetTop,behavior:reduced?'instant':'smooth'});
}));
document.addEventListener('keydown',event=>{if(event.key==='Escape'){setExplore(false);$('#navigation').classList.remove('open');$('.menu-toggle').setAttribute('aria-expanded','false')}});
function setStructure(value){structureOverride=value;rotating=false;targetYaw=0;$('#rotate-structure').setAttribute('aria-pressed','false');for(const [id,v]of [['assemble',0],['explode',1]]){$('#'+id).classList.toggle('selected',value===v);$('#'+id).setAttribute('aria-pressed',String(value===v))}renderNeeded=true;}
$('#assemble').addEventListener('click',()=>setStructure(0));$('#explode').addEventListener('click',()=>setStructure(1));
$('#rotate-structure').addEventListener('click',()=>{rotating=!rotating;$('#rotate-structure').setAttribute('aria-pressed',String(rotating));if(!rotating)targetYaw=0;renderNeeded=true});
document.querySelectorAll('[data-detail]').forEach(button=>button.addEventListener('click',()=>{detail=Number(button.dataset.detail);zoomed=false;$('#detail-zoom').setAttribute('aria-pressed','false');$('#detail-zoom').textContent='＋ 放大查看';document.querySelectorAll('[data-detail]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button))});$('#detail-label').textContent=`0${detail+1} / ${['琉璃瓦','彩绘','木结构','石雕'][detail]}`;renderNeeded=true}));
$('#detail-zoom').addEventListener('click',()=>{zoomed=!zoomed;$('#detail-zoom').setAttribute('aria-pressed',String(zoomed));$('#detail-zoom').textContent=zoomed?'− 还原视角':'＋ 放大查看';renderNeeded=true});
function setExplore(value){exploring=value;targetYaw=0;document.body.classList.toggle('exploring',value);$('.explore-controls').hidden=!value;$('#explore-model').setAttribute('aria-pressed',String(value));$('#explore-model').innerHTML=value?'退出探索 <span>×</span>':'探索更多 <span>⟶</span>';renderNeeded=true;}
$('#explore-model').addEventListener('click',()=>setExplore(!exploring));$('.close-explore').addEventListener('click',()=>setExplore(false));$('#reset-view').addEventListener('click',()=>{targetYaw=0;renderNeeded=true});
let pointer=null;
stage.addEventListener('pointerdown',e=>{if(!exploring)return;pointer={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:targetYaw};stage.setPointerCapture(e.pointerId)});
stage.addEventListener('pointermove',e=>{if(!pointer||e.pointerId!==pointer.id)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;if(e.pointerType!=='touch'||Math.abs(dx)>Math.abs(dy)){targetYaw=pointer.yaw+dx*.008;renderNeeded=true}});
for(const name of ['pointerup','pointercancel','lostpointercapture'])stage.addEventListener(name,()=>pointer=null);

function setupRenderer(){
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,mobile()?1.35:1.65));
 renderer.setClearColor(0x0b0d12,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
 renderer.shadowMap.enabled=!mobile();renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 stage.appendChild(renderer.domElement);
 scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x1b2028,.0038);
 camera=new THREE.PerspectiveCamera(33,1,.1,700);
 const room=new RoomEnvironment();const pmrem=new THREE.PMREMGenerator(renderer);environment=pmrem.fromScene(room,.08);scene.environment=environment.texture;scene.environmentIntensity=.22;room.dispose();pmrem.dispose();
 scene.add(new THREE.HemisphereLight(0x91a8c8,0x36291b,.44));
 key=new THREE.DirectionalLight(0xffd094,4.6);key.position.set(-62,40,34);key.castShadow=!mobile();key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-65;key.shadow.camera.right=65;key.shadow.camera.top=70;key.shadow.camera.bottom=-45;key.shadow.camera.far=220;key.shadow.normalBias=.045;key.shadow.bias=-.0002;key.shadow.radius=4;scene.add(key);
 fill=new THREE.DirectionalLight(0x597faf,.85);fill.position.set(40,34,-30);scene.add(fill);
 const front=new THREE.DirectionalLight(0xffd7a4,.4);front.position.set(-20,18,70);scene.add(front);
 const floorLoader=new THREE.TextureLoader();
 const paving=floorLoader.load(`${import.meta.env.BASE_URL}assets/courtyard-diffuse.webp`,()=>renderNeeded=true);paving.colorSpace=THREE.SRGBColorSpace;
 const pavingNormal=floorLoader.load(`${import.meta.env.BASE_URL}assets/courtyard-normal.webp`,()=>renderNeeded=true);
 for(const texture of [paving,pavingNormal]){texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(500/12,500/12);texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());}
 const groundMaterial=new THREE.MeshStandardMaterial({map:paving,normalMap:pavingNormal,normalScale:new THREE.Vector2(.48,.48),color:0x72746f,roughness:.62,metalness:.16,transparent:true,opacity:.98,depthWrite:false});
 // Fade the physical courtyard into the distant photographic atmosphere, with no hard horizon.
 groundMaterial.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 vCourtyardWorld;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvCourtyardWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
  shader.fragmentShader='varying vec3 vCourtyardWorld;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','diffuseColor.a *= 1.0 - smoothstep(48.0, 155.0, length(vCourtyardWorld.xz));\n#include <opaque_fragment>');
 };
 ground=new THREE.Mesh(new THREE.PlaneGeometry(500,500),groundMaterial);ground.rotation.x=-Math.PI/2;ground.position.y=-.07;ground.receiveShadow=true;ground.renderOrder=-1;scene.add(ground);
 const ringMat=new THREE.MeshBasicMaterial({color:0xc9a45c,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false});
 halo=new THREE.Group();for(const r of [33.5,35,37]){const ring=new THREE.Mesh(new THREE.RingGeometry(r,r+.028,256),ringMat);ring.rotation.x=-Math.PI/2;ring.position.y=-.01;halo.add(ring)}scene.add(halo);
 modelGroup=new THREE.Group();scene.add(modelGroup);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();debug.error='WebGL context lost';showError('图形显示已暂停，可点击重新加载恢复。');loaded=false});
 renderer.domElement.addEventListener('webglcontextrestored',()=>loadModel());
 sizeChanged=true;
}
function showError(message){$('.model-status').classList.add('complete');$('.model-error').hidden=false;$('.model-error>div>span').textContent=message;debug.error=message;debug.loaded=false;}
function disposeModel(){if(!model)return;modelGroup.remove(model);const textures=new Set(),materials=new Set();model.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value)}}});textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());model=null;}
async function loadModel(){
 const id=++loadId;fetchController?.abort();fetchController=new AbortController();loaded=false;debug.loaded=false;debug.error=null;
 $('.model-error').hidden=true;$('.model-status').classList.remove('complete');$('#load-label').textContent='正在唤醒建筑档案';$('#retry-model').disabled=true;
 const update=n=>{$('#load-percent').textContent=`${n}%`;$('.load-track i').style.width=`${n}%`};update(0);
 const variant=mobile()||(navigator.deviceMemory&&navigator.deviceMemory<=4)?'mobile':'desktop';debug.modelVariant=variant;
 const timeout=setTimeout(()=>fetchController.abort(),45000);
 try{
  if(!renderer)setupRenderer();
  const response=await fetch(`${import.meta.env.BASE_URL}assets/qiniandian-${variant}.glb`,{signal:fetchController.signal});if(!response.ok)throw new Error(`Model HTTP ${response.status}`);
  const total=Number(response.headers.get('content-length'));const reader=response.body.getReader();const chunks=[];let received=0;
  while(true){const {done,value}=await reader.read();if(done)break;chunks.push(value);received+=value.length;update(total?Math.min(84,Math.round(received/total*84)):Math.min(70,Math.floor(received/80000)));}
  const buffer=new Uint8Array(received);let offset=0;for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.length}
  update(88);$('#load-label').textContent='正在呈现琉璃与木石';
  const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const gltf=await loader.parseAsync(buffer.buffer,`${import.meta.env.BASE_URL}assets/`);if(id!==loadId)return;
  disposeModel();model=gltf.scene;modelGroup.add(model);
  for(const name of ['Terraces_Root','Timber_Root','Roofs_Root']){const object=model.getObjectByName(name);if(!object)throw new Error('Missing component '+name);roots[name]=object;bases[name]=object.position.clone();}
  let meshCount=0,mapCount=0;model.traverse(o=>{if(o.isMesh){meshCount++;o.castShadow=true;o.receiveShadow=true;o.frustumCulled=true;const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){m.envMapIntensity=.56;if(m.map){mapCount++;m.map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());}if(m.normalMap)m.normalScale.set(.28,.28);if(m.name.includes('Marble')){m.color.set(0xd2c3ac);m.roughness=.57;}if(m.name.includes('Glazed')||m.name.includes('Tile_Ridge')){m.color.set(0xb5c9e0);m.roughness=.25;m.metalness=.24;}if(m.name.includes('Gilding')){m.metalness=.86;m.roughness=.24;}}}});
  debug.meshCount=meshCount;debug.mappedMeshes=mapCount;debug.bounds=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()).toArray();
  update(100);loaded=true;debug.loaded=true;debug.modelBytes=received;$('.model-status').classList.add('complete');sizeChanged=true;renderNeeded=true;
 }catch(error){if(id===loadId){console.error('Model loading:',error);showError('模型暂时未能加载。请重试，文字章节仍可继续阅读。');}}
 finally{clearTimeout(timeout);if(id===loadId)$('#retry-model').disabled=false}
}
$('#retry-model').addEventListener('click',()=>{if(renderer&&renderer.getContext().isContextLost()){renderer.forceContextRestore();return;}loadModel();});

// All coordinates are in the exported Y-up meter system. Root offsets are absolute,
// always added to captured bases, so reverse scroll cannot accumulate drift.
const shots=[
 {cam:[37,22,99],look:[0,17,0],shift:-.20,fov:33,explode:0,yaw:-.06},
 {cam:[55,57,81],look:[0,14,0],shift:-.20,fov:35,explode:0,yaw:.18},
 {cam:[37,38,117],look:[0,22,0],shift:-.17,fov:39,explode:1,yaw:0},
 {cam:[23,22,34],look:[1,15,12],shift:.16,fov:36,explode:0,yaw:0},
 {cam:[26,36,128],look:[0,18,0],shift:0,fov:46,explode:0,yaw:-.02},
 {cam:[32,22,103],look:[0,16,0],shift:-.19,fov:34,explode:0,yaw:.12}
];
const detailShots=[
 {cam:[15,20,27],look:[4,15,13]},
 {cam:[8,20,20],look:[1,18.8,9.7]},
 {cam:[10,12,21],look:[2,10,11.5]},
 {cam:[23,9,34],look:[12,5,22]}
];
const cameraTarget=new THREE.Vector3(),lookTarget=new THREE.Vector3(),currentLook=new THREE.Vector3(0,17,0);
let currentShift=-.2,currentFov=33,currentExplosion=0,currentBaseYaw=0;
function resize(){if(!renderer)return;const rect=stage.getBoundingClientRect();renderer.setSize(rect.width,rect.height,false);composer?.setSize(rect.width,rect.height);camera.aspect=rect.width/rect.height;sizeChanged=false;}
function draw(time){
 requestAnimationFrame(draw);if(document.hidden||!renderer||!loaded)return;
 const dt=Math.min((time-lastTime)/1000||.016,.08);lastTime=time;
 const damping=reduced?1:1-Math.exp(-dt*9);
 if(Math.abs(progress-rawProgress)>.0001){progress=lerp(progress,rawProgress,damping);renderNeeded=true}else progress=rawProgress;
 if(rotating){targetYaw+=dt*.19;renderNeeded=true}
 const i=Math.min(4,Math.floor(progress)),t=smooth(progress-i);const a={...shots[i]},b={...shots[i+1]};
 if(i===3)Object.assign(a,detailShots[detail]);if(i+1===3)Object.assign(b,detailShots[detail]);
 cameraTarget.fromArray(a.cam).lerp(new THREE.Vector3().fromArray(b.cam),t);lookTarget.fromArray(a.look).lerp(new THREE.Vector3().fromArray(b.look),t);
 let targetShift=lerp(a.shift,b.shift,t),targetFov=lerp(a.fov,b.fov,t),explosion=lerp(a.explode,b.explode,t);
 const dw=Math.max(0,1-Math.abs(progress-3));if(zoomed)targetFov-=dw*9;
 if(active===2&&structureOverride!==null)explosion=structureOverride;
 const cultureWeight=Math.max(0,1-Math.abs(progress-4));
 if(mobile()){
  targetShift=0;targetFov=43+dw*(zoomed?-7:3);
  cameraTarget.sub(lookTarget).multiplyScalar(lerp(.84,1.18,smooth(dw))-.03*smooth(cultureWeight)).add(lookTarget);
 }
 if(exploring)targetShift=mobile()?0:-.06;
 const change=camera.position.distanceTo(cameraTarget)+currentLook.distanceTo(lookTarget)+Math.abs(currentShift-targetShift)+Math.abs(currentFov-targetFov)+Math.abs(currentExplosion-explosion)+Math.abs(targetYaw-yaw)+Math.abs(currentBaseYaw-lerp(a.yaw,b.yaw,t));
 if(change>.001)renderNeeded=true;
 if(sizeChanged){resize();renderNeeded=true;}
 if(!renderNeeded)return;
 camera.position.lerp(cameraTarget,damping);currentLook.lerp(lookTarget,damping);currentShift=lerp(currentShift,targetShift,damping);currentFov=lerp(currentFov,targetFov,damping);currentExplosion=lerp(currentExplosion,explosion,damping);yaw=lerp(yaw,targetYaw,damping);currentBaseYaw=lerp(currentBaseYaw,lerp(a.yaw,b.yaw,t),damping);
 if(Math.abs(currentExplosion-explosion)<.001)currentExplosion=explosion;
 for(const [name,factor]of [['Terraces_Root',0],['Timber_Root',5],['Roofs_Root',12]]){roots[name].position.copy(bases[name]);roots[name].position.y+=factor*currentExplosion;}
 modelGroup.rotation.y=currentBaseYaw+yaw;
 camera.fov=currentFov;camera.lookAt(currentLook);const {width,height}=stage.getBoundingClientRect();camera.setViewOffset(width,height,currentShift*width,0,width,height);camera.updateProjectionMatrix();
 halo.children.forEach(o=>o.material.opacity=.35*cultureWeight);
 const dusk=smooth(progress-4);key.color.setRGB(1,lerp(.77,.56,dusk),lerp(.45,.25,dusk));key.intensity=lerp(4.6,4.1,dusk);fill.intensity=lerp(.85,1.15,dusk);key.position.y=lerp(40,25,dusk);
 document.documentElement.style.setProperty('--dusk',String(dusk));
 document.documentElement.style.setProperty('--scene-focus',String(1-.25*Math.max(0,1-Math.abs(progress-3))));
 if(composer)composer.render();else renderer.render(scene,camera);debug.frames++;debug.explosion=currentExplosion;debug.progress=progress;
 renderNeeded=change>.001||rotating;
}
requestAnimationFrame(draw);loadModel();
document.addEventListener('visibilitychange',()=>{lastTime=0;renderNeeded=true;});
// Preserve linked chapter deep-links while the model loads.
if(location.hash&&document.querySelector(location.hash))requestAnimationFrame(()=>window.scrollTo({top:document.querySelector(location.hash).offsetTop,behavior:'instant'}));

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTTextureWebP } from '@gltf-transform/extensions';
import { dedup, weld, simplify, meshopt, textureCompress } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
await fs.mkdir('public/assets',{recursive:true});
await Promise.all([MeshoptEncoder.ready,MeshoptSimplifier.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const metrics={};
for(const variant of ['desktop','mobile']){
 const doc=await io.read('work/qiniandian-raw.glb');
 const originalNames=doc.getRoot().listNodes().map(n=>n.getName());
 await doc.transform(dedup(),weld());
 if(variant==='mobile')await doc.transform(simplify({simplifier:MeshoptSimplifier,ratio:.48,error:.002,lockBorder:true}));
 for(const texture of doc.getRoot().listTextures()){
  const image=await fs.readFile(`work/textures/${variant}/${texture.getName()}.webp`);
  texture.setImage(image).setMimeType('image/webp');
 }
 doc.createExtension(EXTTextureWebP).setRequired(true);
 await doc.transform(meshopt({encoder:MeshoptEncoder,level:'medium'}));
 const target=`public/assets/qiniandian-${variant}.glb`;
 await io.write(target,doc);
 const check=await io.read(target);
 const names=check.getRoot().listNodes().map(n=>n.getName());
 for(const name of originalNames)if(!names.includes(name))throw new Error(`Missing node: ${name}`);
 const triangles=check.getRoot().listMeshes().reduce((sum,m)=>sum+m.listPrimitives().reduce((n,p)=>n+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0),0);
 metrics[variant]={bytes:(await fs.stat(target)).size,nodes:names.length,meshes:check.getRoot().listMeshes().length,triangles,textures:check.getRoot().listTextures().length,roots:names.filter(n=>n.endsWith('_Root')),hierarchyPreserved:true};
 console.log(variant,metrics[variant]);
}
await fs.writeFile('public/assets/model-info.json',JSON.stringify(metrics,null,2));
const index={project:'祈年殿 · 建筑数字档案',sourceBlend:'../祈年殿Blender场景/Qiniandian_Editable.blend',sourceMaterialLibrary:'../祈年殿Blender场景/Qiniandian_Materials.blend',designScreens:Array.from({length:6},(_,i)=>`../祈年殿官网视觉稿/SCREEN-0${i+1}.png`),webModels:{desktop:'public/assets/qiniandian-desktop.glb',mobile:'public/assets/qiniandian-mobile.glb'},components:{terraces:'Terraces_Root',timber:'Timber_Root',roofs:'Roofs_Root'},axes:{blender:'Z-up',gltf:'Y-up',unit:'meters'},materials:'Blender-baked tiled base-color and tangent-normal maps; embedded WebP textures; metallic/roughness factors retained.',transforms:'Source object transforms stored in glTF extras. Named hierarchy preserved. Original .blend unchanged.',metrics,limitations:'Existing artistic exterior reconstruction; not a measured restoration. Original ornament simplifications retained.'};
await fs.writeFile('asset-index.json',JSON.stringify(index,null,2));

import bpy, os, json, math
from mathutils import Vector
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE=os.path.join(os.path.dirname(ROOT),'祈年殿Blender场景','Qiniandian_Editable.blend')
WORK=os.path.join(ROOT,'work'); TEX=os.path.join(WORK,'baked');os.makedirs(TEX,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=SOURCE)
s=bpy.context.scene;s.frame_set(1)
objects=[o for o in s.objects if o.name!='Courtyard_Paved_Surface' and o.type in {'MESH','FONT','EMPTY'}]
manifest={'source':SOURCE,'sourceAxis':'Z_UP','exportAxis':'Y_UP','units':'meters','initialFrame':1,'objects':[]}
for o in objects:
    manifest['objects'].append({'name':o.name,'parent':o.parent.name if o.parent else None,'location':list(o.location),'rotation':list(o.rotation_euler),'scale':list(o.scale),'matrixLocal':[list(r) for r in o.matrix_local]})
    o['sourceName']=o.name;o['sourceLocation']=list(o.location);o['sourceRotationEuler']=list(o.rotation_euler);o['sourceScale']=list(o.scale)
    o.animation_data_clear()
    for mod in o.modifiers:mod.show_render=False;mod.show_viewport=False
materials={m for o in objects if o.type in {'MESH','FONT'} for m in o.data.materials if m}
s.render.engine='CYCLES';s.cycles.samples=8
try:
    pref=bpy.context.preferences.addons['cycles'].preferences;pref.compute_device_type='OPTIX';pref.get_devices()
    for d in pref.devices:d.use=d.type!='CPU'
    s.cycles.device='GPU'
except:pass
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.mesh.primitive_plane_add(size=2,location=(0,0,100))
plane=bpy.context.object;plane.name='TEMP_Material_Bake'
s.render.bake.use_pass_direct=False;s.render.bake.use_pass_indirect=False;s.render.bake.use_pass_color=True;s.render.bake.margin=8
for material in sorted(materials,key=lambda m:m.name):
    plane.data.materials.clear();plane.data.materials.append(material)
    nodes=material.node_tree.nodes;links=material.node_tree.links
    p=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
    images={}
    for mode,size in [('DIFFUSE',512),('NORMAL',256)]:
        img=bpy.data.images.new(material.name+'_'+mode,width=size,height=size,alpha=False)
        if mode=='NORMAL':img.colorspace_settings.name='Non-Color'
        tex=nodes.new('ShaderNodeTexImage');tex.image=img;nodes.active=tex
        bpy.ops.object.bake(type=mode)
        img.filepath_raw=os.path.join(TEX,img.name+'.png');img.file_format='PNG';img.save();images[mode]=img
        nodes.remove(tex)
    for inp in ['Base Color','Normal']:
        for link in list(p.inputs[inp].links):links.remove(link)
    albedo=nodes.new('ShaderNodeTexImage');albedo.image=images['DIFFUSE'];links.new(albedo.outputs['Color'],p.inputs['Base Color'])
    normal=nodes.new('ShaderNodeTexImage');normal.image=images['NORMAL'];normal.image.colorspace_settings.name='Non-Color'
    nm=nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.55;links.new(normal.outputs['Color'],nm.inputs['Color']);links.new(nm.outputs['Normal'],p.inputs['Normal'])
    print('BAKED',material.name,flush=True)
bpy.data.objects.remove(plane,do_unlink=True)
for o in objects:
    if o.type=='FONT':
        bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
    if o.type!='MESH':continue
    me=o.data;uv=me.uv_layers.active or me.uv_layers.new(name='WebUV')
    # Tiled object-space box UVs; no merge or transform changes.
    for p in me.polygons:
        axis=max(range(3),key=lambda i:abs(p.normal[i]));axes=[i for i in range(3) if i!=axis]
        for li in p.loop_indices:
            v=me.vertices[me.loops[li].vertex_index].co
            uv.data[li].uv=(v[axes[0]]*.5,v[axes[1]]*.5)
bpy.ops.object.select_all(action='DESELECT')
for o in objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(WORK,'qiniandian-raw.glb'),export_format='GLB',use_selection=True,export_yup=True,export_apply=False,export_animations=False,export_extras=True,export_cameras=False,export_lights=False,export_materials='EXPORT')
manifest['materials']=[m.name for m in materials]
manifest['bakedTextures']=len(materials)*2
with open(os.path.join(WORK,'blender-export.json'),'w',encoding='utf-8') as f:json.dump(manifest,f,ensure_ascii=False,indent=2)
print('EXPORT_COMPLETE',flush=True)

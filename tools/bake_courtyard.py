import bpy, os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out=os.path.join(ROOT,'work','courtyard');os.makedirs(out,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=os.path.join(os.path.dirname(ROOT),'祈年殿Blender场景','Qiniandian_Editable.blend'))
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=8
try:
 p=bpy.context.preferences.addons['cycles'].preferences;p.compute_device_type='OPTIX';p.get_devices()
 for d in p.devices:d.use=d.type!='CPU'
 s.cycles.device='GPU'
except:pass
bpy.ops.object.select_all(action='DESELECT');bpy.ops.mesh.primitive_plane_add(size=12,location=(0,0,100))
o=bpy.context.object;m=bpy.data.materials['PBR_Courtyard_Paving'];o.data.materials.append(m)
s.render.bake.use_pass_direct=False;s.render.bake.use_pass_indirect=False;s.render.bake.use_pass_color=True;s.render.bake.margin=8
for kind,size in [('DIFFUSE',1024),('NORMAL',1024)]:
 img=bpy.data.images.new('courtyard_'+kind,width=size,height=size,alpha=False)
 if kind=='NORMAL':img.colorspace_settings.name='Non-Color'
 n=m.node_tree.nodes.new('ShaderNodeTexImage');n.image=img;m.node_tree.nodes.active=n
 bpy.ops.object.bake(type=kind)
 img.filepath_raw=os.path.join(out,kind.lower()+'.png');img.file_format='PNG';img.save();m.node_tree.nodes.remove(n)
print('COURTYARD_BAKED_FROM_EXISTING_BLEND',flush=True)

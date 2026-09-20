"""Convert Rosswet Mobile's CC BY 3.0 Thin Zombie to embedded glTF.
Requires Blender 4.2 / bpy. Usage: python convert-zombie.py SOURCE_DIR OUTPUT_GLB
Source: https://opengameart.org/content/thin-zombie-awake-zombie-asset
"""
import bpy, sys, os
from pathlib import Path
source=Path(sys.argv[1]); target=Path(sys.argv[2]).resolve()
bpy.ops.wm.open_mainfile(filepath=str(source/'new_thin_zombie.blend'))
mesh=bpy.data.objects['new_thin_zombie']; arm=bpy.data.objects['Armature']
for obj in list(bpy.data.objects):
    if obj not in [mesh,arm]: bpy.data.objects.remove(obj,do_unlink=True)
texture=bpy.data.images.load(str(source/'new_thin_zombie.png'),check_existing=False)
material=bpy.data.materials.new('Weathered skin'); material.use_nodes=True
nodes=material.node_tree.nodes; bsdf=nodes.get('Principled BSDF'); bsdf.inputs['Roughness'].default_value=.88
image=nodes.new('ShaderNodeTexImage'); image.image=texture
material.node_tree.links.new(image.outputs['Color'],bsdf.inputs['Base Color'])
mesh.data.materials.clear(); mesh.data.materials.append(material)
mesh.data.validate(clean_customdata=False)
for poly in mesh.data.polygons: poly.material_index=0; poly.use_smooth=True
# Export evaluated constraint-driven actions; preserve the author's bone rig.
names={'idle':'Idle','walk':'Walk','run':'Run','attack1_r':'Punch','dead1':'Death','hurt':'Hit'}
for action in list(bpy.data.actions):
    if action.name in names: action.name=names[action.name]; action.use_fake_user=True
    else: bpy.data.actions.remove(action)
arm.animation_data_create(); arm.animation_data.action=bpy.data.actions['Idle']
for track in list(arm.animation_data.nla_tracks): arm.animation_data.nla_tracks.remove(track)
bpy.context.scene.frame_set(0)
print('MESH',len(mesh.data.vertices),'FPS',bpy.context.scene.render.fps,'UV',mesh.data.uv_layers.active.name)
print('BONES',[b.name for b in arm.data.bones])
bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',export_animations=True,export_animation_mode='ACTIONS',export_frame_range=False,export_force_sampling=True,export_def_bones=False,export_cameras=False,export_lights=False)

# bpy wheels may crash during interpreter teardown on macOS after successful export.
assert target.is_file() and target.stat().st_size > 100000
sys.stdout.flush(); sys.stderr.flush(); os._exit(0)

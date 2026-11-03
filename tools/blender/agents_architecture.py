"""Optional staffed Blender preview. Leaves the architecture and furnished scenes unchanged."""
import bpy
import math
from pathlib import Path
from mathutils import Vector

root = Path(__file__).resolve().parents[2]
out = root / "blender-output"
bpy.ops.wm.open_mainfile(filepath=str(out / "signal_symphony_furnished.blend"))
agents = bpy.data.collections.new("OPTIONAL AI AGENTS - visual only")
bpy.context.scene.collection.children.link(agents)

def material(name, rgb):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*rgb, 1)
    mat.use_nodes = True
    mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*rgb, 1)
    return mat

skin = material("Agent warm skin", (0.52, 0.32, 0.22))
skin_alt = material("Agent medium skin", (0.31, 0.18, 0.12))
skin_light = material("Agent light skin", (0.74, 0.52, 0.37))
suit = material("Agent navy uniforms", (0.055, 0.10, 0.19))
suit_alt = material("Agent charcoal uniforms", (0.10, 0.13, 0.17))
shirt = material("Agent pale shirts", (0.64, 0.77, 0.82))
hair = material("Agent dark hair", (0.065, 0.045, 0.035))
hair_alt = material("Agent chestnut hair", (0.20, 0.10, 0.06))
shoes = material("Agent black shoes", (0.035, 0.045, 0.055))

def link(obj):
    for col in list(obj.users_collection):
        col.objects.unlink(obj)
    agents.objects.link(obj)
    return obj

def block(name, location, dimensions, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = link(bpy.context.object)
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    return obj

def sphere(name, location, radius, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=radius, location=location)
    obj = link(bpy.context.object)
    obj.name = name
    obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj

def seated(name, x, y, tone, outfit, hairmat):
    """Seat center matches furniture chair; faces desk toward positive Y."""
    prefix = name + " - "
    block(prefix + "torso", (x, y, 1.17), (0.53, 0.34, 0.67), outfit)
    block(prefix + "shirt collar", (x, y + 0.18, 1.40), (0.23, 0.025, 0.22), shirt)
    sphere(prefix + "head", (x, y + 0.015, 1.76), 0.24, tone)
    sphere(prefix + "hair", (x, y - 0.035, 1.91), 0.205, hairmat)
    for side in (-1, 1):
        block(prefix + "upper arm", (x + side * 0.34, y + 0.075, 1.19),
              (0.15, 0.23, 0.43), outfit)
        block(prefix + "forearm", (x + side * 0.34, y + 0.30, 0.99),
              (0.14, 0.34, 0.14), tone)
        block(prefix + "thigh", (x + side * 0.15, y + 0.30, 0.53),
              (0.24, 0.60, 0.19), outfit)
        block(prefix + "shin", (x + side * 0.15, y + 0.57, 0.31),
              (0.19, 0.18, 0.43), outfit)
        block(prefix + "shoe", (x + side * 0.15, y + 0.71, 0.095),
              (0.21, 0.36, 0.15), shoes)

# Keep all characters within the existing furnished workstation positions.
people = [
    ("Cintia - reception", -14.0, -9.55, skin_alt, suit, hair),
    ("Research agent 1", -16.8, 5.15, skin, suit_alt, hair_alt),
    ("Research agent 2", -12.4, 5.15, skin_light, suit, hair),
    ("Research agent 3", -16.8, 0.25, skin_alt, suit, hair),
    ("Research agent 4", -12.4, 0.25, skin, suit_alt, hair_alt),
    ("Trading agent 1", 11.5, 5.25, skin_alt, suit, hair),
    ("Trading agent 2", 16.3, 5.25, skin_light, suit_alt, hair_alt),
    ("Trading agent 3", 11.5, 0.05, skin, suit, hair),
    ("Trading agent 4", 16.3, 0.05, skin_alt, suit_alt, hair),
    ("Risk agent 1", 11.5, -11.22, skin_light, suit, hair_alt),
    ("Risk agent 2", 16.1, -11.22, skin, suit_alt, hair),
    ("Director", 0.0, 12.8, skin_alt, suit, hair),
]
for person in people:
    seated(*person)

scene = bpy.context.scene
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(out / "architecture_agents.png")
bpy.ops.wm.save_as_mainfile(filepath=str(out / "signal_symphony_agents.blend"))
bpy.ops.export_scene.gltf(filepath=str(out / "signal_symphony_agents.glb"), export_format="GLB")
bpy.ops.render.render(write_still=True)
print("Optional visual agents generated; architecture and furnished previews preserved.")

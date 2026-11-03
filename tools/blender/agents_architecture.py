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

def rounded_block(name, location, dimensions, mat, bevel=0.07):
    obj = block(name, location, dimensions, mat)
    modifier = obj.modifiers.new("Soft tailored edges", "BEVEL")
    modifier.width = bevel
    modifier.segments = 2
    obj.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
    return obj

def ellipsoid(name, location, scale, mat):
    obj = sphere(name, location, 1, mat)
    obj.scale = scale
    return obj

def seated(name, x, y, tone, outfit, hairmat):
    """A seated operator faces positive Y, matching the existing workstation chairs.

    This optional visual-only model does not move furniture or alter trading agents.
    Keep feet under the desk, hands over the keyboard and head above the chair back.
    """
    prefix = name + " - "
    # Rounded jacket and shoulder silhouette, rather than rectangular mannequins.
    rounded_block(prefix + "jacket", (x, y, 1.20), (0.51, 0.34, 0.61), outfit, 0.11)
    rounded_block(prefix + "shirt front", (x, y + 0.178, 1.33),
                  (0.19, 0.022, 0.35), shirt, 0.015)
    rounded_block(prefix + "neck", (x, y + 0.015, 1.57),
                  (0.15, 0.14, 0.15), tone, 0.035)
    ellipsoid(prefix + "head", (x, y + 0.025, 1.79),
              (0.235, 0.215, 0.275), tone)
    # Hair cap sits above the face and does not obscure it.
    ellipsoid(prefix + "hair cap", (x, y - 0.038, 1.963),
              (0.240, 0.225, 0.115), hairmat)
    ellipsoid(prefix + "hair back", (x, y - 0.145, 1.82),
              (0.215, 0.095, 0.185), hairmat)
    # Small jacket lapels and a dark tie create readable clothing at render scale.
    for side in (-1, 1):
        lapel = rounded_block(prefix + "lapel", (x + side * 0.105, y + 0.192, 1.40),
                              (0.105, 0.027, 0.24), outfit, 0.018)
        lapel.rotation_euler[1] = side * 0.22
    rounded_block(prefix + "tie", (x, y + 0.199, 1.34),
                  (0.052, 0.024, 0.23), shoes, 0.012)
    for side in (-1, 1):
        sx = x + side * 0.33
        ellipsoid(prefix + "shoulder", (sx, y + 0.018, 1.40),
                  (0.17, 0.18, 0.16), outfit)
        rounded_block(prefix + "sleeve", (sx, y + 0.10, 1.21),
                      (0.17, 0.23, 0.37), outfit, 0.065)
        rounded_block(prefix + "forearm", (sx, y + 0.34, 1.02),
                      (0.135, 0.31, 0.13), outfit, 0.05)
        ellipsoid(prefix + "hand", (sx, y + 0.49, 1.02),
                  (0.086, 0.11, 0.066), tone)
        rounded_block(prefix + "trouser thigh", (x + side * 0.145, y + 0.31, 0.59),
                      (0.23, 0.55, 0.22), outfit, 0.075)
        rounded_block(prefix + "trouser shin", (x + side * 0.145, y + 0.57, 0.32),
                      (0.18, 0.18, 0.40), outfit, 0.045)
        rounded_block(prefix + "shoe", (x + side * 0.145, y + 0.71, 0.10),
                      (0.21, 0.35, 0.15), shoes, 0.045)

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

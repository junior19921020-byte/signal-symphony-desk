"""Generate an editable, furniture-free architectural shell for Signal Symphony Desk."""
import bpy
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "blender-output"
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

def mat(name, color, metallic=0, roughness=0.5, alpha=1):
    m=bpy.data.materials.new(name)
    m.diffuse_color=(*color,alpha)
    m.use_nodes=True
    bs=m.node_tree.nodes.get("Principled BSDF")
    bs.inputs["Base Color"].default_value=(*color,1)
    bs.inputs["Metallic"].default_value=metallic
    bs.inputs["Roughness"].default_value=roughness
    if alpha<1:
        bs.inputs["Alpha"].default_value=alpha
        if hasattr(m, "surface_render_method"):
            m.surface_render_method="DITHERED"
        else:
            m.blend_method="BLEND"
    return m

floor=mat("Hall - dark stone",(0.075,0.10,0.14),0.15)
wood=mat("Office floors - warm wood",(0.35,0.20,0.11))
wall=mat("Walls - charcoal",(0.12,0.16,0.20))
glass=mat("Glass partitions - blue",(0.32,0.72,0.85),0.05,0.12,0.28)
metal=mat("Window frames",(0.08,0.11,0.14),0.6)
light=mat("Thresholds",(0.18,0.44,0.56),0.3)

def cube(name,loc,scale,material):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    obj=bpy.context.object
    obj.name=name
    obj.dimensions=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    obj.data.materials.append(material)
    return obj

def segment(name,a,b,height,material,thickness=0.13,z=0):
    dx,dy=b[0]-a[0],b[1]-a[1]
    obj=cube(name,((a[0]+b[0])/2,(a[1]+b[1])/2,z+height/2),(math.hypot(dx,dy),thickness,height),material)
    obj.rotation_euler[2]=math.atan2(dy,dx)
    return obj

# 20 x 16 m footprint, entrance at front (negative Y).
cube("Structural foundation",(0,0,-0.22),(20,16,0.44),wall)
cube("Main hall",(0,-1,0.035),(8,13.5,0.07),floor)
# Entire-company shell: rear management, left research, right trading,
# front-left reception, front-right risk. No furniture or agents.
zones=[
 ("Research",(-6,4.3),(8,6.8)),
 ("Trading",(6,4.3),(8,6.8)),
 ("Reception",(-6,-4.7),(8,5.7)),
 ("Risk",(6,-4.7),(8,5.7)),
 ("Management",(0,6.9),(8,2.2)),
]
for name,(x,y),(w,d) in zones:
    cube(name+" floor",(x,y,0.05),(w,d,0.1),wood)
# perimeter walls; front entrance 3m wide.
for name,a,b in [
 ("West exterior",(-10,-8),(-10,8)),
 ("East exterior",(10,-8),(10,8)),
 ("North exterior",(-10,8),(10,8)),
 ("Front left",(-10,-8),(-1.5,-8)),
 ("Front right",(1.5,-8),(10,-8)),
]:
    segment(name,a,b,3.5,wall,0.24)
# Glazed interior corridor partitions, with 2m gaps per zone.
for x in (-4,4):
    for ya,yb in [(-7.8,-5.6),(-3.6,1.7),(3.7,7.7)]:
        segment("Glass corridor partition",(x,ya),(x,yb),2.8,glass,0.08)
        segment("Top glass frame",(x,ya),(x,yb),0.10,metal,0.11,2.75)
# Horizontal zone partitions, doorway gaps facing the hall.
for y in (-1.0,):
    for xa,xb in [(-10,-7),(-5,-4),(4,5),(7,10)]:
        segment("Room division",(xa,y),(xb,y),3,glass,0.10)
# Rear director's room partition and 2m door gap.
for xa,xb in [(-4,-1),(1,4)]:
    segment("Management glass",(xa,5.8),(xb,5.8),3,glass,0.10)
# Entrance and room thresholds.
cube("Main entrance threshold",(0,-7.85,0.08),(3,0.24,0.16),light)
# Architectural camera.
world=bpy.context.scene.world
world.color=(0.16,0.18,0.23)
bpy.ops.object.light_add(type="AREA",location=(0,-2,14))
lamp=bpy.context.object
lamp.name="Architectural softbox"
lamp.data.energy=3500
lamp.data.shape="RECTANGLE"
lamp.data.size=16
lamp.data.size_y=12
bpy.ops.object.camera_add(location=(23,-29,28))
cam=bpy.context.object
direction=Vector((0,0,0))-cam.location
cam.rotation_euler=direction.to_track_quat("-Z","Y").to_euler()
cam.data.type="ORTHO"
cam.data.ortho_scale=30
bpy.context.scene.camera=cam
scene=bpy.context.scene
scene.render.engine="BLENDER_EEVEE"
scene.render.resolution_x=1600
scene.render.resolution_y=1000
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.render.filepath=str(OUT/"architecture.png")
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/"signal_symphony_architecture.blend"))
bpy.ops.export_scene.gltf(filepath=str(OUT/"signal_symphony_architecture.glb"),export_format="GLB")
bpy.ops.render.render(write_still=True)
print("Generated architecture assets in",OUT)

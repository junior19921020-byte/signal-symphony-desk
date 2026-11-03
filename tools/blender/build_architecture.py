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

# Version 2: 40 x 30 metre company-wide architectural footprint.
# Rear: management, research and trading; front: reception and risk.
# All geometry is deliberately furniture-free.
W, D = 40.0, 30.0
cube("Structural foundation",(0,0,-0.22),(W,D,0.44),wall)
cube("Central circulation hall",(0,-1.5,0.035),(12,26,0.07),floor)
zones=[
 ("Research and news",(-14,4.75),(12,20.5)),
 ("Trading",(14,4.75),(12,20.5)),
 ("Reception",(-14,-10.25),(12,9.5)),
 ("Risk management",(14,-10.25),(12,9.5)),
 ("Board and directors",(0,11.5),(16,7)),
]
for name,(x,y),(w,d) in zones:
    cube(name+" floor",(x,y,0.05),(w,d,0.10),wood)
# Outside walls, with a generous 5-metre entrance facing the viewer.
for name,a,b in [
 ("West exterior",(-20,-15),(-20,15)),
 ("East exterior",(20,-15),(20,15)),
 ("North exterior",(-20,15),(20,15)),
 ("Front left",(-20,-15),(-2.5,-15)),
 ("Front right",(2.5,-15),(20,-15)),
]:
    segment(name,a,b,4.2,wall,0.26)
# Long glazed partitions along the central circulation spine.
# Gaps are reserved for future animated door objects.
for x in (-8,8):
    for ya,yb in [(-14.7,-12),(-9,-2),(1,8),(11,14.7)]:
        segment("Central glass partition",(x,ya),(x,yb),3.5,glass,0.09)
        segment("Central glass upper frame",(x,ya),(x,yb),0.11,metal,0.12,3.45)
# Research/trading separated from reception/risk, with corridor-side access.
for xa,xb in [(-20,-8),(8,20)]:
    segment("Department separation",(xa,-5.5),(xb,-5.5),3.5,glass,0.10)
    segment("Department upper frame",(xa,-5.5),(xb,-5.5),0.11,metal,0.12,3.45)
# Boardroom spans the rear centre, with a 3-metre doorway.
for xa,xb in [(-8,-1.5),(1.5,8)]:
    segment("Boardroom glazed front",(xa,8),(xb,8),3.5,glass,0.10)
    segment("Boardroom upper frame",(xa,8),(xb,8),0.11,metal,0.12,3.45)
cube("Wide entrance threshold",(0,-14.8,0.08),(5,0.28,0.16),light)
# Editable department floor labels.
def floor_label(name, label, x, y, size):
    curve=bpy.data.curves.new(name+" lettering","FONT")
    curve.body=label
    curve.size=size
    curve.align_x="CENTER"
    curve.align_y="CENTER"
    obj=bpy.data.objects.new(name,curve)
    bpy.context.collection.objects.link(obj)
    obj.location=(x,y,0.13)
    curve.materials.append(light)

for name,label,x,y,size in [
    ("Research sign","PESQUISA",-14,4.8,1.25),
    ("Trading sign","TRADING",14,4.8,1.25),
    ("Reception sign","RECEPCAO",-14,-10,1.1),
    ("Risk sign","GESTAO DE RISCO",14,-10,0.9),
    ("Director sign","DIRETORIA",0,11.7,1.2),
]:
    floor_label(name,label,x,y,size)
# Architectural camera.
world=bpy.context.scene.world
world.color=(0.16,0.18,0.23)
bpy.ops.object.light_add(type="AREA",location=(0,-2,24))
lamp=bpy.context.object
lamp.name="Architectural softbox"
lamp.data.energy=6500
lamp.data.shape="RECTANGLE"
lamp.data.size=32
lamp.data.size_y=26
bpy.ops.object.camera_add(location=(48,-62,55))
cam=bpy.context.object
direction=Vector((0,0,0))-cam.location
cam.rotation_euler=direction.to_track_quat("-Z","Y").to_euler()
cam.data.type="ORTHO"
cam.data.ortho_scale=53
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

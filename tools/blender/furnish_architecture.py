"""Optional furnished preview. Never modifies the approved empty architectural model."""
import bpy
import math
from pathlib import Path
from mathutils import Vector

root=Path(__file__).resolve().parents[2]
out=root/"blender-output"
bpy.ops.wm.open_mainfile(filepath=str(out/"signal_symphony_architecture.blend"))
collection=bpy.data.collections.new("OPTIONAL FURNITURE - hide to inspect shell")
bpy.context.scene.collection.children.link(collection)

def material(name, rgb, metallic=0, roughness=0.55):
    m=bpy.data.materials.new(name)
    m.diffuse_color=(*rgb,1)
    m.use_nodes=True
    bs=m.node_tree.nodes.get("Principled BSDF")
    bs.inputs["Base Color"].default_value=(*rgb,1)
    bs.inputs["Metallic"].default_value=metallic
    bs.inputs["Roughness"].default_value=roughness
    return m

oak=material("Furniture walnut veneer",(0.23,0.135,0.075))
lightwood=material("Furniture light oak",(0.43,0.30,0.19))
steel=material("Furniture graphite steel",(0.055,0.075,0.095),0.6)
fabric=material("Furniture midnight upholstery",(0.085,0.13,0.19))
screen=material("Monitor dark blue display",(0.045,0.16,0.23),0.15,0.28)
accent=material("Furniture muted cyan",(0.12,0.46,0.54),0.3)

def cube(name,xyz,dims,mat):
    bpy.ops.mesh.primitive_cube_add(size=1,location=xyz)
    ob=bpy.context.object
    ob.name=name
    ob.dimensions=dims
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    ob.data.materials.append(mat)
    for old in list(ob.users_collection):
        old.objects.unlink(ob)
    collection.objects.link(ob)
    return ob

def desk(name,x,y,width=2.2,depth=1.05):
    cube(name+" desktop",(x,y,0.88),(width,depth,0.10),oak)
    for dx in (-width/2+0.13,width/2-0.13):
        for dy in (-depth/2+0.13,depth/2-0.13):
            cube(name+" leg",(x+dx,y+dy,0.43),(0.075,0.075,0.82),steel)
    cube(name+" monitor",(x,y+0.14,1.36),(0.88,0.065,0.53),screen)
    cube(name+" monitor stand",(x,y+0.14,1.06),(0.075,0.075,0.18),steel)
    cube(name+" keyboard",(x,y-0.28,0.952),(0.72,0.21,0.025),steel)

# The chair back must be opposite the desk/monitor direction.
def chair(name,x,y,faces_positive_y=False):
    cube(name+" seat",(x,y,0.53),(0.64,0.63,0.15),fabric)
    cube(name+" back",(x,y+(-0.27 if faces_positive_y else 0.27),0.98),(0.65,0.12,0.94),fabric)
    cube(name+" support",(x,y,0.27),(0.09,0.09,0.46),steel)
    cube(name+" base",(x,y,0.10),(0.60,0.60,0.07),steel)

# Reception: welcome counter with clear passage along the glass wall.
cube("Reception welcome counter",(-14,-10.8,0.73),(4.2,0.95,1.38),lightwood)
cube("Reception counter dark cap",(-14,-10.8,1.44),(4.3,1.03,0.09),steel)
cube("Reception service monitor",(-14,-10.45,1.80),(0.95,0.09,0.55),screen)
chair("Receptionist chair",-14,-9.55)
# Research: two independent workstations and a reading table.
for x,y in [(-16.8,6.3),(-12.4,6.3),(-16.8,1.4),(-12.4,1.4)]:
    desk("Research workstation",x,y)
    chair("Research operator",x,y-1.15,faces_positive_y=True)
cube("Research collaboration table",(-14,11.2,0.72),(3.5,1.55,0.12),lightwood)
for x in (-15.2,-12.8):
    chair("Research meeting chair",x,9.95,faces_positive_y=True)
# Trading: two rows of multi-screen desks, safely inside the trading department.
for x,y in [(11.5,6.5),(16.3,6.5),(11.5,1.3),(16.3,1.3)]:
    desk("Trading station",x,y,2.6,1.2)
    chair("Trading operator",x,y-1.25,faces_positive_y=True)
    cube("Trading secondary display",(x+0.78,y+0.14,1.37),(0.66,0.065,0.48),screen)
# Risk: compact analysis desks.
for x,y in [(11.5,-10.1),(16.1,-10.1)]:
    desk("Risk analysis station",x,y,2.2,1.0)
    chair("Risk analyst",x,y-1.12,faces_positive_y=True)
# Executive room: board table and chairs; no corridor obstructions.
cube("Boardroom meeting table",(0,11.5,0.79),(5.2,1.65,0.15),oak)
for x in (-2.0,0,2.0):
    chair("Boardroom north chair",x,12.8)
    chair("Boardroom south chair",x,10.2,faces_positive_y=True)
# Subtle plants in the room corners, not in door openings.
green=material("Plant foliage",(0.065,0.22,0.13))
for x,y in [(-18.5,12.5),(18.5,12.5),(-18.5,-7.3),(18.5,-7.3)]:
    cube("Planter",(x,y,0.32),(0.68,0.68,0.64),steel)
    cube("Plant foliage",(x,y,0.94),(0.85,0.85,0.85),green)

scene=bpy.context.scene
scene.render.filepath=str(out/"architecture_furnished.png")
bpy.ops.wm.save_as_mainfile(filepath=str(out/"signal_symphony_furnished.blend"))
bpy.ops.export_scene.gltf(filepath=str(out/"signal_symphony_furnished.glb"),export_format="GLB")
bpy.ops.render.render(write_still=True)
print("Furnished preview generated; original shell files preserved")

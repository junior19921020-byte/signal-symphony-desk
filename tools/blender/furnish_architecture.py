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
    cube(name+" mouse",(x+0.50,y-0.28,0.97),(0.11,0.17,0.04),steel)

# The chair back must be opposite the desk/monitor direction.
def chair(name,x,y,faces_positive_y=False):
    cube(name+" seat",(x,y,0.53),(0.64,0.63,0.15),fabric)
    cube(name+" back",(x,y+(-0.27 if faces_positive_y else 0.27),0.98),(0.65,0.12,0.94),fabric)
    cube(name+" support",(x,y,0.27),(0.09,0.09,0.46),steel)
    cube(name+" base",(x,y,0.10),(0.60,0.60,0.07),steel)
    for dx in (-0.32,0.32):
        cube(name+" armrest",(x+dx,y,0.79),(0.10,0.36,0.07),fabric)
        cube(name+" arm support",(x+dx,y,0.67),(0.06,0.08,0.22),steel)
    for i in range(5):
        a=2*math.pi*i/5
        cube(name+" wheel",(x+0.31*math.cos(a),y+0.31*math.sin(a),0.075),(0.12,0.12,0.11),steel)

# Reception: welcome counter with clear passage along the glass wall.
cube("Reception welcome counter",(-14,-10.8,0.73),(4.2,0.95,1.38),lightwood)
cube("Reception counter dark cap",(-14,-10.8,1.44),(4.3,1.03,0.09),steel)
cube("Reception service monitor",(-14,-10.45,1.80),(0.95,0.09,0.55),screen)
cube("Reception front detail",(-14,-11.29,0.90),(3.35,0.022,0.17),accent)
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
    cube("Trading third display",(x-0.78,y+0.14,1.37),(0.66,0.065,0.48),screen)
    cube("Trading third display stand",(x-0.78,y+0.14,1.07),(0.07,0.07,0.18),steel)
# Risk: compact analysis desks.
for x,y in [(11.5,-10.1),(16.1,-10.1)]:
    desk("Risk analysis station",x,y,2.2,1.0)
    chair("Risk analyst",x,y-1.12,faces_positive_y=True)
# Executive room: board table and chairs; no corridor obstructions.
cube("Boardroom meeting table",(0,11.5,0.79),(5.2,1.65,0.15),oak)
cube("Boardroom table inset",(0,11.5,0.873),(3.5,0.70,0.012),lightwood)
cube("Boardroom conference hub",(0,11.5,0.90),(0.46,0.28,0.04),steel)
for x in (-2.0,0,2.0):
    chair("Boardroom north chair",x,12.8)
    chair("Boardroom south chair",x,10.2,faces_positive_y=True)
# Department-specific details stay in the optional furniture collection.
# Reception waiting area, against the outer wall and clear of the entrance.
cube("Reception waiting sofa seat",(-17.25,-8.65,0.48),(2.2,0.80,0.28),fabric)
cube("Reception waiting sofa back",(-17.25,-8.25,0.91),(2.2,0.17,0.86),fabric)
for x in (-18.25,-16.25):
    cube("Reception sofa arm",(x,-8.65,0.68),(0.20,0.85,0.47),fabric)
cube("Reception waiting coffee table",(-17.15,-10.10,0.40),(1.45,0.60,0.09),lightwood)
for x in (-17.72,-16.58):
    cube("Reception coffee table leg",(x,-10.10,0.20),(0.07,0.07,0.38),steel)

# Research reference shelves, along the outside wall and behind the desks.
for y in (3.5,9.0):
    cube("Research reference cabinet",(-19.15,y,1.12),(0.45,2.05,2.10),oak)
    for z in (0.55,1.15,1.75):
        cube("Research shelf trim",(-18.90,y,z),(0.06,1.92,0.055),lightwood)

# Trading market wall: thin status screens positioned high above workstations.
for x in (11.3,14.0,16.7):
    cube("Trading market wall display",(x,13.55,2.50),(2.05,0.085,0.90),screen)
    cube("Trading market wall frame",(x,13.61,2.50),(2.13,0.035,0.98),steel)

# Risk analysis: compact side cabinet for compliance files.
cube("Risk filing cabinet",(18.45,-9.35,0.82),(0.72,1.55,1.52),steel)
for z in (0.42,0.88,1.34):
    cube("Risk filing drawer",(18.07,-9.35,z),(0.025,1.35,0.035),accent)

# Executive room: a separate low credenza and a presentation display.
cube("Executive credenza",(0,13.55,0.66),(3.5,0.50,1.22),oak)
cube("Executive credenza top",(0,13.55,1.29),(3.65,0.57,0.08),lightwood)
cube("Executive presentation display",(0,13.93,2.30),(2.35,0.085,0.85),screen)

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

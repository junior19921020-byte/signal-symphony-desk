"""Generate an editable Blender office and export GLB.
Run: blender -b --python scripts/build_office_blender.py -- --output public/models/signal-office.glb
All dimensions in metres. No application or financial code is touched.
"""
import bpy, math, os, sys
from mathutils import Vector
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
def mat(name,color,metal=0,rough=.7,alpha=1):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,alpha);m.use_nodes=True
 p=m.node_tree.nodes.get("Principled BSDF");p.inputs["Base Color"].default_value=(*color,1);p.inputs["Metallic"].default_value=metal;p.inputs["Roughness"].default_value=rough
 if alpha<1:
  p.inputs["Alpha"].default_value=alpha;m.surface_render_method="DITHERED"
 return m
concrete=mat("polished warm concrete",(.72,.72,.68));wood=mat("light oak",(.64,.45,.29));white=mat("warm white walls",(.88,.88,.84));black=mat("charcoal metal",(.065,.075,.08),.6);glass=mat("smoked glazing",(.43,.69,.74),.1,.12,.23);fabric=mat("sofa fabric",(.38,.46,.46));green=mat("foliage",(.16,.37,.22));screen=mat("monitor glass",(.08,.19,.24),.15,.2)
def cube(name,loc,scale,material):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material);return o
def panel(name,a,b,height=2.65,material=glass,thick=.045):
 mid=((a[0]+b[0])/2,(a[1]+b[1])/2,height/2)
 o=cube(name,mid,(math.dist(a,b),thick,height),material);o.rotation_euler[2]=math.atan2(b[1]-a[1],b[0]-a[0]);return o
def desk(x,y,angle=0):
 parts=[]
 parts.append(cube("oak desk",(x,y,.74),(1.5,.72,.075),wood))
 for dx in (-.64,.64):
  for dy in (-.27,.27):parts.append(cube("desk leg",(x+dx,y+dy,.36),(.045,.045,.72),black))
 parts.append(cube("monitor",(x,y-.18,1.08),(.52,.045,.34),screen))
 parts.append(cube("monitor stand",(x,y-.18,.89),(.045,.045,.25),black))
 parts.append(cube("task chair seat",(x,y+.78,.48),(.52,.48,.12),fabric))
 parts.append(cube("task chair back",(x,y+1.01,.82),(.52,.12,.67),black))
 if angle:
  pivot=Vector((x,y,0))
  for p in parts:
   p.location=pivot+__import__("mathutils").Matrix.Rotation(angle,4,"Z")@(p.location-pivot)
   p.rotation_euler.z+=angle
def sofa(x,y,rot=0):
 p=[cube("lounge seat",(x,y,.44),(1.9,.83,.34),fabric),cube("lounge back",(x,y-.37,.79),(1.9,.18,.85),fabric)]
 for o in p:
  pivot=Vector((x,y,0));o.location=pivot+__import__("mathutils").Matrix.Rotation(rot,4,"Z")@(o.location-pivot);o.rotation_euler.z=rot
def plant(x,y):
 cube("planter",(x,y,.28),(.43,.43,.56),white)
 cube("plant leaves",(x,y,.86),(.62,.58,.65),green)
# 22 x 15 metres: left enclosed rooms, open central workstations, right reception.
cube("building slab",(0,0,-.16),(22,15,.32),concrete)
# Exterior perimeter is deliberately low/transparent at camera-facing sides.
panel("north exterior",(-11,7.5),(11,7.5),2.85,white,.16)
panel("west exterior",(-11,-7.5),(-11,7.5),2.85,white,.16)
panel("east low edge",(11,-7.5),(11,7.5),.45,black,.12)
panel("south low edge",(-11,-7.5),(11,-7.5),.45,black,.12)
# Left wing: meeting room and two glass enclosed focus rooms.
for y in (-1.4,2.6):
 panel("glass room divider",(-11,y),(-3.3,y))
for y0,y1 in [(-7.5,-1.4),(-1.4,2.6),(2.6,7.5)]:
 panel("glass room front",(-3.3,y0),(-3.3,y1))
# Meeting room, private offices
cube("meeting table",(-7.3,-4.5,.74),(3.7,1.1,.1),wood)
for i in range(6):
 cube("meeting chair",(-9.0+i*.67,-3.55,.46),(.48,.48,.2),fabric)
desk(-7.2,.6);desk(-7.2,4.9)
# Central shared workstation banks
for x in (-1.3,1.7,4.7):
 for y in (-4.6,-1.5):desk(x,y)
# Lounge / coffee corner at rear
sofa(.5,3.3);sofa(3.4,4.1,math.pi/2)
cube("coffee table",(2.1,3.4,.42),(1.1,.7,.12),wood)
cube("coffee counter",(5.8,6.5,.85),(3.4,.62,1.7),wood)
# Reception near right entry
cube("reception desk",(8.8,-3.1,.72),(2.9,.85,1.44),wood)
cube("reception monitor",(8.8,-3.2,1.65),(.55,.06,.42),screen)
panel("reception glass partition",(7,-7.5),(7,-3.8),2.4)
# Window mullions on north wall
for x in (-8.5,-4.6,-.7,3.2,7.1):
 cube("window",(x,7.39,1.8),(3.1,.05,1.45),glass)
# plants throughout
for x,y in [(-10,-6.5),(-10,6.5),(-2.2,6.5),(5.6,2.1),(9.7,5.7),(9.6,-6.4)]:plant(x,y)
# Lighting for Blender render preview; glTF exports mesh materials and lights if supported.
world=bpy.context.scene.world
if world:world.color=(.65,.65,.65)
bpy.ops.object.light_add(type="AREA",location=(0,0,9))
bpy.context.object.data.energy=2300;bpy.context.object.data.shape="RECTANGLE";bpy.context.object.data.size=18;bpy.context.object.data.size_y=12
bpy.ops.object.camera_add(location=(23,-25,24))
camera=bpy.context.object
direction=Vector((0,0,0))-camera.location
camera.rotation_euler=direction.to_track_quat("-Z","Y").to_euler()
bpy.context.scene.camera=camera
bpy.context.scene.render.engine="CYCLES";bpy.context.scene.cycles.samples=32
bpy.context.scene.render.resolution_x=1440;bpy.context.scene.render.resolution_y=960;bpy.context.scene.render.resolution_percentage=100
args=sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
output=args[args.index("--output")+1] if "--output" in args else "public/models/signal-office.glb"
os.makedirs(os.path.dirname(os.path.abspath(output)),exist_ok=True)
bpy.ops.export_scene.gltf(filepath=os.path.abspath(output),export_format="GLB",export_cameras=False,export_lights=False)
print("Exported",os.path.abspath(output))

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
  p.inputs["Alpha"].default_value=alpha
  # Blender 4.0 uses blend_method; Blender 4.2+ uses surface_render_method.
  if hasattr(m, "surface_render_method"):
   m.surface_render_method="DITHERED"
  elif hasattr(m, "blend_method"):
   m.blend_method="BLEND"
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
# Architectural and furniture detail pass: all details are actual exportable geometry.
# This is intentionally independent of trading logic and optional AI agents.
steel=mat("brushed steel",(.39,.43,.45),.7,.28)
darkwood=mat("walnut joinery",(.28,.19,.13),.05,.48)
upholstery=mat("soft blue upholstery",(.32,.43,.49),0,.92)
accent=mat("brass accent",(.67,.53,.31),.72,.32)
floorwood=mat("oak parquet flooring",(.74,.58,.42),0,.7)
tile=mat("ceramic floor detail",(.78,.78,.75),0,.65)
def cylinder(name,loc,radius,depth,material,vertices=16):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=loc)
 o=bpy.context.object;o.name=name;o.data.materials.append(material);return o
# Room-specific floor materials and subtle plank seams.
for x0,x1,y0,y1 in [(-10.85,-3.45,-7.3,-1.55),(-10.85,-3.45,-1.25,2.45),(-10.85,-3.45,2.75,7.3)]:
 cube("room oak floor",( (x0+x1)/2,(y0+y1)/2,.012),(x1-x0,y1-y0,.024),floorwood)
 for i in range(int((y1-y0)/.55)):
  y=y0+.55*(i+1)
  cube("parquet joint",((x0+x1)/2,y,.026),(x1-x0,.008,.002),darkwood)
# Glass panels: charcoal framing and discrete vertical mullions.
for y in (-7.45,-1.4,2.6,7.45):
 if y in (-1.4,2.6):
  cube("partition top rail",(-7.15,y,2.6),(7.7,.055,.085),black)
  for x in (-9.7,-7.4,-5.1):
   cube("partition mullion",(x,y,1.33),(.06,.065,2.65),black)
for y0,y1 in [(-7.5,-1.4),(-1.4,2.6),(2.6,7.5)]:
 cube("front glazing top rail",(-3.3,(y0+y1)/2,2.61),(.065,y1-y0,.085),black)
 for y in (y0+.08,(y0+y1)/2,y1-.08):
  cube("glass frame post",(-3.3,y,1.34),(.08,.075,2.68),black)
# Reception desk with distinct fascia, modesty panel, and signage.
cube("reception oak fascia",(8.8,-3.58,.64),(2.94,.12,1.2),darkwood)
cube("reception counter trim",(8.8,-3.1,1.48),(3.05,.94,.07),floorwood)
cube("reception signage",(8.8,-3.653,1.05),(1.8,.018,.22),accent)
# Workstations: additional monitors, desk accessories, task-chair bases.
for x in (-1.3,1.7,4.7):
 for y in (-4.6,-1.5):
  cube("secondary monitor",(x+.44,y-.17,1.08),(.36,.045,.3),screen)
  cube("keyboard",(x,y+.08,.795),(.49,.17,.018),black)
  cube("mouse",(x+.49,y+.1,.797),(.09,.13,.022),steel)
  cylinder("chair pedestal",(x,y+.78,.21),.055,.4,steel)
  for a in range(5):
   theta=a*math.tau/5
   cube("chair star base",(x+math.cos(theta)*.18,y+.78+math.sin(theta)*.18,.065),(.36,.06,.045),black)
# Meeting room chair backs and central cable box.
for i in range(6):
 x=-9.0+i*.67
 cube("meeting chair back",(x,-3.23,.82),(.46,.11,.65),upholstery)
cube("meeting table inset",(-7.3,-4.5,.801),(.8,.14,.015),black)
# Lounge cushions, side table and potted greenery with layered leaves.
for x,y in ((-.15,3.3),(.5,3.3),(1.15,3.3)):
 cube("sofa cushion",(x,y,.65),(.57,.55,.15),upholstery)
cylinder("round side table",(4.25,3.05,.49),.37,.065,darkwood)
cylinder("side table leg",(4.25,3.05,.26),.05,.44,steel)
for x,y in [(-10,-6.5),(-10,6.5),(-2.2,6.5),(5.6,2.1),(9.7,5.7),(9.6,-6.4)]:
 for i in range(5):
  a=i*math.tau/5
  cylinder("plant foliage layer",(x+math.cos(a)*.18,y+math.sin(a)*.18,1.12),.23,.48,green,10)
# Additional exterior window sills and framing.
for x in (-8.5,-4.6,-.7,3.2,7.1):
 cube("window sill",(x,7.30,1.02),(3.2,.23,.08),white)
 cube("window head",(x,7.30,2.56),(3.2,.14,.08),black)
 cube("window central mullion",(x,7.30,1.78),(.065,.09,1.5),black)
# Subtle perimeter skirting to reinforce room depth.
cube("north skirting",(0,7.34,.12),(21.9,.1,.24),darkwood)
cube("west skirting",(-10.92,0,.12),(.1,14.9,.24),darkwood)

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

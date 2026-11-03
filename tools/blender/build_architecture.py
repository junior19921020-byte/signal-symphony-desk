"""Generate the editable, furniture-free architectural shell for Signal Symphony Desk (v7)."""
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
# Version 3: architectural detailing only — no furniture or agents.
# Entrance: glazed sliding leaves with dark structural mullions.
for x in (-2.5, 0, 2.5):
    segment("Entrance vertical mullion", (x,-15.01),(x,-15.01),3.25,metal,0.10)
for xa,xb in [(-2.43,-0.08),(0.08,2.43)]:
    segment("Entrance glazed sliding leaf",(xa,-15),(xb,-15),3.15,glass,0.055)
segment("Entrance overhead beam",(-2.5,-15),(2.5,-15),0.22,metal,0.18,3.22)

# Full-height exterior window bays on the rear wall; dark framing over translucent glass.
for xa,xb in [(-18,-12),(-10,-4),(4,10),(12,18)]:
    segment("Rear window glazing",(xa,14.87),(xb,14.87),2.0,glass,0.07,1.35)
    segment("Rear window upper rail",(xa,14.85),(xb,14.85),0.10,metal,0.10,3.32)
    segment("Rear window lower rail",(xa,14.85),(xb,14.85),0.10,metal,0.10,1.30)
    for x in (xa,xb):
        segment("Rear window mullion",(x,14.83),(x,14.83),2.2,metal,0.10,1.25)

# Glazed room entrances remain unobstructed: the top rail marks each opening.
for x in (-8,8):
    for ya,yb in [(-12,-9),(-2,1),(8,11)]:
        segment("Department doorway lintel",(x,ya),(x,yb),0.14,metal,0.12,3.40)
        for y in (ya,yb):
            cube("Doorway vertical jamb",(x,y,1.73),(0.13,0.13,3.46),metal)
segment("Director entrance lintel",(-1.5,8),(1.5,8),0.14,metal,0.12,3.40)
for x in (-1.5,1.5):
    cube("Director doorway jamb",(x,8,1.73),(0.13,0.13,3.46),metal)

# Fine floor seams: visual circulation guides, not physical obstacles.
seam=mat("Floor joint - muted graphite",(0.11,0.15,0.19),0.1)
for x in (-5.6,-2.8,0,2.8,5.6):
    segment("Hall floor seam longitudinal",(x,-14.5),(x,7.7),0.012,seam,0.025,0.11)
for y in (-13,-10,-7,-4,-1,2,5):
    segment("Hall floor seam transverse",(-5.9,y),(5.9,y),0.012,seam,0.025,0.11)

# Exterior coping adds a readable perimeter silhouette in the isometric view.
for name,a,b in [
    ("West coping",(-20, -15),(-20,15)),
    ("East coping",(20,-15),(20,15)),
    ("Rear coping",(-20,15),(20,15)),
    ("Front left coping",(-20,-15),(-2.5,-15)),
    ("Front right coping",(2.5,-15),(20,-15)),
]:
    segment(name,a,b,0.12,metal,0.34,4.14)

# Structural pilasters at the rear corners and along the exterior sides.
for x,y in [(-19.8,-14.7),(19.8,-14.7),(-19.8,14.7),(19.8,14.7),
            (-19.8,0),(19.8,0)]:
    cube("Perimeter pilaster",(x,y,2.10),(0.38,0.38,4.2),metal)

# Version 4: more generous and legible circulation, entry, and department finishes.
# Keep the 40 x 30 m footprint and preserve the furniture-free structure.
# Side circulation shoulders visually distinguish the open hall from the rooms.
trim=mat("Circulation edge - brushed slate",(0.16,0.24,0.30),0.25,0.38)
threshold=mat("Interior thresholds - blue stone",(0.18,0.31,0.37),0.2,0.42)
for x in (-6.05,6.05):
    segment("Hall edge inlay",(x,-14.6),(x,7.8),0.018,trim,0.11,0.12)
# Each opening has a clear threshold flush with the floor; no obstacles to movement.
for x in (-8,8):
    for ya,yb in [(-12,-9),(-2,1),(8,11)]:
        cube("Department doorway floor threshold",(x,(ya+yb)/2,0.125),(0.38,yb-ya,0.035),threshold)
cube("Director doorway floor threshold",(0,8,0.125),(3,0.38,0.035),threshold)
# An extended exterior arrival platform helps the main entrance read clearly.
cube("Entrance arrival landing",(0,-16.15,-0.08),(7,2.2,0.16),floor)
for x in (-3.5,3.5):
    segment("Entrance landing edge",(x,-17.25),(x,-15.05),0.045,trim,0.075,-0.01)
# Warm-toned, understated floor plank joints in the four work departments.
plank=mat("Wood floor joint - warm shadow",(0.24,0.15,0.10),0.02,0.8)
for x0,x1,y0,y1 in [(-19.7,-8.3,-5.2,14.5),(8.3,19.7,-5.2,14.5),
                    (-19.7,-8.3,-14.6,-5.8),(8.3,19.7,-14.6,-5.8)]:
    y=y0+1.35
    while y<y1-0.3:
        segment("Department wood plank seam",(x0,y),(x1,y),0.006,plank,0.024,0.115)
        y+=1.45
# Exterior wall skirting and glazing bands strengthen architectural scale.
for name,a,b in [
    ("West wall skirting",(-19.80,-14.6),(-19.80,14.6)),
    ("East wall skirting",(19.80,-14.6),(19.80,14.6)),
    ("Rear wall skirting",(-19.7,14.78),(19.7,14.78)),
]:
    segment(name,a,b,0.22,metal,0.12,0.13)
# Thin vertical framing makes long glass runs read as modular partitions.
for x in (-8,8):
    for ya,yb in [(-14.7,-12),(-9,-2),(1,8),(11,14.7)]:
        n=max(1,int((yb-ya)/2.8))
        for i in range(1,n):
            y=ya+(yb-ya)*i/n
            cube("Glazing modular mullion",(x,y,1.78),(0.095,0.095,3.56),metal)

# Version 5: distinguish executive, reception and risk circulation without furniture.
executive=mat("Executive flooring - deep walnut",(0.24,0.14,0.085),0.08,0.62)
welcome=mat("Reception arrival floor - graphite blue",(0.13,0.19,0.24),0.15,0.48)
accent=mat("Executive frame - muted bronze",(0.40,0.30,0.19),0.48,0.38)
# The executive room gets its own recognizable material and entrance border.
cube("Executive suite inset floor",(0,11.5,0.145),(15.6,6.65,0.035),executive)
for xa,xb in [(-7.85,-1.55),(1.55,7.85)]:
    segment("Executive entrance bronze lintel",(xa,8.04),(xb,8.04),0.075,accent,0.095,3.57)
for x in (-1.5,1.5):
    cube("Executive doorway bronze reveal",(x,8.03,1.72),(0.10,0.10,3.42),accent)
# The reception floor gets a defined welcome strip near the public entrance.
cube("Reception welcome strip",(-14,-13.65,0.135),(10.8,1.35,0.025),welcome)
# Mark clear transition between the public entrance and the internal circulation.
cube("Entrance interior transition",(0,-13.55,0.14),(5.6,1.2,0.025),welcome)
# Subtle department-specific boundary details, without blocking door openings.
for x in (-8,8):
    for ya,yb in [(-14.7,-12),(-9,-2),(1,8),(11,14.7)]:
        segment("Glass partition base trim",(x,ya),(x,yb),0.08,trim,0.11,0.16)
# A brighter neutral architectural lighting setup helps evaluate the layout.
bpy.ops.object.light_add(type="AREA",location=(-13,-5,17))
fill_left=bpy.context.object
fill_left.name="Soft fill - research and reception"
fill_left.data.energy=3500
fill_left.data.shape="RECTANGLE"
fill_left.data.size=20
fill_left.data.size_y=20
bpy.ops.object.light_add(type="AREA",location=(13,-5,17))
fill_right=bpy.context.object
fill_right.name="Soft fill - trading and risk"
fill_right.data.energy=3500
fill_right.data.shape="RECTANGLE"
fill_right.data.size=20
fill_right.data.size_y=20
bpy.ops.object.light_add(type="AREA",location=(0,11,15))
executive_light=bpy.context.object
executive_light.name="Soft fill - executive suite"
executive_light.data.energy=2300
executive_light.data.shape="RECTANGLE"
executive_light.data.size=16
executive_light.data.size_y=9

# Version 6: readable departmental zoning and circulation wayfinding.
# Thin floor finishes are flush with the architecture; no furniture or navigation blockers.
research_finish=mat("Research flooring - honey oak",(0.39,0.255,0.155),0.02,0.78)
trading_finish=mat("Trading flooring - smoked oak",(0.275,0.175,0.115),0.05,0.65)
risk_finish=mat("Risk flooring - slate oak",(0.30,0.225,0.17),0.04,0.72)
reception_finish=mat("Reception flooring - light oak",(0.43,0.30,0.20),0.02,0.77)
hall_inlay=mat("Hall compass inlay - soft steel",(0.25,0.37,0.44),0.35,0.4)
for name,center,size,finish in [
    ("Research warm finish",(-14,4.75),(11.25,19.8),research_finish),
    ("Trading focused finish",(14,4.75),(11.25,19.8),trading_finish),
    ("Reception arrival finish",(-14,-10.25),(11.25,8.8),reception_finish),
    ("Risk controlled finish",(14,-10.25),(11.25,8.8),risk_finish),
]:
    cube(name,(center[0],center[1],0.119),(size[0],size[1],0.014),finish)
# Version 7: restore visible plank seams ABOVE the v6 department finish overlays.
# Earlier plank seams were at z=0.115, hidden under the new finish top (z=0.126).
plank_joint=mat("Visible oak plank grooves - walnut shadow",(0.16,0.095,0.055),0.02,0.88)
plank_end=mat("Wood board end joints - subtle",(0.22,0.135,0.078),0.01,0.9)
for x0,x1,y0,y1 in [
    (-19.6,-8.4,-14.5,-5.95), # reception
    (-19.6,-8.4,-5.1,14.55),  # research
    (8.4,19.6,-14.5,-5.95),  # risk
    (8.4,19.6,-5.1,14.55),   # trading
    (-7.65,7.65,8.35,14.65), # executive walnut
]:
    # Long grain seams and staggered end joints read as individual wood boards.
    row=0
    y=y0+0.95
    while y<y1-0.20:
        segment("Restored visible wood plank groove",(x0,y),(x1,y),0.008,plank_joint,0.033,0.133 if x0 != -7.65 else 0.176)
        y+=1.12
        row+=1
    y=y0
    row=0
    while y+1.12<y1:
        offset=1.65 if row%2 else 0.0
        x=x0+2.4+offset
        while x<x1-0.3:
            segment("Staggered wood board end",(x,y+0.07),(x,min(y+1.07,y1-0.08)),0.007,plank_end,0.021,0.133 if x0 != -7.65 else 0.176)
            x+=4.8
        y+=1.12
        row+=1

# Clear, understated center-hall inlay reserves the future company emblem location.
for xa,xb,ya,yb in [
    (-3.3,3.3,-5.3,-5.3),(-3.3,3.3,-1.7,-1.7),
    (-3.3,-3.3,-5.3,-1.7),(3.3,3.3,-5.3,-1.7),
]:
    segment("Company emblem reserved border",(xa,ya),(xb,yb),0.013,hall_inlay,0.075,0.143)
# Separate the reception's public arrival zone from its workstation area visually.
segment("Reception public approach marker",(-19.2,-11.8),(-8.6,-11.8),0.014,hall_inlay,0.07,0.148)
# Floor signage must remain above the final floor finishes, not hidden beneath them.
for obj in bpy.data.objects:
    if obj.type=="FONT" and obj.name in {
        "Research sign","Trading sign","Reception sign","Risk sign","Director sign"
    }:
        obj.location.z=0.195

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

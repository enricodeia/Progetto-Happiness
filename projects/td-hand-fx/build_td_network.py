# TouchDesigner network builder for hand-driven particles.
# Run from Textport with:
#   exec(open('/Users/enrideia/Desktop/Claude Code Projects/projects/td-hand-fx/build_td_network.py').read())

root = op('/project1')
if root is None:
    root = op('/')

# Clean previous run
for n in ['oscin1', 'sel_x', 'sel_y', 'lag_x', 'lag_y', 'math_x', 'math_y',
         'ren_x', 'ren_y', 'merge_xy', 'add_pt', 'chopto_pos', 'part1',
         'trail1', 'cam1', 'light1', 'mat_glow', 'geo_trail', 'render1', 'out1']:
    existing = root.op(n)
    if existing:
        existing.destroy()

# 1. OSC In CHOP
osc = root.create(oscinCHOP, 'oscin1')
osc.nodeX, osc.nodeY = 0, 400
osc.par.port = 7000
osc.par.active = True

# 2. Select x and y of /index_tip
sel_x = root.create(selectCHOP, 'sel_x')
sel_x.nodeX, sel_x.nodeY = 200, 500
sel_x.inputConnectors[0].connect(osc)
sel_x.par.channames = '/index_tip/x'

sel_y = root.create(selectCHOP, 'sel_y')
sel_y.nodeX, sel_y.nodeY = 200, 300
sel_y.inputConnectors[0].connect(osc)
sel_y.par.channames = '/index_tip/y'

# 3. Lag for smoothing
lag_x = root.create(lagCHOP, 'lag_x')
lag_x.nodeX, lag_x.nodeY = 400, 500
lag_x.inputConnectors[0].connect(sel_x)
lag_x.par.lag1 = 0.05
lag_x.par.lag2 = 0.05

lag_y = root.create(lagCHOP, 'lag_y')
lag_y.nodeX, lag_y.nodeY = 400, 300
lag_y.inputConnectors[0].connect(sel_y)
lag_y.par.lag1 = 0.05
lag_y.par.lag2 = 0.05

# 4. Math: remap 0..1 → -0.8..0.8
math_x = root.create(mathCHOP, 'math_x')
math_x.nodeX, math_x.nodeY = 600, 500
math_x.inputConnectors[0].connect(lag_x)
math_x.par.fromrange1 = 0
math_x.par.fromrange2 = 1
math_x.par.torange1 = -0.8
math_x.par.torange2 = 0.8

math_y = root.create(mathCHOP, 'math_y')
math_y.nodeX, math_y.nodeY = 600, 300
math_y.inputConnectors[0].connect(lag_y)
math_y.par.fromrange1 = 0
math_y.par.fromrange2 = 1
math_y.par.torange1 = -0.5
math_y.par.torange2 = 0.5

# 5. Rename channels to tx, ty
ren_x = root.create(renameCHOP, 'ren_x')
ren_x.nodeX, ren_x.nodeY = 800, 500
ren_x.inputConnectors[0].connect(math_x)
ren_x.par.renameto = 'tx'
ren_x.par.renamefrom = '*'

ren_y = root.create(renameCHOP, 'ren_y')
ren_y.nodeX, ren_y.nodeY = 800, 300
ren_y.inputConnectors[0].connect(math_y)
ren_y.par.renameto = 'ty'
ren_y.par.renamefrom = '*'

# 6. Merge into single CHOP with tx + ty
merge = root.create(mergeCHOP, 'merge_xy')
merge.nodeX, merge.nodeY = 1000, 400
merge.inputConnectors[0].connect(ren_x)
merge.inputConnectors[1].connect(ren_y)

# 7. Single-point source
add_pt = root.create(addSOP, 'add_pt')
add_pt.nodeX, add_pt.nodeY = 1000, 100
add_pt.par.points = '0 0 0'

# 8. CHOP to SOP — push hand pos into the point
choptos = root.create(chopto_SOP, 'chopto_pos')
choptos.nodeX, choptos.nodeY = 1200, 100
choptos.inputConnectors[0].connect(add_pt)
choptos.par.chop = merge.path
choptos.par.channelscope = 'tx ty'
choptos.par.attribscope = 'P(0) P(1)'

# 9. Particle SOP
part = root.create(particleSOP, 'part1')
part.nodeX, part.nodeY = 1400, 100
part.inputConnectors[0].connect(choptos)
part.par.birth = 200
part.par.life = 1.5
part.par.lifevar = 0.3
part.par.initialspeed = 0.5
part.par.initialspeedvar = 0.2

# 10. Trail SOP for ribbon
trail = root.create(trailSOP, 'trail1')
trail.nodeX, trail.nodeY = 1600, 100
trail.inputConnectors[0].connect(part)
trail.par.trail = 'connect'
trail.par.length = 30

# 11. Render chain
cam = root.create(cameraCOMP, 'cam1')
cam.nodeX, cam.nodeY = 1400, -200
cam.par.tz = 3

light = root.create(lightCOMP, 'light1')
light.nodeX, light.nodeY = 1400, -350

mat = root.create(constantMAT, 'mat_glow')
mat.nodeX, mat.nodeY = 1600, -200
mat.par.colorr = 0.6
mat.par.colorg = 0.9
mat.par.colorb = 1.0

# Geo COMP wrapping the trail
geo = root.create(geometryCOMP, 'geo_trail')
geo.nodeX, geo.nodeY = 1800, 100
geo.par.material = mat.path
# Move trail inside the geo
trail_path = trail.path
# Create reference: clone trail SOP path into geo's render
# Simplest: set geo's display SOP via internal SOP-In and external connection
if geo.inputConnectors:
    geo.inputConnectors[0].connect(trail)

render = root.create(renderTOP, 'render1')
render.nodeX, render.nodeY = 2000, -50
render.par.camera = cam.path
render.par.geometry = geo.path
render.par.lights = light.path
render.par.resolutionw = 1280
render.par.resolutionh = 720

out = root.create(outTOP, 'out1')
out.nodeX, out.nodeY = 2200, -50
out.inputConnectors[0].connect(render)
out.viewer = True

print("✅ Network built. Look at out1 — move your hand, particles should follow.")

"""
Procedural Blender scene: robot-assisted open abdominal surgery (close-up).

Builds the whole scene from code -- iodine-prepped skin, a retracted laparotomy
incision with skin / subcutaneous fat / muscle layers, wet bowel loops, an
anastomosis being closed with a running suture, steel retractors, surgical
drapes and three robotic instruments that pivot around a remote centre of
motion (RCM) with articulated EndoWrist-style tips.

Renders a seamless loop with Cycles for the website hero.

Usage (Blender as a Python module, `pip install bpy==5.2.3`):
    python build_surgical_scene.py --mode preview --out ./render
    python build_surgical_scene.py --mode still   --out ./render
    python build_surgical_scene.py --mode anim    --out ./render/frames
or inside Blender:
    blender -b -P build_surgical_scene.py -- --mode anim --out ./render/frames
"""

import argparse
import math
import os
import random
import sys

import bpy  # noqa: E402  (bpy must be imported before bmesh/mathutils)
import bmesh
from mathutils import Euler, Matrix, Quaternion, Vector, noise

random.seed(7)

FRAMES = 96  # 4 s at 24 fps, seamless loop
TAU = math.tau


# --------------------------------------------------------------------------
# helpers
# --------------------------------------------------------------------------
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def link(obj):
    bpy.context.scene.collection.objects.link(obj)
    return obj


def mesh_obj(name, bm, mat=None, smooth=True):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    if mat is not None:
        if isinstance(mat, (list, tuple)):
            for m in mat:
                me.materials.append(m)
        else:
            me.materials.append(mat)
    return link(ob)


def empty(name, loc=(0, 0, 0), parent=None):
    ob = bpy.data.objects.new(name, None)
    ob.empty_display_size = 0.01
    ob.location = loc
    link(ob)
    if parent:
        ob.parent = parent
    return ob


def add_mod_subsurf(ob, levels=2):
    m = ob.modifiers.new("subd", "SUBSURF")
    m.levels = levels
    m.render_levels = levels
    return m


def add_bevel(ob, width=0.002, segs=3):
    m = ob.modifiers.new("bevel", "BEVEL")
    m.width = width
    m.segments = segs
    m.limit_method = "ANGLE"
    return m


def rounded_box(name, size, mat, bevel=0.004, parent=None, loc=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= size[0]
        v.co.y *= size[1]
        v.co.z *= size[2]
    ob = mesh_obj(name, bm, mat)
    add_bevel(ob, bevel, 4)
    ob.location = loc
    if parent:
        ob.parent = parent
    return ob


def cylinder(name, r, depth, mat, segs=32, parent=None, loc=(0, 0, 0), rot=(0, 0, 0), bevel=0.0):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r, radius2=r, depth=depth)
    ob = mesh_obj(name, bm, mat)
    if bevel:
        add_bevel(ob, bevel, 2)
    ob.location = loc
    ob.rotation_euler = rot
    if parent:
        ob.parent = parent
    return ob


def curve_obj(name, pts, bevel, mat, resolution=12, nurbs=False, cyclic=False):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = bevel
    cu.bevel_resolution = 4
    cu.resolution_u = resolution
    cu.use_fill_caps = True
    if nurbs:
        sp = cu.splines.new("NURBS")
        sp.points.add(len(pts) - 1)
        for p, c in zip(sp.points, pts):
            p.co = (c[0], c[1], c[2], 1.0)
        sp.use_endpoint_u = True
        sp.order_u = 4
    else:
        sp = cu.splines.new("BEZIER")
        sp.bezier_points.add(len(pts) - 1)
        for p, c in zip(sp.bezier_points, pts):
            p.co = c
            p.handle_left_type = p.handle_right_type = "AUTO"
    sp.use_cyclic_u = cyclic
    ob = bpy.data.objects.new(name, cu)
    if mat:
        cu.materials.append(mat)
    return link(ob)


# --------------------------------------------------------------------------
# materials
# --------------------------------------------------------------------------
class M:
    """Tiny node-building helper."""

    def __init__(self, name):
        self.mat = bpy.data.materials.new(name)
        self.mat.use_nodes = True
        self.nt = self.mat.node_tree
        self.nt.nodes.clear()
        self.out = self.n("ShaderNodeOutputMaterial", (600, 0))
        self.bsdf = self.n("ShaderNodeBsdfPrincipled", (300, 0))
        self.l(self.bsdf.outputs[0], self.out.inputs["Surface"])
        self.coord = self.n("ShaderNodeTexCoord", (-900, 0))

    def n(self, kind, loc=(0, 0)):
        node = self.nt.nodes.new(kind)
        node.location = loc
        return node

    def l(self, a, b):
        self.nt.links.new(a, b)

    def set(self, **kw):
        names = {
            "base": "Base Color", "rough": "Roughness", "metal": "Metallic",
            "sss": "Subsurface Weight", "sss_r": "Subsurface Radius", "sss_s": "Subsurface Scale",
            "coat": "Coat Weight", "coat_r": "Coat Roughness", "spec": "Specular IOR Level",
            "aniso": "Anisotropic", "sheen": "Sheen Weight", "sheen_tint": "Sheen Tint",
            "emit": "Emission Color", "emit_s": "Emission Strength", "ior": "IOR",
        }
        for k, v in kw.items():
            self.bsdf.inputs[names[k]].default_value = v
        return self

    def noise(self, scale, detail=6.0, rough=0.55, distortion=0.0, loc=(-600, 0), space="Object"):
        t = self.n("ShaderNodeTexNoise", loc)
        t.inputs["Scale"].default_value = scale
        t.inputs["Detail"].default_value = detail
        t.inputs["Roughness"].default_value = rough
        t.inputs["Distortion"].default_value = distortion
        self.l(self.coord.outputs[space], t.inputs["Vector"])
        return t

    def ramp(self, inp, stops, loc=(-300, 0)):
        r = self.n("ShaderNodeValToRGB", loc)
        els = r.color_ramp.elements
        while len(els) > 2:
            els.remove(els[-1])
        for i, (pos, col) in enumerate(stops):
            e = els[i] if i < len(els) else els.new(pos)
            e.position = pos
            e.color = col if len(col) == 4 else (*col, 1.0)
        self.l(inp, r.inputs["Fac"])
        return r

    def bump(self, height_socket, strength=0.3, distance=0.001, loc=(0, -400)):
        b = self.n("ShaderNodeBump", loc)
        b.inputs["Strength"].default_value = strength
        b.inputs["Distance"].default_value = distance
        self.l(height_socket, b.inputs["Height"])
        self.l(b.outputs["Normal"], self.bsdf.inputs["Normal"])
        if "Normal" in self.bsdf.inputs and "Coat Normal" in self.bsdf.inputs:
            self.l(b.outputs["Normal"], self.bsdf.inputs["Coat Normal"])
        return b

    def mix(self, fac, a, b, loc=(-100, 0)):
        m = self.n("ShaderNodeMix", loc)
        m.data_type = "RGBA"
        m.blend_type = "MIX"
        if isinstance(fac, float):
            m.inputs[0].default_value = fac
        else:
            self.l(fac, m.inputs[0])
        for idx, src in ((6, a), (7, b)):
            if isinstance(src, tuple):
                m.inputs[idx].default_value = (*src, 1.0) if len(src) == 3 else src
            else:
                self.l(src, m.inputs[idx])
        return m


def tissue_material(name, c_dark, c_mid, c_light, scale=180.0, sss_radius=(1.0, 0.35, 0.18),
                    vessels=True, blood=0.0, coat=0.85, bump=0.35):
    m = M(name)
    m.set(rough=0.42, sss=0.55, sss_r=sss_radius, sss_s=0.004, coat=coat, coat_r=0.1,
          spec=0.55, ior=1.38)
    m.mat.node_tree.nodes["Principled BSDF"].subsurface_method = "BURLEY"
    n1 = m.noise(scale, 8, 0.6, 0.3, (-800, 200))
    col = m.ramp(n1.outputs["Fac"], [(0.3, c_dark), (0.55, c_mid), (0.8, c_light)], (-500, 200))
    last = col.outputs["Color"]
    if vessels:
        # fine branching vessels from distorted wave texture
        w = m.n("ShaderNodeTexWave", (-800, -100))
        w.wave_type = "BANDS"
        w.inputs["Scale"].default_value = scale * 0.08
        w.inputs["Distortion"].default_value = 18.0
        w.inputs["Detail"].default_value = 6.0
        w.inputs["Detail Scale"].default_value = 2.5
        m.l(m.coord.outputs["Object"], w.inputs["Vector"])
        vr = m.ramp(w.outputs["Fac"], [(0.0, (1, 1, 1)), (0.06, (0, 0, 0))], (-500, -100))
        vm = m.mix(vr.outputs["Color"], last, (0.28, 0.02, 0.03), (-200, 100))
        vm.inputs[0].default_value = 0.0
        mm = m.n("ShaderNodeMath", (-350, -150))
        mm.operation = "MULTIPLY"
        mm.inputs[1].default_value = 0.55
        m.l(vr.outputs["Color"], mm.inputs[0])
        m.l(mm.outputs[0], vm.inputs[0])
        last = vm.outputs[2]
    if blood > 0:
        bn = m.noise(scale * 0.12, 4, 0.5, 0.0, (-800, -400))
        br = m.ramp(bn.outputs["Fac"], [(0.62 - blood * 0.1, (0, 0, 0)), (0.66 - blood * 0.1, (1, 1, 1))], (-500, -400))
        bm = m.mix(br.outputs["Color"], last, (0.16, 0.005, 0.006), (-100, -200))
        last = bm.outputs[2]
        # pooled blood is glossier
        rr = m.n("ShaderNodeMapRange", (0, -300))
        m.l(br.outputs["Color"], rr.inputs[0])
        rr.inputs["To Min"].default_value = 0.42
        rr.inputs["To Max"].default_value = 0.12
        m.l(rr.outputs[0], m.bsdf.inputs["Roughness"])
    m.l(last, m.bsdf.inputs["Base Color"])
    bn2 = m.noise(scale * 2.2, 6, 0.65, 0.0, (-800, -600))
    m.bump(bn2.outputs["Fac"], bump + 0.25, 0.0008)
    return m.mat


def build_materials():
    mats = {}
    # povidone-iodine prepped skin
    m = M("skin_iodine")
    m.set(rough=0.38, sss=0.35, sss_r=(1.0, 0.45, 0.25), sss_s=0.003, coat=0.5, coat_r=0.15, spec=0.5)
    n = m.noise(260, 6, 0.55, 0.2)
    r = m.ramp(n.outputs["Fac"], [(0.3, (0.30, 0.10, 0.03)), (0.5, (0.42, 0.17, 0.06)), (0.7, (0.52, 0.27, 0.13))])
    m.l(r.outputs["Color"], m.bsdf.inputs["Base Color"])
    n2 = m.noise(900, 4, 0.7, 0.0, (-600, -400))
    m.bump(n2.outputs["Fac"], 0.25, 0.0004)
    mats["skin"] = m.mat

    # subcutaneous fat: yellow lobular
    m = M("fat")
    m.set(rough=0.33, sss=0.75, sss_r=(1.0, 0.75, 0.3), sss_s=0.005, coat=0.9, coat_r=0.05, spec=0.6)
    vo = m.n("ShaderNodeTexVoronoi", (-700, 0))
    vo.inputs["Scale"].default_value = 180
    vo.feature = "SMOOTH_F1"
    vo.inputs["Randomness"].default_value = 1.0
    dn = m.noise(90, 4, 0.5, 0.0, (-1000, 0))
    dmix = m.n("ShaderNodeMix", (-850, 0))
    dmix.data_type = "VECTOR"
    dmix.inputs[0].default_value = 0.004
    m.l(m.coord.outputs["Object"], dmix.inputs[4])
    m.l(dn.outputs["Color"], dmix.inputs[5])
    m.l(dmix.outputs[1], vo.inputs["Vector"])
    r = m.ramp(vo.outputs["Distance"], [(0.0, (0.97, 0.82, 0.45)), (0.45, (0.88, 0.62, 0.22)), (0.85, (0.62, 0.30, 0.10))])
    n = m.noise(60, 6, 0.6, 0.0, (-700, 300))
    blood = m.ramp(n.outputs["Fac"], [(0.58, (0, 0, 0)), (0.66, (1, 1, 1))], (-450, 300))
    mx = m.mix(blood.outputs["Color"], r.outputs["Color"], (0.35, 0.03, 0.02))
    m.l(mx.outputs[2], m.bsdf.inputs["Base Color"])
    m.bump(vo.outputs["Distance"], 0.9, 0.0012)
    mats["fat"] = m.mat

    # rectus muscle with fibre direction
    m = M("muscle")
    m.set(rough=0.35, sss=0.4, sss_r=(1.0, 0.2, 0.1), sss_s=0.003, coat=0.9, coat_r=0.05)
    w = m.n("ShaderNodeTexWave", (-700, 0))
    w.inputs["Scale"].default_value = 420
    w.inputs["Distortion"].default_value = 3
    w.inputs["Detail"].default_value = 4
    m.l(m.coord.outputs["Object"], w.inputs["Vector"])
    r = m.ramp(w.outputs["Fac"], [(0.2, (0.22, 0.02, 0.02)), (0.7, (0.52, 0.08, 0.06))])
    m.l(r.outputs["Color"], m.bsdf.inputs["Base Color"])
    m.bump(w.outputs["Fac"], 0.35, 0.0004)
    mats["muscle"] = m.mat

    mats["bowel"] = tissue_material("bowel", (0.42, 0.10, 0.09), (0.70, 0.30, 0.25), (0.86, 0.50, 0.42),
                                    scale=140, blood=0.4)
    mats["lip"] = tissue_material("anastomosis", (0.36, 0.05, 0.05), (0.66, 0.20, 0.18), (0.82, 0.38, 0.32),
                                  scale=220, blood=0.9, bump=0.5)
    mats["mesofat"] = tissue_material("mesentery_fat", (0.62, 0.38, 0.12), (0.86, 0.66, 0.30), (0.95, 0.82, 0.50),
                                      scale=120, sss_radius=(1.0, 0.8, 0.35), vessels=True, blood=0.2)
    m = M("cavity")
    m.set(base=(0.10, 0.008, 0.006, 1), rough=0.12, sss=0.2, sss_r=(1, 0.2, 0.1), sss_s=0.002, coat=1.0, coat_r=0.02)
    mats["cavity"] = m.mat

    # surgical drape (blue non-woven)
    m = M("drape")
    m.set(rough=0.85, sheen=0.6, sheen_tint=(0.6, 0.8, 1.0, 1), spec=0.25)
    n = m.noise(40, 4, 0.5)
    r = m.ramp(n.outputs["Fac"], [(0.3, (0.010, 0.050, 0.10)), (0.7, (0.020, 0.085, 0.15))])
    m.l(r.outputs["Color"], m.bsdf.inputs["Base Color"])
    n2 = m.noise(2500, 2, 0.5, 0.0, (-600, -400))
    m.bump(n2.outputs["Fac"], 0.15, 0.0003)
    mats["drape"] = m.mat

    # green towel edge
    m = M("towel")
    m.set(rough=0.95, sheen=0.8, spec=0.2)
    n = m.noise(1600, 3, 0.6)
    r = m.ramp(n.outputs["Fac"], [(0.3, (0.015, 0.075, 0.07)), (0.7, (0.03, 0.12, 0.10))])
    m.l(r.outputs["Color"], m.bsdf.inputs["Base Color"])
    m.bump(n.outputs["Fac"], 0.4, 0.0006)
    mats["towel"] = m.mat

    m = M("steel")
    m.set(base=(0.80, 0.80, 0.82, 1), metal=1.0, rough=0.16, aniso=0.6)
    n = m.noise(30, 3, 0.5)
    rr = m.n("ShaderNodeMapRange", (-300, -200))
    m.l(n.outputs["Fac"], rr.inputs[0])
    rr.inputs["To Min"].default_value = 0.10
    rr.inputs["To Max"].default_value = 0.24
    m.l(rr.outputs[0], m.bsdf.inputs["Roughness"])
    mats["steel"] = m.mat

    m = M("steel_dark")
    m.set(base=(0.45, 0.46, 0.48, 1), metal=1.0, rough=0.22)
    mats["steel_dark"] = m.mat

    m = M("shaft")
    m.set(base=(0.018, 0.019, 0.021, 1), rough=0.32, coat=0.4, coat_r=0.2)
    mats["shaft"] = m.mat

    m = M("robot_white")
    m.set(base=(0.82, 0.84, 0.86, 1), rough=0.28, coat=0.6, coat_r=0.08, sss=0.05)
    mats["white"] = m.mat

    m = M("robot_joint")
    m.set(base=(0.03, 0.035, 0.04, 1), rough=0.45, metal=0.2)
    mats["joint"] = m.mat

    m = M("led")
    m.set(base=(0.0, 0.0, 0.0, 1), emit=(0.15, 0.62, 1.0, 1), emit_s=18.0, rough=0.3)
    mats["led"] = m.mat

    m = M("suture")
    m.set(base=(0.20, 0.04, 0.42, 1), rough=0.35, coat=0.5, coat_r=0.1)
    mats["suture"] = m.mat

    m = M("sterile_bag")  # translucent sterile drape on robot arms
    m.set(base=(0.85, 0.9, 0.95, 1), rough=0.18)
    m.bsdf.inputs["Transmission Weight"].default_value = 0.85
    m.bsdf.inputs["Alpha"].default_value = 0.35
    mats["bag"] = m.mat

    m = M("gauze")
    m.set(rough=0.95, sss=0.3, sss_r=(1, 1, 1), sss_s=0.002, sheen=0.4)
    n = m.noise(50, 5, 0.6, 0.4)
    r = m.ramp(n.outputs["Fac"], [(0.45, (0.92, 0.90, 0.88)), (0.62, (0.55, 0.06, 0.05)), (0.75, (0.35, 0.02, 0.02))])
    m.l(r.outputs["Color"], m.bsdf.inputs["Base Color"])
    w = m.n("ShaderNodeTexBrick", (-600, -400))
    w.inputs["Scale"].default_value = 900
    m.l(m.coord.outputs["Object"], w.inputs["Vector"])
    m.bump(w.outputs["Fac"], 0.3, 0.0003)
    mats["gauze"] = m.mat
    return mats


# --------------------------------------------------------------------------
# anatomy
# --------------------------------------------------------------------------
A, B = 0.078, 0.044  # half-axes of the retracted incision opening (m)


def dome(x, y):
    return 0.018 * (1.0 - (x / 0.42) ** 2 - (y / 0.30) ** 2)


def build_wound(mats):
    """Skin surface + incision walls as one ring-parametrised mesh."""
    seg = 192
    rings = []  # (scale, z_offset_from_dome or absolute depth, mat index, absolute?)
    for s in [3.4, 3.0, 2.6, 2.2, 1.9, 1.65, 1.45, 1.3, 1.2, 1.13, 1.08, 1.05, 1.03]:
        rings.append((s, 0.0, 0))
    rings += [(1.015, -0.0012, 0), (1.005, -0.0028, 0), (1.0, -0.0045, 1)]
    depth_rings = [(-0.008, 0.99, 1), (-0.013, 0.975, 1), (-0.019, 0.955, 1), (-0.025, 0.935, 1),
                   (-0.029, 0.92, 2), (-0.033, 0.905, 2), (-0.037, 0.89, 2), (-0.041, 0.875, 2),
                   (-0.046, 0.86, 2), (-0.055, 0.84, 2)]
    bm = bmesh.new()
    grid = []
    lip_z = None
    for s, dz, mi in rings:
        row = []
        for i in range(seg):
            th = TAU * i / seg
            x, y = A * s * math.cos(th), B * s * math.sin(th)
            # incision is longer than wide; flatten the ends slightly (retractor tension)
            z = dome(x, y) + dz
            n = noise.noise(Vector((x * 60, y * 60, s * 3))) * 0.0012 * min(1.0, (s - 1.0) * 6 + 0.2)
            row.append(bm.verts.new((x, y, z + n)))
        grid.append((row, mi))
    for dz, s, mi in depth_rings:
        row = []
        for i in range(seg):
            th = TAU * i / seg
            x, y = A * s * math.cos(th), B * s * math.sin(th)
            bulge = 1.0 + 0.04 * noise.noise(Vector((math.cos(th) * 4, math.sin(th) * 4, dz * 90)))
            lob = 0.0018 * noise.noise(Vector((x * 400, y * 400, dz * 400)))
            row.append(bm.verts.new((x * bulge + lob * math.cos(th), y * bulge + lob * math.sin(th),
                                     dome(x, y) * 0.6 + dz)))
        grid.append((row, mi))
    for j in range(len(grid) - 1):
        r0, _ = grid[j]
        r1, mi = grid[j + 1]
        for i in range(seg):
            f = bm.faces.new((r0[i], r0[(i + 1) % seg], r1[(i + 1) % seg], r1[i]))
            f.material_index = grid[j][1] if j < len(rings) - 1 else mi
    bm.normal_update()
    ob = mesh_obj("wound", bm, [mats["skin"], mats["fat"], mats["muscle"]])
    add_mod_subsurf(ob, 1)

    # cavity floor
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=8, y_segments=8, size=0.12)
    for v in bm.verts:
        v.co.z = -0.05
    mesh_obj("cavity", bm, mats["cavity"])


def tube_along(name, pts, radius, mat, res=24, amp=0.0011, freq=170.0):
    """Bevelled curve -> real mesh with organic noise displacement (wrinkles, peristaltic bulges)."""
    ob = curve_obj(name + "_crv", pts, radius, mat, resolution=res)
    ob.data.bevel_resolution = 10
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    bpy.data.objects.remove(ob)
    seed = Vector((random.random() * 50, random.random() * 50, random.random() * 50))
    for v in me.vertices:
        p = v.co + seed
        d = amp * noise.noise(p * freq) + amp * 0.5 * noise.noise(p * freq * 3.1) \
            + amp * 0.3 * math.sin(p.x * 420 + 3.0 * noise.noise(p * 60))
        v.co += v.normal * d
    for poly in me.polygons:
        poly.use_smooth = True
    ob = link(bpy.data.objects.new(name, me))
    return ob


def build_organs(mats):
    # bowel loops filling the field (small intestine)
    loops = [
        [(-0.075, 0.03, -0.035), (-0.05, 0.035, -0.022), (-0.03, 0.028, -0.024), (-0.012, 0.034, -0.02),
         (0.01, 0.03, -0.024), (0.04, 0.036, -0.022), (0.07, 0.025, -0.032)],
        [(-0.08, -0.03, -0.036), (-0.055, -0.026, -0.025), (-0.035, -0.032, -0.026), (-0.02, -0.024, -0.03)],
        [(0.025, -0.032, -0.03), (0.045, -0.024, -0.024), (0.062, -0.03, -0.026), (0.085, -0.022, -0.036)],
        [(-0.07, 0.0, -0.04), (-0.055, -0.01, -0.03), (-0.048, 0.012, -0.03), (-0.06, 0.02, -0.04)],
        [(0.07, 0.0, -0.04), (0.058, 0.012, -0.031), (0.052, -0.008, -0.03), (0.064, -0.016, -0.04)],
        [(-0.072, -0.036, -0.042), (-0.04, -0.04, -0.034), (-0.01, -0.035, -0.036), (0.02, -0.04, -0.034),
         (0.05, -0.036, -0.036), (0.075, -0.038, -0.044)],
        [(-0.03, -0.018, -0.04), (-0.01, -0.02, -0.03), (0.012, -0.016, -0.031), (0.03, -0.02, -0.04)],
        [(-0.06, 0.04, -0.044), (-0.02, 0.042, -0.036), (0.02, 0.044, -0.036), (0.06, 0.04, -0.044)],
    ]
    for i, l in enumerate(loops):
        tube_along(f"bowel_{i}", l, 0.0105 + 0.002 * (i % 2), mats["bowel"])

    # mesenteric fat lumps
    for i in range(14):
        th = random.uniform(0, TAU)
        r = random.uniform(0.55, 0.9)
        x, y = A * r * math.cos(th), B * r * math.sin(th)
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=4, radius=random.uniform(0.008, 0.014))
        for v in bm.verts:
            v.co.z *= 0.55
            v.co += v.co.normalized() * 0.0025 * noise.noise(v.co * 260)
        ob = mesh_obj(f"mesofat_{i}", bm, mats["mesofat"])
        ob.location = (x, y, -0.036)

    # the anastomosis: two bowel ends approximated along the x axis
    for side, y in (("L", -0.0068), ("R", 0.0068)):
        pts = [(-0.06, y * 1.4, -0.024), (-0.035, y, -0.0135), (0.0, y, -0.0115), (0.035, y, -0.0135),
               (0.06, y * 1.4, -0.024)]
        tube_along(f"anastomosis_{side}", pts, 0.0078, mats["lip"], res=32, amp=0.0006, freq=260.0)

    # completed running suture across the seam (violet braided)
    pts = []
    xs = [-0.034, -0.026, -0.018, -0.010, -0.002, 0.006]
    for x in xs:
        z_top = -0.0045 - 0.0035 * (x / 0.035) ** 2
        pts += [(x - 0.002, -0.0075, z_top - 0.0018), (x + 0.0005, -0.001, z_top + 0.0012),
                (x + 0.003, 0.0045, z_top + 0.0006), (x + 0.0045, 0.0078, z_top - 0.0022),
                (x + 0.006, 0.002, z_top - 0.004), (x + 0.006, -0.004, z_top - 0.004)]
    pts = pts[:-2]
    curve_obj("suture_done", pts, 0.00028, mats["suture"], resolution=10, nurbs=True)


def build_retractors(mats):
    # Balfour-style blades on both long edges + a self-retaining frame
    for sgn in (-1, 1):
        prof = [
            (0.0, sgn * (B + 0.024), 0.007), (0.0, sgn * (B + 0.014), 0.0055), (0.0, sgn * (B + 0.004), 0.004),
            (0.0, sgn * (B - 0.001), -0.002), (0.0, sgn * (B - 0.004), -0.016), (0.0, sgn * (B - 0.006), -0.028),
            (0.0, sgn * (B - 0.012), -0.034),
        ]
        bm = bmesh.new()
        w = 0.026
        rows = []
        for xo in (-w, w):
            rows.append([bm.verts.new((xo, p[1], p[2] + dome(xo, p[1]) * 0.5)) for p in prof])
        for i in range(len(prof) - 1):
            bm.faces.new((rows[0][i], rows[0][i + 1], rows[1][i + 1], rows[1][i]))
        ob = mesh_obj(f"retractor_{sgn}", bm, mats["steel"])
        s = ob.modifiers.new("solid", "SOLIDIFY")
        s.thickness = 0.0016
        add_bevel(ob, 0.0006, 2)
        add_mod_subsurf(ob, 2)
        # frame rod
        cylinder(f"retractor_rod_{sgn}", 0.0032, 0.36, mats["steel"], loc=(0, sgn * (B + 0.027), 0.011),
                 rot=(0, math.pi / 2, 0))
    # lateral bars
    for sgn in (-1, 1):
        cylinder(f"frame_{sgn}", 0.0035, 0.2, mats["steel"], loc=(sgn * 0.18, 0, 0.02), rot=(math.pi / 2, 0, 0))

    # lap sponge tucked at the wound edge
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=40, y_segments=30, size=0.016)
    for v in bm.verts:
        x, y = v.co.x * 1.3, v.co.y
        v.co.x, v.co.y = x - 0.085, y + 0.06
        v.co.z = dome(v.co.x, v.co.y) + 0.004 + 0.003 * noise.noise(Vector((x * 120, y * 120, 1.3))) \
            - max(0.0, (0.05 - v.co.y)) * 0.6
    ob = mesh_obj("gauze", bm, mats["gauze"])
    s = ob.modifiers.new("solid", "SOLIDIFY")
    s.thickness = 0.002
    add_mod_subsurf(ob, 1)


def build_drapes(mats):
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=180, y_segments=140, size=1.0)
    win_x, win_y = 0.118, 0.074
    kill = []
    for v in bm.verts:
        x, y = v.co.x * 1.1, v.co.y * 0.9
        v.co.x, v.co.y = x, y
        # distance outside the rounded-rectangle window
        dx, dy = max(abs(x) - win_x, 0.0), max(abs(y) - win_y, 0.0)
        d = math.hypot(dx, dy)
        inside = abs(x) < win_x - 0.004 and abs(y) < win_y - 0.004
        if inside:
            kill.append(v)
            continue
        folds = 0.008 + 0.008 * noise.noise(Vector((x * 9, y * 9, 0.5))) + 0.003 * noise.noise(Vector((x * 30, y * 30, 2.0)))
        z = dome(min(abs(x), 0.4) * (1 if x > 0 else -1), min(abs(y), 0.28) * (1 if y > 0 else -1)) + 0.0035
        z += folds * min(1.0, d * 12) + 0.004 * math.exp(-d * 120)
        # drape falls off the table edges
        if abs(y) > 0.3:
            z -= (abs(y) - 0.3) * 1.6
        if abs(x) > 0.75:
            z -= (abs(x) - 0.75) * 1.2
        v.co.z = z
    bmesh.ops.delete(bm, geom=kill, context="VERTS")
    ob = mesh_obj("drape", bm, mats["drape"])
    s = ob.modifiers.new("solid", "SOLIDIFY")
    s.thickness = 0.0015

    # towels framing the window (disabled: drape fold reads better)
    for name, loc, size in (("towel_n", (0, win_y + 0.006, 0.0), (0.16, 0.012)),
                            ("towel_s", (0, -win_y - 0.006, 0.0), (0.16, 0.012)))[:0]:
        bm = bmesh.new()
        bmesh.ops.create_grid(bm, x_segments=80, y_segments=12, size=1.0)
        for v in bm.verts:
            v.co.x *= size[0]
            v.co.y *= size[1]
            x, y = v.co.x + loc[0], v.co.y + loc[1]
            v.co.z = dome(x, y) + 0.008 + 0.0035 * noise.noise(Vector((x * 40, y * 40, 3.0))) \
                + 0.004 * math.cos(v.co.y / size[1] * math.pi / 2)
            v.co.x, v.co.y = x, y
        ob = mesh_obj(name, bm, mats["towel"])
        ob.modifiers.new("solid", "SOLIDIFY").thickness = 0.003
        add_mod_subsurf(ob, 1)


# --------------------------------------------------------------------------
# robot
# --------------------------------------------------------------------------
class Instrument:
    """RCM-constrained instrument. Root sits at the RCM and aims -Z at the tip."""

    SHAFT_R = 0.0042
    HOUSING_Z = 0.125

    def __init__(self, name, rcm, kind, mats, arm_dir):
        self.name, self.kind, self.mats = name, kind, mats
        self.rcm = Vector(rcm)
        self.root = empty(f"{name}_rcm", rcm)
        self.root.rotation_mode = "QUATERNION"
        self.insert = empty(f"{name}_insert", parent=self.root)
        self.insert.rotation_mode = "XYZ"
        self.wrist = empty(f"{name}_wrist", (0, 0, 0.024), parent=self.insert)
        self.wrist.rotation_mode = "XYZ"
        self.jaw = empty(f"{name}_jawpivot", (0, 0, -0.011), parent=self.wrist)
        self._geometry(arm_dir)

    def _geometry(self, arm_dir):
        mats = self.mats
        ins, wr, jaw = self.insert, self.wrist, self.jaw
        L = self.HOUSING_Z - 0.03
        cylinder(f"{self.name}_shaft", self.SHAFT_R, L, mats["shaft"], loc=(0, 0, 0.03 + L / 2), parent=ins, segs=40)
        # steel tip sleeve + white marking band
        cylinder(f"{self.name}_sleeve", self.SHAFT_R * 1.02, 0.008, mats["steel"], loc=(0, 0, 0.032), parent=ins)
        cylinder(f"{self.name}_band", self.SHAFT_R * 1.03, 0.004, mats["white"], loc=(0, 0, 0.055), parent=ins)
        # proximal wrist link (cable-driven)
        cylinder(f"{self.name}_wristlink", 0.0034, 0.008, mats["steel_dark"], loc=(0, 0, 0.004), parent=wr, bevel=0.0006)
        cylinder(f"{self.name}_pin1", 0.0012, 0.0078, mats["steel"], loc=(0, 0, 0.0), rot=(0, math.pi / 2, 0), parent=wr)
        cylinder(f"{self.name}_clevis", 0.0031, 0.011, mats["steel"], loc=(0, 0, -0.0055), parent=wr, bevel=0.0006)
        cylinder(f"{self.name}_pin2", 0.0011, 0.0072, mats["steel"], loc=(0, 0, -0.011), rot=(math.pi / 2, 0, 0), parent=wr)
        # cables
        for a in (0.8, 2.4, 3.9, 5.5):
            cylinder(f"{self.name}_cable", 0.00025, 0.012, mats["steel_dark"],
                     loc=(0.0032 * math.cos(a), 0.0032 * math.sin(a), 0.004), parent=wr, segs=8)
        # jaws
        self.jaws = []
        for sgn in (-1, 1):
            j = empty(f"{self.name}_jaw{sgn}", parent=jaw)
            j.rotation_mode = "XYZ"
            bm = bmesh.new()
            length = 0.013 if self.kind != "hook" else 0.0
            n_seg = 6
            vs = []
            for k in range(n_seg + 1):
                t = k / n_seg
                w = 0.0027 * (1 - 0.55 * t)
                th = 0.0013 * (1 - 0.45 * t)
                z = -length * t
                curve = (0.0012 * t * t) if self.kind == "maryland" else 0.0
                vs.append([bm.verts.new((sx * w / 2 + curve, sgn * (sy * th + 0.0002), z))
                           for sx, sy in ((-1, 0), (1, 0), (1, 1), (-1, 1))])
            for k in range(n_seg):
                for e in range(4):
                    bm.faces.new((vs[k][e], vs[k][(e + 1) % 4], vs[k + 1][(e + 1) % 4], vs[k + 1][e]))
            bm.faces.new(vs[0][::-1])
            bm.faces.new(vs[-1])
            ob = mesh_obj(f"{self.name}_jawmesh{sgn}", bm, mats["steel"])
            ob.parent = j
            add_bevel(ob, 0.0003, 2)
            self.jaws.append((j, sgn))

        # carriage / sterile adapter / housing
        hz = self.HOUSING_Z
        rounded_box(f"{self.name}_adapter", (0.022, 0.018, 0.012), mats["joint"], 0.002, ins, (0, 0, hz))
        rounded_box(f"{self.name}_housing", (0.03, 0.022, 0.05), mats["white"], 0.006, ins, (0, -0.004, hz + 0.05))
        rounded_box(f"{self.name}_ledstrip", (0.002, 0.0225, 0.04), mats["led"], 0.0008, ins, (0.0295, -0.004, hz + 0.05))
        # instrument spar (rail) fixed to the RCM frame
        rail = rounded_box(f"{self.name}_spar", (0.012, 0.011, 0.13), mats["white"], 0.005, self.root,
                           (0, 0.034, 0.0))
        rail.location = (0, 0.034, 0.0)  # adjusted per frame below via parent space
        self.rail = rail
        # arm links reaching out of frame
        base = empty(f"{self.name}_armbase", parent=self.root)
        self.arm_base = base
        d = Vector(arm_dir).normalized()
        segs = [(0.42, 0.035), (0.55, 0.045)]
        p = Vector((0, 0.034, 0.21))
        for i, (ln, rad) in enumerate(segs):
            cylinder(f"{self.name}_joint{i}", rad * 1.15, rad * 1.6, mats["joint"], loc=p, parent=base,
                     rot=(0, math.pi / 2, 0), bevel=0.004)
            cylinder(f"{self.name}_jointled{i}", rad * 1.17, 0.003, mats["led"], loc=p, parent=base,
                     rot=(0, math.pi / 2, 0))
            q = p + d * ln
            mid = (p + q) / 2
            link = rounded_box(f"{self.name}_link{i}", (rad, rad * 0.9, ln / 2), mats["white"], rad * 0.6, base, mid)
            link.rotation_mode = "QUATERNION"
            link.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d)
            p = q
            d = (d + Vector((0, 0, 0.6))).normalized()

    def pose(self, frame, tip, roll=0.0, pitch=0.0, yaw=0.0, jaw=0.0):
        dvec = Vector(tip) - self.rcm
        dist = dvec.length
        q = Vector((0, 0, -1)).rotation_difference(dvec.normalized())
        self.root.rotation_quaternion = q
        self.insert.location = (0, 0, -dist)
        self.insert.rotation_euler = (0, 0, roll)
        self.wrist.rotation_euler = (pitch, yaw, 0)
        # spar stays at a fixed position along the RCM frame
        self.rail.location = (0, 0.034, 0.1)
        for j, sgn in self.jaws:
            j.rotation_euler = (sgn * jaw, 0, 0)
        self.root.keyframe_insert("rotation_quaternion", frame=frame)
        self.insert.keyframe_insert("location", frame=frame)
        self.insert.keyframe_insert("rotation_euler", frame=frame)
        self.wrist.keyframe_insert("rotation_euler", frame=frame)
        self.rail.keyframe_insert("location", frame=frame)
        for j, _ in self.jaws:
            j.keyframe_insert("rotation_euler", frame=frame)


def build_needle(inst, mats):
    """Curved 3/8 circle taper needle clamped in the needle-driver jaws."""
    r = 0.0085
    pts = []
    for k in range(17):
        a = math.radians(-20 + 155 * k / 16)
        pts.append((r * math.cos(a) - r * math.cos(math.radians(55)), 0.0, -r * math.sin(a) - 0.0035))
    nd = curve_obj("needle", pts, 0.0005, mats["steel"], resolution=6)
    nd.parent = inst.jaw
    nd.location = (0, 0, 0)
    nd.rotation_euler = (0, 0, 0.35)
    tail = empty("needle_tail", pts[-1], parent=nd)
    return nd, tail


# --------------------------------------------------------------------------
# scene
# --------------------------------------------------------------------------
def build_scene():
    mats = build_materials()
    build_wound(mats)
    build_organs(mats)
    build_retractors(mats)
    build_drapes(mats)

    nd = Instrument("needle_driver", (-0.06, 0.03, 0.075), "driver", mats, (-0.7, 0.4, 0.5))
    gr = Instrument("grasper", (0.09, 0.04, 0.07), "grasper", mats, (0.7, 0.4, 0.5))
    mb = Instrument("maryland", (-0.005, 0.075, 0.08), "maryland", mats, (0.0, 0.9, 0.4))
    needle, tail = build_needle(nd, mats)

    # thread: from needle swage end, sagging, into the last bite
    thread_pts = [(0, 0, 0)] * 9
    thread = curve_obj("suture_live", thread_pts, 0.00028, mats["suture"], resolution=12, nurbs=True)

    scn = bpy.context.scene
    scn.frame_start, scn.frame_end = 1, FRAMES
    for f in range(1, FRAMES + 1):
        t = TAU * (f - 1) / FRAMES
        # needle driver: rotates the wrist to drive the needle through the tissue in a tight arc
        nd.pose(f, (0.017 + 0.0022 * math.sin(t), -0.010 + 0.0012 * math.sin(2 * t), 0.0045 + 0.0016 * math.cos(t)),
                roll=0.35 + 0.42 * math.sin(t), pitch=0.35 + 0.12 * math.sin(t + 0.6), yaw=-0.25 + 0.08 * math.cos(2 * t),
                jaw=0.0)
        # grasper: everts the anastomosis edge, gentle micro-adjustments
        gr.pose(f, (0.034 + 0.0012 * math.sin(t + 1.2), 0.009 + 0.0008 * math.cos(2 * t), -0.0015 + 0.0009 * math.sin(2 * t)),
                roll=-0.6 + 0.08 * math.sin(t), pitch=-0.45 + 0.06 * math.sin(t + 2), yaw=0.2,
                jaw=0.045 + 0.03 * (0.5 + 0.5 * math.sin(2 * t + 1.0)))
        # maryland dissector: holds the suture line under tension
        mb.pose(f, (-0.014 + 0.0015 * math.sin(t + 2.1), 0.016 + 0.0008 * math.sin(t), 0.0005 + 0.001 * math.cos(t)),
                roll=0.2, pitch=0.55 + 0.05 * math.sin(2 * t), yaw=0.1,
                jaw=0.18 + 0.12 * (0.5 + 0.5 * math.sin(t + 0.5)))

    entry = Vector((0.0115, -0.0072, -0.0062))
    dg = bpy.context.evaluated_depsgraph_get()
    for f in range(1, FRAMES + 1):
        scn.frame_set(f)
        dg = bpy.context.evaluated_depsgraph_get()
        a = tail.evaluated_get(dg).matrix_world.translation.copy()
        n = len(thread.data.splines[0].points)
        for i, p in enumerate(thread.data.splines[0].points):
            s = i / (n - 1)
            pos = a.lerp(entry, s)
            sag = math.sin(math.pi * s) * (0.009 + 0.001 * math.sin(TAU * (f - 1) / FRAMES))
            pos.z -= sag
            pos.y -= math.sin(math.pi * s) * 0.004
            p.co = (pos.x, pos.y, pos.z, 1.0)
            p.keyframe_insert("co", frame=f)
    return mats


CAMERAS = {
    # hero: over-the-shoulder view into the laparotomy
    "hero": dict(target=(0.008, 0.0, 0.006), base=(0.035, -0.215, 0.255), lens=50, fstop=3.2, shift=-0.07),
    # macro: the articulated wrist and needle at the anastomosis
    "macro": dict(target=(0.017, -0.007, 0.006), base=(0.10, -0.12, 0.095), lens=85, fstop=3.5, shift=0.0),
}


def build_camera_and_lights(view="hero"):
    cfg = CAMERAS[view]
    target = Vector(cfg["target"])
    scn = bpy.context.scene
    cam_data = bpy.data.cameras.new("cam")
    cam_data.lens = cfg["lens"]
    cam_data.shift_x = cfg["shift"]
    cam_data.sensor_width = 36
    cam_data.dof.use_dof = True
    cam_data.dof.aperture_fstop = cfg["fstop"]
    cam = link(bpy.data.objects.new("camera", cam_data))
    aim = empty("cam_target", target)
    cam_data.dof.focus_object = aim
    tr = cam.constraints.new("TRACK_TO")
    tr.target = aim
    tr.track_axis = "TRACK_NEGATIVE_Z"
    tr.up_axis = "UP_Y"
    base = Vector(cfg["base"])
    for f in range(1, FRAMES + 1):
        t = TAU * (f - 1) / FRAMES
        cam.location = base + Vector((0.006 * math.sin(t), 0.003 * math.sin(2 * t), 0.002 * math.cos(t)))
        cam.keyframe_insert("location", frame=f)
    scn.camera = cam

    def area(name, loc, size, energy, color, rot_target=Vector((0, 0, 0)), shape="DISK"):
        ld = bpy.data.lights.new(name, "AREA")
        ld.shape = shape
        ld.size = size
        ld.energy = energy
        ld.color = color
        ob = link(bpy.data.objects.new(name, ld))
        ob.location = loc
        c = ob.constraints.new("TRACK_TO")
        tgt = empty(name + "_t", rot_target)
        c.target = tgt
        c.track_axis = "TRACK_NEGATIVE_Z"
        c.up_axis = "UP_Y"
        return ob

    # twin surgical lights (~4500K) + cool monitor rim + soft fill
    def spot(name, loc, energy, color, size_deg, radius):
        ld = bpy.data.lights.new(name, "SPOT")
        ld.energy = energy
        ld.color = color
        ld.spot_size = math.radians(size_deg)
        ld.spot_blend = 1.0
        ld.shadow_soft_size = radius
        ob = link(bpy.data.objects.new(name, ld))
        ob.location = loc
        c = ob.constraints.new("TRACK_TO")
        c.target = empty(name + "_t", (0.0, 0.0, -0.01))
        c.track_axis = "TRACK_NEGATIVE_Z"
        c.up_axis = "UP_Y"
        return ob

    # focused twin surgical light heads: bright pool on the field, OR falls into darkness
    spot("surgical_light_A", (0.25, -0.35, 1.25), 170, (1.0, 0.95, 0.88), 11, 0.12)
    spot("surgical_light_B", (-0.45, 0.15, 1.15), 90, (1.0, 0.96, 0.92), 10, 0.1)
    area("monitor_rim", (0.1, 0.9, 0.35), 0.8, 6, (0.45, 0.7, 1.0), shape="RECTANGLE")
    area("fill", (-0.4, -0.6, 0.4), 1.0, 0.25, (0.8, 0.88, 1.0))

    world = bpy.data.worlds.new("or")
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (0.004, 0.009, 0.014, 1)
    bg.inputs["Strength"].default_value = 1.0
    scn.world = world


def configure_render(mode, out):
    scn = bpy.context.scene
    scn.render.engine = "CYCLES"
    cy = scn.cycles
    cy.device = "CPU"
    cy.use_adaptive_sampling = True
    cy.adaptive_threshold = 0.02
    cy.use_denoising = True
    cy.denoiser = "OPENIMAGEDENOISE"
    cy.max_bounces = 5
    cy.diffuse_bounces = 2
    cy.glossy_bounces = 3
    cy.transmission_bounces = 4
    cy.caustics_reflective = False
    cy.caustics_refractive = False
    cy.blur_glossy = 1.0
    try:
        scn.view_settings.view_transform = "AgX"
        scn.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass
    scn.view_settings.exposure = 0.0
    r = scn.render
    r.image_settings.file_format = "PNG"
    r.image_settings.color_depth = "8"
    r.film_transparent = False
    r.use_persistent_data = True
    if mode == "preview":
        r.resolution_x, r.resolution_y, r.resolution_percentage = 960, 540, 100
        cy.samples = 24
    elif mode == "still":
        r.resolution_x, r.resolution_y, r.resolution_percentage = 1920, 1080, 100
        cy.samples = 96
    else:
        r.resolution_x, r.resolution_y, r.resolution_percentage = 1280, 720, 100
        cy.samples = 20
    os.makedirs(out, exist_ok=True)


def main():
    argv = sys.argv
    argv = argv[argv.index("--") + 1:] if "--" in argv else argv[1:]
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", choices=["preview", "still", "anim"], default="preview")
    ap.add_argument("--out", default="render")
    ap.add_argument("--frame", type=int, default=1)
    ap.add_argument("--start", type=int, default=1)
    ap.add_argument("--end", type=int, default=FRAMES)
    ap.add_argument("--save-blend", default="")
    ap.add_argument("--view", choices=list(CAMERAS), default="hero")
    ap.add_argument("--samples", type=int, default=0)
    args = ap.parse_args(argv)

    reset()
    build_scene()
    build_camera_and_lights(args.view)
    configure_render(args.mode, args.out)
    if args.samples:
        bpy.context.scene.cycles.samples = args.samples
    scn = bpy.context.scene
    if args.save_blend:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(args.save_blend))
    if args.mode in ("preview", "still"):
        scn.frame_set(args.frame)
        scn.render.filepath = os.path.join(args.out, f"{args.mode}_{args.view}_{args.frame:03d}.png")
        bpy.ops.render.render(write_still=True)
    else:
        for f in range(args.start, args.end + 1):
            path = os.path.join(args.out, f"frame_{f:04d}.png")
            if os.path.exists(path):
                continue
            scn.frame_set(f)
            scn.render.filepath = path
            bpy.ops.render.render(write_still=True)
            print(f"rendered {path}", flush=True)


if __name__ == "__main__":
    main()

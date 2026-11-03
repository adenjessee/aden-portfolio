"""
Turns a VRoid export into the site's avatar: real height and adult proportions, Aden's hair, skin, eyes and
stubble, and the black suit with emissive cyan seam lines. The source file is never modified.

blender -b --python scripts/avatar/build.py -- <in.vrm> <out.vrm>   (or: npm run avatar:build)

Every number here was tuned against the photos with `npm run avatar:compare`; change one, rerun, look.
"""
import bpy
import math
import random
import sys
from collections import defaultdict

import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1 :]
SRC, OUT = argv[0], argv[1]

# --- Targets ---------------------------------------------------------------------------------------
HEIGHT = 1.778  # 5'10", crown of the skull (not the hair) to the floor
HEAD = 0.92  # head size relative to VRoid's: adult heads are a smaller share of height
NECK = 1.3  # neck thickness
CHEST = (1.12, 1.06)  # upper torso width, depth
SHOULDER = 0.035  # metres each arm moves outward
ARM = 1.12  # arm thickness

HAIR = ("#241b15", "#3d2f25", "#5a4a3c")  # shadow, base, highlight
BROW = ("#1a1410", "#2a211b", "#3a2e25")
IRIS = ("#2c3530", "#66725f", "#a3ad95")
SKIN = (245, 214, 186)  # lit skin, a touch lighter than the photo for the toon shader
SKIN_SHADE = (0.86, 0.66, 0.56)
STUBBLE = (0.42, 0.36, 0.31)
SUIT = ("#06080b", "#0b0e13", "#161b23")
LINE = (0.157, 0.882, 1.0)  # #28e1ff

random.seed(7)


def rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)])


def smooth(e0, e1, x):
    t = min(max((x - e0) / (e1 - e0), 0.0), 1.0)
    return t * t * (3 - 2 * t)


# --- Load ------------------------------------------------------------------------------------------
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.preferences.addon_enable(module="bl_ext.blender_org.vrm")
bpy.ops.import_scene.vrm(filepath=SRC)
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
bones = arm.data.bones
meshes = [o for o in bpy.data.objects if o.type == "MESH"]


def subtree(name):
    out, stack = set(), [bones[name]]
    while stack:
        b = stack.pop()
        out.add(b.name)
        stack.extend(b.children)
    return out


HEAD_SET = subtree("J_Bip_C_Head")
ARM_L, ARM_R = subtree("J_Bip_L_UpperArm"), subtree("J_Bip_R_UpperArm")
LIMB = {n for n in ARM_L | ARM_R if "Hand" not in n and not any(f in n for f in ("Thumb", "Index", "Middle", "Ring", "Little"))}
CHEST_SET = {"J_Bip_C_Chest", "J_Bip_C_UpperChest", "J_Bip_L_Shoulder", "J_Bip_R_Shoulder"} | {n for n in bones.keys() if "Bust" in n}
HAIR_BONES = {n for n in HEAD_SET if "Hair" in n}

HEAD_PIVOT = arm.matrix_world @ bones["J_Bip_C_Head"].head_local
NECK_AXIS = arm.matrix_world @ bones["J_Bip_C_Neck"].head_local
ARM_AXIS = arm.matrix_world @ bones["J_Bip_L_UpperArm"].head_local

# --- Hair restyle (in VRoid's head space, before any scaling) -------------------------------------
SKULL_C = Vector((0.0, 0.0385, 1.64))
SKULL_R = Vector((0.100, 0.104, 0.124))


def restyle(p, rand):
    d = p - SKULL_C
    k = math.sqrt((d.x / SKULL_R.x) ** 2 + (d.y / SKULL_R.y) ** 2 + (d.z / SKULL_R.z) ** 2) or 1.0
    surface = SKULL_C + d / k
    out = p - surface  # hair volume above the skull, along the radial direction
    front = 1 - smooth(-0.03, 0.005, p.y)
    side = smooth(0.055, 0.085, abs(p.x)) * (1 - front)
    back = smooth(0.04, 0.09, p.y)
    top = smooth(1.69, 1.73, p.z)
    low = 1 - smooth(1.64, 1.70, p.z)
    # Short sides and back: hug the skull below the crown.
    low = 1 - smooth(1.65, 1.73, p.z)
    keep = 1 - side * low * 0.85
    # The back follows the skull all the way up to the crown.
    keep *= 1 - back * (1 - side) * 0.75 * (1 - smooth(1.72, 1.76, p.z))
    # More lift on top, a little more at the front (the hair rises off the forehead).
    keep *= 1 + 0.5 * top + 0.25 * top * front
    q = surface + out * keep
    # Sides: nothing hangs over the ears; fold the lower hair up into a short band.
    ear = side * (1 - back) * (1 - smooth(1.625, 1.655, q.z))
    q.z += (1.645 - q.z) * 0.85 * ear
    # Back: taper into the nape.
    nape = back * (1 - smooth(1.53, 1.58, q.z))
    q.z += (1.545 - q.z) * 0.7 * nape if q.z < 1.545 else 0
    # Fringe: uneven pieces, shorter in front so the forehead shows.
    fr = front * (1 - smooth(1.69, 1.72, q.z))
    q.z += (1.725 - q.z) * (0.45 + 0.4 * rand) * fr
    # Swept toward his right (-X) on top.
    q.x -= 0.012 * top
    return q


def islands(mesh):
    parent = list(range(len(mesh.vertices)))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    for e in mesh.edges:
        a, b = find(e.vertices[0]), find(e.vertices[1])
        if a != b:
            parent[a] = b
    roots = [find(i) for i in range(len(parent))]
    per = {r: random.random() for r in set(roots)}
    return [per[r] for r in roots]


# --- Body transform (applied to vertices by skin weight, and to bones) -----------------------------
def categories(weights):
    total = sum(weights.values()) or 1.0
    c = defaultdict(float)
    for name, w in weights.items():
        w /= total
        if name in HEAD_SET:
            c["head"] += w
        elif name == "J_Bip_C_Neck":
            c["neck"] += w
        elif name in ARM_L:
            c["armL"] += w
            if name in LIMB:
                c["limb"] += w
        elif name in ARM_R:
            c["armR"] += w
            if name in LIMB:
                c["limb"] += w
        elif name in CHEST_SET:
            c["chest"] += w
    return c


JAW = 1.08  # lower face width


def widen_jaw(p):
    # Wider at the jaw line, unchanged at the eyes and at the neck seam.
    w = (1 - smooth(1.575, 1.60, p.z)) * smooth(1.505, 1.53, p.z)
    p.x *= 1 + (JAW - 1) * w
    return p


def transform(p, c, scale_all):
    p = p.copy()
    if c["head"]:
        p = p.lerp(HEAD_PIVOT + (p - HEAD_PIVOT) * HEAD, c["head"])
    if c["neck"]:
        f = 1 + (NECK - 1) * c["neck"]
        p.x = NECK_AXIS.x + (p.x - NECK_AXIS.x) * f
        p.y = NECK_AXIS.y + (p.y - NECK_AXIS.y) * f
    if c["chest"]:
        p.x *= 1 + (CHEST[0] - 1) * c["chest"]
        p.y = -0.01 + (p.y + 0.01) * (1 + (CHEST[1] - 1) * c["chest"])
    if c["limb"]:
        f = 1 + (ARM - 1) * c["limb"]
        p.y = ARM_AXIS.y + (p.y - ARM_AXIS.y) * f
        p.z = ARM_AXIS.z + (p.z - ARM_AXIS.z) * f
    p.x += SHOULDER * (c["armL"] - c["armR"])
    return p * scale_all


crown = max((o.matrix_world @ v.co).z for o in meshes if o.name == "Face" for v in o.data.vertices)
SCALE = HEIGHT / (HEAD_PIVOT.z + (crown - HEAD_PIVOT.z) * HEAD)
print(f"AVATAR crown {crown:.3f} -> scale {SCALE:.4f}")

for obj in meshes:
    me = obj.data
    names = {g.index: g.name for g in obj.vertex_groups}
    cats = [categories({names[g.group]: g.weight for g in v.groups if g.group in names}) for v in me.vertices]
    rands = islands(me) if obj.name == "Hair" else None
    blocks = me.shape_keys.key_blocks if me.shape_keys else None
    layers = [kb.data for kb in blocks] if blocks else [me.vertices]
    for layer in layers:
        for i, item in enumerate(layer):
            p = item.co.copy()
            if rands is not None:
                p = restyle(p, rands[i])
            if obj.name == "Face":
                p = widen_jaw(p)
            item.co = transform(p, cats[i], SCALE)
    if blocks:
        for i, v in enumerate(me.vertices):
            v.co = blocks[0].data[i].co
    me.update()

bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode="EDIT")
for eb in arm.data.edit_bones:
    eb.use_connect = False
for eb in arm.data.edit_bones:
    c = categories({eb.name: 1.0})
    head, tail = eb.head.copy(), eb.tail.copy()
    if eb.name in HAIR_BONES:
        head, tail = restyle(head, 0.3), restyle(tail, 0.3)
    eb.head, eb.tail = transform(head, c, SCALE), transform(tail, c, SCALE)
bpy.ops.object.mode_set(mode="OBJECT")

# Spring-bone colliders and hit radii follow the parts they belong to.
sb = arm.data.vrm_addon_extension.spring_bone1


def size_of(bone_name):
    c = categories({bone_name: 1.0})
    return SCALE * (HEAD if c["head"] else 1) * (ARM if c["limb"] else 1)


for col in sb.colliders:
    f = size_of(col.node.bone_name)
    for shape in (col.shape.sphere, col.shape.capsule):
        shape.radius *= f
        shape.offset = [x * f for x in shape.offset]
    col.shape.capsule.tail = [x * f for x in col.shape.capsule.tail]
for spring in sb.springs:
    for j in spring.joints:
        j.hit_radius *= size_of(j.node.bone_name)


# --- Textures ---------------------------------------------------------------------------------------
def pixels(img):
    a = np.empty(img.size[0] * img.size[1] * 4, dtype=np.float32)
    img.pixels.foreach_get(a)
    return a.reshape(img.size[1], img.size[0], 4)


def store(img, a):
    img.pixels.foreach_set(np.ascontiguousarray(a, dtype=np.float32).ravel())
    img.pack()


def gradient(img, stops):
    a = pixels(img)
    lum = a[..., :3] @ np.array([0.299, 0.587, 0.114])
    mask = a[..., 3] > 0.05
    lo, hi = np.percentile(lum[mask], [2, 98]) if mask.any() else (0, 1)
    t = np.clip((lum - lo) / max(hi - lo, 1e-4), 0, 1)[..., None]
    s, m, h = (rgb(x) for x in stops)
    a[..., :3] = np.where(t < 0.55, s + (m - s) * (t / 0.55), m + (h - m) * ((t - 0.55) / 0.45))
    store(img, a)


def warm_skin(img):
    a = pixels(img)
    mask = (a[..., 3] > 0.5) & (a[..., :3].min(axis=2) > 0.6)  # skin, not the dark under-clothes areas
    ratio = (np.array(SKIN) / 255) / a[..., :3][mask].mean(axis=0)
    a[..., :3] = np.clip(a[..., :3] * ratio, 0, 1)
    store(img, a)
    return a


def mat(fragment):
    return next(m for m in bpy.data.materials if fragment in m.name and "Outline" not in m.name)


def mtoon(m):
    return m.vrm_addon_extension.mtoon1


def base_image(m):
    return mtoon(m).pbr_metallic_roughness.base_color_texture.index.source


for frag in ("_Hair_00_HAIR", "HairBack"):
    m = mat(frag)
    gradient(base_image(m), HAIR)
    mtoon(m).extensions.vrmc_materials_mtoon.shade_color_factor = (0.62, 0.6, 0.62)
gradient(base_image(mat("FaceBrow")), BROW)
gradient(base_image(mat("EyeIris")), IRIS)

for frag in ("Body_00_SKIN", "Face_00_SKIN"):
    m = mat(frag)
    mtoon(m).extensions.vrmc_materials_mtoon.shade_color_factor = SKIN_SHADE
    warm_skin(base_image(m))

# Stubble: painted in the face texture's UV space from where each face vertex sits in 3D, so it lands
# on the jaw, chin and upper lip and stays off the lips and cheeks.
face_obj = bpy.data.objects["Face"]
face_img = base_image(mat("Face_00_SKIN"))
fw, fh = face_img.size
skin_index = next(i for i, m in enumerate(face_obj.data.materials) if "Face_00_SKIN" in m.name)
open_mouth = face_obj.data.shape_keys.key_blocks["Fcl_MTH_A"].data
basis = face_obj.data.shape_keys.key_blocks[0].data
moved = np.array([(open_mouth[i].co - basis[i].co).length for i in range(len(basis))])
lips = moved > np.percentile(moved, 99)
mouth_c = sum((basis[i].co for i in np.nonzero(lips)[0]), Vector()) / max(lips.sum(), 1)


def stubble_weight(co):
    rel = co - mouth_c
    below = 1 - smooth(-0.004, 0.012, rel.z)  # chin and jaw, below the mouth
    lip = smooth(0.006, 0.010, rel.z) * (1 - smooth(0.016, 0.024, rel.z)) * (1 - smooth(0.018, 0.028, abs(rel.x)))
    on_lip = (1 - smooth(0.006, 0.012, abs(rel.z))) * (1 - smooth(0.018, 0.026, abs(rel.x)))
    jaw = 1 - smooth(0.045 * SCALE, 0.07 * SCALE, -rel.z)  # fade out down the neck
    side_jaw = smooth(0.012, 0.03, abs(rel.x))  # strongest along the jaw, faint at the chin centre
    return below * jaw * (0.55 + 0.45 * side_jaw) * (1 - on_lip)


mask = np.zeros((fh, fw), dtype=np.float32)
uv = face_obj.data.uv_layers.active.data
for poly in face_obj.data.polygons:
    if poly.material_index != skin_index:
        continue
    loops = list(poly.loop_indices)
    for t in range(1, len(loops) - 1):
        tri = [loops[0], loops[t], loops[t + 1]]
        uvs = np.array([[uv[l].uv[0] * fw, uv[l].uv[1] * fh] for l in tri])
        ws = np.array([stubble_weight(face_obj.data.vertices[face_obj.data.loops[l].vertex_index].co) for l in tri])
        if ws.max() <= 0.01:
            continue
        x0, y0 = np.floor(uvs.min(axis=0)).astype(int)
        x1, y1 = np.ceil(uvs.max(axis=0)).astype(int)
        xs, ys = np.meshgrid(np.arange(max(x0, 0), min(x1 + 1, fw)), np.arange(max(y0, 0), min(y1 + 1, fh)))
        if xs.size == 0:
            continue
        (ax, ay), (bx, by), (cx, cy) = uvs
        den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
        if abs(den) < 1e-9:
            continue
        l1 = ((by - cy) * (xs - cx) + (cx - bx) * (ys - cy)) / den
        l2 = ((cy - ay) * (xs - cx) + (ax - cx) * (ys - cy)) / den
        l3 = 1 - l1 - l2
        inside = (l1 >= -0.01) & (l2 >= -0.01) & (l3 >= -0.01)
        val = l1 * ws[0] + l2 * ws[1] + l3 * ws[2]
        sub = mask[ys, xs]
        mask[ys, xs] = np.where(inside, np.maximum(sub, val), sub)
rng = np.random.default_rng(3)
grain = 0.55 + 0.45 * rng.random(mask.shape)
a = pixels(face_img)
for _ in range(6):  # soften the edges so it reads as shadow, not paint
    mask = (mask + np.roll(mask, 3, 0) + np.roll(mask, -3, 0) + np.roll(mask, 3, 1) + np.roll(mask, -3, 1)) / 5
amount = (np.clip(mask, 0, 1) * grain * 0.24)[..., None]
a[..., :3] = a[..., :3] * (1 - amount) + np.array(STUBBLE) * amount
store(face_img, a)
print(f"AVATAR stubble pixels {(mask > 0.05).sum()}")

# Suit: the tee goes near-black, and every seam (the edge of each UV island) becomes a cyan line in a
# new emissive texture. The site pushes emissive past the bloom threshold so only the lines glow.
body = bpy.data.objects["Body"]
for frag in ("Tops_01_CLOTH", "Bottoms_01_CLOTH"):
    m = mat(frag)
    img = base_image(m)
    gradient(img, SUIT)
    w, h = img.size
    idx = next(i for i, mm in enumerate(body.data.materials) if frag in mm.name)
    uvd = body.data.uv_layers.active.data
    edges = defaultdict(int)
    for poly in body.data.polygons:
        if poly.material_index != idx:
            continue
        ls = list(poly.loop_indices)
        for i in range(len(ls)):
            a0, b0 = tuple(np.round(uvd[ls[i]].uv, 5)), tuple(np.round(uvd[ls[(i + 1) % len(ls)]].uv, 5))
            edges[tuple(sorted((a0, b0)))] += 1
    glow = np.zeros((h, w), dtype=np.float32)
    radius = max(2, w // 256)
    yy, xx = np.mgrid[-radius - 2 : radius + 3, -radius - 2 : radius + 3]
    disc = np.clip(radius + 1 - np.sqrt(xx**2 + yy**2), 0, 1)
    for (p0, p1), count in edges.items():
        if count != 1:
            continue
        p0, p1 = np.array(p0) * (w, h), np.array(p1) * (w, h)
        steps = int(np.linalg.norm(p1 - p0)) + 1
        for t in np.linspace(0, 1, steps):
            cx, cy = (p0 + (p1 - p0) * t).astype(int)
            x0, y0 = cx - radius - 2, cy - radius - 2
            xa, ya = max(x0, 0), max(y0, 0)
            xb, yb = min(x0 + disc.shape[1], w), min(y0 + disc.shape[0], h)
            if xa >= xb or ya >= yb:
                continue
            glow[ya:yb, xa:xb] = np.maximum(glow[ya:yb, xa:xb], disc[ya - y0 : yb - y0, xa - x0 : xb - x0])
    em = bpy.data.images.new(f"{frag}_emissive", w, h, alpha=False)
    out = np.zeros((h, w, 4), dtype=np.float32)
    out[..., :3] = glow[..., None] * np.array(LINE)
    out[..., 3] = 1
    store(em, out)
    ext = mtoon(m)
    ext.emissive_texture.index.source = em
    ext.emissive_factor = (1.0, 1.0, 1.0)
    ext.extensions.vrmc_materials_mtoon.shade_color_factor = (0.5, 0.55, 0.65)
    ext.extensions.vrmc_materials_mtoon.outline_color_factor = (0.0, 0.0, 0.0)
    print(f"AVATAR {frag} seam edges {sum(1 for c in edges.values() if c == 1)}")

# --- Size --------------------------------------------------------------------------------------------
for img in bpy.data.images:
    if img.name == "Thumbnail" and img.size[0] > 512:
        img.scale(512, 512)
    elif img.size[0] >= 2048 or img.size[1] >= 2048:
        img.scale(max(img.size[0] // 2, 1), max(img.size[1] // 2, 1))
    if img.size[0]:
        img.pack()

arm.data.vrm_addon_extension.spec_version = "1.0"
meta = arm.data.vrm_addon_extension.vrm1.meta
meta.vrm_name = "Aden"
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.vrm(filepath=OUT)
print("AVATAR wrote", OUT)

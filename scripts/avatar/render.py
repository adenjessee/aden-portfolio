import bpy, sys, math
from mathutils import Vector
argv = sys.argv[sys.argv.index("--")+1:]
vrm, outdir = argv[0], argv[1]
mode = argv[2] if len(argv) > 2 else "head"
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.preferences.addon_enable(module="bl_ext.blender_org.vrm")
bpy.ops.import_scene.vrm(filepath=vrm)
sc = bpy.context.scene
sc.render.engine = "BLENDER_EEVEE_NEXT"
sc.render.resolution_x, sc.render.resolution_y = (675, 900) if mode == "head" else (600, 1200)
sc.render.film_transparent = True
sc.view_settings.view_transform = "Standard"
world = bpy.data.worlds.new("w"); sc.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs[1].default_value = 1.0
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); sc.collection.objects.link(sun)
sun.rotation_euler = (math.radians(50), 0, math.radians(-20)); sun.data.energy = 3
arm = [o for o in bpy.data.objects if o.type == "ARMATURE"][0]
head = arm.matrix_world @ arm.data.bones["J_Bip_C_Head"].head_local
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = "ORTHO"
if mode == "head":
    target = Vector((0, 0, head.z + 0.04)); cam.data.ortho_scale = 0.62
else:
    target = Vector((0, 0, 0.88)); cam.data.ortho_scale = 1.95
# angle 0 = front; positive = camera swings toward the model's left (+X)
for name, ang in [("front", 0), ("threequarter", 50), ("profile_left", 90), ("profile_right", -90), ("back", 180)]:
    a = math.radians(ang)
    cam.location = target + Vector((math.sin(a) * 4, -math.cos(a) * 4, 0))
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = f"{outdir}/{mode}_{name}.png"
    bpy.ops.render.render(write_still=True)

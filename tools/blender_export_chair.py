from pathlib import Path
import bpy

OUT_DIR = Path("/Users/qing/Desktop/数字艺术实践/定制网站/assets")
OUT_DIR.mkdir(parents=True, exist_ok=True)

SOURCE_NAME = "3号椅"

bpy.ops.object.select_all(action="DESELECT")
source = bpy.data.objects[SOURCE_NAME]
source.select_set(True)
bpy.context.view_layer.objects.active = source

bpy.ops.object.duplicate()
work = bpy.context.object
work.name = "chair_source"

# Keep the authored shape, but make the export transform browser-friendly.
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

bpy.ops.mesh.separate(type="LOOSE")
parts = [obj for obj in bpy.context.selected_objects if obj.type == "MESH"]

for index, obj in enumerate(parts):
    world_corners = [obj.matrix_world @ __import__("mathutils").Vector(corner) for corner in obj.bound_box]
    min_x = min(c.x for c in world_corners)
    max_x = max(c.x for c in world_corners)
    min_y = min(c.y for c in world_corners)
    max_y = max(c.y for c in world_corners)
    min_z = min(c.z for c in world_corners)
    max_z = max(c.z for c in world_corners)
    center_x = (min_x + max_x) * 0.5
    center_y = (min_y + max_y) * 0.5
    center_z = (min_z + max_z) * 0.5
    prefix = "shell"
    if center_y < -120:
        prefix = "leg"
    elif center_y > 110 or center_z < -140:
        prefix = "seat"
    elif center_z > 20 or abs(center_x) > 110:
        prefix = "back"
    obj.name = f"{prefix}_{index:02d}"
    obj.data.name = f"{obj.name}_mesh"

    obj["parametric_role"] = prefix
    obj["manufacturing_note"] = "low-poly separated chair component"

for obj in parts:
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
    obj.select_set(False)

    if obj.data.materials:
        mat = obj.data.materials[0]
    else:
        mat = bpy.data.materials.new(f"{prefix}_material")
        obj.data.materials.append(mat)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Metallic"].default_value = 0.65
        bsdf.inputs["Roughness"].default_value = 0.32

bpy.ops.object.select_all(action="DESELECT")
for obj in parts:
    obj.select_set(True)
bpy.context.view_layer.objects.active = parts[0]

glb_path = OUT_DIR / "chair_parametric.glb"
stl_path = OUT_DIR / "chair_manufacturing.stl"
obj_path = OUT_DIR / "chair_manufacturing.obj"

bpy.ops.export_scene.gltf(
    filepath=str(glb_path),
    use_selection=True,
    export_format="GLB",
    export_apply=True,
)

bpy.ops.wm.stl_export(
    filepath=str(stl_path),
    export_selected_objects=True,
    apply_modifiers=True,
)

bpy.ops.wm.obj_export(
    filepath=str(obj_path),
    export_selected_objects=True,
    apply_modifiers=True,
)

print("EXPORT_DONE")
print(glb_path)
print(stl_path)
print(obj_path)

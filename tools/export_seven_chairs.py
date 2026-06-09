from pathlib import Path

import bpy


OUT = Path("/Users/qing/Desktop/数字艺术实践/定制网站_副本2/assets/seven_chairs_textured.glb")
OUT.parent.mkdir(parents=True, exist_ok=True)

bpy.ops.object.select_all(action="DESELECT")
meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]

for obj in meshes:
    obj.select_set(True)

bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.export_scene.gltf(
    filepath=str(OUT),
    use_selection=True,
    export_format="GLB",
    export_apply=True,
    export_materials="EXPORT",
    export_image_format="AUTO",
    export_texcoords=True,
    export_normals=True,
)

print(f"EXPORTED {len(meshes)} mesh objects to {OUT}")

from pathlib import Path

import bpy
from mathutils import Vector


OUT = Path("/Users/qing/Desktop/数字艺术实践/定制网站_副本2/assets/custom_components.glb")
BODY_NAME = "椅身"
BACK_NAMES = [f"背部{index}" for index in range(1, 7)]
BACK_FINE_TUNING = {
    "背部2": (0.0, 0.0, -0.04),
    "背部5": (0.0, 0.07, 0.0),
}

bpy.ops.object.select_all(action="DESELECT")
body = bpy.data.objects[BODY_NAME]
export_objects = []

for source in [body, *[bpy.data.objects[name] for name in BACK_NAMES]]:
    duplicate = source.copy()
    duplicate.data = source.data.copy()
    bpy.context.collection.objects.link(duplicate)
    duplicate.name = "custom_body" if source == body else f"custom_back_{BACK_NAMES.index(source.name) + 1}"

    if source != body:
        world_corners = [duplicate.matrix_world @ Vector(corner) for corner in duplicate.bound_box]
        geometry_center_x = (min(point.x for point in world_corners) + max(point.x for point in world_corners)) * 0.5
        duplicate.location.x += body.location.x - geometry_center_x
        duplicate.location += Vector(BACK_FINE_TUNING.get(source.name, (0.0, 0.0, 0.0)))

    duplicate.select_set(True)
    export_objects.append(duplicate)

bpy.context.view_layer.objects.active = export_objects[0]
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

print(f"EXPORTED {len(export_objects)} custom components to {OUT}")

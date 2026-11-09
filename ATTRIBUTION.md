# Third-party asset attribution

## Conveyor Transfer Station — `conveyor_belt_a61`

- **Author:** NVIDIA (SimReady Assets)
- **Licence:** Creative Commons Attribution 4.0 International (CC BY 4.0) — https://creativecommons.org/licenses/by/4.0/
- **Original source:** https://huggingface.co/datasets/nvidia/simready-assets/tree/main/conveyor_belt_a61 (CC BY 4.0)
- **GLB conversion used:** CodePawl, "SimReady GLB": https://huggingface.co/datasets/codepawl/simready-glb (CC BY 4.0). File `engine/conveyor_belt_a61/conveyor_belt_a61.glb`, SHA-256 `7fbbf782b1a768e0d58be383508318fd83e809b2bc2c8fe30c9284050d9135ec`, as downloaded on 2026-11-08. CodePawl's dataset card asks users to credit NVIDIA as the original author and link the source dataset.

### Changes made for FlowSight

- Geometry simplified with glTF-Transform 4.1.1 (`simplify --ratio 0.08 --error 0.0005`): 1,143,281 → 168,179 triangles.
- Removed the `KHR_physics_rigid_bodies` extension and 88 empty physics joint helper nodes (`prune --keep-leaves false`).
- Imported into Lens Studio 5.24.1 as an unpacked prefab (`Assets/Models/Conveyor/conveyor_belt_a61_specs/`).
- Textures resized for performance on glasses: decal and screen colour/emissive maps kept at 1024 px; trim, belt and decal material maps at 512 px; generic material maps at 256 px.
- Materials and named parts (rollers, buttons, glass, frame) are otherwise unchanged.

Conveyor model by NVIDIA, licensed under CC BY 4.0, converted to GLB by CodePawl. Modified for this project.

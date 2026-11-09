# Third-party notices

FlowSight includes the third-party materials below. Each stays under its own licence; nothing here relicenses it.

## 1. NVIDIA SimReady `conveyor_belt_a61` (3D model)

| | |
|---|---|
| Author | NVIDIA (SimReady Assets) |
| Source | https://huggingface.co/datasets/nvidia/simready-assets |
| Converted to GLB by | CodePawl, https://huggingface.co/datasets/codepawl/simready-glb |
| Licence | CC BY 4.0, https://creativecommons.org/licenses/by/4.0/ (source and conversion) |
| Location in repo | `Assets/Models/Conveyor/conveyor_belt_a61_specs/` |
| Modified | Yes. See [`ATTRIBUTION.md`](ATTRIBUTION.md) for the exact changes. |

**Redistribution.** CC BY 4.0 allows sharing and adapting the model, including commercially, as long as you:
- give appropriate credit,
- link the licence, and
- say that changes were made.

This repository does all three in this file, in `ATTRIBUTION.md` and in the README. If you reuse the model from this repo, keep the same credit: "Conveyor model by NVIDIA, licensed under CC BY 4.0, converted to GLB by CodePawl. Modified for FlowSight."

## 2. Snap Lens Studio packages

| Package | File |
|---|---|
| Spectacles Interaction Kit | `Packages/SpectaclesInteractionKit.lspkg` |
| Spectacles UI Kit | `Packages/SpectaclesUIKit.lspkg` |
| Icons | `Packages/Icons.lspkg` |
| Motion | `Packages/Motion.lspkg` |

- **Copyright:** Specs Inc. (Snap).
- **Terms:**
  - Lens Studio License Agreement: https://snap.com/en-US/terms/lens-studio-license-agreement
  - Specs Developer Terms: https://snap.com/en-US/terms/developer
- **Why they're included:** the Lens Studio project needs these packages to open and run. Snap's own public SPECS sample projects ship the same packages inside their repos. The packages carry no separate licence file. They are covered by Snap's terms above, not by any licence in this repository.

## 3. Google Material Symbols (icons)

- **Files:** `Assets/Icons/*.png`. Rasterised in Lens Studio with the CLAD `IconSelector` tool.
- **Icons used:** `check_circle`, `radio_button_unchecked`, `warning`, `search`, `play_arrow`.
- **Source:** https://fonts.google.com/icons
- **Licence:** Apache License 2.0, https://www.apache.org/licenses/LICENSE-2.0

## 4. Lens Studio template assets

The Specs Base Template supplied some project files:
- `Assets/Render/` (device camera texture, render target, `Echopark.hdr` environment map)
- the default materials and shaders in `Assets/Materials/` (`Image.png`, `Base.png`, `*.graphShader`)

These are part of Lens Studio and are covered by the Lens Studio License Agreement above.

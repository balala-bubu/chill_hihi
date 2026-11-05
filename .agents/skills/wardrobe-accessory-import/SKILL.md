---
name: wardrobe-accessory-import
description: Import and fit dog wardrobe accessories in chill_hihi using the existing Collada conversion pipeline, without rebuilding the interaction system. Use when asked to add hats, glasses, collars, or additional wearable accessories.
---

# Dog accessory import (token-efficient)

## Read only these files
1. `models/wardrobe/slots.json` (bone attachment presets)
2. `models/wardrobe/src/<item-id>/item.json` (item metadata; if present)
3. `tools/build_wardrobe.py` only when conversion errors occur
4. The `wEquip`, `wLayout`, and `wardFrame` functions in `index.html` only when changing runtime behavior.

Avoid reading all of `index.html`, all meshes, texture bytes, or the entire dog animation code for routine imports.

## One-pass procedure
1. Copy a new `<name>.dae` plus its referenced image into `models/wardrobe/inbox/`.
2. Run `python3 tools/build_wardrobe.py --check` to validate inputs; run `python3 tools/build_wardrobe.py` to archive, convert meshes/textures, and regenerate `manifest.json`.
3. Check the new `models/wardrobe/src/<id>/item.json` and set the intended `slot`, `name`, and optional `fit` (`pos`, `rot`, `scale`). Use the model's real id, not a filename guessed from product name.
4. Only change `slots.json` if the **entire class** of accessories needs a different bone or baseline. For one item, change `item.json.fit`, not a global slot. Regenerate after changes.
5. Run `python3 tools/validate_wardrobe.py` and check that every slot, mesh, and referenced texture is valid. Keep IDs unique.
6. Test exactly the affected slot in the browser: front, side, head-turning, idle, sit, lie-down, click-to-remove, drag-to-rewear, and reload persistence. Ensure no geometry intersects the face/neck; a passing JSON validator does not prove visual clearance.
7. Publish only after the targeted visual pass. If visual inspection is unavailable, say so; do not claim clipping is fully resolved.

## Geometry + fitting conventions
- Coordinate system: Three.js Y-up. Importer converts Collada Z-up to Y-up.
- `slots.json` stores `bone`, baseline `worn.pos`, `worn.rot` (Euler XYZ or quaternion [x,y,z,w]), `worn.scale`, and `display` defaults.
- Runtime item `fit` is applied **inside** the slot transform: `fit.pos` and `fit.rot` act in local model coordinates; `fit.scale` multiplies within the slot group.
- Prefer moving glasses outward along the dog's snout-facing axis rather than scaling them excessively; align bridge at the nose and lenses in front of the eyes. Check ears during head turns.
- Collar should follow the neck bone and encircle neck fur with a small clearance. Adjust axial displacement and uniform scale before changing quaternion. Avoid giant scales that float off the neck.
- Mesh bbox units differ across exports. Never copy a fit across models without checking bounds and axis orientation.
- One item per slot is worn at a time. Keep drag-to-equip and single-item recycle usable.
- Cabinet is **open-front**, with left/right page buttons and scroll-wheel fallback; never reintroduce a door.

## Definition of done
- Import and regeneration succeed; validation script exits 0.
- No broken models, missing textures, duplicate ids, or invalid slot references.
- Accessory can be selected using arrows and dragged to the dog, removed independently, and equipped state persists after reload.
- Browser visuals are checked from multiple directions and dog poses, or explicitly marked **not visually verified**.

## Screenshot-based sizing correction (2026-11-05)
- User verified the cyan **collar is correctly fitted**; preserve collar configuration exactly when fixing glasses.
- User explicitly corrected a mistaken diagnosis: **the 3D glasses are too small overall**, NOT too large. Do not reduce `glass_c` scale for this case.
- Current trial fit for `glass_c`: `fit.scale = 1.3`, `fit.pos = [0, 0.2, 0.65]`. This is pending in-browser visual validation.
- Evaluate width/height (lens coverage over each eye) separately from depth (avoid intersections with eyes and nose); do not assume scaling alone prevents clipping.
- Update BOTH source `models/wardrobe/src/glass_c/item.json` and generated runtime `models/wardrobe/manifest.json` (regenerate using `tools/build_wardrobe.py` if available); the site loads only the manifest. Compare the effective fit fields before declaring the change visible.
- For every new accessory, first assess actual screenshot fit and state whether the problem is **too small**, **too large**, **position**, or **rotation**, then adjust per-item `fit` before modifying shared slot defaults.
- Preserve unrelated components and user changes: branch from latest main, no force push, inspect file-only diff before requesting merge. A passing static check does not replace visual proof.

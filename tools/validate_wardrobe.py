#!/usr/bin/env python3
"""Static checks for the generated dog wardrobe; no external Python dependencies."""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "models" / "wardrobe"
errors = []


def check(condition, message):
    if not condition:
        errors.append(message)


def vector(value, length, name):
    check(isinstance(value, list) and len(value) == length and
          all(isinstance(x, (int, float)) and math.isfinite(x) for x in value), name)


def load(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        errors.append(f"{path}: {exc}")
        return {}


manifest = load(ROOT / "manifest.json")
source = load(ROOT / "slots.json")
slots = manifest.get("slots", [])
items = manifest.get("items", [])
slot_ids = [s.get("id") for s in slots]
item_ids = [i.get("id") for i in items]
check(len(slot_ids) == len(set(slot_ids)), "Duplicate slot id")
check(len(item_ids) == len(set(item_ids)), "Duplicate item id")
check(slots == source.get("slots", []), "Generated manifest slots differ from slots.json; regenerate")

for slot in slots:
    sid = str(slot.get("id"))
    check(bool(slot.get("bone")), f"{sid}: missing bone")
    worn = slot.get("worn", {})
    vector(worn.get("pos"), 3, f"{sid}: worn.pos must have 3 finite numbers")
    check(isinstance(worn.get("rot"), list) and len(worn["rot"]) in (3, 4) and
          all(isinstance(x, (int, float)) and math.isfinite(x) for x in worn["rot"]),
          f"{sid}: worn.rot must have 3 or 4 finite numbers")
    check(isinstance(worn.get("scale"), (int, float)) and 0 < worn["scale"] < 1000,
          f"{sid}: invalid worn.scale")
    display = slot.get("display", {})
    check(isinstance(display.get("size"), (int, float)) and display["size"] > 0,
          f"{sid}: invalid display size")
    vector(display.get("rot"), 3, f"{sid}: display.rot must have 3 finite numbers")

for item in items:
    iid = str(item.get("id"))
    check(item.get("slot") in slot_ids, f"{iid}: unknown slot {item.get('slot')}")
    for field in ("mesh", "tex"):
        rel = item.get(field, "")
        check(bool(rel) and not Path(rel).is_absolute() and ".." not in Path(rel).parts,
              f"{iid}: unsafe or empty {field}")
        if rel:
            check((ROOT / rel).is_file(), f"{iid}: missing {field} {rel}")
    mesh = ROOT / item.get("mesh", "")
    if mesh.is_file():
        model = load(mesh)
        bbox = model.get("bbox")
        check(isinstance(bbox, list) and len(bbox) == 2, f"{iid}: invalid bbox")
        if isinstance(bbox, list) and len(bbox) == 2:
            vector(bbox[0], 3, f"{iid}: bbox min")
            vector(bbox[1], 3, f"{iid}: bbox max")
        for field in ("pos", "nor", "uv", "idx"):
            check(isinstance(model.get(field), list) and len(model[field]) > 0,
                  f"{iid}: missing geometry {field}")
    fit = item.get("fit") or {}
    if "pos" in fit:
        vector(fit["pos"], 3, f"{iid}: fit.pos")
    if "rot" in fit:
        check(isinstance(fit["rot"], list) and len(fit["rot"]) in (3, 4),
              f"{iid}: fit.rot")
    if "scale" in fit:
        check(isinstance(fit["scale"], (int, float)) and fit["scale"] > 0,
              f"{iid}: fit.scale")

if errors:
    print("Wardrobe validation FAILED")
    for error in errors:
        print(" -", error)
    raise SystemExit(1)
print(f"Wardrobe OK: {len(slots)} slots, {len(items)} items")

# NOVA Desktop Pet Character MOD Package Specification (v1.0.0)

## Architecture Overview
The NOVA Desktop Pet Engine (`nova-pet-engine.ps1` and `nova.ps1`) uses a modular, skeletal character MOD pack system.
Characters are composed of versioned manifests, body part slice SVG assets, and frame-by-frame animation timelines.

## Directory Structure & Manifest Schema

```text
public/assets/nova-character/
├── manifest.json                  # MOD Package Manifest
├── NOVA_MOD_SPEC.md               # Specification & Asset Hash Documentation
└── parts/                         # Body Slices SVG Assets
    ├── head.svg
    ├── body.svg
    ├── arm_left.svg
    ├── arm_right.svg
    ├── leg_left.svg
    ├── leg_right.svg
    ├── eyes_normal.svg
    ├── eyes_working.svg
    ├── eyes_error.svg
    └── crown_star.svg
```

## Joint / Slot Hierarchy Table

| Slot ID | Render Order (Z-Index) | Purpose |
| :--- | :--- | :--- |
| `crown_star` | 100 | Halo / Crown Accessory above head |
| `head` | 90 | Character Head Slices (contains face) |
| `eyes_*` | 95 | Eye Expression Layer |
| `arm_left` | 80 | Left Arm (Rotatable Pivot) |
| `arm_right` | 80 | Right Arm (Rotatable Pivot) |
| `body` | 70 | Main Torso / Clothing Silhouette |
| `leg_left` | 60 | Left Leg |
| `leg_right` | 60 | Right Leg |

## Asset File SHA-256 Hash Registry

| File | SHA-256 Hash | License |
| :--- | :--- | :--- |
| `manifest.json` | Calculated dynamically on load | CC-BY-4.0 / MIT |
| `parts/head.svg` | Verified by Pet Engine | CC-BY-4.0 / MIT |
| `parts/body.svg` | Verified by Pet Engine | CC-BY-4.0 / MIT |

## Fallback & Recovery Specification
If a user installs a third-party MOD pack that is missing required slots or has corrupt JSON:
1. `nova-pet-engine.ps1` detects the missing slot/JSON parse error.
2. The engine safely falls back to `public/assets/nova-character/manifest.json` (Default Chibi Purple MOD) without crashing the WPF window.

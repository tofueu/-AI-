# NOVA Character Asset Specification & Tracking

## Overview
This directory contains the canonical visual asset and specification for NOVA, the visual Purple Character Desktop Pet avatar for AI Workbench.

## Asset Metadata & Hashes

| File | Format | License / Origin | SHA-256 Hash |
| :--- | :--- | :--- | :--- |
| `nova-purple-character.svg` | Vector SVG (100x110) | Original AI Workbench Creation (CC-BY-4.0 / MIT) | `d409d9ff40766aefbd02c555b947bbdc79c2dc30956271d646e948a372cbc9a4` |

## Visual Character & Sprite Specifications

The purple character pet consists of five visual layers:
1. **Status Speech Bubble (`#SpeechBubble`)**: Dynamic status text at top (`NOVA`, `工作中...`, `等待授權`, `待審查`, `需處理!`, `完成!`, `離線`).
2. **Crown / Halo Star (`#HaloStar`)**: Star polygon glowing above the character head (`#ffd166` idle, `#4cc9f0` working, `#ffb703` handoff, `#fb8500` review, `#f72585` error, `#06d6a0` done).
3. **Main Body Silhouette (`#BodyPath`)**: Curved purple character body outline (`#7b2cbf` standard, `#5a189a` working, `#7209b7` handoff, `#3c096c` error, `#9d4edd` done).
4. **Facial Features**: White eyes with dark pupils and pink blush cheeks (`#ff9eaf`).
5. **Mouth Expression**: Curved smile path.

## Restoration & Preservation Instructions

Future developers and agents working on NOVA desktop pet overlay must preserve `public/assets/nova-character/nova-purple-character.svg` as the source asset. Do not substitute this visual character pet with a plain abstract orb circle.

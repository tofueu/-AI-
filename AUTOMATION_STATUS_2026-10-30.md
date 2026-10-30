# Current status and acceptance plan

## Published state
Remote PR #21 is at `edcd62c12f77b8640a422a8a9145bf674d48e9f1`. It contains a WPF workbench wrapper, local task API, account-slot UI, connection-state controls, PowerShell regressions, and a small status overlay.

## Not accepted
The current `nova-purple-character.svg` / PowerShell overlay is a static purple icon, not a real person pet. It contains no mature or chibi character, no jointed layers, no animation timeline, no saved original storyboard, and no installable character MOD.

## Required next delivery
1. Implement a movable transparent Windows pet window with real animated character states.
2. Define a versioned character MOD manifest, asset hashes, licensing metadata, joint/slot schema, layer validation and safe fallback.
3. Deliver separate mature and chibi character packages with body parts and animation timelines; do not claim the lost original assets were restored.
4. Run automated loading/fallback tests and Windows evidence; publish exact SHA/PR. Do not change main or auto-merge.

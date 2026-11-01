# NOVA desktop pet core (experimental)
This is an additive, host-independent module. It does NOT replace the current Workbench, does NOT delete GIFs, and does NOT yet render a Windows window or rig official artwork.

## Architecture
Workbench task events -> resolvePetState -> NovaPetController -> renderer adapter.
Renderer adapter may use sprite frames or skeletal keyframes. User MOD manifests are validated before loading.
The official Q-version artwork must be separately rigged into independently movable parts (head, hair, torso, upper/lower arms, hands, skirt, legs, boots, companion cat); do not regenerate or redraw the character identity.

## License references
- https://github.com/sereinmono/dsh-desktop-pet (MIT): architecture, state-driven pet packs
- https://github.com/Sutera-Diffusus/dsh-whale-musume (MIT): interaction and quiet-work behavior
No upstream source code or artwork is copied into this initial module.

## Test
node --test nova/pet-core.test.js

## Not yet implemented
Actual transparent Windows overlay; official Q-version image segmentation and bone binding; physics/inertia; secure MOD import UI; integration with Workbench runtime; Windows validation. All prior NOVA assets must remain intact until user approval.

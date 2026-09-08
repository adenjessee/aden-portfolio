# Avatar model

Ready Player Me shut down in January 2026. The supported path is VRM 1.0.

## Make Aden (or yourself)

1. Install [VRoid Studio](https://vroid.com/en/studio) (free).
2. Build a stylized figure: glasses, hair, ordinary clothes. Do not chase photorealism.
3. Fill license metadata. You own the likeness.
4. Export VRM 1.0 with visemes `aa ih ou ee oh`, blink, and lookAt.
5. Save as `public/models/aden.vrm`.

Optional: a $7.99 VTubeMe pass for a likeness reference, then restyle in VRoid so you stay out of the uncanny valley.

## Animations

v1 uses a procedural humanoid FSM (`src/avatar/AnimationController.ts`). Mixamo clips are optional. Drop FBX into `raw-animations/` and run `npm run retarget-mixamo` for the conversion notes. The bone contract does not change.

## Placeholder

`public/models/placeholder.vrm` is a public sample from the pixiv three-vrm examples, used only until the personal export exists. Replace it before calling this site finished in public.

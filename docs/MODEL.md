# Avatar model: anime-style Aden in a TRON suit

The site loads `public/models/aden.vrm` if it exists, otherwise the sample model. Anything that exports VRM 1.0 works: the code relies only on the VRM contract (humanoid bones, the five mouth shapes `aa ih ou ee oh`, blink, look-at).

The stage is already built for a TRON suit: a near-black room, cyan and violet rim lights that outline a dark suit, a glowing grid floor, and bloom set so only emissive parts glow. Paint the suit's lines as emissive and they light up (`src/avatar/loadVrm.ts` boosts emissive intensity past the bloom threshold).

## Step 0. Nail the look before modeling (30 minutes)

Collect 4 to 6 photos of yourself: front, three-quarter, side, usual hair. Note hair color and cut, brow shape, eye color, skin tone, glasses or not, jaw and face shape. Then make 3 to 5 concept images of you in anime style wearing the suit (Claude can generate these with you from your photos). Pick one; every later step is "match the concept".

The suit in one sentence: a fitted near-black bodysuit (`#0a0d12`) with thin cyan (`#28e1ff`) light lines tracing the shoulders, chest seam, outer arms and outer legs, a glowing disc on the back, matte panels, no logos.

## Path A. Build it in VRoid Studio (free, an evening or two)

1. Install VRoid Studio (v2 exports VRM 1.0). New model, masculine base.
2. **Face:** match eyes, brows, nose, mouth and jaw to your front photo. Keep it anime; aim for "recognizably you" at a glance. Check the three-quarter view as often as the front.
3. **Hair:** use the hair editor with guides. Match the silhouette first, then the color. Turn on hair physics so it moves when the avatar gestures.
4. **Suit:** start from fitted tops, bottoms and shoes. In each texture editor:
   - base layer: near-black with subtle panel shading
   - a separate layer: the cyan lines, 4 to 8 px wide on a 2048 texture, following the seams
   - export that line layer alone as `suit-lines.png` (cyan lines on black) for step 5
5. **Make the lines glow:** if your VRoid version lets you set an emission texture, use `suit-lines.png`. If not, open the exported VRM in Blender with the VRM add-on (saturday06/VRM-Addon-for-Blender), set each suit material's MToon emissive texture to `suit-lines.png` and the emissive factor to white, and export VRM 1.0 again.
6. **Export:** VRM 1.0, texture atlas 2048 (1024 if the file is over 8 MB), keep blend shapes. Fill in the license fields: you, all rights reserved, no redistribution.
7. Save it as `public/models/aden.vrm`, run `npm run dev`, and open `/ask`.

## Path B. Commission it ($150 to $600, one to two weeks)

Search VGen, Booth or Fiverr for "custom VRoid model" or "VRM avatar commission". Send:

- the photos and the chosen concept image
- the suit sentence and colors above
- the deliverable: VRM 1.0, MToon shading, emissive suit lines on their own texture, the five visemes plus blink and the standard expressions (happy, angry, sad, relaxed, surprised), hair spring bones, under 10 MB, full rights for your own use
- one revision round after you test it on the site

## Refinement loop (either path)

Check in `/ask` on desktop and phone, and fix one thing per round:

1. **Silhouette:** hair and shoulders should read as you as a dark shape in a dark room. The rim lights sell this.
2. **Face at small size:** on a phone the head is about 200 px tall. Eyes and brows carry likeness at that size.
3. **Glow:** lines glow, panels don't. If the whole suit blooms, the base texture is too bright; if the lines don't glow, the emission texture isn't set.
4. **Talking:** ask a long question and watch the mouth. Wrong shapes are fixed in the model's blend shapes, not the code.
5. **Weight:** under 8 MB loads in about 2 to 3 seconds on a good connection; the 10 MB sample takes 8.
6. **Poster:** screenshot the finished avatar for `public/avatar-poster.svg` (or a PNG) and the OG image, so LinkedIn previews show the real thing.

## Animations

Gestures are procedural poses on a rest pose (`src/avatar/AnimationController.ts`). For more life, convert Mixamo clips (idle breathing, talking hands, nod) to VRMA; `npm run retarget-mixamo` has the notes. That's later polish; face and voice matter more.

## The file

`public/models/aden.vrm` is gitignored so a work-in-progress model is never published by accident. When you're happy with it, remove that line from `.gitignore` and commit it, or host it on R2 and point `VRM_CANDIDATES` at the URL.

## The match loop (photos vs. model)

`npm run avatar:compare -- ~/Documents/me.vrm` cuts the backgrounds out of the photos in `private/avatar/photos/` (Apple Vision, on device, once per photo), renders the VRM in Blender from the same angles, and writes `private/avatar/compare_head.png` (photos on top, model below) and `compare_body.png`. Export from VRoid, run it, fix one thing, repeat. Needs Blender 4.5 with the VRM add-on and `uv`.

### Aden's targets (from the 2026-11-03 photos)

**Hair.** Short, textured, dark brown. Roughly 2.5 to 3 inches on top, shorter at the sides, tapered at the nape.
- Color: base `#3d2f25`, shadow `#241b15`, a faint highlight `#5a4a3c`. Not orange: the default light brown reads as a different person.
- Top: lifted at the roots, pieces pushed up and back, then falling forward and slightly to his right. No smooth helmet dome; the silhouette is a little taller than wide.
- Fringe: loose, uneven pieces that reach the brow on the side profiles and leave the forehead partly showing from the front. Never a straight-across bowl line.
- Sides: short and close to the head. The ears are fully visible; nothing covers them.
- Back: follows the skull and tapers into the neck. The hairline at the nape is natural, not a poof.

**Face and skin.** Square, strong jaw and chin; wide neck; light stubble on the jaw and upper lip (paint it in the face texture at low opacity). Skin light and warm (`#edc9a5` lit), not pink. Eyes grey-green.

**Body.** Adult build, not teen: smaller head relative to body, thicker neck, broader shoulders, fuller chest and arms. Height: Aden's real height.

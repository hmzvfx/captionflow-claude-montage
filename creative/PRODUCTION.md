# Production Rules

These are delivery constraints, not scene templates.

## Default master

- 1080 × 1920
- 9:16
- 60 fps for code-driven motion unless the supplied footage or delivery requirement makes 30 fps more appropriate
- social-safe composition for Reels, TikTok and YouTube Shorts
- keep essential information away from extreme top/bottom UI zones

## Duration

Do not force a fixed runtime.

For most organic Captionflow pieces, prefer a compact idea that earns every second. A 10–20 second video is often stronger than stretching the same concept to 30 seconds.

## Rendering stack

When no project exists, prefer:
- Remotion
- React
- TypeScript
- CSS/SVG/canvas/vector-first visual construction

Use raster assets only when they add real value. Rebuild interface fragments as crisp code-driven components where practical.

## Architecture

A clean video project should usually separate:
- composition entry
- scenes/beats
- reusable Captionflow UI primitives
- motion helpers/easing
- design tokens
- local media/assets

Do not build an abstract design-system framework so large that it slows down one video.

## Animation quality

- use deterministic frame-based timing
- avoid browser-only interaction assumptions in rendered video
- test first and last frame of every transition
- avoid accidental subpixel softness on thin 1px elements
- keep major UI/type crisp after transform settles
- prefer GPU-friendly transform/opacity animation where possible

## Product-like motion cues

The current Captionflow product already uses:
- transform/opacity-based motion
- subtle blur during entrances
- scroll/depth transforms
- small controlled springs
- violet/blue radial atmosphere
- animated playhead and active caption states
- restrained 3D perspective on hero UI

These are legitimate ingredients. They are not mandatory scene recipes.

## Audio

Unless the prompt requests silence, design with sound in mind even if the initial implementation is visual-first.

Good motion should create obvious sync points for:
- subtle impacts
- UI ticks
- whooshes
- low sub hits
- clean digital transitions

Do not cover every animation with a sound effect.

## QA pass

Before final render:
1. Preview at actual phone-size scale.
2. Verify all text is readable.
3. Check the first second without audio.
4. Check that there is no dead frame between beats.
5. Remove any motion that does not direct attention.
6. Check gradients for banding and overexposure.
7. Confirm brand colors remain accurate.
8. Confirm no fake product claim or fake UI data was introduced.
9. Confirm the ending feels resolved.
10. Export a clean master without editor overlays.

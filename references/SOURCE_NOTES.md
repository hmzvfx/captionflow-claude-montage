# Source Notes

This repository was derived from the current Captionflow product source, not from generic SaaS references.

## Product source inspected

Repository: `hmzvfx/captionflowV1.1`

Relevant current source areas:
- `app/globals.css`
- `components/landing/Hero.tsx`
- `components/landing/LandingEditorDemo.tsx`
- `components/landing/EditorShowcase.tsx`
- `components/landing/LandingMotionScene.tsx`
- `lib/captions/style/signature-gradients.ts`
- `UX_REDESIGN_AUDIT.md`

## Signals intentionally preserved

### Visual
- near-black product and landing backgrounds
- dark translucent panel system
- thin white borders
- violet/blue active states
- restrained pink as a gradient endpoint
- crisp white display typography
- SF-style system font stack
- tight display tracking
- subtle background point/grid language
- minimal but purposeful glow

### Product
- editor-stage composition
- compact right-side control language
- captions/style/export mental model
- timeline and playhead vocabulary
- word-level caption emphasis
- focused editing workspace rather than generic analytics dashboard imagery

### Motion
- `cubic-bezier(0.16, 1, 0.3, 1)`-style premium easing
- transform and opacity first
- blur mainly during transition
- restrained perspective
- controlled scroll/depth behavior
- small spring interaction rather than playful bounce

## What is deliberately NOT copied

- exact landing page section layouts
- exact hero composition
- exact desktop viewport proportions
- repeated screenshot recreations
- scene timing from the website

The goal is to preserve Captionflow's authorship while allowing new creative direction for every video.

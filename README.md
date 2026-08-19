# Captionflow Motion System

This repository is the creative source of truth for code-driven Captionflow motion design.

It does **not** prescribe scene-by-scene templates. Its purpose is to give Claude enough of Captionflow's real visual DNA to create original work that feels native to the product, while preserving creative freedom.

## Creative target

Every output should feel like the Captionflow product interface has been translated into motion: dark, precise, premium, spatial, restrained, fast and readable.

Quality bar: contemporary product-film craft associated with Apple-level restraint and Vercel-level digital precision, without copying either brand.

## Read before creating

Claude should read these files in order:

1. `CLAUDE.md`
2. `creative/BRAND.md`
3. `creative/UI_LANGUAGE.md`
4. `creative/MOTION.md`
5. `creative/VIDEO_DIRECTION.md`
6. `creative/PRODUCTION.md`
7. `creative/ANTI_SLOP.md`
8. `tokens/captionflow.json`

## Core principle

**Consistency lives in the design language, not in repeated compositions.**

Keep the visual identity stable. Vary the storytelling, layouts, transitions, camera language and motion ideas from video to video.

## Default output

- Vertical short-form: 1080 × 1920
- Social-first framing for Instagram Reels, TikTok and YouTube Shorts
- Fast pacing with immediate visual information
- Minimal copy
- No voice-over unless a prompt explicitly asks for it
- Product/UI motion should carry the story
- All important text and UI must remain readable on a phone

## Repository structure

- `creative/` — permanent art direction and production language
- `tokens/` — machine-readable Captionflow visual constants
- `references/` — provenance and product-source notes
- `prompts/` — lightweight prompting guidance
- `videos/` — one self-contained implementation folder per generated video
- `assets/` — shared assets only when a project actually needs them

## Source

The system was derived from the current `hmzvfx/captionflowV1.1` product source: landing design tokens, authenticated workspace language, Captionflow Signature gradients, editor presentation and existing Framer Motion behavior. It intentionally compresses those signals into reusable art direction instead of copying application code into every video.
# 2026-08-09 A01 — Owner-selected Home hero preview

## Scope

- A01 Home-page implementation.
- Use the owner's latest attached image directly as the Home hero, without further AI editing, cropping, resizing, color conversion, or recompression.
- Preserve the existing Home copy, CTA, desktop layout, and decorative-image accessibility contract.
- Move only the mobile photo focal point so the teacher and boy are shown without the girl.

## Baseline

- Isolated worktree: `/Volumes/Starship/MAIS-home-hero-wt`
- Branch: `codex/a01-home-hero-chromebook`
- Baseline: `origin/main` at `758ebed96cd279c733574e0e0753d72f95bf3ddf`
- Owner-selected attachment: `/var/folders/zr/vf0vw1p93rd19t00wbxpmnnh0000gn/T/codex-clipboard-25b1b270-d0a7-4fe1-9212-10116daceb51.png`

## Changes

- Added the attachment byte-for-byte as `components/home/brand-assets/pedanova-home-background-20260809-owner-selected-white-stylus.png`.
- Updated the single static hero import in `components/home/PedaNovaHomeHero.tsx`.
- Changed the mobile-only background position from `78% 0` to `92% 0`; desktop positioning is unchanged.
- Did not change the Hero's text, CTA, image asset, desktop crop rules, or accessibility attributes.

## Asset acceptance

- Final project asset: PNG, 1842x854, 2,066,574 bytes.
- Attachment and project asset SHA-256: `d6948dc05110a84a859207727f1ae8642a9612321fb0021a34ae5a49f8bc9889`.
- Built static-media copy has the same SHA-256, proving the source asset was not altered during the production build.
- Browser visual review passed at 1916x869, 1440x900, and 390x844.
- Desktop views keep the white stylus, girl, teacher, boy, tablet, and Chromebook visible without placing copy over a face.
- Mobile uses a `92% 0` focal position: the girl is outside the crop, while the teacher and boy's faces, the boy's hands, and the Chromebook remain visible.

## Verification

- `npm run type-check` — passed.
- `npm run build` — passed; 236/236 static pages generated.
- Production DOM checks at 1916x869, 1440x900, and 390x844 — hero visible, owner-selected asset loaded, zero page errors, decorative `alt=""`/`aria-hidden="true"` preserved, CTA remains `/login`, and no horizontal overflow.
- Final production probe at 390x844 confirmed the mobile layer is visible with computed `background-position: 92% 0px`; the 1440x900 probe confirmed the mobile layer remains hidden on desktop.
- `git diff --check` — passed.

## Handoff

- Owner authorized committing and pushing this exact A01 package to GitHub on 2026-08-09.
- GitHub delivery target: branch `codex/a01-home-hero-chromebook`; package pathspecs are this session log, `components/home/PedaNovaHomeHero.tsx`, and the owner-selected PNG only.
- The isolated worktree remains available for review. No merge to `main` and no deployment were authorized or performed.
- Preview screenshots are under `/Users/dongpinhu/.codex/visualizations/2026/08/08/019fe1c5-8294-7c90-bd43-dc199712bc94/`.

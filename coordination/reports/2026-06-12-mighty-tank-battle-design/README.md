# Mighty Tank Battle Design Notes

- Date: 2026-06-12
- Session: S20
- Chinese title: 威猛坦克大战
- English title: Mighty Tank Battle
- Status: hidden draft route only; not linked from live navigation.

## Image References

- `desktop-reference.png`: owner-designed desktop UI reference.
- `mobile-reference.png`: owner-designed mobile UI reference.
- `desktop-browser-smoke.png`: implemented desktop browser smoke screenshot.
- `mobile-browser-smoke.png`: implemented mobile browser smoke screenshot.
- `desktop-asset-browser.png`: browser verification after the route was refactored to use the owner-designed desktop PNG as the scene asset.
- `mobile-asset-browser.png`: browser verification after the route was refactored to use the owner-designed mobile PNG as the scene asset.

## Project Asset Copies

- `/public/games/mighty-tank-battle/desktop-reference.png`
- `/public/games/mighty-tank-battle/mobile-reference.png`

These copies are the draft route's primary visual assets. The React layer adds transparent interaction hotspots over the artwork instead of redrawing the UI with CSS.

## Extracted Direction

- Layout: full-screen top-down battle arena, top HUD for time/base HP/kills/coins, side mission panel on desktop, bottom controls on arena.
- Mobile: compact top HUD, large bottom controls, math challenge as a large bottom sheet with three answer buttons.
- Palette: deep navy and steel battlefield, cyan player accents, red enemy accents, amber coins and correct-hit energy.
- Gameplay loop: fire at enemy, answer math to confirm hit quality, then receive damage/coins/combo/cooldown changes.
- Power-ups: repair, piercing shell, boost, and stealth are visible local inventory actions.
- Publishing boundary: no homepage, practice page, student game registry, API, or real reward wiring.

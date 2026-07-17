# Practice Adaptive Mission Asset Package

This directory is the landing zone for layered assets used by the Practice Arena adaptive mission card.

## Current Status

The requested Figma plugin workflow could not be completed in this Codex session because no callable Figma MCP tools (`whoami`, `create_new_file`, `use_figma`, or export helpers) were exposed to the agent. The files currently in this directory are a local vector reconstruction of the supplied screenshot, exported into the same package structure that a real Figma export should use.

When the Figma source file or working MCP tools are available, replace only the PNG/SVG asset files and keep `asset-manifest.json` as the coordinate contract unless the frame dimensions change.

## Figma Export Source

Duplicate the original design frame and name the copy `Practice Mission Export`. Export from the copied frame only.

Target design dimensions:

- Mission card reference viewport: `1600 x 1019`
- Mission card target size: `1496 x 918`
- Route map asset coordinate space: `1440 x 410`

## Required Figma Exports

Export these files from Figma into this directory:

- `map-base.svg`: editable vector source for terrain, contour lines, river, math formulas, trees, road, and arrows; no checkpoint pins, start pad, finish pad, progress text, or status text.
- `map-base@2x.png`: terrain, contour lines, river, math formulas, trees, road, arrows; no checkpoint pins, start pad, finish pad, progress text, or status text.
- `map-base@3x.png`: same layer group as `map-base@2x.png`, exported at 3x for high-density displays.
- `start-pad.svg`: editable transparent source for the left glowing circular pad and flag.
- `start-pad@2x.png`: left glowing circular pad and flag, transparent background.
- `finish-pad.svg`: editable transparent source for the right glowing circular pad and gem.
- `finish-pad@2x.png`: right glowing circular pad and gem, transparent background.
- `checkpoint-active-shell.svg`: editable transparent source for the active checkpoint shell and pedestal only, no number or status text.
- `checkpoint-active-shell@2x.png`: active checkpoint shell and pedestal only, no number or status text.
- `checkpoint-locked-shell.svg`: editable transparent source for the locked checkpoint shell and pedestal only, no number or status text.
- `checkpoint-locked-shell@2x.png`: locked checkpoint shell and pedestal only, no number or status text.

The SVG files in this directory are implementation-ready vector placeholders. Replace them with Figma exports only if the source design has more accurate vector shapes.

## Coordinate Contract

`asset-manifest.json` stores the design coordinate system and dynamic element anchors. Keep dynamic text in React:

- checkpoint numbers
- locked / active / completed status labels
- progress count
- topic, difficulty, question type, and AI reason text

When replacing assets, update coordinates only if the Figma frame or exported map dimensions change.

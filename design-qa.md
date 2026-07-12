**Source Visual Truth**

- Selected design: `/Users/dongpinhu/.codex/generated_images/019eaf22-2e02-7aa3-bd1d-2186393ddbf4/ig_0ed929aa61d3e1cc016a28c51359f481918bb06f78c5c60951.png`
- User selection: Scheme 3, Lab Quest visualization lab with an island hero, central grade control panel, lab logo launcher, single-lab preview, and back-to-control-panel flow.

**Implementation Evidence**

- Local URL: `http://127.0.0.1:3000/student/tools/visualizations`
- Desktop control-panel screenshot: `output/playwright/visualization-lab-quest-control-zh-final.png`
- Desktop lab-mode screenshot: `output/playwright/visualization-lab-quest-lab-zh-final.png`
- Mobile control-panel screenshot: `output/playwright/visualization-lab-quest-mobile-zh-final.png`
- Playable preview desktop screenshot: `output/playwright/visualization-lab-playable-preview.png`
- Playable preview mobile screenshot: `output/playwright/visualization-lab-playable-preview-mobile.png`
- Lab-title overflow screenshots: `output/playwright/visualization-lab-titles-zh-fixed.png`, `output/playwright/visualization-lab-titles-en-fixed.png`
- Fixed bilingual map screenshots: `output/playwright/visualization-map-en-final-2.png`, `output/playwright/visualization-map-zh-final-2.png`, `output/playwright/visualization-map-en-mobile-final-2.png`
- Single-layer English map label screenshots: `output/playwright/angle-valley-label-single-layer.png`, `output/playwright/visualization-map-en-single-layer-label.png`, `output/playwright/visualization-map-en-single-layer-map-only.png`
- Viewports checked: desktop `1619x971`, mobile `390x844`.
- State checked: Simplified Chinese, light mode, selected grade `P6`, guest state.

**Findings**

- No actionable P0/P1/P2 findings remain.

**Required Fidelity Surfaces**

- Fonts and typography: The implementation uses the existing MAIS type stack and heavy weights to match the source's bold student-facing rhythm. Heading scale, button labels, and small pill labels are readable.
- Spacing and layout rhythm: The first viewport matches the source structure: navigation, turquoise formula background, hero card, island map, central control panel, grade chips, lab launcher, recommendation panel, lab preview panel, and reward strip. The main wrapper was widened to better match the source frame.
- Colors and visual tokens: The implementation follows the source palette of bright cyan background, white panels, deep navy text, red primary CTAs, blue secondary CTAs, teal accents, yellow stars, and pastel lab cards. Button contrast is acceptable.
- Image quality and asset fidelity: The island map is a raster asset cropped from the selected source image and placed as the hero map. Lab tile badges use cropped raster icon assets from the selected source image, including percentage, car, pie chart, bars, scale, axes, ruler, and puzzle icons.
- Bilingual map behavior: English UI uses `components/visualizations/assets/lab-quest-island-map-en.png`, which replaces the map mission labels with English text. Chinese UI continues using `components/visualizations/assets/lab-quest-island-map.png`.
- English map label layering: English mission labels are rendered as a single opaque replacement layer. The previous lower white/shadow layer from the source map no longer appears beneath the Angle Valley label.
- Copy and content: Chinese UI copy matches the source intent while using real MAIS lab data. Labels such as `可视化实验室`, `Lab Quest`, `控制面板`, `小学六年级实验入口`, `推荐下一个`, `实验预览`, `进入实验`, and `返回控制面板` are present.
- Interaction states: Grade chips switch the displayed lab group. Lab tiles enter a single lab. The lab screen shows `返回控制面板`, and returning restores the control panel. The recommended card and red practice buttons are clickable.
- Playable preview: The preview is no longer static. The speed and time sliders update the chart, moving car, plotted points, and distance badge. The red preview button starts and pauses an automatic time animation.
- Lab tile text safety: Chinese and English lab titles now use redundant suffix trimming, language-aware text sizing, safe word breaking, and a fixed title/progress layout so titles do not collide with stars, progress numbers, or progress bars.
- Responsive behavior: Mobile control-panel smoke check shows the control panel and lab tiles are visible with no blocking layout failure.

**Patches Made During QA**

- Replaced the prior long, all-labs rendering with a control-panel mode and a single-lab mode.
- Mounted the new shared Visualization Lab page at `/student/tools/visualizations`, with `/visualization-lab` redirecting to that student tools route.
- Added the Lab Quest island image asset at `components/visualizations/assets/lab-quest-island-map.png`.
- Added the English Lab Quest island image asset at `components/visualizations/assets/lab-quest-island-map-en.png`.
- Cropped the island asset to remove source-card edge artifacts while preserving the island labels and route.
- Added cropped lab icon assets at `components/visualizations/assets/lab-icons/`.
- Hid the hero map in lab mode so the lab page opens as a focused practice surface.
- Expanded the page wrapper to match the source width more closely.
- Reworked the control panel into three visible columns: lab entrances, recommended next lab, and lab preview.
- Reduced the preview chart and slider heights so the reward strip sits closer to the source first viewport.
- Converted the static lab preview into a playable mini position-time simulation with live sliders and play/pause.
- Fixed lab entrance text overflow in Chinese and English by tightening title labels and reserving separate card regions for title and progress content.
- Fixed English map stretching/cropping by locking the hero map to its source aspect ratio and keeping the English hero buttons on one desktop row.
- Switched the hero map asset by language so English no longer shows Chinese map labels.
- Regenerated the English map asset so mission cards fully cover the old Chinese label areas, removing the extra lower label layer.

**Open Questions**

- The implementation keeps live MAIS lab titles and real visualization modules, so it intentionally does not freeze every source label as decorative mock text.

**Implementation Checklist**

- Keep dev server running at `http://127.0.0.1:3000`.
- Use `/student/tools/visualizations` for review.
- Review desktop control panel first, then click a lab tile and use `返回控制面板`.
- Regression checks run: `npm run type-check` and focused Playwright desktop/mobile smoke, including preview slider/play interaction, Chinese/English S4 title-overlap checks, English map asset checks, map aspect-ratio checks, and English single-layer label visual checks.

final result: passed

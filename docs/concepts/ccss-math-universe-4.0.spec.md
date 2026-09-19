> **Design record.** This is the build spec the Concept 4.0 design panel produced on 2026-09-11, kept for reference. Numbers marked *(draft)* came from an earlier draft of the dataset; the page recomputes every count from `ccss-math-universe-4.0.data.json`. Paths under `scratchpad/` referred to the build session and no longer exist. Where the shipped page deliberately differs after independent testing (for example the Ready-star glyph, filter-aware captions and the Year Ruler layout), the page and its `?receipt` drawer are authoritative. **§16 (2026-09-19) records the groups-first revision** — constellation bodies, the learner's-region default, collapsible panels and the 2.0 shapes — and supersedes §4, §5.3 and §8 where it says so.

# CCSS Math Universe — Concept 4.0 build spec (Coherence Atlas rigor on the Starways galaxy)

Deliverable: one self-contained HTML file, `docs/concepts/ccss-math-universe-4.html`. It must work offline from `file://`: no network, CDN or web fonts, and a single dark theme. Target browsers are Chrome 152 (the default) and Safari 26.

Base selection, by the stated rule: summed judge totals tie at 161 (Coherence Atlas 53+53+55; Starways 54+53+54); relationshipLegibility ties at 25; feasibility breaks the tie, 20 to 15. **Coherence Atlas is the formal base.** Its rigor engine is kept: exact aggregate counts, hidden-edge captions, per-direction depth control, the A→B path, integrity checks, the official hierarchy tree, and P0/P1/P2 phasing. All three judges ruled its grid layout a structural fatal flaw: it has weak student appeal, it loses the time axis inside a single HS column, it files measurement MD under Statistics, and its phone overview is 6 px tiles. That flaw is resolved by grafting the geometry and student mechanics of **Starways**, the unanimous judged winner: grade and course rings, stream arms, Launch mission, Plot a course, numbered badges, and per-cell LOD. From **Orbit Atlas** the design grafts the effects canvas, cropped nebula, frame governor, `?selftest`, camera insets and phone defaults.

Every number marked *(draft)* was computed from the merged 2026-09-11 draft dataset: 385 standards, 657 prerequisite links, 232 connection links and 124 sub-standards. The scripts are in `scratchpad/design4/`: `analyze.py` and `layout3.mjs`. The page must recompute these numbers at load and never hard-code them.

## 0. Scope, cuts, phases

Budget: about 3,000 hand-written lines (JS + CSS + HTML), not counting the embedded JSON. No libraries.

| Cut from Starways | Replacement |
|---|---|
| Per-ring stream widths, twist minimiser, 12-order search, smoothstep blend | One fixed width set; fixed 4° twist; frozen order N·A·G·F·D (lowest adjacency cost of the 12 circular orders on the draft: 357) |
| Transitive-reduction bitsets | BFS generation trees (TR would remove only 22 of 657 links on the draft) |
| Grand Road detours | In-stream DP, at most 2 roads per stream |
| 3 personas, 2 voices | 1 demo learner (Grade 4), 1 plain voice |
| MST constellation figures, aurora contour | Year Ruler frontier ticks and Ready glyphs |
| Edit-distance suggestions | Fixed no-match hint; a ≤ 16-pair synonym map is kept |
| Immersive mode, container queries, minimap | App shell plus media queries |
| All-roads offscreen density cache | P2 "All links" mode drawn live |

- **P0, about 1,500 lines:**
  - data load and validation, facts, copy table;
  - layout;
  - world canvas: nebula, sprites, stars, labels with collision, LOD;
  - camera and input: pointer, touch, wheel, gesture, keys;
  - search;
  - Star card, direct focus, Grand Roads, backbone;
  - app shell at 4 breakpoints;
  - listbox twin, tree, live region;
  - reduced motion;
  - `?receipt`, `?perf`, `?check`.
- **P1, about 1,000 lines:**
  - learner layer: state, glyphs, Mission HUD, launch/reset, route, review branch;
  - effects canvas;
  - trace with depth and collapse;
  - plot a course, filters, portals;
  - deep links and history;
  - frame governor;
  - `?selftest`, `?figure`, print outline.
- **P2, about 500 lines:** A→B path, "All links" mode, edge ledger (copy as TSV), "+N since last visit", product-road gap report in the receipt.

## 1. Data embedding (exact)

Two inline blocks. Nothing else carries data.

```html
<script type="application/json" id="ccss-data">
{"dataVersion":"<yyyy-mm-dd-tag>",
 "standards":[{"id":"4.NF.B.3","code":"4.NF.3","grade":"4","domain":"NF","domainTitle":"…","category":"","cluster":"B","clusterTitle":"…","title":"…","emphasis":"major","modeling":false,"plus":false,"hsCourse":"none","subs":[{"letter":"a","title":"…"}]}],
 "edges":[{"from":"3.NF.A.1","to":"4.NF.B.3","type":"prerequisite","why":"…","confidence":"high"}],
 "practices":[{"id":"MP1","title":"…"}]}
</script>
<script type="application/json" id="mais-demo-learner">{ …§6.1… }</script>
```

- **Standard record keys**, exactly these 14, in this order:
  - `id`: K–8 `^(K|[1-8])\.[A-Z]+\.[A-E]\.\d+$`; HS `^HS[NAFGS]-[A-Z]+\.[A-E]\.\d+$`
  - `code`: K–8 `4.NF.3`; HS `A-SSE.1`
  - `grade`: `K`,`1`…`8`,`HS`
  - `domain`: K–8 `NF`; HS `A-SSE`
  - `domainTitle`
  - `category`: `""` for K–8; `N|A|F|G|S` for HS
  - `cluster`: `A`–`E`
  - `clusterTitle`: paraphrase
  - `title`: ≤ 10 words, paraphrase
  - `emphasis`: `major|supporting|additional` for K–8; `none` for HS
  - `modeling`, `plus`: booleans, false for K–8
  - `hsCourse`: `none` for K–8; `Algebra I|Geometry|Algebra II|Fourth year (+)` for HS
  - `subs`: `[{letter,title}]`
- **Edge keys:** `from`, `to`, `type` (`prerequisite|connection`), `why` (≤ 18 words), `confidence` (`high|medium|low`).
- **Practice keys:** `id` (`MP1`–`MP8`), `title`.
- **Minified JSON.** Expected size about 300 KB. Record objects are used, not tuples.
- **Official link, derived (there is no URL field).** `OFFICIAL_BASE = "https://www.thecorestandards.org"`.
  - K–8: `4.NF.B.3` → `/Math/Content/4/NF/B/3/`
  - HS: `HSA-SSE.A.1` → `/Math/Content/HSA/SSE/A/1/`
  - sub-standard: append `<letter>/`
  - practice: `/Math/Practice/MP1/`
  - Link text: "Official standard page (opens thecorestandards.org, needs internet)". Use `target=_blank rel=noopener`. The pattern could not be fetched during design (Cloudflare challenge), so tests check the format only.
- **Load-time validation.** It never drops silently: every result goes to `facts.checks`, the receipt and the header chip.
  - V1 JSON parses and has ≥ 1 standard. Otherwise show an error panel and stop.
  - V2 ids are unique and match the regex.
  - V3 `code` and `domain` agree with `id`.
  - V4 K–8 has emphasis ≠ none; HS has course ≠ none.
  - V5 title ≤ 10 words; why ≤ 18 words.
  - V6 sub letters are a, b, c… contiguous.
  - V7 edge endpoints exist. An endpoint matching `^(.*\.\d+)\.?([a-z])$` resolves to its parent and is counted.
  - V8 no self-loops and no duplicate (from, to, type).
  - V9 a prerequisite's source grade ≤ its target grade (HS = 9).
  - V10 HS→HS prerequisites never point from a later to an earlier course ring.
  - V11 the prerequisite graph is a DAG (Kahn; list any cycle members).
  - V12 no pair carries both types; mirrored connections are merged.
  - V13 each of the 6 data-cluster ids exists and is MD.
  - V14 Σ in-degree = Σ out-degree = displayed link counts.
  - V15 every standard has a position, a listbox option, a tree path and a search entry (parity).
  - V16 demo learner: overrides exist; 0 counted stars with a prerequisite below 0.65; mission not counted and not locked.
  - Violating edges are still drawn and flagged in the card ("⚠ data check").
  - Header chip: "Data check ✓" or "Data check: {n} issues". It opens the receipt.

## 2. Derived model (computed once, pure functions)

- **Rings** (13): `RINGS = K,1,2,3,4,5,6,7,8, Algebra I, Geometry, Algebra II, Fourth year (+)`.
  - K–8: `ring = index of grade`. HS: `ring = 9 + index of hsCourse`.
  - Short labels: `K,1…8,Alg I,Geo,Alg II,4th (+)`.
  - The HS label always carries "typical course (traditional pathway)".
- **Streams** (5; one of them per standard). Glyph, name, hue:

| Key | Glyph | Name | Hue | Domains |
|---|---|---|---|---|
| N | `#` | Number | `#67e8f9` | CC, NBT, NS; HS category N |
| A | `x` | Operations → Algebra | `#818cf8` | OA, EE; HS category A |
| G | `△` | Geometry & Measurement | `#6ee7b7` | G, measurement MD; HS category G |
| F | `½` | Fractions → Ratios → Functions | `#f0abfc` | NF, RP, F; HS category F |
| D | `▮` | Data → Statistics & Probability | `#bef264` | SP, data MD; HS category S |

  - `DATA_MD = {K.MD.B, 1.MD.C, 2.MD.D, 3.MD.B, 4.MD.B, 5.MD.B}`. Matched by cluster id, never by title.
  - Totals *(draft)*: N 79, A 82, G 112, F 56, D 56.
- **Constellation** (collection unit, 65): K–8 `grade.domain` (43) plus HS domain (22).
- **Plate** (drawing and aggregation unit):
  - K–8 `grade.domain`, with K–5 MD split into `g.MD·Measurement` and `g.MD·Data`;
  - HS `domain@ring`;
  - 83 plates *(draft)*.
- **Cluster** = id without the last segment (147). **Cluster piece** = cluster × ring (160 *(draft)*). 13 HS clusters span 2 courses.
- **Domain order:**
  - K–5: `CC,OA,NBT,NF,MD,G`
  - 6–8: `RP,NS,EE,F,G,SP`
  - HS: `N-RN,N-Q,N-CN,N-VM,A-SSE,A-APR,A-CED,A-REI,F-IF,F-BF,F-LE,F-TF,G-CO,G-SRT,G-C,G-GPE,G-GMD,G-MG,S-ID,S-IC,S-CP,S-MD`
- **Document order** = ring, then domain order, then cluster letter, then standard number.
- **Plate short names** (display only):

| Domain | Short name | Domain | Short name |
|---|---|---|---|
| CC | Counting | A-SSE | Structure |
| OA | Operations | A-APR | Polynomials |
| NBT | Base Ten | A-CED | Creating equations |
| NF | Fractions | A-REI | Reasoning & solving |
| MD·M | Measurement | F-IF | Interpreting functions |
| MD·D | Data | F-BF | Building functions |
| G | Geometry | F-LE | Linear & exponential |
| RP | Ratios | F-TF | Trig functions |
| NS | Number System | G-CO | Congruence |
| EE | Expressions & Equations | G-SRT | Similarity & trig |
| F | Functions | G-C | Circles |
| SP | Statistics | G-GPE | Coordinates |
| N-RN | Real numbers | G-GMD | Measurement & dimension |
| N-Q | Quantities | G-MG | Modeling geometry |
| N-CN | Complex numbers | S-ID | Interpreting data |
| N-VM | Vectors & matrices | S-IC | Inference |
| | | S-CP | Probability |
| | | S-MD | Decisions |

- **Graph:** `parents[id]`, `children[id]` (prerequisite), `conns[id]`; Kahn topological order with ties by document order. Draft maxima: in-degree 4, out-degree 7, total degree 13.
- **`facts`**: a single frozen object holding every count the copy uses (§11).

## 3. Layout math (world space)

World units (wu). Origin is the galaxy centre, y points down. Angles θ are in degrees, clockwise from 12 o'clock: `x = r·sin θ`, `y = −r·cos θ`. Layout is deterministic, costs about 5 ms, and needs no randomness.

**3.1 Constants**

| Constant | Value |
|---|---|
| `R_CORE` | 130 |
| `R_OUT` | 1000 |
| `RING_GAP` | 10 |
| `GATEWAY_GAP` | 36 (between ring 8 and Algebra I) |
| `SEAM` | 8° |
| `LANE` | 3° |
| `TWIST` | 4° per ring |
| `CG` (cluster gap) | 0.4·q |
| `KG` (plate gap) | 0.9·q |
| `RMAX` | 4 rows |
| `STRETCH` | 1.5 |
| `ORDER` | `[N, A, G, F, D]` |

**3.2 Stream wedges** (one width set for all 13 rings)
- `SPAN = 360 − SEAM − 4·LANE = 340°`.
- `W_k = SPAN · total_k / 385`. Draft values: N 69.766°, A 72.416°, G 98.909°, F 49.455°, D 49.455°.
- `start(k, i) = TWIST·i + SEAM/2 + Σ_{k' before k} (W_k' + LANE)`.
- The seam (Year Ruler) is centred at `θ = TWIST·i`.
- The twist turns sectors into spiral arms: 48° from K to Fourth year.

**3.3 Ring solver.** It guarantees a star pitch of q wu.
- For each cell (ring i × stream k), list its stars in document order and group consecutive stars into **blocks** (cluster pieces).
- A block gap is `CG` when the neighbour is in the same plate, otherwise `KG`.
- `Gunits` = the sum of those gap factors.
- `cols(R) = Σ_b ceil(n_b / R)`.

```js
function cellT(k, blocks, r0, q){             // minimal thickness for this cell
  const w = W[k]*DEG, G = Gunits(blocks)*q; let best = Infinity;
  for (let R = 1; R <= Math.min(RMAX, nStars); R++)
    best = Math.min(best, Math.max(R*q, 2*((q*cols(R) + G)/w - r0)));
  return best;
}
function solve(q){ let r = R_CORE; const rings = [];
  for (let i = 0; i < 13; i++){ if (i === 9) r += GATEWAY_GAP - RING_GAP;
    let t = q; for (const k of ORDER) if (cell(i,k).length) t = Math.max(t, cellT(k, blocks(i,k), r, q));
    rings.push({r0: r, t, r1: r + t}); r += t + RING_GAP; }
  return rings; }
// bisection, 60 iterations over q in [5, 200]: largest q with rings[12].r1 <= R_OUT
```

Draft result: q = 40.89 wu.

| Ring | r0–r1 (t) | Ring | r0–r1 (t) |
|---|---|---|---|
| K | 130–252.8 (122.8) | 6 | 546.0–586.9 |
| 1 | 262.8–332.5 (69.6) | 7 | 596.9–637.8 |
| 2 | 342.5–383.3 (40.9) | 8 | 647.8–688.7 |
| 3 | 393.3–434.2 | Alg I | 724.7–806.4 (81.8) |
| 4 | 444.2–485.1 | Geo | 816.4–898.2 (81.8) |
| 5 | 495.1–536.0 | Alg II | 908.2–949.1 |
| | | 4th (+) | 959.1–1000.0 |

- Cell pitch: min 40.9, median 50.9, max 61.3. Nearest-neighbour distance: min 40.9, median 52.6.
- Tightest cells: K×N, 1×A, AlgI×F, Geo×G.

**3.4 Star placement.** For each cell:
- `rMid = r0 + t/2`, `U = W_k·DEG·rMid − G`.
- Choose `R ∈ 1..min(RMAX, n)` that maximises `min(U/cols(R), R===1 ? t+RING_GAP : t/R)`.
- `cw = min(U/cols(R), STRETCH·q)`.
- `used = cols(R)·cw + G`.
- `arc = (W_k·DEG·rMid − used)/2`. This centres the run on the wedge, which leaves dark lanes between arms.
- For each block b, in order:
  - add a gap to `arc` if b is not the first block;
  - `bc = ceil(n_b/R)`, `br = ceil(n_b/bc)`;
  - star j: `row = floor(j/bc)`, `inRow = min(bc, n_b − row·bc)`, `col = j mod bc + (bc − inRow)/2`;
  - `r = r0 + (row+0.5)·t/br`;
  - `θ = start(k,i) + (arc + (col+0.5)·cw)/rMid/DEG`;
  - then `arc += bc·cw`.
- Reading order is clockwise, then outward, which matches official numbering.
- Store per cell: `pitch_c = min(cw, R===1 ? t+RING_GAP : t/R)`.
- **HS** uses the same packing per course ring. A cluster spanning two courses becomes two pieces that share the cluster hue and hull style. Their labels read "B · part 1 of 2", and the card says "This cluster spans Algebra I and Algebra II".
- **Empty cells** (for example F in K–2, or N/A/F in the Geometry ring) are dark seed lanes. At L1, if the lane is on screen, draw a 12 px label: "{stream} begins in {firstRing}" for inner rings, or "No {stream} standards in the typical {course} course".

**3.5 Other geometry**
- **Core.** MP k sits at r = 78, θ = 45°·(k−1). Core glow radius 130. No links.
- **Plate centroid** = mean of member star positions. **Plate extent** = max member distance + 0.6q.
- **Cluster hull** (per piece) = annular sector from the first to the last member θ ± cw/2, over r from min to max member r ± 0.45q, with rounded ends drawn as a Path2D.
- **Moons** are drawn in screen space around the parent star:
  - dot radius 3 px at orbit radius 16 px;
  - angle `−90°` if n = 1, otherwise `−150° + j·120°/(n−1)` (upper arc);
  - letter label (12 px mono, weight 700) at radius 29 px along the same angle;
  - max 5 moons on the draft (F-IF.7); 43 standards have moons.
- **Year Ruler pill** for ring i at `(rMid_i, TWIST·i)`, drawn in screen space. The Gateway pill "High school · typical courses →" sits at `(r1_8 + 18, TWIST·8.5)`.
- **Rim stream labels** are placed at `R_OUT` along the stream centre angle of ring 12, pushed 20 px outward on screen.
  - Alignment: left if `sin θ > 0.3`, right if `< −0.3`, otherwise centred.
  - Baseline: alphabetic when `cos θ > 0`, otherwise hanging.
- **Galaxy fit** is a circle, not a rectangle. The fit radius in px is `ρ = min(W/2 − 12, H/2 − 12, dist(centre, each reserved rect)) − M`, where M = 36 px (24 px when the stage is < 700 px, which uses glyph-only rim labels). `s_fit = ρ / R_OUT`. Breadcrumb max width is 40% of the stage so it stays in its corner.

## 4. Camera, zoom, level of detail, labels

- **Camera** = `{cx, cy, s}` (world centre, px/wu). `k = s/s_fit ∈ [0.8, 24]`.
  - Buttons zoom ×1.6.
  - Wheel: `s *= exp(−dy·0.0015)`, with dy normalised (deltaMode 1 ×16, deltaMode 2 × stage height).
  - Ctrl/⌘ + wheel: `s *= exp(−dy·0.01)`.
  - The world point under the cursor, or under the pinch midpoint, stays fixed.
- **Fit and zoom per breakpoint** *(draft)*:

| Breakpoint | Stage | s_fit | Galaxy | L2 in tightest cell | L3 in tightest cell |
|---|---|---|---|---|---|
| XL 1512×860 | 824×780 | 0.342 | 684 px | 3.4× | 7.9× |
| L 1024×700 | 668×624 | 0.264 | 528 px | 4.5× | 10.2× |
| M 768×960 | 744×557 | 0.231 | 461 px | 5.1× | 11.7× |
| S 390×664 | 390×516 | 0.159 | 318 px | 7.4× | 16.9× |
| Landscape 844×390 | 508×330 | 0.129 | 258 px | 9.1× | 20.9× |

- **Levels.** `σ = pitch·s` (px).

| Level | σ |
|---|---|
| L0 | < 22 |
| L1 | 22–48 |
| L2 | 48–110 |
| L3 | ≥ 110 |

  - Hysteresis: go up at ≥ 1.1·T, go down at < 0.9·T.
  - **Per cell:** `level_c` from `pitch_c`, stored in a `Uint8Array` (57 non-empty cells). It drives star glyph layers, hulls, codes, titles and moons.
  - **Global:** `level_G` from the median cell pitch. It drives edge tiers and plate labels.
- **What renders**

| Level | Scope | Adds |
|---|---|---|
| L0 | global | nebula; ring hairlines (6% `#a9b4d6`); Year Ruler pills (every ring at stage ≥ 700 px; on phones K, 2, 4, 6, 8, Alg I, Alg II plus the learner ring); rim stream labels (name + glyph; glyph only < 700 px); core glow with the label "8 Practices" (count from data); one sprite per star; Grand Roads (35%, 3 px); learner: ship, mission ring, Ready ticks, Year Ruler lit arcs and frontier ticks; no per-star text |
| L1 | global | plate labels, e.g. "4.NF · Fractions" (with a lit/total arc when the journey layer is on); MP codes in the core; backbone roads; seed-lane labels |
| L1 | per cell | cluster emphasis fills |
| L2 | per cell | cluster hull strokes (major solid, supporting dashed [6,4], additional dotted [1.5,4]); cluster label "B · {clusterTitle}" truncated to 28 chars with "…"; star codes (K–8 without grade, e.g. "NF.3"; HS full code "A-SSE.1"); ★ badge, "+" notch, lock badge; moons of the selected star |
| L2 | global | local links |
| L3 | per cell | titles (13 px, weight 600, max 150 px, 2 lines, ellipsis); all moons with letters |

- **Star radius (px):** `clamp(0.14·σ_c, 2.5, 7) × statusScale × emphScale`.
  - statusScale: lit 1, fading 1, confirming .93, unstable .87, igniting .83, undiscovered .6 (min 2 px), current 1.5. These follow the app's relative sizes.
  - Journey off: statusScale 1; emphScale major 1.15, supporting 1, additional .9.
- **Labels** are drawn in screen space at fixed sizes and never scaled.

| Label | Size and weight |
|---|---|
| Stream | 15/800 |
| Ring pill | 12/700 |
| Plate | 13/800 |
| Cluster | 12/700 |
| Code | 12 mono/600 |
| Title | 13/600 |
| Moon letter | 12 mono/700 |
| Badge | 12/800 |

  - At stage < 700 px, add 1 px to every label except stream labels.
  - Halo: `strokeText` with lineWidth 3, `#070b1e` at .9, lineJoin round, then `fillText`.
  - `measureText` results are cached per (font, string).
- **Greedy collision placement** on a 64 px grid. Star discs (r + 2) are inserted first as obstacles. Priority order:
  0. Year Ruler and rim labels (fixed);
  1. focused, hovered and selected;
  2. mission, route and course stops, trace members, search hits;
  3. plate labels;
  4. cluster labels (major first, then larger);
  5. codes (major first);
  6. titles;
  7. moon letters.
  - Cap: 400 attempts per placement.
  - Re-place when s changes by > 3%, and 120 ms after rest. In between, placed labels translate with the camera.
- **Motion LOD.** During drag, pinch or flight: skip tiers 6–7, moons, hull strokes and local links. Keep codes that are already placed. Restore full quality 140 ms after settling.
- **Hit test.** 96 wu grid. Nearest star or moon within `max(16 px, 0.45·σ_c)` for a mouse, 22 px for coarse pointers. If ≥ 2 stars lie within 22 px and σ_c < 20, a tap zooms ×2.5 at that point instead of selecting.
- **Presets.** Each fits a bounding box into the safe rect (stage minus reserved corner rects, 32 px pad). The galaxy preset uses the circle rule.
  - **Whole galaxy.**
  - **My mission:** mission + direct prerequisites + direct unlocks + next 3 route stops.
  - **Ready stars:** bounding box of Ready.
  - **Ring pill click:** that ring's annulus.
  - **Trace / Course / Road:** its members.
- **Default camera.**
  - Stage ≥ 700 px: Whole galaxy.
  - Phones: Whole galaxy, then after 600 ms a one-time flight to My mission. Under reduced motion it cuts straight to My mission. The intro waits for the nebula bake.

## 5. Relationships

**5.1 Visual grammar**
- **Prerequisite (road).** Directed, constant screen width, with a 7 px chevron at t = 0.62. There are no tapered ribbons and no per-edge gradients.
- **Connection (bridge).** Undirected, dotted: `setLineDash([0.1, 5])`, round caps, 2 px.
- **Confidence styles.** high = full alpha; medium = ×0.65 alpha; low = dash [6,5] plus a "low confidence" tag in the card. The draft has only high (555) and medium (334).
- **Default roads colour** = the source stream hue. **Focus colours** (colour-vision-safe):
  - needs (upstream, into the focus) `#93c5fd`;
  - unlocks (downstream) `#fdba74`;
  - connections `#cbd5e1`.
  - Arrows and list grouping carry the same meaning, so colour is never the only cue.
- **Invariant on the draft:** prerequisite links run 318 outward and 339 along a ring, with 0 inward. The receipt shows these counts. Copy may say "every prerequisite road runs outward or along a ring" only when the inward count is 0.

**5.2 Curve.** Polar Hermite between endpoints a and b, given as (r, θ):
- `dθ = wrap180(θb − θa)`;
- `bow = sameRing ? clamp(0.3·chord, 8, 40) : (|dθ| > 25 ? 0.08·chord : 0)`;
- `P(t) = polar(lerp(ra, rb, t) + bow·sin(πt), θa + dθ·t)`;
- `nseg = max(1, ceil(|dθ|/60))`;
- each segment is a cubic with `C1 = P(t0) + P'(t0)·Δt/3` and `C2 = P(t1) − P'(t1)·Δt/3`, using a finite-difference derivative with h = 1e-3.

The curve follows the spiral and never cuts through the core. The chevron sits at P(0.62), oriented along P′. For focus and trace edges, the ends are trimmed by (star radius px + 3)/s along P′. Road and backbone Path2Ds are built once in world space and stroked with `lineWidth = px/s`.

**5.3 Reveal ladder.** Every pruned tier carries a caption with shown and total counts.

1. **Grand Roads** (L0–L1, nothing focused; also a filter toggle).
   - Per stream, run a DP over plates: `best[b] = max_a (best[a] + ln(1 + w(a,b)))`, where ring(a) < ring(b) and w ≥ 1. w = number of star-level prerequisite links from a's stars to b's stars.
   - The end is the argmax, with ties going to the higher ring; backtrack from it.
   - Remove the used plates and repeat once. Keep the second road if it has ≥ 3 hops and a score ≥ 0.4 × the first.
   - Name comes from the first plate's domain: CC/NBT/NS/N-* "The Number Road"; OA/EE/A-* "The Algebra Road"; NF "The Fraction Road"; RP "The Ratio Road"; F/F-* "The Function Road"; G/G-* "The Shape Road"; MD·Measurement "The Measurement Road"; MD·Data/SP/S-* "The Data Road".
   - Draft result: 7 roads.

| Road | Path | Links / hops |
|---|---|---|
| Number | K.CC → … → 8.NS → N-CN(Alg II) → N-CN(4th) | 36 / 10 |
| Algebra | K.OA → … → 8.EE → A-REI(Alg I) → A-REI(4th) | 37 / 10 |
| Measurement | K.MD·M → … → 5.MD·M → 6.G → 7.G → 8.G → G-GPE → G-GPE | 32 / 10 |
| Shape | K.G → … → 5.G → G-CO | 15 / 6 |
| Fraction | 3.NF → 4.NF → 5.NF → 6.RP → 7.RP | 11 / 4 (identical to the product's Fraction Road) |
| Function | 8.F → F-IF → F-TF(Alg II) → F-TF(4th) | 11 / 3 |
| Data | K.MD·D → … → 7.SP → S-ID → S-CP → S-MD | 16 / 10 |

   - Style: 3 px, stream hue at 35%; hover 80% with a pill "{name} · {links} links".
   - Card: "Named by MAIS, built from {links} prerequisite links across {plates} constellations", then hop rows "{a} → {b} · {w} links", each expandable to its member links.
   - A zero-support hop is impossible by construction.
2. **Backbone** (global L1+).
   - Aggregate prerequisite links by plate pair (a ≠ b). For each target plate keep the pairs whose weight equals that plate's top incoming weight.
   - Draft: 119 of 231 pairs kept, carrying 264 of 398 cross-plate links. A further 259 links are within a plate.
   - Width `1 + 1.4·log2(1 + w)` px. Same stream: source hue at 30%; cross stream: `#c7d2fe` at 22%. Chevron when length > 80 px.
   - Hover pill: "{w} prerequisite links: {a} → {b} ({high} high, {medium} medium)". Click lists the member links in the card.
   - Caption: "Showing {kept} of {pairs} constellation roads ({keptLinks} of {crossLinks} links)".
3. **Local links** (global L2+, nothing focused).
   - Links with both endpoints inside the viewport + 10%.
   - Sort: prerequisite before connection, high before medium, then shorter. Cap 60.
   - 1.25 px, target stream hue at 35%.
   - Caption: "Showing {shown} of {inView} links in view".
4. **Preview** (hover or keyboard roving focus).
   - Direct needs, unlocks and connections are drawn. Non-members dim to 25%.
   - Off-screen neighbours become **portals**: DOM buttons clamped to the safe rect along the ray from the focus. Neighbours in the same 45° bucket merge ("↖ 3.NF.A.1 +2"). Clicking one fits focus + that neighbour. Portals never enter the reserved corners.
5. **Select** (click, tap, Enter). Pins the focus and opens the card. Non-members dim to 18%.
   - Numbered badges on neighbour stars match the card lists: needs are blue circles 1…n; unlocks are orange rounded squares 1…m; connections get a dotted ring (listed, not numbered).
   - A comet dot runs along each focused prerequisite toward its target on the fx canvas, period 1.6 s. Under reduced motion it is static.
6. **Trace** (keys R / B, card buttons): Roots (ancestors), Branches (descendants) or Both.
   - Depth stepper 1 · 2 · 3 · All, default 3. Prerequisite links only; "Include connections" is off by default.
   - BFS over filtered links. Each member has a generation g.
   - Tree edge per member: the link toward a member of generation g−1. Ties: high confidence first, then smaller ring difference, then document order.
   - Toggle "Show all links" draws the induced subgraph instead.
   - If members > 60 and show-all is off, links in generations ≥ 4 are drawn as plate-pair roads with counts.
   - Styles by generation (hue = needs blue or unlocks orange): g1 2.2 px at 100%, g2 1.8 px at 80%, g3 1.5 px at 62%, g4+ 1.2 px at 45%. Members get matching rings. Non-members dim to 12%.
   - Reveal cascades at 90 ms per generation (instant under reduced motion). The generation scrubber is an `<input type=range>` 1…maxGen. Member rings get ticks on the Year Ruler.
   - Caption: "Roots of {code}: {n} stars across {rings} rings · {gens} generations · deepest {deep} · showing {drawn} of {total} links".
   - Draft examples:
     - 4.OA.B.4 roots All: 25 stars / 7 generations.
     - 7.RP.A.2 roots: 102 stars / 11 generations / 157 induced links.
     - HSF-TF.C.9 roots: 204 stars / 12 generations / 348 induced links.
     - K.CC.A.1 branches: 362 stars / 16 generations.
   - The card lists members grouped by ring as "code · title · gen g".
7. **Plot a course** (P1; card button "Set as destination", key C).
   - Stops = {ancestors(D) ∪ {D}} minus counted stars (lit, fading), with filters applied.
   - Order: Kahn on the stop subgraph; ties by ring, then θ, then document order.
   - Drawn as a flight path (dashed `#e0f2fe`, 2 px) from the ship through the stops, with numbered stop badges 1–9 and "…" after that; stops beyond 12 are ringed but not joined. Legend text: "Itinerary (suggested order), not a prerequisite road".
   - Card: "Course to {code}: {n} stops across {r} rings", grouped by ring; the first stop is labelled "Next stop".
   - Special cases: D counted → "You've already lit {code}."; no stops except D → "{code} is ready now.".
8. **Path between** (P2, teacher). "Path from here…" then pick B in search.
   - Nodes = descendants(A) ∩ ancestors(B) ∪ {A, B}. Draw the induced links; emphasise one BFS shortest path.
   - Empty result: "No prerequisite path from {A} to {B} in this data." with a button "Try {B} → {A}".
9. **All links** (P2 filter). All 889 links at 7–12% alpha, drawn live (measured 0.21 ms CPU in Chrome 152 at DPR 2). Caption: "{prereq} prerequisite + {conn} connection links".

**5.4 Filters** (rail, dock or sheet tab; key F)

| Group | Controls |
|---|---|
| Links | Roads (prerequisite), Bridges (connection), Grand Roads |
| Confidence | High only / High + medium / All (default) |
| Rings | Dual `<input type=range>` over the 13 rings |
| Streams | 5 glyph toggles |
| K–8 emphasis | Major, Supporting, Additional |
| HS | ★ Modeling only; (+) Show / Hide / Only |
| Learner | Ready & course only |
| Mode | Dim filtered stars (default, 15%) / Hide |

- Links with a filtered endpoint are not drawn.
- Roads, backbone, traces, courses and paths recompute on the filtered graph.
- Summary: "Showing {x} of {total} stars · {a} of {b} links".
- Search rows get a "hidden by filter" chip; activating one offers "Clear filters and show".

## 6. Learner layer (demo)

**6.1 Data model** (`#mais-demo-learner`)
```json
{"label":"Demo learner","grade":"4","missionId":"4.OA.B.4","litThroughRing":3,
 "overrides":{
  "1.MD.B.3":{"p":0.90,"attempts":9,"streak":4,"reviewDue":true}, "2.MD.C.8":{"p":0.88,"attempts":8,"streak":3,"reviewDue":true},
  "3.MD.A.1":{"p":0.89,"attempts":10,"streak":3,"reviewDue":true}, "3.NBT.A.1":{"p":0.91,"attempts":9,"streak":4,"reviewDue":true},
  "3.OA.D.8":{"p":0.88,"attempts":7,"streak":2}, "3.G.A.2":{"p":0.86,"attempts":5,"streak":1}, "3.NF.A.3":{"p":0.48,"attempts":9,"streak":0},
  "4.NBT.A.1":{"p":0.96,"attempts":11,"streak":5}, "4.NBT.A.2":{"p":0.94,"attempts":10,"streak":4}, "4.NBT.A.3":{"p":0.87,"attempts":9,"streak":3,"reviewDue":true},
  "4.NBT.B.4":{"p":0.92,"attempts":10,"streak":4}, "4.NBT.B.5":{"p":0.90,"attempts":9,"streak":3}, "4.NBT.B.6":{"p":0.88,"attempts":8,"streak":2},
  "4.OA.A.1":{"p":0.91,"attempts":9,"streak":4}, "4.OA.A.2":{"p":0.32,"attempts":6,"streak":0},
  "4.OA.A.3":{"p":0.58,"attempts":5,"streak":1}, "4.OA.B.4":{"p":0.62,"attempts":5,"streak":1}}}
```
- **Defaults for rings ≤ `litThroughRing`** without an override:
  - `h(x)` = FNV-1a 32-bit of the UTF-16 string, divided by 2³²;
  - `p = round2(0.90 + 0.08·h(id+"|p"))`;
  - `streak = 3 + floor(4·h(id+"|s"))`;
  - `attempts = streak + 3 + floor(5·h(id+"|a"))`.
- **All other stars:** `p = 0`, `attempts = 0`.
- **Status rules** (the app's, from `lib/mathUniverseMap.ts`, `knowledgeGalaxyMap.ts` and `adaptiveLearning.ts`):
  - attempts = 0 → **undiscovered**;
  - confirmed = `p ≥ 0.85 && streak ≥ 3`;
  - confirmed + reviewDue → **fading**;
  - confirmed → **lit**;
  - `p ≥ 0.85` → **confirming**;
  - `p < 0.55` → **unstable**;
  - otherwise → **igniting**.
  - **Counted** = lit or fading.
- **Overlays**
  - **Current:** the mission flag. It is never a rung, and the mission is always uncounted.
  - **Locked:** some direct prerequisite has p < 0.65 (`adaptivePrerequisiteThreshold`). Shown on uncounted, non-current stars. The reason names the weakest unmet prerequisite.
  - **Ready:** undiscovered and not locked.
- **Draft outcome** (V16 passes):
  - lit 92, fading 5, confirming 3, unstable 2 (3.NF.A.3, 4.OA.A.2), igniting 2, undiscovered 281;
  - counted 97 of 385 (25%);
  - Ready 10: 4.OA.C.5, 4.NF.B.3, 4.MD.A.1, 4.MD.A.3, 4.MD.C.5, 4.G.A.1, 5.NBT.B.5, 5.NBT.B.6, 5.MD.C.3, 6.NS.C.5 (Grade 4: 6, Grade 5: 3, Grade 6: 1);
  - locked 271;
  - constellations complete 15 of 65.
  - 3.NF.A.3 is unstable and blocks 4.NF.A.1: this is the Fraction repair story.
- **Consistency with 2.0.** 4.OA.B.4 is the mission, 4.NBT.3 is fading, 4.OA.2 is unstable, 4.OA.3 is igniting, and 4.NF/4.MD/4.G lie ahead. 2.0's "46% igniting" became 58%, and 4.OA.5 and 4.NF.1 became undiscovered, so that the app's 0.55 unstable rule holds.

**6.2 Next mission and route** (same rule used for the route line, Launch, and "Why this next")
- Candidates = uncounted, not locked, not the current mission.
- Sort by: ring ascending → same constellation as the current mission first → status rank (igniting 0, confirming 1, unstable 2, undiscovered 3) → emphasis (major, supporting, additional, none) → document order.
- Route = the first 3 candidates. Draft: 3.OA.D.8, 3.G.A.2, 3.NF.A.3.
- **Review branch** = the fading star nearest the mission by world distance.

**6.3 Glyphs** (world canvas static layer; animation on the fx canvas; never colour alone)

| State | Sprite stops (light, mid, dark), glow | Extra geometry | Animation (none under reduced motion) |
|---|---|---|---|
| Lit | Stream palette: N `#cffafe/#67e8f9/#0891b2`, A `#e0e7ff/#818cf8/#4f46e5`, G `#d1fae5/#6ee7b7/#0d9488`, F `#fae8ff/#f0abfc/#c026d3`, D `#ecfccb/#bef264/#65a30d`; glow = mid at .72 | Highlight white .96 at (32%, 26%) radius 34%; inner glow white .65 (6 px equivalent); border white .20; 4-point sparkle (2.6r) at L2+ | none |
| Fading | `#fef3c7/#fbbf24/#d97706`, glow .78 | Dashed halo 1.9r [3,3] 1.2 px | Halo opacity .55↔1, 1.9 s |
| Unstable | `#ffe4e6/#fb7185/#e11d48`, glow .78 | Notched ring 1.7r (4 × 60° arcs) | Stepped flicker 1.6 s: 0.8 s full, 0.8 s under a `#070b1e` occluder at .45 (i.e. .55) |
| Confirming | `#ecfeff/#38bdf8/#0369a1`, glow .85 | 90% arc ring 1.6r, 1.6 px | Additive white glow 0↔.35 ("brightness 1.35"), 1.5 s |
| Igniting | Core `#131a3a`, 1 px stroke `#8b93b8` | Progress arc 1.6r in stream hue = p% from −90° | none |
| Undiscovered | `#64748b→#334155` at .55, glow 6 px `rgba(100,116,139,.35)` | none | none |
| Ready (overlay) | — | 4 ticks at 45°/135°/225°/315° from 1.5r to 2.3r, `#e0f2fe` 1.4 px | Tick alpha .5↔1, 2.4 s (static .9) |
| Locked (overlay) | Sprite at 60% alpha, desaturated variant | Padlock 8×9 px at (+r+2, −r−2), `#a9b4d6`, L2+ | none |
| Current (overlay) | Underlying sprite ×1.5 + white core .45r | Dashed ring 2.4r [4,5] 1.4 px; halo white .12 at 3.2r; ship chevron 18 px at (+14, −22) px, visible at every level | Ring rotates 6 s; halo pulse 2 s; ship bob 5 px, 2.8 s |

- The legend is generated from this table, with live counts. The Lit swatch shows all 5 hues.
- Journey off: stars drawn with the lit sprite of their stream at 80% alpha; emphasis hulls; no status, ship or HUD learner rows.

**6.4 Mission HUD** (left rail at XL; "Mission" tab elsewhere)
- Kicker "You are here" + ship glyph. Then code (mono), title and status line.
- **Why this next** (§11 `why.*`), plus the highest-confidence prerequisite's `why`.
- **Unlocks line.** Draft: "Unlocks 1 star directly and 71 more later, through Fourth year (+)".
- **Buttons:** Fly to my mission · Launch mission (demo) · Trace roots · Plot a course · Reset demo.
- **Illumination:** "Lit 97 of 385 (25%)", a bar, and per-stream mini-bars with glyphs.
- **Stat row:** Constellations complete · Ready · Review due · Needs repair.
- **Route list;** **Atlas shelf** (complete constellation codes: first 12, then "+{n} more").
- **Rule note:** "Counted = Lit + Fading. Confirming needs a {streak}-correct streak to count."
- Persistent chip beside the toggle: "Demo learner · sample data".

**6.5 Launch mission (demo)**
1. Snapshot Ready, counted and complete constellations.
2. If motion is allowed, play a 900 ms burst on fx: ring 1r→4r fading .95→0, plus a radial flash.
3. Set the mission to `p = max(p, .88)`, `streak = max(streak, 3)`, `attempts += 3`, `reviewDue = false`.
4. Recompute everything.
5. newlyReady = Ready now − Ready before. Draft: 6.NS.B.4.
6. Next mission = rule 6.2 (draft: 3.OA.D.8).
7. The ship flies along the route curve (900 ms). The camera moves only if the new mission is off-screen.
8. Counter tween over 600 ms.
9. Newly Ready stars twinkle once (1.2 s).
10. Live region (polite) plus toast: `launch.done`. If a constellation completed, also `launch.complete`, and the chip joins the shelf.
11. When no candidates remain: "Every reachable star is lit."

"Reset demo" restores the seed. In P2 the page stores the counted total under localStorage key `mais-c4-lit` inside try/catch and shows "+{n} stars since your last visit".

## 7. Search, fly-to, input, keyboard, deep links, list

**7.1 Search.** Header combobox (ARIA 1.2); opens with `/` or Ctrl/⌘K.
- **Normalisation.** `norm(x)` = lowercase, strip `ccss.math.content.`, remove every non-alphanumeric character.
- **Index keys.**
  - Standard: `norm(id)` and `norm(code)`; for HS also `"hs"+norm(code)`. So 4.NF.B.3 = 4.NF.3 = 4nf3, and HSA-SSE.A.1 = A-SSE.1 = A.SSE.1 = asse1.
  - Sub-standard: `norm(id)+letter` and `norm(code)+letter` (4.NF.3c, 4.NF.B.3.c).
  - Cluster: `4nfb`. Constellation: `4nf`, `asse`, `hsasse`. MP: `mp1`…`mp8`.
  - Word tokens: from title, clusterTitle, domainTitle, plate short name, sub titles, practice titles. Lowercase, punctuation stripped. Stem by stripping trailing `ing`, `ed`, `es` and `s` when length > 4.
  - Grade tokens restrict to a ring: `k`, `kindergarten`, `grade n`, `nth`, `algebra 1|i`, `geometry`, `algebra 2|ii`, `fourth year`, `hs`, `high school`.
  - Synonyms (≤ 16 pairs): times, multiplication→multiply; plus→add; minus, take away→subtract; shapes→geometry; graph→data, function; chart→data; clock→time; decimal→decimals; percent→percent; equation→equations; chance→probability; fraction→fractions; money→money; angle→angles. A synonym hit shows "matched: {word}".
- **Score.** 1000 exact code/id; 800 code prefix; 600 all words match title word prefixes; 400 cluster, domain or practice title; 200 synonym. Ties: ring, then document order.
- **Results.** Up to 8 rows, grouped Stars · Clusters & constellations · Practices. Each row: stream glyph, code, title, ring chip, status chip (journey on), "hidden by filter" chip. Summary "{n} results".
- **Keys.** ↑/↓ move; Enter flies to, selects and opens the card (cluster or constellation: fit its bounding box and open its card); Esc closes, a second Esc clears.
- **Empty.** `search.none`.

**7.2 Fly-to**
- van Wijk–Nuij smooth zoom, ρ = 1.4.
- Duration `clamp(S·300, 400, 1000)` ms, where S is the path length.
- End pose: fit target + direct neighbours, with s at least the level where the target's cell reaches σ = 52.
- Any wheel, pointer or key input cancels the flight and continues from the current camera.
- Reduced motion: instant cut.

**7.3 Pointer and touch**
- Active pointers live in a Map keyed by pointerId.
- **Pan:** one pointer (mouse only when `button === 0`); ignore mouse moves with `buttons === 0`.
- **Pinch:** two pointers; `s = s0·dist/dist0` about the midpoint, which also pans. Re-baseline whenever the pointer count changes.
- **Drag end:** a single handler for `pointerup`, `pointercancel` and `lostpointercapture`.
- **Tap** (< 6 px, < 300 ms): select the hit star, or run the ambiguity zoom.
- **Double-click / double-tap** (≤ 300 ms, ≤ 24 px): ×2 at the point; Shift ×0.5.
- **Flick inertia:** velocity decays ×0.92 per frame; off under reduced motion.
- **App mode** (default): `touch-action: none` on the stage. Plain wheel or Ctrl+wheel zooms at the cursor; Shift+wheel or a horizontal-dominant wheel pans. The wheel listener is on the stage only, so scrollable panels keep native scrolling with `overscroll-behavior: contain`.
- **Safari:** `gesturestart/change/end` are prevented; `s = s0·e.scale` about `(clientX, clientY)`. Ctrl+wheel is ignored while a gesture is active.
- **Cooperative mode.** Automatic when `document.scrollingElement.scrollHeight > innerHeight + 1` (re-checked on resize), or forced with `?embed=1`.
  - Plain wheel is not intercepted until the map is **engaged** (stage pointerdown or map keyboard focus).
  - Engagement ends on Esc, blur, or 1,500 ms after the pointer leaves.
  - Ctrl/⌘ + wheel and Safari gestures always zoom.
  - Stage uses `touch-action: pan-y` until a tap engages, then `none` until disengaged.
  - One-time hint chip: "Tap the map to explore · pinch or Ctrl+scroll to zoom".
- **Stage CSS/JS:** `user-select: none; -webkit-user-select: none; -webkit-touch-callout: none`. On canvas pointerdown: `preventDefault()` and `focus({preventScroll: true})` (canvas only, never buttons).

**7.4 Keyboard.** The galaxy is one tab stop (roving) with `aria-activedescendant` into the listbox twin.

| Key | Action |
|---|---|
| ← / → | Previous / next star along the current ring (angular order, wraps) |
| ↑ / ↓ | Outward / inward: the star in the next non-empty ring with the nearest θ |
| PageUp / PageDown | Previous / next cluster piece (its first star) |
| Home or M | My mission |
| 0 | Whole galaxy |
| + or = / − | Zoom in / out |
| Shift + arrows | Pan 80 px |
| Enter / Space | Select and open card |
| Esc | Step back: popover → search → course/trace → selection |
| [ / ] / \ | Go to next prerequisite / unlock / connection of the selection (cycles on repeat) |
| , / . | Previous / next moon of the selection (announces the sub-standard) |
| R / B / D | Trace roots / branches / cycle depth |
| C | Plot a course to the selection |
| P | Path from selection (P2) |
| J | Journey layer on/off |
| F / L | Filters tab / List tab |
| / or Ctrl/⌘K | Search |
| ? | Keys dialog |

Tab leaves the widget. The camera pans so the roving star sits at least 48 px inside the safe rect.

**7.5 Deep links and history**
- Hash only, so it works on `file://`: `#s=<id>&t=roots|branches|both&d=1|2|3|all&c=<destId>&j=0|1&v=<cx>,<cy>,<k>`.
- Selection changes use `pushState`, so Back/Forward walks the focus trail (restored on `popstate`). Camera changes use debounced `replaceState` (300 ms).
- Unknown id: toast "Couldn't find {id}", then ignored.
- `localStorage` is used only in P2, inside try/catch.

**7.6 List tab** (ARIA tree, visible to everyone)
- K–8: Grade → Domain → Cluster → Standard → Sub-standard. High school: Category → Domain → Cluster → Standard (course chip) → Sub-standard.
- Children are rendered lazily on expand. Roving tabindex, `aria-level/setsize/posinset/expanded`, typeahead by code.
- Enter moves the canvas selection, camera and card, and keeps the tree in sync.
- A separate visually hidden `role=listbox` twin holds 385 + 124 options. Option name: `aria.star` (§11).

## 8. HUD layout per breakpoint

- **Shell.** `html, body {height: 100%; margin: 0; background: #070b1e; font-size: 14px}`. The page is a grid of `100dvh` (fallback `100vh`) and the document never scrolls.
- **Z-order:** canvases < reserved stage overlays < portals < popovers (search results, legend, tooltips) < dialogs.
- **Panels** are opaque `rgba(13,19,48,.94)` with no backdrop-filter, a 1 px border `rgba(169,180,214,.22)` and radius 14. No panel is positioned over another panel.
- **Reserved stage overlays** (the only DOM over the canvas; all excluded from fits):
  - **TL** breadcrumb: 32 px tall, max-width 40%, one line with ellipsis. Example: "Galaxy › Grade 4 › Fractions → Ratios → Functions › 4.NF.B". Each segment fits that level.
  - **BR** zoom stack: +, −, fit, 44×44 each, gap 6. Vertical at ≥ 700 px; horizontal at < 700 px.
  - **BL** hint chip: transient, `pointer-events: none`.
  - Plus portals (§5.3).

| Viewport | Grid | Stage (draft size) | Panels |
|---|---|---|---|
| ≥ 1280 (test 1512×860) | rows `56px 1fr`; cols `300px minmax(0,1fr) 340px`; gap 12; pad 12 | 824×780 | Left rail: Mission HUD (journey on) or Curriculum summary (off), collapsible Legend. Right rail tabs: Star · Trace · Filters · List |
| 1024–1279 (test 1024×700) | rows `52px 1fr`; cols `minmax(0,1fr) 320px` | 668×624 | Right rail tabs: Mission · Star · Trace · Filters · List; Legend as a popover from the header |
| 700–1023 (test 768×960) | rows `52px clamp(360px,58dvh,620px) 1fr` | 744×557 | Dock below the stage (scrolls internally), tabs Mission · Star · Trace · Filters · List · Legend. Selecting a star switches to Star |
| < 700 (test 390×664) | rows `52px 1fr 96px` | 390×516 | Bottom sheet peek (96 px, in flow): mission one-liner or selected code + title + Ready count, plus a drag handle with Expand/Collapse buttons. Half (50dvh) and Full (`100dvh − 52px`) overlay the stage; while open, the camera's bottom inset = sheet height (focus never obscured). Sheet tabs: Star · Mission · Trace · Filters · List · Legend. Full makes the stage `inert` |
| Height < 520 and width ≥ 700 (test 844×390) | rows `44px 1fr`; cols `minmax(0,1fr) 300px` | 508×330 | Right rail tabs as at 1024 |

- **Header content.**
  - ≥ 1024: logo glyph + "Math Universe", subtitle chip `header.sub`, search (360 px at XL, 240 px at L), "My journey" toggle + demo chip, Data check chip, List, Keys (?), About.
  - < 1024: logo, search icon (expands to a full-width field over the header, results below it as a popover), journey icon toggle, menu (Data check, About, Keys, Legend).
- **About dialog** (`<dialog>`): `about.*` copy, the 8 practices from data, provenance, the `Print outline` button and the receipt link.
- **Everywhere.**
  - Touch targets ≥ 44 px; `overflow-wrap: anywhere` on codes and reasons; no nbsp runs; no fixed min-widths.
  - Safe-area insets (`env(safe-area-inset-*)`) on header and sheet.
  - Body text ≥ 12 px; canvas text ≥ 12 px (13 px on phones).
  - The tooltip (hover only, `aria-hidden`) is positioned with `transform` from 0,0, measured after fill, flipped and clamped on both axes with an 8 px margin, and emptied and `hidden` when not shown.
  - The stage uses `overflow: clip; contain: layout paint`.

## 9. Rendering stack and performance

- **Three layers; no SVG scene.**
  - **`#world` canvas:** everything static per frame.
  - **`#fx` canvas:** same size, `pointer-events: none`, animated items only.
  - **DOM HUD.**
- **Banned:** CSS `filter`, SVG filters, `ctx.filter`, `shadowBlur`, `backdrop-filter`, web fonts, network, Workers, `requestIdleCallback`.
- **Fonts:** `"Avenir Next", Avenir, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`; mono `ui-monospace, "SF Mono", Menlo, Consolas, monospace`.
- **Backing store.**
  - Size `round(css × min(devicePixelRatio, 2))`: from `devicePixelContentBoxSize` when present (Chrome), otherwise `contentRect × dpr` (Safari).
  - Cap 8.5 MP per canvas (lower the effective dpr if exceeded).
  - Re-rasterise on ResizeObserver: re-fit if the user hasn't moved the camera, otherwise keep the world point at the stage centre.
  - Never resize mid-flight. Zero discarded offscreen canvases (`width = height = 0`).
- **Offscreen assets** are built after the first frame in `setTimeout` chunks of ≤ 50 ms:
  - **Sprite atlas:** 12 palettes (5 stream lit, fading, unstable, confirming, undiscovered, igniting core, current white, MP gold) × 3 sizes (16/32/64 device px), about 1 MB.
  - **Nebula:** `N = 2048` if the stage's short side ≥ 600 css px, else 1024. It covers world [−1090, 1090]².
    - Content: dark radial base; per stream × ring, 3 hue blobs (`'lighter'`, alpha .07, radius 0.9·(t + 40)) on the arm centreline; one blob per plate (alpha .05); core glow radius 150; 1,200 hashed dust points (0.5–1.2 px, alpha .25–.55).
    - Each frame, only the visible world sub-rectangle is drawn: `drawImage(neb, sx, sy, sw, sh, 0, 0, W·dpr, H·dpr)`.
    - Nebula alpha falls to .5 above k = 6.
  - **Prewarm:** once, draw every composite mode and dash pattern used into a 1×1 canvas (avoids the 117 ms first-use stall measured in Chrome).
- **World frame order** (render on demand: `invalidate(flags)` → one rAF):
  1. fill `#070b1e`;
  2. nebula crop;
  3. ring hairlines;
  4. Grand Roads / backbone / local / All links, batched by style bucket via Path2D `addPath`, `lineWidth = px/s` under `setTransform(dpr·s, 0, 0, dpr·s, dpr·tx, dpr·ty)`;
  5. cluster hulls, 3 dash batches;
  6. focus / trace / course / path links and chevrons;
  7. stars via the 96 wu culling grid: `drawImage` sprite, then static glyph layers;
  8. moons;
  9. selection ring + keyboard focus ring (2 px white inside 2 px `#070b1e`);
  10. screen-space labels (identity × dpr transform), numbered badges.
- **Snapping.** Sprites snap to device pixels at rest only.
- **fx loop.**
  - Runs when ≥ 1 animated item is on screen, motion is allowed, the page is visible and the last input was < 30 s ago.
  - 30 fps for ambient effects (skip if < 33 ms since the last frame); 60 fps during ignition, ship flight, trace cascade and camera motion.
  - Clears and stops otherwise. The `matchMedia` change listener is honoured live.
- **Frame governor** (motion only). EMA of draw ms (α .2):
  - > 10 ms for 5 frames → tier 1: no label halos, connections or hull strokes;
  - > 14 ms → tier 2: labels ≤ 40, no local links.
  - Full quality 150 ms after settle. `navigator.deviceMemory` is never used.
- **Budgets** (Chrome 152, DPR 2, XL stage ≈ 1648×1560 device px ≈ 2.6 MP per canvas):

| Measure | Budget |
|---|---|
| Draw CPU at L0–L2, ≤ 150 links | p95 ≤ 8 ms |
| Draw CPU at L3, ≤ 400 labels | p95 ≤ 12 ms |
| Flight rAF delta, Chrome | p95 ≤ 18 ms, worst ≤ 25 ms |
| Flight rAF delta, Safari 26 | p95 ≤ 20 ms |
| Parse + validate + layout + graph + roads | ≤ 60 ms |
| First frame, without nebula | ≤ 250 ms |
| Assets baked | ≤ 150 ms |
| Canvas memory at XL | ≈ 40 MB (world 10 + fx 10 + nebula 17 + atlas 1) |

- **Draw counts** (worst case in view):

| Level | Stars | Links | Labels | fx items |
|---|---|---|---|---|
| L0 | 385 + 8 MP | 7 roads | ≤ 20 | ≤ 25 (draft: 1 + 5 + 2 + 3 + 10 + ship) |
| L1 | 385 + 8 MP | ≤ 120 backbone (119) | ≤ 110 (+83 plates) | ≤ 25 |
| L2 | ≤ 150 | ≤ 60 local + 13 focus | ≤ 250 (≤ 60 hulls) | ≤ 25 |
| L3 | ≤ 80 | ≤ 60 | ≤ 400 | ≤ 25 |

  Trace adds ≤ 204 tree links (the draft maximum), or fewer once collapsed.
- **Test hooks** (query flags):

| Flag | Behaviour |
|---|---|
| `?perf` | Overlay: rAF avg/p95/worst over 120 frames, draw ms, counts drawn, governor tier, backing size |
| `?receipt` | Drawer: `facts`, V1–V16 results, direction invariant, data version, FNV checksum of the JSON text, stream-order cost vs best of 12 (P2), product-road hop report (P2) |
| `?check` | Runs parity, layout (no NN < q − 0.5), HUD pairwise-overlap and copy-digit assertions; PASS/FAIL overlay; `window.__check` |
| `?selftest` | 3 scripted flights (galaxy → mission → HSF-TF.C.9 → galaxy); p50/p95/worst in overlay and console; `window.__selftest` (usable in real Safari) |
| `?figure&freeze=<ms>` | Hides the HUD, fixes the animation phase, no intro flight |
| `?embed=1` | Forces cooperative mode |
| `?learner=0\|1` | Sets the journey layer |
| `?reduced=1` | Forces reduced motion |

- **Test API.** `window.__galaxy` = `{facts, camera(), starScreen(id) → {x, y, visible}, select(id), state()}` (read-only snapshots, plus `select`).
- **Print** (`@media print`): hide the canvases and HUD; print the outline (grade → domain → cluster → standard: code, title, status when the journey is on, official URL) with `print-color-adjust: exact` off.

## 10. Accessibility and reduced motion

**Three routes to every star:** the map widget with roving keys, the List tree, and Search. No information exists only on the canvas.

**Structure**
- `lang="en"` and one `h1`.
- Landmarks: `header`, `nav` (rail tabs), `main` (stage), `aside` (card/dock/sheet).
- A skip link, "Skip to star list", is the first tab stop.
- Tab order: skip link → header → galaxy widget → panels.

**Map widget**
- `tabindex=0`, `role="application"`, `aria-roledescription="galaxy map"`.
- `aria-label` = `aria.galaxy`; `aria-describedby` points to the keys help.
- `aria-activedescendant` points into the listbox twin.
- Both canvases are `aria-hidden`.

**Live regions**
- One polite region, debounced 250 ms, announces roving focus with `aria.star`.
- The same region announces trace, course, filter, launch and search counts.
- Dialogs use `<dialog>`: the background becomes inert, Esc closes, and focus returns to the trigger. Closing the card returns focus to the map.

**Focus indication**
- Every DOM control gets `:focus-visible`: 2 px `#ffffff` outline plus a 2 px `#070b1e` offset.
- The canvas focus ring uses the same double ring.
- The camera keeps the focused star outside every inset (WCAG 2.4.11).

**Contrast** (WCAG 2.x, measured)

| Token | Colour | On canvas `#070b1e` | On panel `#0d1330` |
|---|---|---|---|
| ink | `#f5f8ff` | 18.4:1 | — |
| dim | `#a9b4d6` | 9.5:1 | 8.8:1 |
| faint | `#8f9abf` | 7.0:1 | 6.5:1 |

- 3.0's faint colour, `#5a6690`, measured 3.48:1.
- Stream hues used as text, on canvas: cyan 13.5, fuchsia 11.1, indigo 6.5, emerald 12.8, lime 14.9.
- Undiscovered slate `#64748b` (4.1:1) is used for glyphs only, never text.
- Canvas labels always carry the 3 px dark halo.

**Colour independence**
- Status = glyph shape + colour.
- Stream = position + glyph + label + colour.
- Direction = arrowheads + list grouping.
- Link type = solid vs dotted.
- Confidence = alpha + dash.
- K–8 emphasis = hull stroke style + the word in the card.
- ★ and (+) = badge shapes + text.
- Measured OKLab ΔE×100:
  - stream vs status ≥ 12.7 (tightest: Number vs Confirming);
  - stream vs stream 9.1 (normal and protan), but only 3.1–3.2 (deutan and tritan), so the non-colour cues are mandatory.

**Reduced motion** (`matchMedia` change listener, or `?reduced=1`)
- Camera: flights become cuts, and there is no inertia.
- Disabled: pulses, flicker, rotation, twinkle, ship bob, comets, dash flow, ignition burst, trace cascade, counter tween, phone intro flight.
- Every glyph keeps its static form.
- Global CSS rule: `@media (prefers-reduced-motion: reduce){*,*::before,*::after{transition:none!important;animation:none!important;scroll-behavior:auto!important}}`. This also covers button hover lift.
- Flicker steps at 0.625 Hz; nothing flashes more than 3 times per second.

**Other**
- Touch targets ≥ 44 px; coarse-pointer hit radius 22 px.
- Hover is never required: the card is the accessible surface.
- The tooltip is `aria-hidden`, and emptied and hidden when not shown.
- Official links say that they need internet.
- At 200% zoom the shell falls to the M/S layouts.
- `forced-colors`: DOM controls use system colours.

## 11. Computed copy (the only source of user-visible sentences)

**Rules for all copy**
- Every string lives in `COPY` and is filled from `facts` or state by `fmt(key, vars)`.
- `plural(n, one, many)` handles plurals. Percentages use `Math.round`.
- Template literals contain no digits.
- The only allowed static names are "K–12", "Concept 4.0" and `<kbd>` key caps.
- Codes, ids, MP labels and course names always come from data.

| Key | Template |
|---|---|
| `doc.title` | "CCSS Math Universe · Concept 4.0" |
| `header.sub` | "All {standards} CCSS math standards, K–12" |
| `aria.galaxy` | "{standards} standards in {rings} rings and {streams} streams, with {prereq} prerequisite links and {conn} connection links. {learner}" |
| `aria.learner.on` / `.off` | "Demo learner in Grade {grade}: {counted} of {standards} stars lit." / "Journey layer off." |
| `aria.star` | "{code}, {title}. {ringName}, {streamName} stream, cluster {cluster}{emph}. {status}. Needs {nNeeds}, unlocks {nUnlocks}{conn}. Enter for details." |
| `status.*` (app labels) | "Lit · mastered", "Fading · review due", "Unstable · repair", "Confirming · almost mastered", "Igniting · in progress", "Undiscovered", "Current mission" |
| `status.detail` | "{label} · {pct}% mastery" |
| `locked` | "Locked: master {weakest} first ({pct}%)." |
| `ready` | "Ready: every prerequisite is at least {threshold}%." |
| `why.none` | "This is a starting star: it has no prerequisites." |
| `why.one` | "Its prerequisite {code} is lit." |
| `why.all` | "All {n} prerequisites are lit: {codes}." |
| `why.some` | "{k} of {n} prerequisites are ready; strengthen {weakest} first." |
| `why.reason` | "Why it matters: {why}" |
| `unlocks` / `unlocks.none` | "Unlocks {direct} {star|stars} directly and {later} more later, through {farRing}." / "Doesn't unlock other standards in this map." |
| `illum` | "Lit {counted} of {standards} ({pct}%)" |
| `stat.const` / `.ready` / `.review` / `.repair` | "Constellations complete: {c} of {total}" / "Ready to explore: {n}" / "Review due: {n}" / "Needs repair: {n}" |
| `rule.count` | "Counted = Lit + Fading. Confirming needs a {streak}-correct streak to count." |
| `launch.done` | "{code} lit! {newReady} Next mission: {next}." |
| `launch.newReady` | "{n} new {star|stars} ready: {codes}." / "No new stars unlocked yet." |
| `launch.complete` | "Constellation complete: {plate}." |
| `card.metaK8` | "Grade {grade} · {domainTitle} · Cluster {cluster}: {clusterTitle}" |
| `card.metaHS` | "High school · {category} · {domainTitle} · Cluster {cluster}: {clusterTitle} · Typical course: {course} (traditional pathway)" |
| `card.emph` / `.modeling` / `.plus` | "{Major|Supporting|Additional} cluster" / "★ Modeling standard" / "(+) Beyond the college-ready core" |
| `card.subs`, `card.needs`, `card.unlocks`, `card.conns` | "Parts ({n})", "Needs first ({n})", "Unlocks ({n})", "Connected ideas ({n})" |
| `card.link` | "{code} · {title} — {why} · {confidence} confidence" |
| `card.split` | "This cluster spans {courseA} and {courseB}." |
| `card.official` | "Official standard page (opens thecorestandards.org, needs internet)" |
| `road.card` | "{name} · named by MAIS, built from {links} prerequisite links across {plates} constellations" |
| `road.pill` / `backbone.pill` | "{name} · {links} links" / "{w} prerequisite links: {a} → {b} ({high} high, {medium} medium)" |
| `cap.backbone` / `cap.local` / `cap.all` | "Showing {kept} of {pairs} constellation roads ({keptLinks} of {crossLinks} links)" / "Showing {shown} of {inView} links in view" / "{prereq} prerequisite + {conn} connection links" |
| `trace.cap` | "{Roots|Branches} of {code}: {n} stars across {rings} rings · {gens} generations · deepest {deep} · showing {drawn} of {total} links" |
| `course.cap` / `.done` / `.readyNow` / `.legend` | "Course to {code}: {n} stops across {r} rings" / "You've already lit {code}." / "{code} is ready now." / "Itinerary (suggested order), not a prerequisite road" |
| `path.none` | "No prerequisite path from {a} to {b} in this data." |
| `filter.sum` | "Showing {x} of {total} stars · {a} of {b} links" |
| `search.count` / `.none` / `.hidden` / `.syn` | "{n} results" / "No stars match “{q}”. Try a code like {exampleCode} or a word like {exampleWord}." (examples from data: a random-but-seeded Grade 4 code and plate short name) / "hidden by filter" / "matched: {word}" |
| `ring.pill` | "{ringName} · {n} stars · {c} clusters · largest {plate}" (draft: "Grade 4 · 28 stars · 12 clusters · largest 4.NF") |
| `ruler.frontier` | "{n} ready" |
| `seed.inner` / `seed.hs` | "{stream} begins in {firstRing}" / "No {stream} standards in the typical {course} course" |
| `datacheck.ok` / `.bad` | "Data check ✓" / "Data check: {n} issues" |
| `legend.row` | "{label} ({n})" |
| `about.body` | "{standards} standards: {k8} for grades K–8 and {hs} for high school across {cats} conceptual categories and {hsDomains} domains. {clusters} clusters and {subs} lettered parts. {prereq} prerequisite links and {conn} connection links, each with a short reason and a confidence level ({confSummary}). Titles, cluster titles and reasons are MAIS paraphrases; relationships are MAIS-authored interpretations, not part of the CCSS. The {practices} Standards for Mathematical Practice apply at every grade, so they sit at the core without links." (`confSummary` omits zero counts) |
| `about.demo` | "The journey layer shows a simulated Grade {grade} learner, not a real student." |
| `hint.coop` | "Tap the map to explore · pinch or Ctrl+scroll to zoom" |

## 12. Audit findings → fixes

**Concept 3.0 behaviour**
- UB-1, U8 (fog stuck): one immutable view state, `{camera, selection, trace, course, path, filters, journeyOn, demoState}`. Every control is a pure transition followed by one render. There is no fog layer.
- UB-2 (frontier preset): bounding-box presets (§4); test 17 asserts 100% of members are in frame.
- UB-3, U3 and the label-clipping warning: the circle fit includes rim labels; test 16 asserts 385 of 385 stars and 5 of 5 rim labels are visible.
- UB-4 (tooltip): measure after fill, then flip and clamp on both axes.
- UB-5, F5 and the non-primary-buttons warning: a pointer Map, primary mouse button only, and one end handler for up, cancel and lost capture.
- UB-6: any input cancels a flight.
- UB-7, F3, U5 and the wheel-trap and anchor-drift warnings: the app shell has no document scroll, and the wheel listener sits on the stage. Cooperative mode applies only when a page scroll exists. Zoom is cursor-anchored.
- UB-8 (occlusion): nearest-star hit testing; only the reserved corners sit over the stage.
- UB-9, U1, U2, F7 (HUD collisions, card below the fold): grid shell, no floating cards, and a pairwise-overlap test.

**Concept 3.0 data**
- UD-1 (17 constellations): the atlas is computed from complete constellations.
- UD-2, UD-3, UD-4 (stale copy): §11 copy table, a digit scan, and a check that numbers match `facts`.
- UD-5, UD-6 (merged HS domains, fake codes): 22 real HS domains; codes come only from data.
- UD-7 (legend gaps): the legend is generated from the §6.3 glyph table with live counts; the lit swatch shows all 5 hues.
- UD-8 (STUDENT_GRADE unused): `learner.grade` drives state, presets and copy.

**Concept 3.0 layout and robustness**
- U4 (tiny labels): screen-pixel labels at ≥ 12 px with per-cell LOD.
- U6: stage `overflow: clip`; tooltip transform from 0,0.
- U7: solid background.
- U9: global reduced-motion rule.
- F1 (WebKit drag selection): no SVG text; `user-select: none`; canvas pointerdown `preventDefault`.
- F2, F8 (filters): no filters at all; gradient sprites; budgets; `?perf` and `?selftest`.
- F4 (touch): pinch with re-baselining, double-tap, cooperative `touch-action`.
- F6 (keyboard): roving map, tree, listbox twin, search.
- F9 (contrast): faint `#8f9abf` at 7.0:1.
- Stale tooltip in the accessibility tree: `aria-hidden` plus emptied.
- Cross-engine differences: one canvas path, identical in both engines.

**Star ladder and app drift**
- F1: Current is an overlay and the mission is never counted.
- F2: "needs a 3-correct streak to count".
- F3: 1.35 brightness, 0.55 opacity.
- F4: slate undiscovered style.
- F5: highlight .96, glow, inner .65, border .20.
- F6: Locked overlay at < 0.65, naming the weakest prerequisite.
- Ladder-render F1–F5 and source-fidelity F1–F2: explicit `body {font-size: 14px}`, no nbsp runs, no fixed min-width, glyph wells, overflow tests at every breakpoint.

**Critic gaps**
- Headed Chrome 152 at DPR 2 (test 65).
- Real Safari 26 checklist and `?selftest` (tests 70–73).
- `?figure&freeze` (test 74).
- Vocabulary aligned with `lib/mathUniverseMap.ts` and `knowledgeGalaxyMap.ts`: "sealed" and "charted" are dropped.
- Print outline (test 78).
- CVD emulation screenshots (test 42).

## 13. Judges' fatal flaws → resolutions

**Scope (all three judges)**
- §0 cuts and P0/P1/P2 phasing with line budgets.

**Embedded wheel and pan-y hurting children (J1)**
- App shell: wheel zoom and one-finger pan work by default.
- About moves into a dialog.
- Cooperative mode applies only when a page scroll exists.
- The phone stage fills to the sheet (390×516, not 390×390) and defaults to My mission.

**Uneven HS course rings and empty cells (J1, J3)**
- The pitch-guaranteed solver sizes each ring from its densest cell: Algebra I and Geometry get 2 rows, the others 1.
- Empty cells become labelled seed lanes.
- Clusters that span courses are drawn as two labelled pieces (13 on the draft), and the card says so.
- Every HS label says "typical course (traditional pathway)".

**HS→HS links running along rings (J3)**
- They are same-course facts (154 of 208).
- Drawn locally at L2+ or on focus, using an outward-bulging lane curve.
- Aggregated by plate on the backbone.

**Spatial memory (J1)**
- Fixed widths, fixed twist and a frozen order.
- Layout depends only on the data counts.

**Unstable star under a lit descendant (J1)**
- Validation V16 plus a curated seed with 0 contradictions on the draft.

**Default view shows little of the graph (J2)**
- Every tier prints shown/total counts.
- The backbone covers 264 of 398 cross-plate links.
- P2 adds All links and the edge ledger.

**Title-keyword test for data clusters (J2)**
- Replaced by an explicit id list checked by V13.

**Small transitive-reduction gain (J2)**
- Transitive reduction is dropped.
- Depth control plus the > 60-member collapse replaces it.

**Rendering (J3)**
- A separate fx canvas means no 30 fps world redraw.
- The nebula is cropped to the visible rectangle.
- About 40 MB of canvases.
- The governor replaces mid-flight backing-store resizes.
- `deviceMemory` is not used.
- Paths are constant-width, with no per-frame ribbon rebuilds.

**Inconsistent zoom figures (J3)**
- One computed table (§4).

**Orbit Atlas's locked-rule error**
- Locked = any direct prerequisite below 0.65, which matches `knowledgeGalaxyMap.ts:407`.

**Coherence Atlas (formal base) structural flaws**
- The grade × lane grid read as a wiring diagram: replaced by the radial Starways galaxy (§3).
- The single HS column lost the time axis: replaced by course rings, so 0 links point inward on the draft.
- Measurement MD was filed under Statistics: the K–5 data clusters move to the D stream by id, and measurement MD stays in G, which the draft links support (measurement MD feeds 6–8 G).
- The phone overview was 6 px tiles: replaced by a 318 px circle fit and the My mission default.
- The learner layer was off by default and the ignition demo was deferred: the journey layer is on by default and Launch ships in P1.

**Safari unmeasured (all three)**
- `?selftest`, plus the manual checklist in tests 70–73.

## 14. Risks and open questions

1. The data is still a draft. All numbers are recomputed at load, but the look shifts when counts change. Pitch q is recomputed, and zoom thresholds follow automatically.
2. Course rings imply a single pathway. Mitigations: labelling, the card note, and the "Rings" filter, which lets users collapse HS visually through the dim option.
3. Phones need 7× zoom for codes and 17× for titles, so reading on phones relies on search, the list, the card and My mission. Test this with children.
4. The Grand Road names are editorial. The card says "named by MAIS". A second road per stream depends on the 0.4 threshold.
5. The canvas and its accessibility twin could drift. Both are generated from the same arrays; V15 and test 9 guard parity. `role=application` needs VoiceOver checks.
6. The official URL pattern could not be verified offline (Cloudflare challenge). `OFFICIAL_BASE` is a single constant.
7. The practice titles in the dataset are the official headings, which are short. Consider paraphrasing them.
8. Single-file maintenance, about 3,000 lines: keep layout, graph and learner code as pure functions so they can be ported to `lib/`.
9. A reviewer could mistake the demo learner for real data. It is badged everywhere and `about.demo` explains it.
10. The next-mission rule runs lowest ring first, which sends a Grade 4 learner back to Grade 3 confirming stars. This is honest to the app, but confirm it with the owner.

## 15. Test checklist (verifiers)

Environments:
- Playwright with the headed Chrome channel, DPR 2, at 1512×860, 1024×700, 768×960, 390×664 and 844×390.
- Real Safari 26 for tests 70–73.
- Hooks: `window.__galaxy`, `?check`, `?receipt`, `?perf`, `?selftest`.

**Data and facts**
1. The file loads from `file://` with zero network requests (request log is empty apart from the file).
2. `ccss-data` has exactly the §1 keys on every record; the practices are MP1–MP8.
3. `facts` equal an independent recount from the JSON: standards, K–8 vs HS, per-HS-category counts, 22 HS domains, 147 clusters, subs, prerequisite and connection links, confidence tallies.
4. V1–V16 results in the receipt match an independent Python validation (validate4 rules). The Data check chip shows the issue count.
5. The prerequisite direction invariant (outward/along/inward) matches a recount. The outward-or-along sentence appears only when inward = 0.
6. Each of the 6 DATA_MD ids exists; the 8 data MD standards are in stream D.
7. Every official link matches the §1 pattern for its id and sub-standard.
8. A copy-digit scan of the rendered DOM text (excluding `<kbd>`, codes and ids from data, "K–12", "Concept 4.0") finds 0 digits not produced by `fmt`. Every number in the HUD, About and captions equals the corresponding `facts` or state value.
9. Search, tree and listbox together cover 385 of 385 standards and 124 of 124 subs (parity).

**Layout**
10. The positions from `__galaxy` match the §3 reference implementation (`layout3.mjs`) within 0.01 wu.
11. The minimum centre-to-centre distance is ≥ q − 0.5, and there are no duplicate positions.
12. All stars lie within R_CORE ≤ r ≤ R_OUT. Every star's angle lies inside its stream wedge for its ring.
13. Reading order: within each block, θ increases (then r) with the standard number.
14. HS pieces: 13 split clusters show the "part i of 2" label and the card note.
15. Dark lanes: for each ring, no star lies within the 3° lanes or the 8° seam.

**Camera, level of detail, labels**
16. At initial load (stage ≥ 700 px), all 385 star centres and 5 of 5 rim labels are inside the stage and outside the reserved rects.
17. Each preset puts 100% of its member stars inside the safe rect.
18. Wheel zoom keeps the world point under the cursor within 2 px. Pinch keeps the midpoint within 2 px, with no jump when a finger is added or lifted.
19. Level thresholds match σ (22/48/110) with hysteresis. A ±5% oscillation around a threshold causes no level change.
20. No rendered canvas label is smaller than 12 px (13 px on phones). No two placed labels overlap (rectangles from the placement log).
21. At L3 in the tightest cell, titles appear at the §4 zoom figures ±10%.
22. The ambiguity tap (two stars within 22 px) zooms instead of selecting.

**Relationships**
23. At L0 exactly the computed Grand Roads are drawn. Each hop has w ≥ 1, and the road cards list the correct link counts.
24. The Fraction Road on the draft equals 3.NF → 4.NF → 5.NF → 6.RP → 7.RP.
25. The backbone count and caption equal the recount (119 roads / 264 of 398 on the draft).
26. The local-links cap is 60, and the caption shows the true in-view total.
27. Hover or focus on 4.NF.B.3 draws exactly its direct needs, unlocks and connections, with the correct colours and arrows. Non-members are at 25%.
28. Select shows numbered badges that match the card list order.
29. Portals appear for off-screen neighbours, never inside the reserved rects, and clicking one frames both stars.
30. Trace roots of 7.RP.A.2 at depth All: 102 members, 11 generations, "showing 102 of 157 links" (draft). "Show all" draws 157.
31. Trace of HSF-TF.C.9 (> 60 members) collapses generations ≥ 4 into plate roads; the caption counts stay true.
32. Filters: the confidence "High only" count equals the recount. Hidden endpoints remove links. Roads and backbone recompute. The search chip shows "hidden by filter".
33. Plot a course to 5.NF.B.4: the stops equal uncounted ancestors ∪ D in topological order, and the caption counts match.
34. (P2) Path between 3.NF.A.1 and 5.NF.B.4 matches desc ∩ anc on the visible (filtered) graph. A pair with no prerequisite path in the data shows `path.none`. A pair whose only paths run through stars or links the current filters hide shows `path.noneFiltered` ("No visible path from {a} to {b} with the current filters.") instead.

**Learner layer**
35. Demo statuses equal the §6 rules for every star. Draft tallies: 92/5/3/2/2/281; counted 97; Ready 10; locked 271; complete 15 of 65.
36. 0 counted stars have a prerequisite below 0.65. The mission 4.OA.B.4 is igniting and not locked.
37. Locked cards name the weakest unmet prerequisite (4.NF.A.1 → 3.NF.A.3 48%).
38. Mission HUD "why", "unlocks" (1 direct, 71 later, through Fourth year (+)) and the route (3.OA.D.8, 3.G.A.2, 3.NF.A.3) match the recount.
39. Launch: counted becomes 98; newly Ready = [6.NS.B.4]; next mission 3.OA.D.8; the live region text equals `launch.done`. Reset restores the seed exactly.
40. The legend lists every rendered state and overlay with live counts, and the Lit swatch shows 5 hues.
41. Journey off removes status glyphs, ship and learner copy. `aria.learner.off` is used.
42. The glyph shapes differ per state in CVD emulation (protanopia, deuteranopia, tritanopia, achromatopsia screenshots at L2).

**Search, keyboard, accessibility**
43. The queries "4.NF.B.3", "4nf3", "HSA-SSE.A.1", "a-sse.1", "asse1", "4.NF.3c", "4.NF.B", "mp3", "times", "grade 4 area" return the expected first result. "times" shows "matched: multiply".
44. Enter on a result flies to it, selects it and opens the card. The popup closes and the query stays; focus moves to the card heading (on phones, into the card in the sheet), and the live region says `live.selected` ("4.NF.3 selected; its card is in the Star tab."). Focusing the field again reopens the popup; there Esc closes it, then a second Esc clears the query.
45. Keyboard only: Tab reaches the map. Arrow keys visit every star in a ring. ↑/↓ change ring. PageUp/PageDown cycle clusters. `[ ] \` walk relations. `, .` walk moons: each part becomes the active option (`aria-activedescendant`) and, while the map has focus, is not also spoken in the live region. R/B/D/C/J/F/L/?/0/+/− work. All stars are reachable without a mouse (scripted walk covers 385).
46. `aria-activedescendant` always references an existing listbox option whose name equals `aria.star`.
47. Roving focus is announced once, through `aria-activedescendant` (the option name is `aria.star`); the live region does not echo it while the map has focus, and speaks the star only when there is no new option to hear (the same star again, or the map is not focused). The live region announces the search result count once typing pauses (700 ms), and launch, trace, course and filter results.
48. The tree supports aria-level, setsize, posinset and expanded, typeahead by code, and Enter syncs the map.
49. Every DOM control has a visible focus ring ≥ 3:1. Dialogs trap focus, close on Esc, and return focus to their trigger.
50. Contrast: sampled text colours meet the §10 ratios on their actual grounds.
51. The hover tooltip is `aria-hidden` and empty when hidden, and never extends outside the stage.

**Input and scrolling**
52. App mode: document `scrollHeight == clientHeight` at all 5 viewports. Wheel over panels scrolls the panels, not the camera.
53. `?embed=1` in a scrolling host page: plain wheel scrolls the page until the map is engaged, Ctrl+wheel zooms, and a vertical touch swipe scrolls the page before a tap.
54. Right- and middle-button drags do not pan. After `pointercancel` or `lostpointercapture`, a mouse move does not pan.
55. Input during a flight takes over within one frame.
56. Double-click zooms ×2 at the point; Shift+double-click zooms ×0.5.
57. Deep link `#s=4.NF.B.3&t=roots&d=2` restores that selection and trace from `file://`. Back/Forward walks selections. An unknown id shows a toast.

**HUD and responsive**
58. Pairwise intersection of persistent HUD boxes (header, rails, dock, sheet peek, breadcrumb, zoom stack, hint) = 0 at all 5 viewports.
59. There is no horizontal overflow anywhere. Long codes and reasons wrap.
60. The phone sheet's half and full states update the camera inset, and the selected star stays unobscured. The full state makes the stage inert.
61. Phones default to My mission after the intro flight; under reduced motion they cut to it. Ring pills show alternate rings plus ring 4.
62. The landscape 844×390 layout has no overlaps and the stage is at least 508×330.
63. Touch targets ≥ 44 px (automated scan of interactive elements).

**Rendering, performance, cross-browser**
64. 0 uses of CSS `filter`, `backdrop-filter`, SVG filters, `ctx.filter` or `shadowBlur` (source scan plus runtime `getComputedStyle` scan).
65. Headed Chrome 152 at DPR 2, XL: `?selftest` flight p95 ≤ 18 ms, worst ≤ 25 ms; `?perf` draw p95 ≤ 8 ms at L0–L2 and ≤ 12 ms at L3.
66. Load timings: parse+layout ≤ 60 ms, first frame ≤ 250 ms, assets ≤ 150 ms (performance marks).
67. The fx loop stops when idle 30 s, when the tab is hidden, and under reduced motion (rAF count stays flat).
68. The world canvas does not redraw during ambient-only animation (draw counter unchanged while fx runs).
69. Backing store ≤ 8.5 MP per canvas and does not change during a flight.
70. Safari 26 (manual): dragging 100 px from 10 start points, including labels and HUD edges, never leaves a text selection or tints the stage.
71. Safari 26: trackpad pinch zooms the map, not the page. Ctrl+wheel is not double-applied.
72. Safari 26: `?selftest` flight p95 ≤ 20 ms. Glows render identically to Chrome (side-by-side screenshot).
73. Safari 26 / iOS: sheet vs dynamic toolbar, `100dvh`, VoiceOver reads `aria.star` while roving.
74. Visual regression screenshots at 5 viewports × journey on/off × L0/L2 are captured with `?figure&freeze=0`.

**Reduced motion**
75. With `?reduced=1` and with emulated `prefers-reduced-motion`: 0 running CSS animations or transitions, flights are instant, and the fx loop is inactive.
76. Toggling the OS setting live switches behaviour without a reload.
77. All state glyphs remain distinguishable statically (screenshot diff against the motion build at phase 0).

**Print**
78. Print emulation hides the canvases and HUD and prints an outline containing all 385 codes with official URLs.

## 16. Groups first, the learner's region, collapsible panels, 2.0 shapes (2026-09-19 revision)

Why: two owner findings on the shipped 4.0. (1) Its design language (shapes and lines) had drifted from Knowledge Galaxy 2.0 and 3.0: beads, geometric marks, wedges, curved arrows and capsule labels instead of sparkle stars, straight constellation lines and named nebulae. (2) At the default view the stars sat too close: a median 18 px to the nearest neighbour on a laptop (2.0: 71 px), 12 px on a tablet. The layout (§3) already spreads 385 stars as far as one circle allows, so the fix is to show fewer things at once. The layout, the data, the graph, the learner rules and every `facts` value are unchanged.

**16.1 Constellation bodies (supersedes "one sprite per star" in the §4 L0–L1 rows)**
- The unit is the **plate** (§2): 83 bodies for the 65 constellations. A constellation that spans two course rings, or K–5 MD's measurement and data halves, is two bodies, because those stars sit in different places.
- **Split rule, per cell** (ring × stream, as the levels): a cell draws its plates as bodies until its stars would stand `SPLIT_T = 44` px apart (`σ = pitch·s`). Hysteresis as §4: open at ≥ 1.1·T (48.4 px), close at < 0.9·T (39.6 px); at the maximum zoom the up threshold is T. So L2 (codes, from 52.8 px) always implies open, and a fly-to (§7.2, σ = 52) always lands on open stars.
- **Forced open, whatever the zoom:** the cells of the focused star and its direct neighbours (selection, hover preview, keyboard roving star), of every trace member, course stop and path member, and of a pending path start. Trace, course, path, badges, portals and keyboard walking therefore behave exactly as before; their stars are simply the only ones drawn star by star at low zoom.
- **Transition:** `openT` eases 0 → 1 in 240 ms (smoothstep). Stars fly out of the body's centre while it fades; labels of the state being left are held back and placed again as the cell settles. A cut under reduced motion, with `?freeze`, and before the first frame. Hit tests, labels and captions follow the target state at once.
- **Body position and size:** the plate centroid; radius `clamp(0.3·nn·s, 1.6, clamp(4 + 9.5·s, 6, 13)) × sz`, where `nn` is the distance to the nearest other plate centre and `sz = clamp(0.86 + 0.045·√n, 0.9, 1.12)`. Since the radius is at most 0.336 of the way to the nearest body, two discs never touch at any scale.
- **Body look, journey on:** complete (every star counted) = the stream's lit sprite with a four-point sparkle; in progress (any star counted or attempted) = the igniting dark core, overlaid with the lit sprite at an alpha equal to the share counted, inside a progress ring (1.55 r, from 12 o'clock) of that share; not started = the slate undiscovered sprite at 0.72 r. At most one mark rides on a body, the most useful first: mission (white core, dashed ring, ship), a star to repair (rose notched ring, 2 r), a review due (amber dashed halo, 2 r), a star that is Ready (diamond, 1.8 r). Animated marks run on the fx canvas as for stars. Journey off: the lit sprite at 85% with a sparkle.
- **Dimming and filters:** bodies dim like non-member stars under a focus (18–25%), a trace or a path (12%); a body whose stars are all filtered out dims to 15% or, in Hide mode, is not drawn and cannot be picked.
- **Pointer:** `hitBody` picks the nearest closed body within `max(14 px, r + 5)` (22 px for a finger). Hover shows a tooltip (name · stars and lit count · "Select it or zoom in to open it", under the same WCAG 1.4.13 rules as every tooltip, key `c:<plate>`), lights its nebula, names it and lights the constellation roads into and out of it with their arrowheads. A tap or click **opens** it: the camera frames its stars at a scale between "just open" (1.14·T / pitch) and a comfortable 72 px pitch, and its card (kind `plate`: name, domain title, stars and clusters, ring, lit count, Ready/review/repair counts, member list) fills the Star tab without opening a collapsed panel or the phone sheet. While a path destination is being picked, a tap only opens the body.
- **Keyboard and screen readers:** unchanged. Bodies are a visual aggregation only; the roving star, the listbox twin, the tree and search address stars, and the roving star's cell is forced open.
- **Anchors:** the route, the review branch, the launch burst, the ship flight and the Ready twinkle use `anchorOf(star)`: the star, or its constellation's body while its cell is closed.
- **Caption:** "Showing {closed} of {plates} constellations as single bodies; zoom in or select one to open it" while any cell is closed.

**16.2 The 2.0 shapes**
- **Sparkle stars:** a lit star sparkles whenever its cell is open by zoom (from 48.4 px), not only from L2; journey-off stars too.
- **Constellation lines:** straight lines along each open plate's Euclidean minimum spanning tree (a tree never crosses itself). Journey on: a line lights in the stream hue (62%, 1.4 px) when both of its stars are counted, otherwise faint slate (26%, 1.1 px), so figures light up as the learner masters them; journey off: stream hue at 36%. They follow the stars while a cell opens and step back to 40% under a focus and 25% under a trace or path. Lines to filtered stars are left out.
- **Named nebulae:** the baked sky carries one soft oval per plate, turned along its ring (semi-axes = the plate's extent along and across the ring + 0.95 q, alpha 0.10 → 0). A live layer of stretched stream-hue sprites (no filters) brightens a complete constellation (+0.13), the mission's (+0.10) and the hovered one (+0.14). A closed constellation's name sits beside its body: the plate label (13/800, stream hue) over a progress line (12 mono/600: "{c} of {t} lit", gold "… · complete"). How much a body says follows its room and its distance from the learner's grade: both lines for the learner's grade, the mission and the hovered body (and the grades beside it from 120 px of room); the name for the grades beside it (others from 70 px); otherwise the code (a K–5 MD body keeps its half). The mission's and the hovered body are named at every level, L0 included; the rest from L1. When a plate is open the §4 plate label names it as before.
- **Route:** the dashed route rides on a soft wide glow (7 px at 12% of its alpha), as in 2.0.
- **Quieter 4.0 line-work, so the shapes above lead:** constellation roads (backbone) at 60% with no arrowheads at rest — the hovered road, and the roads of the hovered body, keep theirs; links in view (L2+) at half their alpha with no arrowheads (a focused star still draws its links in full with arrowheads); hull fills ×0.7 and hull strokes ×0.65; the Year Ruler's gold lit arcs at 17% instead of 30% at L0–L1; cluster labels move from L2 to L3. Direction is still never colour-only: Grand Roads, focus, trace and path links keep their arrowheads, and cards and hover pills spell "a → b".

**16.3 The learner's region (supersedes "Default camera" in §4)**
- The learner's grade with the grade below and the grade above. In a ring layout that is an annulus around the core, so the view is the disc out to the outer edge of grade + 1 (+ 0.6 q); the earlier grades sit inside it. Fitted by the §3.5 circle rule with a 16 px margin (12 px on compact stages) and no rim labels; like `s_fit` it is settled at each resize, so the view is reproducible. Draft: Grade 4 → K–5, k = 1.89 on a laptop. No region when there is no learner grade or grade + 1 is the outermost ring.
- **Default camera:** stages that are not compact open on the region when the journey is on (`?learner=0` and `?home=galaxy` open on the whole galaxy). Phones keep the whole-galaxy glimpse and the flight to My mission. An untouched camera re-fits the preset it rests on (`restKind`: region or galaxy) on resize; Back to the first history entry returns to it.
- **Controls:** a fourth zoom-stack button "My grade region" (ship in a dashed ring; hidden on compact stages, with the journey off, and when there is no region) and the `H` key. `0` and the fit button still show the whole galaxy.

**16.4 Collapsible panels (adds to §8)**
- Two header toggles (disclosure buttons, `aria-expanded`, `aria-controls`): the left rail (XL) and the panel host — the right rail at XL, L and landscape, the dock at M (its icon turns to a bottom panel). The phone sheet keeps peek, half and full.
- A collapsed panel is `hidden` and its grid track is dropped, so the stage takes its room and the ResizeObserver re-fits or keeps the camera as for any resize. No transition (a stage never resizes mid-flight).
- An action whose result lives in a panel brings it back: the List button, the skip link, the F and L keys, a search result, Enter on the map, starting a trace, a course or a path. A tap or click on a star or a body leaves a collapsed panel collapsed (as the phone sheet stays at peek); a tapped road opens its card, as it opens the phone sheet.
- The choice is remembered in `localStorage` (`mais-c4-panels`, inside try/catch); `?panels=LR` (1 shown, 0 collapsed) forces it; a figure never reads the stored choice.
- Measured effect: at 1512×860 the whole-galaxy circle stays 684 px with both panels collapsed, because the stage height limits the fit there; the stage widens 824 → 1488 px, so zoomed views show 80% more sky. At 1280×800 the circle grows 453 → 624 px (+38%).

**16.5 Measured result** (nearest-neighbour distance between what is drawn, default view)

| View | Before | Now |
|---|---|---|
| Laptop 1512×860 | 385 stars, median 18 px, min 14 | 51 bodies, median 39 px, min 23 |
| Tablet 768×960 | 385 stars, median 12 px | 58 bodies, median 28 px |
| Phone 390×664 after the intro | 239 stars, median 19 px | 53 bodies, median 22 px |
| Laptop, whole galaxy (`0`) | 385 stars, median 18 px | 83 bodies, median 24 px |

Individual stars are drawn only from 44 px of pitch. World draw time fell (wheel sweep p95 3.1 → 1.4 ms in Chrome 152).

**16.6 Tests added** (`?check` runs 79–83 itself)
79. `lod.codesOnlyInOpenCells`: no cell at L2+ is closed.
80. `lod.bodiesStandApart`: no two body discs on the stage come within 1 px, at all five viewports, region and whole galaxy.
81. `lod.bodiesPickedStarsNot`: a pointer at a body's centre picks that body; no star of a closed cell can be picked at its own spot.
82. `lod.captionCountsBodies`: the caption's count equals the recount of closed plates.
83. `home.learnerRegionInView`: resting on the region, every star of grade − 1 … grade + 1 is on the stage and clear of the reserved corners, and the learner's grade is named. `fit.allStarsAndRimLabelsVisible` and `ruler.everyRingPillAndGateway` then report pending; `?home=galaxy` runs them.
84. Unchanged behaviour, compared with the page before this revision by one script on both: deep-link trace (`#s=4.NF.B.3&t=roots&d=2`), trace of 7.RP.A.2, course to 5.NF.B.4, path 3.NF.A.1 → 5.NF.B.4, the ten §15-43 queries, learner tallies, Launch and Reset, a keyboard walk, a scripted walk that reaches 385 of 385 stars, `facts` and a hash of all positions are identical.
85. A selection made at the region zoom forces its own and its neighbours' cells open, numbered badges land on drawn stars, and clearing it closes them.
86. Hide mode removes the bodies of a filtered stream and they cannot be hovered; Dim mode keeps them at 15%.
87. Reduced motion: the page opens on the region, a body opens without easing (`openT` ∈ {0, 1}), 0 running animations.
88. Phone: a tapped body opens, its card is set, the sheet stays at peek, the peek names the constellation; a star of the opened constellation can then be tapped.
89. Body tooltip: hoverable, dismissible with Esc (then empty and hidden), `aria-hidden`.
90. Panels: both collapse to a 1488 px stage at 1512×860, their content is `hidden`, the choice survives a reload, `?panels=11` overrides it; the header has no overflow, overlap or target under 44 px from 320 to 1512 px wide.
91. Resize while untouched keeps resting on the region; after a user zoom it keeps k; `0` rests on the galaxy and `H` returns to the same region view as at load.

**16.7 Review fixes (PR #256, 2026-09-19)**
- **`H` with the journey off** shows the whole galaxy: the region is a learner view and its button is hidden then. An untouched camera that already rests on the region keeps it on resize, so toggling the journey never moves the map by itself.
- **A Hide filter that removes the keyboard star** (§5.4, §7.4) moves roving focus to the nearest star the map still draws, silently, with `aria-activedescendant`; no focus ring is drawn on a hidden star, its cell is not forced open, and Enter or Space on one announces `roving.none` instead of selecting it. The same runs when the learner layer or a course changes what "Ready & course only" hides.
- **A card that replaces a pinned star** (a constellation body, road, constellation road, cluster, constellation or practice) clears that star everywhere it is recorded: the twin's `aria-selected` option, the Trace tab, and the address (`s`, `t`, `p`). It is one pushed history entry, as clearing a selection is, so a reload or a shared link restores what is shown and Back returns to the star. A card that replaces nothing pushes nothing.
- **Filters that remove an open road or constellation-road card** refresh the phone peek row as well as the Star tab.
- The probes fail closed: `edge.mjs`, `edge2.mjs` and `edge3.mjs` exit non-zero on a failed assertion or a captured console or page error, and `check-x.mjs` counts an engine that cannot launch as a failure.

Tests (`probes/edge3.mjs`): 92. `H` with the journey off rests on the galaxy (k = 1) and returns to the region once it is on again. 93. After Hide + a stream off, roving has left the hidden star, the active descendant is an option, the ring shows and Enter selects a star of a drawn stream. 94. A body opened over `#s=4.NF.B.3&t=roots&d=2` leaves no selection, no selected twin option and no `s`, `t` or `p` in the address, and Back restores 4.NF.B.3; a constellation-road card opened from the List tab (no camera move) clears them at once. 95. On a phone, a road card removed by a filter no longer names the road in the peek row.

## Appendix A. Draft reference numbers (for cross-checking only; never embed)

- q = 40.89 wu. Stream widths N 69.766°, A 72.416°, G 98.909°, F 49.455°, D 49.455°.
- Ring radii as in §3.3.
- 57 non-empty cells; pitch min 40.9, median 50.9, max 61.3.
- Stream order costs: N·A·G·F·D 357; the next best are N·A·D·F·G and N·A·F·D·G at 362.
- 83 plates, 160 cluster pieces, 13 split HS clusters.
- Backbone "top-only": 119 roads.
- 7 Grand Roads.
- Traces:
  - 4.OA.B.4: roots 25, branches 72.
  - 7.RP.A.2: roots 102, branches 60.
  - 8.EE.C.7: roots 122.
  - HSG-SRT.C.8: roots 142.

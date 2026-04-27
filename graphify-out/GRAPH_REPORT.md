# Graph Report - /mnt/c/Users/kaioe/apps/fliptimer  (2026-04-24)

## Corpus Check
- Corpus is ~22,924 words - fits in a single context window. You may not need a graph.

## Summary
- 139 nodes · 205 edges · 20 communities detected
- Extraction: 70% EXTRACTED · 30% INFERRED · 0% AMBIGUOUS · INFERRED: 61 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Preset Data and UI Logic|Preset Data and UI Logic]]
- [[_COMMUNITY_Toolbar and Sound Manager|Toolbar and Sound Manager]]
- [[_COMMUNITY_Storage and Settings|Storage and Settings]]
- [[_COMMUNITY_HTML DOM Structure|HTML DOM Structure]]
- [[_COMMUNITY_UI Settings Components|UI Settings Components]]
- [[_COMMUNITY_Fliptimer Clock Core|Fliptimer Clock Core]]
- [[_COMMUNITY_Build Scripts (dist)|Build Scripts (dist)]]
- [[_COMMUNITY_Color Utilities|Color Utilities]]
- [[_COMMUNITY_Build and Deploy Pipeline|Build and Deploy Pipeline]]
- [[_COMMUNITY_BrowserSync Middleware|BrowserSync Middleware]]
- [[_COMMUNITY_Prep Countdown Tests|Prep Countdown Tests]]
- [[_COMMUNITY_Entry Point (fliptimer.js)|Entry Point (fliptimer.js)]]
- [[_COMMUNITY_Playwright Config|Playwright Config]]
- [[_COMMUNITY_Browser Console Script|Browser Console Script]]
- [[_COMMUNITY_Preset Save Tests|Preset Save Tests]]
- [[_COMMUNITY_E2E Test Specs|E2E Test Specs]]
- [[_COMMUNITY_App Container|App Container]]
- [[_COMMUNITY_Responsive Design|Responsive Design]]
- [[_COMMUNITY_Preset Feature|Preset Feature]]
- [[_COMMUNITY_Testing Framework|Testing Framework]]

## God Nodes (most connected - your core abstractions)
1. `initPresetTimers()` - 27 edges
2. `applySoundsFromJsonRoot()` - 9 edges
3. `5-Second Prep Countdown` - 8 edges
4. `syncPresetJsonToProjectFile()` - 7 edges
5. `resolveSoundUrlForKind()` - 6 edges
6. `syncPresetFileDropFromInput()` - 6 edges
7. `main()` - 5 edges
8. `normalizePreset()` - 5 edges
9. `snapPresetMinutesToStep()` - 5 edges
10. `getPresetTrackMax()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `BJJ Training Background Image` --complements--> `Dark Theme UI`  [INFERRED]
  imgs/background.webp → README.md
- `BJJ Training Background Image` --configured_by--> `Background Image Settings`  [EXTRACTED]
  imgs/background.webp → index.html
- `ES Module Split Architecture` --rationale_for--> `Sass/SCSS Build Pipeline`  [INFERRED]
  docs/plans/2026-04-18-es-module-split.md → README.md
- `initPresetTimers()` --calls--> `setPresetTrackMax()`  [INFERRED]
  /mnt/c/Users/kaioe/apps/fliptimer/src/presets-ui.js → /mnt/c/Users/kaioe/apps/fliptimer/src/storage.js
- `initPresetTimers()` --calls--> `assignFileToInput()`  [INFERRED]
  /mnt/c/Users/kaioe/apps/fliptimer/src/presets-ui.js → /mnt/c/Users/kaioe/apps/fliptimer/src/sound-manager.js

## Hyperedges (group relationships)
- **Preset Modal Components** — indexhtml_preset_modal, indexhtml_preset_form, indexhtml_sound_settings, indexhtml_bg_settings, indexhtml_counter_size [EXTRACTED 1.00]
- **FlipTimer Core Features** — readme_flip_clock_design, readme_responsive_touch, readme_customizable_presets, readme_sound_effects, readme_dark_theme [EXTRACTED 0.90]
- **Clock ↔ Countdown Mode Transitions** — plan_clock_first_mode, plan_rebuild_face, plan_clock_countdown_transition, prep_countdown_mechanism [EXTRACTED 0.85]

## Communities

### Community 0 - "Preset Data and UI Logic"
Cohesion: 0.11
Nodes (22): applyAppBackgroundState(), blobToDataUrlString(), cssUrlTokenForBg(), dataUrlToBlob(), encodeCanvasToBlob(), fetchPresetTimersDocument(), formatPresetMinuteLabel(), formatPresetMinuteSliderLabel() (+14 more)

### Community 1 - "Toolbar and Sound Manager"
Cohesion: 0.15
Nodes (18): getLocalTimeHhMmString(), getAppBackgroundDataUrlForSync(), syncPresetJsonToProjectFile(), assignFileToInput(), baseHrefForSoundRelativeUrl(), fliptimerUnlockHtmlAudioIfNeeded(), getFliptimerSharedAudioContext(), playFliptimerSound() (+10 more)

### Community 2 - "Storage and Settings"
Cohesion: 0.14
Nodes (16): applySoundsFromJsonRoot(), normalizeSoundDataUrlFromDoc(), applyCounterSizePct(), emptyPreloadedSoundSelections(), loadCounterSizePct(), loadPreloadedSoundSelectionsFromStorage(), loadPresetTrackMax(), refreshPresetCounterSizeRangeFills() (+8 more)

### Community 3 - "HTML DOM Structure"
Cohesion: 0.13
Nodes (20): Countdown Display (.countdown), jQuery CDN Dependency, Sound Settings Panel, FlipTimer Toolbar, Clock-to-Countdown Mode Transition, Clock-First Mode Design, Colon Separator CSS Logic, ES Module Split Architecture (+12 more)

### Community 4 - "UI Settings Components"
Cohesion: 0.22
Nodes (9): BJJ Training Background Image, Active Preset Info Panel, Background Image Settings, Color Picker Popover, Counter Size Slider, Preset Timer Form, Preset Settings Modal, Dark Theme UI (+1 more)

### Community 5 - "Fliptimer Clock Core"
Cohesion: 0.29
Nodes (0): 

### Community 6 - "Build Scripts (dist)"
Cohesion: 0.6
Nodes (5): copyDirRecursive(), copyFile(), main(), rmrf(), transformHtmlForDist()

### Community 7 - "Color Utilities"
Cohesion: 0.8
Nodes (4): applyCounterContrastFromPresetColor(), flipDigitContrastFromBgHex(), normalizeHexColor(), relativeLuminanceFromHex()

### Community 8 - "Build and Deploy Pipeline"
Cohesion: 0.4
Nodes (5): BrowserSync Dev Server, Distribution Bundle (dist/), fliptimer.json Preset Seed, GitHub Pages Deployment, Sass/SCSS Build Pipeline

### Community 9 - "BrowserSync Middleware"
Cohesion: 0.67
Nodes (0): 

### Community 10 - "Prep Countdown Tests"
Cohesion: 0.67
Nodes (0): 

### Community 11 - "Entry Point (fliptimer.js)"
Cohesion: 1.0
Nodes (0): 

### Community 12 - "Playwright Config"
Cohesion: 1.0
Nodes (0): 

### Community 13 - "Browser Console Script"
Cohesion: 1.0
Nodes (0): 

### Community 14 - "Preset Save Tests"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "E2E Test Specs"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "App Container"
Cohesion: 1.0
Nodes (1): Main Container (.container)

### Community 17 - "Responsive Design"
Cohesion: 1.0
Nodes (1): Responsive Touch Support

### Community 18 - "Preset Feature"
Cohesion: 1.0
Nodes (1): Customizable Timer Presets

### Community 19 - "Testing Framework"
Cohesion: 1.0
Nodes (1): Playwright Testing

## Knowledge Gaps
- **16 isolated node(s):** `Main Container (.container)`, `Counter Size Slider`, `Color Picker Popover`, `Flip-Clock Design Feature`, `Responsive Touch Support` (+11 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Entry Point (fliptimer.js)`** (1 nodes): `fliptimer.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Playwright Config`** (1 nodes): `playwright.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Browser Console Script`** (1 nodes): `browser-console.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Preset Save Tests`** (1 nodes): `test-preset-save-no-reload.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `E2E Test Specs`** (1 nodes): `fliptimer.spec.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `App Container`** (1 nodes): `Main Container (.container)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Responsive Design`** (1 nodes): `Responsive Touch Support`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Preset Feature`** (1 nodes): `Customizable Timer Presets`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Testing Framework`** (1 nodes): `Playwright Testing`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `initPresetTimers()` connect `Preset Data and UI Logic` to `Toolbar and Sound Manager`, `Storage and Settings`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **Are the 26 inferred relationships involving `initPresetTimers()` (e.g. with `loadActivePresetIdFromStorage()` and `loadSliderThumbsFromStorage()`) actually correct?**
  _`initPresetTimers()` has 26 INFERRED edges - model-reasoned connections that need verification._
- **Are the 7 inferred relationships involving `applySoundsFromJsonRoot()` (e.g. with `saveSoundSourceToStorage()` and `loadPreloadedSoundSelectionsFromStorage()`) actually correct?**
  _`applySoundsFromJsonRoot()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `5-Second Prep Countdown` (e.g. with `Female Eryn Voice Prompts` and `Sound Effects System`) actually correct?**
  _`5-Second Prep Countdown` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `syncPresetJsonToProjectFile()` (e.g. with `loadSoundSourceFromStorage()` and `loadPreloadedSoundSelectionsFromStorage()`) actually correct?**
  _`syncPresetJsonToProjectFile()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `resolveSoundUrlForKind()` (e.g. with `loadSoundSourceFromStorage()` and `loadPreloadedSoundSelectionsFromStorage()`) actually correct?**
  _`resolveSoundUrlForKind()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Main Container (.container)`, `Counter Size Slider`, `Color Picker Popover` to the rest of the system?**
  _16 weakly-connected nodes found - possible documentation gaps or missing edges._
# ES Module Split Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Split fliptimer.js (3608 lines, IIFE) into logical ES module files using native browser imports.

**Architecture:** Extract sections into separate files under `src/`. Each file exports its functions/constants. The main `fliptimer.js` becomes the entry point that imports everything and runs the bootstrap. jQuery is accessed via `window.jQuery` since it's loaded as a regular script tag.

**Tech Stack:** Vanilla JS ES modules, jQuery (window global), no bundler

---

## Module Structure

### File 1: `src/fliptimer-clock.js` (~440 lines)
- **Source:** Lines 1-439 of current fliptimer.js
- **Contains:** Module helpers (timeStringToComparableInt, comparableIntToMmSsString, prepStepToMmSs, transitionSupport), Fliptimer constructor, all prototype methods (createConfig, init, markup, tick engine, etc.)
- **Exports:** Fliptimer class, comparableIntToMmSsString, prepStepToMmSs
- **Imports:** none (uses `const $ = window.jQuery;` at top)

### File 2: `src/storage.js` (~350 lines)
- **Source:** Lines 445-630 of current fliptimer.js
- **Contains:** All localStorage key constants, track max constants/functions, counter size constants/functions, sound storage load/save functions
- **Exports:** All key constants, snapTrackMaxMinutes, loadPresetTrackMax, getPresetTrackMax/setPresetTrackMax, all load/save functions for sounds, PRESET_SOUND_KINDS, TRACK_MAX_MIN/MAX/STEP, COUNTER_SIZE_MIN/MAX/STEP
- **Imports:** none
- **Note:** The mutable variable `presetTrackMaxMinutes` needs getter/setter exports

### File 3: `src/sound-manager.js` (~200 lines)
- **Source:** Lines ~630-930 of current fliptimer.js
- **Contains:** Sound URL resolution (baseHrefForSoundRelativeUrl, preloadedFilenameToSoundUrl, resolveSoundUrlForKind), file input helpers (assignFileToInput, syncPresetFileDropFromInput, syncAllPresetFileDrops), audio context, FLIPTIMER_SILENT_WAV, FLIPTIMER_PREP_FLIP_MS/FLIPTIMER_PREP_FLIP_FALLBACK_PAD_MS/FLIPTIMER_COUNTDOWN_TICK_BUFFER_MS, getFliptimerSharedAudioContext, playPrepCountdownBeep, fliptimerUnlockHtmlAudioIfNeeded, playFliptimerSound
- **Exports:** All listed functions and constants
- **Imports:** loadSoundSourceFromStorage, loadPreloadedSoundSelectionsFromStorage, loadSoundsFromStorage from storage.js

### File 4: `src/colors.js` (~100 lines)
- **Source:** Lines ~930-1060 of current fliptimer.js
- **Contains:** PRESET_COLOR_SWATCHES, normalizeHexColor, relativeLuminanceFromHex, flipDigitContrastFromBgHex, applyCounterContrastFromPresetColor
- **Exports:** All listed
- **Imports:** none

### File 5: `src/presets-data.js` (~650 lines)
- **Source:** Lines ~1060-1730 of current fliptimer.js
- **Contains:** Preset data functions (generatePresetId, minutesToStartTime, normalizePreset, formatPresetMinuteLabel, loadPresetsFromStorage, savePresetsToStorage, loadActivePresetIdFromStorage, saveActivePresetIdToStorage, loadSliderThumbsFromStorage, normalizeSliderThumbState, slider math constants and functions), fetchPresetTimersDocument, normalizeSoundDataUrl, applySoundsFromJsonRoot, background image functions (BG_OPTIMIZE_MAX_EDGE, BG_JPEG_QUALITY, BG_WEBP_QUALITY, dataUrlToBlob, loadImageElementFromFile, encodeCanvasToBlob, optimizeImageFileForBackground, blobToDataUrlString, loadAppBgStateFromStorage, getAppBackgroundDataUrlForSync, cssUrlTokenForBg, applyAppBackgroundState, persistAppBgState, syncPresetJsonToProjectFile), presetActionIcon
- **Exports:** All listed functions and constants
- **Imports:** storage keys from storage.js, resolveSoundUrlForKind from sound-manager.js, SOUNDS_MANIFEST_URL, PRESET_JSON_FILE, DEFAULT_BG_FILE

### File 6: `src/toolbar.js` (~420 lines)
- **Source:** Lines ~1731-2153 of current fliptimer.js
- **Contains:** TOOLBAR_ICON_PLAY, TOOLBAR_ICON_PAUSE, FLIPTIMER_CHROME_IDLE_MS, initFliptimerChromeDimming, FLIPTIMER_IDLE_WALL_CLOCK_MS, initFliptimerToolbar (with prep countdown, idle wall clock, all inner functions)
- **Exports:** initFliptimerChromeDimming, initFliptimerToolbar
- **Imports:** Fliptimer-clock helpers (comparableIntToMmSsString, prepStepToMmSs), playFliptimerSound/playPrepCountdownBeep from sound-manager, FLIPTIMER_PREP_FLIP_MS/FLIPTIMER_PREP_FLIP_FALLBACK_PAD_MS from sound-manager

### File 7: `src/presets-ui.js` (~1385 lines)
- **Source:** Lines ~2155-3539 of current fliptimer.js
- **Contains:** initPresetTimers function and ALL its inner functions
- **Exports:** initPresetTimers
- **Imports:** Fliptimer from clock, all preset data functions, storage functions, sound functions, color functions, toolbar constants, counter size functions

### File 8: `fliptimer.js` (~100 lines) - Entry Point
- **Source:** Lines 3540-3608 of current fliptimer.js
- **Contains:** DOMContentLoaded bootstrap only
- **Imports:** Fliptimer from clock, all init functions, all constants needed for bootstrap

---

## Implementation Tasks

### Task 1: Create src/ directory and fliptimer-clock.js
- Extract lines 1-439 from fliptimer.js
- Remove the IIFE wrapper `(function ($, window) {` and `})(jQuery, window);`
- Add `const $ = window.jQuery;` at top
- Add `export` before Fliptimer class
- Export: Fliptimer, comparableIntToMmSsString, prepStepToMmSs
- Remove `window.Fliptimer = Fliptimer;` line

### Task 2: Create src/storage.js
- Extract storage key constants (PRESET_STORAGE_KEY etc.) and all load/save functions
- For `presetTrackMaxMinutes` (mutable): use module-level `let` with exported getter/setter
- Export all constants and functions

### Task 3: Create src/sound-manager.js
- Extract sound URL, audio context, and playback functions
- Add imports from storage.js
- Export all functions and constants (FLIPTIMER_PREP_FLIP_MS, etc.)

### Task 4: Create src/colors.js
- Extract color utility functions
- Export all

### Task 5: Create src/presets-data.js
- Extract preset data functions, slider math, background functions, JSON sync
- Add imports from storage.js and sound-manager.js
- Export all functions and constants

### Task 6: Create src/toolbar.js
- Extract chrome dimming, toolbar constants, initFliptimerToolbar (with ALL inner functions intact)
- Add imports from clock (comparableIntToMmSsString, prepStepToMmSs), sound-manager
- Export: initFliptimerChromeDimming, initFliptimerToolbar

### Task 7: Create src/presets-ui.js
- Extract initPresetTimers with ALL inner functions intact
- Add imports from all other modules
- Export: initPresetTimers

### Task 8: Rewrite fliptimer.js as entry point
- Replace entire file with ES module imports + DOMContentLoaded bootstrap
- Import from all src/ modules

### Task 9: Update index.html
- Change `<script src="./fliptimer.js?v=..."></script>` to `<script type="module" src="./fliptimer.js?v=..."></script>`
- Keep jQuery script tag as-is (non-module, loads first)

### Task 10: Update build-dist.mjs
- Add copy of `src/` directory into `dist/src/`
- The HTML in dist already points to `./fliptimer.js` which will work

### Task 11: Test
- Run `npm run build:dist` to verify build
- Verify the dist output has all files
- Do NOT commit yet (leave for manual verification)

---

## Important Notes

1. **jQuery access:** Each module that needs jQuery uses `const $ = window.jQuery;` at the top. This works because `<script>` tags for jQuery load before `<script type="module">` (modules are deferred).

2. **Closure variables:** Inner functions within initFliptimerToolbar and initPresetTimers keep their closure scope. We only change how the outer function gets its dependencies (imports instead of IIFE scope).

3. **Mutable state:** `presetTrackMaxMinutes` is the main mutable module-level variable. Use getter/setter pattern:
   ```js
   let _presetTrackMaxMinutes = loadPresetTrackMax();
   export function getPresetTrackMax() { return _presetTrackMaxMinutes; }
   export function setPresetTrackMax(v) { _presetTrackMaxMinutes = v; }
   ```

4. **Event handlers:** Functions like `fliptimerUnlockHtmlAudioIfNeeded` that are used as event handlers must be exported and imported where needed.

5. **No circular dependencies:** The dependency graph is one-directional:
   - clock → (none)
   - storage → (none)
   - sounds → storage
   - colors → (none)
   - presets-data → storage, sounds
   - toolbar → clock, sounds
   - presets-ui → clock, storage, sounds, colors, presets-data, toolbar
   - entry → all

/**
 * Storage — localStorage keys, load/save helpers.
 */
"use strict";

export const PRESET_STORAGE_KEY = "fliptimer-preset-timers-v1";
export const ACTIVE_PRESET_ID_STORAGE_KEY = "fliptimer-active-preset-id-v1";
export const PRESET_SLIDER_THUMBS_KEY = "fliptimer-preset-slider-thumbs-v1";
export const PRESET_TRACK_MAX_KEY = "fliptimer-preset-track-max-v1";
export const FLIPTIMER_COUNTER_PCT_KEY = "fliptimer-counter-pct-v1";
export const FLIPTIMER_SOUND_PRELOADED_KEY = "fliptimer-sound-preloaded-v1";
export const SOUNDS_MANIFEST_URL = "sounds/manifest.json";
export const SOUND_UPLOAD_URL = "/__fliptimer__/upload-sound";
export const SOUND_DELETE_URL = "/__fliptimer__/delete-sound";
export const FLIPTIMER_APP_BG_KEY = "fliptimer-app-bg-v1";
export const PRESET_JSON_FILE = "fliptimer.json";
export const DEFAULT_BG_FILE = "imgs/background.webp";

/**
 * One-time migration: copy old `flipclock-*` localStorage keys to `fliptimer-*`.
 * Runs silently on every load; no-ops once old keys are gone.
 */
const _OLD_TO_NEW = [
    ["flipclock-preset-timers-v1", PRESET_STORAGE_KEY],
    ["flipclock-active-preset-id-v1", ACTIVE_PRESET_ID_STORAGE_KEY],
    ["flipclock-preset-slider-thumbs-v1", PRESET_SLIDER_THUMBS_KEY],
    ["flipclock-preset-track-max-v1", PRESET_TRACK_MAX_KEY],
    ["flipclock-counter-pct-v1", FLIPTIMER_COUNTER_PCT_KEY],
    ["flipclock-sounds-v1", null],
    ["flipclock-sound-filenames-v1", null],
    ["flipclock-sound-source-v1", null],
    ["flipclock-sound-preloaded-v1", null],
    ["flipclock-app-bg-v1", FLIPTIMER_APP_BG_KEY],
];

const _OLD_SOUND_KEYS_TO_REMOVE = [
    "fliptimer-sounds-v1",
    "fliptimer-sound-filenames-v1",
    "fliptimer-sound-source-v1",
    "fliptimer-sound-preloaded-v1",
];

const _MIGRATED_BG_NO_FILENAME_KEY = "fliptimer-migrated-bg-no-filename-v1";

export function migrateLocalStorage() {
    for (var ri = 0; ri < _OLD_SOUND_KEYS_TO_REMOVE.length; ri++) {
        localStorage.removeItem(_OLD_SOUND_KEYS_TO_REMOVE[ri]);
    }
    for (var [oldKey, newKey] of _OLD_TO_NEW) {
        if (localStorage.getItem(oldKey) !== null) {
            if (newKey !== null && localStorage.getItem(newKey) === null) {
                localStorage.setItem(newKey, localStorage.getItem(oldKey));
            }
            localStorage.removeItem(oldKey);
        }
    }
    if (localStorage.getItem(_MIGRATED_BG_NO_FILENAME_KEY) === "1") {
        return;
    }
    try {
        var raw = localStorage.getItem(FLIPTIMER_APP_BG_KEY);
        if (raw) {
            var o = JSON.parse(raw);
            if (o && typeof o.dataUrl === "string" && o.dataUrl.indexOf("data:image/") === 0) {
                var fn = o.fileName;
                if (typeof fn !== "string" || fn.trim() === "") {
                    /* Legacy: first-run used to persist appBackgroundDataUrl from fliptimer.json without fileName. User uploads always set fileName. */
                    localStorage.removeItem(FLIPTIMER_APP_BG_KEY);
                }
            }
        }
        localStorage.setItem(_MIGRATED_BG_NO_FILENAME_KEY, "1");
    } catch (e) {
        try {
            localStorage.setItem(_MIGRATED_BG_NO_FILENAME_KEY, "1");
        } catch (e2) {
            /* ignore */
        }
    }
}
/** Keys for Timer settings → Sounds (must match `data-sound-kind` in HTML). */
export const PRESET_SOUND_KINDS = ["start", "pause", "finish"];

export const TRACK_MAX_MIN = 10;
export const TRACK_MAX_MAX = 60;
export const TRACK_MAX_STEP = 5;

export function snapTrackMaxMinutes(n) {
    var x = Number(n);
    if (Number.isNaN(x)) {
        return TRACK_MAX_MIN;
    }
    x = Math.min(TRACK_MAX_MAX, Math.max(TRACK_MAX_MIN, x));
    var steps = Math.round((x - TRACK_MAX_MIN) / TRACK_MAX_STEP);
    var snapped = TRACK_MAX_MIN + steps * TRACK_MAX_STEP;
    return Math.min(TRACK_MAX_MAX, Math.max(TRACK_MAX_MIN, snapped));
}

export function loadPresetTrackMax() {
    try {
        var raw = localStorage.getItem(PRESET_TRACK_MAX_KEY);
        if (raw === null) {
            return TRACK_MAX_MIN;
        }
        var n = Number(raw);
        if (Number.isNaN(n)) {
            return TRACK_MAX_MIN;
        }
        return snapTrackMaxMinutes(n);
    } catch (e) {
        return TRACK_MAX_MIN;
    }
}

let _presetTrackMaxMinutes = loadPresetTrackMax();

export function getPresetTrackMax() {
    return _presetTrackMaxMinutes;
}

export const COUNTER_SIZE_MIN = 5;
export const COUNTER_SIZE_MAX = 95;
export const COUNTER_SIZE_STEP = 5;
/** Matches `$preset-counter-thumb-half` / 20px thumb in `fliptimer.scss`. */
export const COUNTER_SIZE_RAIL_PAD_PX = 10;
export const COUNTER_SIZE_THUMB_PX = 20;

export function snapCounterSizePct(n) {
    var x = Number(n);
    if (Number.isNaN(x)) {
        return snapCounterSizePct(12);
    }
    x = Math.min(COUNTER_SIZE_MAX, Math.max(COUNTER_SIZE_MIN, x));
    var steps = Math.round((x - COUNTER_SIZE_MIN) / COUNTER_SIZE_STEP);
    var snapped = COUNTER_SIZE_MIN + steps * COUNTER_SIZE_STEP;
    return Math.min(COUNTER_SIZE_MAX, Math.max(COUNTER_SIZE_MIN, snapped));
}

export function setCounterRangeFillPct(inputEl, value) {
    if (!inputEl) {
        return;
    }
    var rail = inputEl.closest && inputEl.closest(".preset-counter-size-rail");
    if (!rail || !rail.style) {
        return;
    }
    var minAttr = parseInt(inputEl.getAttribute("min"), 10);
    var maxAttr = parseInt(inputEl.getAttribute("max"), 10);
    var min = Number.isNaN(minAttr) ? COUNTER_SIZE_MIN : minAttr;
    var max = Number.isNaN(maxAttr) ? COUNTER_SIZE_MAX : maxAttr;
    var v = Number(value);
    if (Number.isNaN(v)) {
        v = min;
    }
    v = Math.min(max, Math.max(min, v));
    var rw = rail.getBoundingClientRect().width;
    var span = max - min;
    var t = span > 0 ? (v - min) / span : 0;
    var thumbCenter = COUNTER_SIZE_RAIL_PAD_PX + COUNTER_SIZE_THUMB_PX / 2 + t * (rw - 2 * COUNTER_SIZE_RAIL_PAD_PX - COUNTER_SIZE_THUMB_PX);
    var fillW = Math.max(0, thumbCenter - COUNTER_SIZE_RAIL_PAD_PX);
    rail.style.setProperty("--preset-counter-fill-width", fillW + "px");
}

/** Refills both counter-size and track-max range inputs (same `.preset-counter-size-*` component). */
export function refreshPresetCounterSizeRangeFills() {
    var ids = ["fliptimer-counter-size", "fliptimer-preset-track-max"];
    for (var ii = 0; ii < ids.length; ii++) {
        var el = document.getElementById(ids[ii]);
        if (!el) {
            continue;
        }
        var v = parseInt(el.value, 10);
        if (Number.isNaN(v)) {
            continue;
        }
        setCounterRangeFillPct(el, v);
    }
}

/**
 * Max-minutes track: rebuild tick dots from the range input’s min/max/step (any values).
 * Sets inline `left: calc(2×pad + t×(100% − 4×pad))` (same geometry as SCSS / setCounterRangeFillPct) so layout works
 * while the settings panel is hidden and avoids `var(--tick-t)` inside `calc()` quirks in some engines.
 */
export const TRACK_MAX_TICK_PAD_PX = 10;

export function rebuildTrackMaxTicks(wrap) {
    if (!wrap) {
        wrap = document.querySelector(".preset-counter-size-wrap--track-max .preset-counter-size-ticks");
    }
    if (!wrap) {
        return;
    }
    var rail = wrap.closest && wrap.closest(".preset-counter-size-rail");
    var input = rail && rail.querySelector("input.preset-counter-size-input[type=range]");
    if (!input) {
        return;
    }
    var min = parseFloat(input.getAttribute("min"));
    var max = parseFloat(input.getAttribute("max"));
    var step = parseFloat(input.getAttribute("step"));
    if (Number.isNaN(min) || Number.isNaN(max)) {
        return;
    }
    if (Number.isNaN(step) || step <= 0) {
        step = 1;
    }
    wrap.innerHTML = "";
    var span0 = max - min;
    var nSteps = Math.max(0, Math.floor((max - min) / step + 1e-9));
    var pad = TRACK_MAX_TICK_PAD_PX;
    var innerPct = "(100% - " + 4 * pad + "px)";
    var i;
    for (i = 0; i <= nSteps; i++) {
        var v = min + i * step;
        if (v > max + 1e-9) {
            break;
        }
        v = Math.round(v * 1000) / 1000;
        var t = span0 > 0 ? (v - min) / span0 : 0;
        var span = document.createElement("span");
        span.className = "preset-counter-size-tick";
        span.style.left = "calc(" + 2 * pad + "px + " + t + " * " + innerPct + ")";
        span.setAttribute("data-value", String(v));
        span.setAttribute("aria-hidden", "true");
        wrap.appendChild(span);
    }
}

/** One span.preset-counter-size-tick per snap stop per rail; min/max/step from that rail’s range input (counter % only). Track-max ticks: skip here — `#preset-settings-frame` is hidden at load (0-width rail); **`rebuildTrackMaxTicks`** runs when Timer settings opens. */
export function initPresetCounterSizeTicks() {
    var wraps = document.querySelectorAll(".preset-counter-size-ticks");
    for (var wi = 0; wi < wraps.length; wi++) {
        var wrap = wraps[wi];
        if (wrap.closest && wrap.closest(".preset-counter-size-wrap--track-max")) {
            continue;
        }
        if (wrap.querySelector(".preset-counter-size-tick")) {
            continue;
        }
        var rail = wrap.closest && wrap.closest(".preset-counter-size-rail");
        var input = rail && rail.querySelector("input.preset-counter-size-input[type=range]");
        if (!input) {
            continue;
        }
        var min = parseInt(input.getAttribute("min"), 10);
        var max = parseInt(input.getAttribute("max"), 10);
        var step = parseInt(input.getAttribute("step"), 10) || 1;
        if (Number.isNaN(min) || Number.isNaN(max)) {
            continue;
        }
        for (var v = min; v <= max; v += step) {
            var span = document.createElement("span");
            span.className = "preset-counter-size-tick";
            span.setAttribute("data-value", String(v));
            span.setAttribute("aria-hidden", "true");
            wrap.appendChild(span);
        }
    }
}

export function loadCounterSizePct() {
    try {
        var raw = localStorage.getItem(FLIPTIMER_COUNTER_PCT_KEY);
        if (raw === null) {
            return snapCounterSizePct(12);
        }
        var n = Number(raw);
        if (Number.isNaN(n)) {
            return snapCounterSizePct(12);
        }
        return snapCounterSizePct(Math.round(n));
    } catch (e) {
        return snapCounterSizePct(12);
    }
}

export function applyCounterSizePct(pct, clock) {
    try {
        document.documentElement.style.setProperty("--fliptimer-counter-pct", String(pct));
    } catch (e) {
        /* ignore */
    }
    if (clock && typeof clock.setDimensions === "function") {
        clock.setDimensions();
    }
}

var _soundSelections = (function () {
    var sel = emptyPreloadedSoundSelections();
    try {
        var raw = localStorage.getItem("fliptimer-sound-preloaded-v1");
        if (raw) {
            var data = JSON.parse(raw);
            if (data && typeof data === "object") {
                for (var i = 0; i < PRESET_SOUND_KINDS.length; i++) {
                    var k = PRESET_SOUND_KINDS[i];
                    if (typeof data[k] === "string") {
                        sel[k] = data[k];
                    }
                }
            }
        }
    } catch (e) {
        /* ignore */
    }
    return sel;
})();

export function loadSoundSelections() {
    return _soundSelections;
}

export function saveSoundSelections(obj) {
    for (var i = 0; i < PRESET_SOUND_KINDS.length; i++) {
        var k = PRESET_SOUND_KINDS[i];
        _soundSelections[k] = (obj && typeof obj[k] === "string") ? obj[k] : "";
    }
}

export function applySoundSelectionsFromJson(root) {
    if (!root || typeof root !== "object") { return; }
    if (root.soundPreloaded && typeof root.soundPreloaded === "object") {
        for (var i = 0; i < PRESET_SOUND_KINDS.length; i++) {
            var k = PRESET_SOUND_KINDS[i];
            var fn = root.soundPreloaded[k];
            if (typeof fn === "string") {
                _soundSelections[k] = fn;
            }
        }
    }
}

export function emptyPreloadedSoundSelections() {
    var o = {};
    for (var i = 0; i < PRESET_SOUND_KINDS.length; i++) {
        o[PRESET_SOUND_KINDS[i]] = "";
    }
    return o;
}

export function loadPreloadedSoundSelectionsFromStorage() {
    return _soundSelections;
}

export function savePreloadedSoundSelectionsToStorage(obj) {
    saveSoundSelections(obj);
}

// Background state
export function loadAppBgStateFromStorage() {
    try {
        var raw = localStorage.getItem(FLIPTIMER_APP_BG_KEY);
        if (raw === null || raw === "") {
            return null;
        }
        var o = JSON.parse(raw);
        if (!o || typeof o !== "object") {
            return null;
        }
        if (typeof o.dataUrl === "string" && o.dataUrl.indexOf("data:image/") === 0) {
            var out = { dataUrl: o.dataUrl };
            if (typeof o.fileName === "string" && o.fileName.trim() !== "") {
                out.fileName = o.fileName.trim();
            }
            return out;
        }
        return null;
    } catch (e) {
        return null;
    }
}

export function setPresetTrackMax(v) { _presetTrackMaxMinutes = v; }
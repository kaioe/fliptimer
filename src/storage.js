/**
 * Storage — localStorage keys, load/save helpers.
 */
"use strict";

export const PRESET_STORAGE_KEY = "fliptimer-preset-timers-v1";
export const ACTIVE_PRESET_ID_STORAGE_KEY = "fliptimer-active-preset-id-v1";
export const PRESET_SLIDER_THUMBS_KEY = "fliptimer-preset-slider-thumbs-v1";
export const PRESET_TRACK_MAX_KEY = "fliptimer-preset-track-max-v1";
export const FLIPTIMER_COUNTER_PCT_KEY = "fliptimer-counter-pct-v1";
export const FLIPTIMER_SOUNDS_KEY = "fliptimer-sounds-v1";
export const FLIPTIMER_SOUND_NAMES_KEY = "fliptimer-sound-filenames-v1";
export const FLIPTIMER_SOUND_SOURCE_KEY = "fliptimer-sound-source-v1";
export const FLIPTIMER_SOUND_PRELOADED_KEY = "fliptimer-sound-preloaded-v1";
export const SOUNDS_MANIFEST_URL = "sounds/manifest.json";
export const FLIPTIMER_APP_BG_KEY = "fliptimer-app-bg-v1";
export const PRESET_JSON_FILE = "fliptimer.json";
export const DEFAULT_BG_FILE = "imgs/background.webp";
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

export function loadSoundsFromStorage() {
	try {
		var raw = localStorage.getItem(FLIPTIMER_SOUNDS_KEY);
		if (raw === null || raw === "") {
			return {};
		}
		var data = JSON.parse(raw);
		if (!data || typeof data !== "object") {
			return {};
		}
		return data;
	} catch (e) {
		return {};
	}
}

export function saveSoundsToStorage(obj) {
	try {
		localStorage.setItem(FLIPTIMER_SOUNDS_KEY, JSON.stringify(obj));
	} catch (e) {
		window.alert("Could not save sounds (storage may be full). Try shorter files or clear other site data.");
	}
}

export function loadSoundNamesFromStorage() {
	try {
		var raw = localStorage.getItem(FLIPTIMER_SOUND_NAMES_KEY);
		if (raw === null || raw === "") {
			return {};
		}
		var data = JSON.parse(raw);
		if (!data || typeof data !== "object") {
			return {};
		}
		return data;
	} catch (e) {
		return {};
	}
}

export function saveSoundNamesToStorage(obj) {
	try {
		localStorage.setItem(FLIPTIMER_SOUND_NAMES_KEY, JSON.stringify(obj));
	} catch (e) {
		/* ignore */
	}
}

export function loadSoundSourceFromStorage() {
	try {
		var raw = localStorage.getItem(FLIPTIMER_SOUND_SOURCE_KEY);
		if (raw === "preloaded" || raw === "upload") {
			return raw;
		}
	} catch (e) {
		/* ignore */
	}
	return "upload";
}

export function saveSoundSourceToStorage(mode) {
	try {
		if (mode === "preloaded" || mode === "upload") {
			localStorage.setItem(FLIPTIMER_SOUND_SOURCE_KEY, mode);
		}
	} catch (e) {
		/* ignore */
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
	var empty = emptyPreloadedSoundSelections();
	try {
		var raw = localStorage.getItem(FLIPTIMER_SOUND_PRELOADED_KEY);
		if (raw === null || raw === "") {
			return empty;
		}
		var data = JSON.parse(raw);
		if (!data || typeof data !== "object") {
			return empty;
		}
		for (var j = 0; j < PRESET_SOUND_KINDS.length; j++) {
			var k = PRESET_SOUND_KINDS[j];
			if (typeof data[k] === "string") {
				empty[k] = data[k];
			}
		}
		return empty;
	} catch (e) {
		return empty;
	}
}

export function savePreloadedSoundSelectionsToStorage(obj) {
	try {
		localStorage.setItem(FLIPTIMER_SOUND_PRELOADED_KEY, JSON.stringify(obj));
	} catch (e) {
		/* ignore */
	}
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

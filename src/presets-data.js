/**
 * Presets data — CRUD, slider math, bg optimization, JSON sync.
 */
const $ = window.jQuery;
"use strict";

import {
	PRESET_STORAGE_KEY, ACTIVE_PRESET_ID_STORAGE_KEY,
	PRESET_SLIDER_THUMBS_KEY, PRESET_TRACK_MAX_KEY, FLIPTIMER_APP_BG_KEY,
	PRESET_JSON_FILE, DEFAULT_BG_FILE, PRESET_SOUND_KINDS,
	snapTrackMaxMinutes, getPresetTrackMax, loadPresetTrackMax,
	loadSoundSourceFromStorage, saveSoundSourceToStorage,
	loadPreloadedSoundSelectionsFromStorage, savePreloadedSoundSelectionsToStorage,
	loadSoundsFromStorage, saveSoundsToStorage,
	loadSoundNamesFromStorage, saveSoundNamesToStorage,
	loadAppBgStateFromStorage,
} from "./storage.js";

export function generatePresetId() {
	return "preset-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
}

/** @param {number} mins */
export function minutesToStartTime(mins) {
	var total = Math.max(0, Number(mins) || 0);
	var m = Math.floor(total);
	var s = Math.round((total - m) * 60);
	if (s >= 60) {
		m += Math.floor(s / 60);
		s = s % 60;
	}
	if (m > 99) {
		m = 99;
		s = 59;
	}
	var mm = m < 10 ? "0" + m : String(m);
	var ss = s < 10 ? "0" + s : String(s);
	return mm + ":" + ss;
}

export function normalizePreset(raw) {
	var maxM = getPresetTrackMax();
	return {
		id: raw.id || generatePresetId(),
		name: String(raw.name || "").trim() || "Untitled",
		color: normalizeHexColor(raw.color),
		minutes: snapPresetMinutesToStep(Number(raw.minutes) || 0, maxM),
		rounds: Math.min(10, Math.max(1, Math.round(Number(raw.rounds) || 1))),
		intervalMinutes: snapPresetMinutesToStep(Number(raw.intervalMinutes) || 0, maxM),
	};
}

/** Display minutes for preset summary (matches slider / table semantics). */
export function formatPresetMinuteLabel(n) {
	var v = Number(n);
	if (v !== v) {
		return "—";
	}
	var maxM = getPresetTrackMax();
	var step = getPresetMinuteSliderStep(maxM);
	if (step >= 1) {
		return String(Math.round(v)) + " min";
	}
	var s = v % 1 === 0 ? String(v) : v.toFixed(1);
	return s + " min";
}

export function loadPresetsFromStorage() {
	try {
		var raw = localStorage.getItem(PRESET_STORAGE_KEY);
		if (raw === null) {
			return null;
		}
		var data = JSON.parse(raw);
		if (data && Array.isArray(data.presets)) {
			return data.presets.map(normalizePreset);
		}
	} catch (e) {
		return null;
	}
	return null;
}

export function savePresetsToStorage(presets) {
	var payload = { version: 1, presets: presets };
	localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(payload));
}

export function loadActivePresetIdFromStorage() {
	try {
		var raw = localStorage.getItem(ACTIVE_PRESET_ID_STORAGE_KEY);
		if (raw === null || raw === "") {
			return null;
		}
		return String(raw);
	} catch (e) {
		return null;
	}
}

export function saveActivePresetIdToStorage(id) {
	try {
		if (id == null || id === "") {
			localStorage.removeItem(ACTIVE_PRESET_ID_STORAGE_KEY);
		} else {
			localStorage.setItem(ACTIVE_PRESET_ID_STORAGE_KEY, String(id));
		}
	} catch (e) {
		/* ignore quota */
	}
}

export function loadSliderThumbsFromStorage() {
	try {
		var raw = localStorage.getItem(PRESET_SLIDER_THUMBS_KEY);
		if (raw === null) {
			return null;
		}
		var data = JSON.parse(raw);
		if (!data || typeof data !== "object") {
			return null;
		}
		return {
			minutes: Number(data.minutes),
			intervalMinutes: Number(data.intervalMinutes),
			rounds: Number(data.rounds),
		};
	} catch (e) {
		return null;
	}
}

export function normalizeSliderThumbState(data) {
	if (!data) {
		return null;
	}
	var maxM = getPresetTrackMax();
	var m = Math.min(maxM, Math.max(0, Number(data.minutes)));
	if (Number.isNaN(m)) {
		m = 5;
	}
	m = snapPresetMinutesToStep(m, maxM);
	var i = Math.min(maxM, Math.max(0, Number(data.intervalMinutes)));
	if (Number.isNaN(i)) {
		i = 0;
	}
	i = snapPresetMinutesToStep(i, maxM);
	var r = Math.min(10, Math.max(1, Math.round(Number(data.rounds))));
	if (Number.isNaN(r)) {
		r = 1;
	}
	return { minutes: m, intervalMinutes: i, rounds: r };
}

/** Track max ≤ 30 → 0.5 min steps; &gt; 30 → 5 min steps (duration / interval). */
export const PRESET_MINUTE_STEP_THRESHOLD = 30;
export const PRESET_MINUTE_STEP_FINE = 0.5;
export const PRESET_MINUTE_STEP_COARSE = 5;

export function getPresetMinuteSliderStep(maxM) {
	var m = Number(maxM);
	if (Number.isNaN(m)) {
		return PRESET_MINUTE_STEP_FINE;
	}
	return m > PRESET_MINUTE_STEP_THRESHOLD ? PRESET_MINUTE_STEP_COARSE : PRESET_MINUTE_STEP_FINE;
}

export function snapPresetMinutesToStep(v, maxM) {
	var step = getPresetMinuteSliderStep(maxM);
	var max = Math.max(0, Number(maxM) || 0);
	var x = Number(v);
	if (Number.isNaN(x)) {
		x = 0;
	}
	x = Math.min(max, Math.max(0, x));
	var snapped = Math.round(x / step) * step;
	snapped = Math.round(snapped * 1000) / 1000;
	return Math.min(max, Math.max(0, snapped));
}

/** Duration / interval legend & cluster (matches active step for current track max). */
export function formatPresetMinuteSliderLabel(v, maxM) {
	var n = snapPresetMinutesToStep(v, maxM);
	var step = getPresetMinuteSliderStep(maxM);
	if (step >= 1) {
		return String(Math.round(n));
	}
	if (n % 1 === 0) {
		return String(n);
	}
	return n.toFixed(1);
}

/** Match `.preset-minutes-slider` `--thumbs-too-close` (percent of track). */
export const PRESET_SLIDER_OVERLAP_THRESH_PCT = 5;
/** Base thumb fills (same order as duration / interval / rounds inputs). */
export const PRESET_THUMB_RGB = [
	[3, 102, 214],
	[201, 120, 26],
	[124, 58, 237],
];

export function presetSliderCompleted01(el, minV, maxV) {
	var v = Number(el.value);
	if (Number.isNaN(v)) {
		return 0;
	}
	return ((v - minV) / (maxV - minV)) * 100;
}

export function presetSumRgbToHex(rgbList) {
	var r = 0;
	var g = 0;
	var b = 0;
	for (var s = 0; s < rgbList.length; s++) {
		var c = rgbList[s];
		r += c[0];
		g += c[1];
		b += c[2];
	}
	r = Math.min(255, r);
	g = Math.min(255, g);
	b = Math.min(255, b);
	function byteHex(n) {
		var h = n.toString(16);
		return h.length < 2 ? "0" + h : h;
	}
	return "#" + byteHex(r) + byteHex(g) + byteHex(b);
}

export function presetContrastTextOnRgb(r, g, b) {
	var L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	return L > 0.55 ? "#111" : "#fff";
}

export function saveSliderThumbsToStorage(mEl, iEl, rEl) {
	if (!mEl || !iEl || !rEl) {
		return;
	}
	try {
		var payload = {
			minutes: Number(mEl.value),
			intervalMinutes: Number(iEl.value),
			rounds: Number(rEl.value),
		};
		localStorage.setItem(PRESET_SLIDER_THUMBS_KEY, JSON.stringify(payload));
	} catch (e) {
		// ignore quota / private mode
	}
}

/** Loads fliptimer.json: presets, optional app background, optional sounds (see `applySoundsFromJsonRoot`). */
export function fetchPresetTimersDocument() {
	return $.getJSON(PRESET_JSON_FILE)
		.then(function (data) {
			var presets = [];
			if (data && Array.isArray(data.presets)) {
				presets = data.presets.map(normalizePreset);
			}
			var bg = null;
			if (data && typeof data.appBackgroundDataUrl === "string" && data.appBackgroundDataUrl.indexOf("data:image/") === 0) {
				bg = data.appBackgroundDataUrl;
			}
			var bgFile = null;
			if (!bg && data && typeof data.appBackgroundFile === "string" && data.appBackgroundFile.trim() !== "") {
				bgFile = data.appBackgroundFile.trim();
			}
			return { presets: presets, appBackgroundDataUrl: bg, appBackgroundFile: bgFile, jsonRoot: data || null };
		})
		.fail(function () {
			return { presets: [], appBackgroundDataUrl: null, appBackgroundFile: null, jsonRoot: null };
		});
}

export function normalizeSoundDataUrlFromDoc(s) {
	if (typeof s !== "string" || s.indexOf("data:audio/") !== 0) {
		return null;
	}
	return s;
}

/** Reads optional sound mode, preloaded filenames, and `sounds` / `soundFileNames` from fliptimer.json (first-run seed). */
export function applySoundsFromJsonRoot(root) {
	if (!root || typeof root !== "object") {
		return;
	}
	if (root.soundSource === "preloaded" || root.soundSource === "upload") {
		saveSoundSourceToStorage(root.soundSource);
	}
	if (root.soundPreloaded && typeof root.soundPreloaded === "object") {
		var merged = loadPreloadedSoundSelectionsFromStorage();
		for (var pi = 0; pi < PRESET_SOUND_KINDS.length; pi++) {
			var pk = PRESET_SOUND_KINDS[pi];
			var pfn = root.soundPreloaded[pk];
			if (typeof pfn === "string") {
				merged[pk] = pfn;
			}
		}
		savePreloadedSoundSelectionsToStorage(merged);
	}
	if (loadSoundSourceFromStorage() === "preloaded") {
		return;
	}
	var sounds = {};
	if (root.sounds && typeof root.sounds === "object") {
		for (var i = 0; i < PRESET_SOUND_KINDS.length; i++) {
			var k = PRESET_SOUND_KINDS[i];
			var u = normalizeSoundDataUrlFromDoc(root.sounds[k]);
			if (u) {
				sounds[k] = u;
			}
		}
	}
	if (Object.keys(sounds).length === 0) {
		return;
	}
	saveSoundsToStorage(sounds);
	var names = {};
	if (root.soundFileNames && typeof root.soundFileNames === "object") {
		for (var j = 0; j < PRESET_SOUND_KINDS.length; j++) {
			var kk = PRESET_SOUND_KINDS[j];
			if (!sounds[kk]) {
				continue;
			}
			var fn = root.soundFileNames[kk];
			if (typeof fn === "string" && fn.length > 0) {
				names[kk] = fn;
			}
		}
	}
	if (Object.keys(names).length > 0) {
		saveSoundNamesToStorage(names);
	}
}

var warnedPresetSave404 = false;

/** Max width/height (px) for background image after resize (long edge). */
export const BG_OPTIMIZE_MAX_EDGE = 1920;
export const BG_JPEG_QUALITY = 0.82;
export const BG_WEBP_QUALITY = 0.78;

export function dataUrlToBlob(dataUrl) {
	var m = String(dataUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
	if (!m) {
		return null;
	}
	try {
		var binStr = window.atob(m[2]);
		var len = binStr.length;
		var arr = new Uint8Array(len);
		for (var i = 0; i < len; i++) {
			arr[i] = binStr.charCodeAt(i);
		}
		return new Blob([arr], { type: m[1] });
	} catch (e) {
		return null;
	}
}

export function loadImageElementFromFile(file, callback) {
	var url = URL.createObjectURL(file);
	var img = new window.Image();
	img.onload = function () {
		URL.revokeObjectURL(url);
		callback(img);
	};
	img.onerror = function () {
		URL.revokeObjectURL(url);
		callback(null);
	};
	img.src = url;
}

export function encodeCanvasToBlob(canvas, callback) {
	var jpegQ = BG_JPEG_QUALITY;
	var webpQ = BG_WEBP_QUALITY;
	if (!canvas.toBlob) {
		var du = canvas.toDataURL("image/jpeg", jpegQ);
		callback(dataUrlToBlob(du));
		return;
	}
	canvas.toBlob(
		function (webpBlob) {
			if (webpBlob && webpBlob.size > 0) {
				callback(webpBlob);
				return;
			}
			canvas.toBlob(
				function (jpegBlob) {
					if (jpegBlob && jpegBlob.size > 0) {
						callback(jpegBlob);
						return;
					}
					var du2 = canvas.toDataURL("image/jpeg", jpegQ);
					callback(dataUrlToBlob(du2));
				},
				"image/jpeg",
				jpegQ,
			);
		},
		"image/webp",
		webpQ,
	);
}

/**
 * Resize (max edge), re-encode WebP or JPEG for smaller files, then invoke callback(err, blob).
 */
export function optimizeImageFileForBackground(file, callback) {
	if (!file || !file.type || file.type.indexOf("image/") !== 0) {
		callback(new Error("Not an image"));
		return;
	}
	var maxEdge = BG_OPTIMIZE_MAX_EDGE;
	function drawAndEncode(drawable, w, h) {
		var scale = Math.min(1, maxEdge / Math.max(w, h));
		var cw = Math.max(1, Math.round(w * scale));
		var ch = Math.max(1, Math.round(h * scale));
		var canvas = document.createElement("canvas");
		canvas.width = cw;
		canvas.height = ch;
		var ctx = canvas.getContext("2d");
		if (!ctx) {
			if (typeof drawable.close === "function") {
				drawable.close();
			}
			callback(new Error("Canvas unsupported"));
			return;
		}
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(0, 0, cw, ch);
		try {
			ctx.drawImage(drawable, 0, 0, cw, ch);
		} catch (err) {
			if (typeof drawable.close === "function") {
				drawable.close();
			}
			callback(err);
			return;
		}
		if (typeof drawable.close === "function") {
			drawable.close();
		}
		encodeCanvasToBlob(canvas, function (blob) {
			if (!blob || blob.size === 0) {
				callback(new Error("Could not encode image"));
				return;
			}
			callback(null, blob);
		});
	}
	if (typeof createImageBitmap === "function") {
		createImageBitmap(file, { imageOrientation: "from-image" })
			.then(function (bitmap) {
				drawAndEncode(bitmap, bitmap.width, bitmap.height);
			})
			.catch(function () {
				createImageBitmap(file)
					.then(function (bitmap) {
						drawAndEncode(bitmap, bitmap.width, bitmap.height);
					})
					.catch(function () {
						loadImageElementFromFile(file, function (img) {
							if (!img) {
								callback(new Error("Could not load image"));
								return;
							}
							drawAndEncode(img, img.naturalWidth, img.naturalHeight);
						});
					});
			});
		return;
	}
	loadImageElementFromFile(file, function (img) {
		if (!img) {
			callback(new Error("Could not load image"));
			return;
		}
		drawAndEncode(img, img.naturalWidth, img.naturalHeight);
	});
}

export function blobToDataUrlString(blob, callback) {
	var r = new FileReader();
	r.onload = function () {
		callback(typeof r.result === "string" ? r.result : "");
	};
	r.onerror = function () {
		callback("");
	};
	r.readAsDataURL(blob);
}

export function getAppBackgroundDataUrlForSync() {
	var st = loadAppBgStateFromStorage();
	if (st && typeof st.dataUrl === "string" && st.dataUrl.indexOf("data:image/") === 0) {
		return st.dataUrl;
	}
	return null;
}

export function cssUrlTokenForBg(pathOrDataUrl) {
	if (typeof pathOrDataUrl !== "string" || pathOrDataUrl === "") {
		return "none";
	}
	if (pathOrDataUrl.indexOf("data:") === 0) {
		return "url(" + JSON.stringify(pathOrDataUrl) + ")";
	}
	var resolved = pathOrDataUrl;
	try {
		resolved = new URL(pathOrDataUrl, window.location.href).href;
	} catch (e) {
		/* keep relative */
	}
	return "url(" + JSON.stringify(resolved) + ")";
}

export function applyAppBackgroundState(state) {
	var body = document.body;
	if (!body) {
		return;
	}
	if (!state) {
		body.classList.remove("fliptimer-custom-bg");
		body.style.removeProperty("--fliptimer-bg-image");
		return;
	}
	var token = cssUrlTokenForBg(state.dataUrl);
	if (token === "none") {
		body.classList.remove("fliptimer-custom-bg");
		body.style.removeProperty("--fliptimer-bg-image");
		return;
	}
	body.classList.add("fliptimer-custom-bg");
	body.style.setProperty("--fliptimer-bg-image", token);
}

export function persistAppBgState(state) {
	try {
		if (!state) {
			localStorage.removeItem(FLIPTIMER_APP_BG_KEY);
			return;
		}
		localStorage.setItem(FLIPTIMER_APP_BG_KEY, JSON.stringify(state));
	} catch (e) {
		window.alert("Could not save background (storage may be full). Try a smaller image.");
	}
}

/** Writes fliptimer.json in the app root when served via `npm run dev` (BrowserSync middleware). Includes optional appBackgroundFile (or appBackgroundDataUrl for user uploads); sounds as data URLs when source is Upload, else soundPreloaded paths. No-op if fetch fails (e.g. file:// or static host without the endpoint). */
export function syncPresetJsonToProjectFile(presets) {
	var doc = { version: 1, presets: presets };
	var bg = getAppBackgroundDataUrlForSync();
	if (bg) {
		doc.appBackgroundDataUrl = bg;
	} else {
		doc.appBackgroundFile = DEFAULT_BG_FILE;
	}
	var soundSource = loadSoundSourceFromStorage();
	doc.soundSource = soundSource;
	if (soundSource === "preloaded") {
		var pre = loadPreloadedSoundSelectionsFromStorage();
		var preOut = {};
		for (var si = 0; si < PRESET_SOUND_KINDS.length; si++) {
			var sk = PRESET_SOUND_KINDS[si];
			if (typeof pre[sk] === "string" && pre[sk].length > 0) {
				preOut[sk] = pre[sk];
			}
		}
		if (Object.keys(preOut).length > 0) {
			doc.soundPreloaded = preOut;
		}
	} else {
		var sounds = loadSoundsFromStorage();
		if (sounds && typeof sounds === "object" && Object.keys(sounds).length > 0) {
			doc.sounds = sounds;
		}
		var soundNames = loadSoundNamesFromStorage();
		if (soundNames && typeof soundNames === "object" && Object.keys(soundNames).length > 0) {
			doc.soundFileNames = soundNames;
		}
	}
	var payload = JSON.stringify(doc, null, 2);
	if (typeof fetch !== "function") {
		return;
	}
	fetch("/__fliptimer__/save-preset-timers", {
		method: "POST",
		headers: { "Content-Type": "application/json; charset=utf-8" },
		body: payload,
		credentials: "same-origin",
	})
		.then(function (res) {
			if (res && res.status === 404 && !warnedPresetSave404) {
				warnedPresetSave404 = true;
				console.warn("[Fliptimer] fliptimer.json sync failed (404). Page origin: " + (typeof location !== "undefined" ? location.origin : "?") + ". Use the exact Local: URL from npm run dev (BrowserSync + bs-config.js). If port 3000 is busy, BrowserSync uses 3001, 3002, … — a bookmark to :3000 may hit a different app without POST /__fliptimer__/save-preset-timers.");
			}
		})
		.catch(function () {});
}

export function presetActionIcon(kind) {
	if (kind === "apply") {
		return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>';
	}
	if (kind === "edit") {
		return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
	}
	if (kind === "delete") {
		return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';
	}
	return "";
}

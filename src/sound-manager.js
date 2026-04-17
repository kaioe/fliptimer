/**
 * Sound manager — URL resolution, audio context, playback.
 */
const $ = window.jQuery;
"use strict";

import {
	loadSoundSourceFromStorage,
	loadPreloadedSoundSelectionsFromStorage,
	loadSoundsFromStorage,
	loadSoundNamesFromStorage,
	loadAppBgStateFromStorage,
} from "./storage.js";

/**
 * Base URL for resolving `sounds/...` paths. Strips a trailing slash from the path so
 * `http://host/fliptimer/` does not resolve `sounds/x` to `http://host/fliptimer/sounds/x` (404);
 * without the slash, resolution matches `index.html` + sibling `sounds/` → `/sounds/x`.
 */
export function baseHrefForSoundRelativeUrl() {
	if (typeof URL === "undefined" || typeof location === "undefined" || !location.href) {
		return typeof location !== "undefined" ? location.href : "";
	}
	try {
		var u = new URL(location.href);
		if (u.pathname.length > 1 && /\/$/.test(u.pathname)) {
			u.pathname = u.pathname.replace(/\/+$/, "") || "/";
		}
		return u.href;
	} catch (e) {
		return location.href;
	}
}

/** URL for a file under `sounds/` (path segments encoded). */
export function preloadedFilenameToSoundUrl(filename) {
	if (typeof filename !== "string" || filename.length === 0) {
		return null;
	}
	var raw = filename.trim();
	if (raw.length === 0) {
		return null;
	}
	if (typeof raw.normalize === "function") {
		try {
			raw = raw.normalize("NFC");
		} catch (e) {
			/* ignore */
		}
	}
	var parts = raw.split("/").filter(function (p) {
		return p.length > 0;
	});
	if (parts.length === 0) {
		return null;
	}
	var enc = parts.map(encodeURIComponent).join("/");
	var rel = "sounds/" + enc;
	try {
		if (typeof URL !== "undefined" && typeof location !== "undefined" && location.href) {
			return new URL(rel, baseHrefForSoundRelativeUrl()).href;
		}
	} catch (e2) {
		/* ignore */
	}
	return rel;
}

export function resolveSoundUrlForKind(kind) {
	var src = loadSoundSourceFromStorage();
	if (src === "preloaded") {
		var sel = loadPreloadedSoundSelectionsFromStorage();
		var fn = sel[kind];
		return preloadedFilenameToSoundUrl(fn);
	}
	var sounds = loadSoundsFromStorage();
	var url = sounds[kind];
	return typeof url === "string" && url.length > 0 ? url : null;
}

export function assignFileToInput(input, file) {
	if (!input || !file) {
		return false;
	}
	try {
		var dt = new DataTransfer();
		dt.items.add(file);
		input.files = dt.files;
		return true;
	} catch (e) {
		return false;
	}
}

export function syncPresetFileDropFromInput(input) {
	if (!input) {
		return;
	}
	var $drop = $(input).closest(".preset-file-drop");
	if (!$drop.length) {
		return;
	}
	var $label = $drop.find("[data-file-label]");
	var $btn = $drop.find(".preset-file-drop__btn");
	var kind = $(input).attr("data-sound-kind");
	var isBg = $(input).hasClass("preset-settings-file--bg");
	var hasFile = false;
	var displayName = "";
	if (kind) {
		var sounds = loadSoundsFromStorage();
		var url = sounds[kind];
		hasFile = typeof url === "string" && url.length > 0;
		if (hasFile) {
			var names = loadSoundNamesFromStorage();
			displayName = names[kind] || "Audio file";
		}
	} else if (isBg) {
		var st = loadAppBgStateFromStorage();
		hasFile = !!(st && st.dataUrl);
		if (hasFile) {
			displayName = (st.fileName && String(st.fileName)) || "Background image";
		}
	}
	$label.text(hasFile ? displayName : "No file selected");
	$btn.text(hasFile ? "Clear" : "Upload");
	var ctx = $drop.closest(".preset-settings-upload-row").find(".preset-settings-upload-row__label").first().text() || "file";
	$btn.attr("aria-label", hasFile ? "Clear " + ctx : "Upload " + ctx);
}

export function syncAllPresetFileDrops() {
	$(".preset-file-drop__input.preset-settings-file").each(function () {
		syncPresetFileDropFromInput(this);
	});
}

/** Tiny silent WAV — played once after user gesture so browsers allow later HTMLAudio playback (e.g. finish sound without a click). */
export const FLIPTIMER_SILENT_WAV =
	"data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQAAAAA=";

var fliptimerAudioUnlockDone = false;
/** Shared Web Audio context (prep beeps + unlock). */
var fliptimerSharedAudioContext = null;

/**
 * Wall time for one full digit flip (ms). Must match `fliptimer.scss` stacked halves:
 * `$anim-delay-stack` + `$anim-flip` → 0.5s + 0.5s. Used only for prep beep timing (not in `doTick`).
 */
export const FLIPTIMER_PREP_FLIP_MS = 1000;
/** Extra ms after full flip duration if `animationend` never fires (slow devices, reduced motion). */
export const FLIPTIMER_PREP_FLIP_FALLBACK_PAD_MS = 400;
/**
 * Countdown `setInterval` must tick **after** the stacked CSS flip finishes (~1000ms). 50ms buffer avoids
 * `removeClass("play")` mid-animation on the main timer (same torn-digit glitch as prep).
 */
export const FLIPTIMER_COUNTDOWN_TICK_BUFFER_MS = 50;

export function getFliptimerSharedAudioContext() {
	if (fliptimerSharedAudioContext) {
		return fliptimerSharedAudioContext;
	}
	try {
		var Ctx = window.AudioContext || window.webkitAudioContext;
		if (!Ctx) {
			return null;
		}
		fliptimerSharedAudioContext = new Ctx();
		return fliptimerSharedAudioContext;
	} catch (e) {
		return null;
	}
}

/** Short sine beep for prep countdown (one per second). */
export function playPrepCountdownBeep() {
	var ctx = getFliptimerSharedAudioContext();
	if (!ctx) {
		return;
	}
	if (ctx.state === "suspended" && typeof ctx.resume === "function") {
		ctx.resume().catch(function () {});
	}
	try {
		var t0 = ctx.currentTime;
		var osc = ctx.createOscillator();
		var gain = ctx.createGain();
		osc.type = "sine";
		osc.frequency.setValueAtTime(880, t0);
		gain.gain.setValueAtTime(0.0001, t0);
		gain.gain.linearRampToValueAtTime(0.2, t0 + 0.01);
		gain.gain.linearRampToValueAtTime(0.0001, t0 + 0.09);
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start(t0);
		osc.stop(t0 + 0.1);
	} catch (e) {
		/* ignore */
	}
}

export function fliptimerUnlockHtmlAudioIfNeeded() {
	if (fliptimerAudioUnlockDone) {
		return;
	}
	fliptimerAudioUnlockDone = true;
	try {
		var a = new Audio(FLIPTIMER_SILENT_WAV);
		a.volume = 0;
		var p = a.play();
		if (p && typeof p.catch === "function") {
			p.catch(function () {});
		}
	} catch (e) {
		/* ignore */
	}
	try {
		var ctx = getFliptimerSharedAudioContext();
		if (ctx && ctx.state === "suspended" && typeof ctx.resume === "function") {
			ctx.resume().catch(function () {});
		}
	} catch (e2) {
		/* ignore */
	}
}

export function playFliptimerSound(kind) {
	var url = resolveSoundUrlForKind(kind);
	if (!url || typeof url !== "string") {
		return;
	}
	try {
		var a = new Audio();
		if ("playsInline" in a) {
			a.playsInline = true;
		}
		try {
			a.setAttribute("playsinline", "");
		} catch (eAttr) {
			/* ignore */
		}
		a.preload = "auto";
		a.volume = 1;
		var run = function () {
			var p = a.play();
			if (p && typeof p.catch === "function") {
				p.catch(function () {});
			}
		};
		var done = false;
		var tryPlay = function () {
			if (done) {
				return;
			}
			done = true;
			run();
		};
		a.addEventListener("canplay", tryPlay, { once: true });
		a.addEventListener(
			"error",
			function () {
				done = true;
			},
			{ once: true },
		);
		a.src = url;
		a.load();
		if (typeof a.readyState === "number" && a.readyState >= 2) {
			tryPlay();
		}
	} catch (e) {
		/* ignore */
	}
}

/**
 * Presets UI — modal, list, form, settings, drag-reorder.
 */
const $ = window.jQuery;
"use strict";

import { Fliptimer } from "./fliptimer-clock.js";
import {
	PRESET_STORAGE_KEY, ACTIVE_PRESET_ID_STORAGE_KEY, PRESET_SLIDER_THUMBS_KEY,
	PRESET_TRACK_MAX_KEY, FLIPTIMER_COUNTER_PCT_KEY, FLIPTIMER_APP_BG_KEY,
	PRESET_SOUND_KINDS, SOUNDS_MANIFEST_URL, PRESET_JSON_FILE, DEFAULT_BG_FILE,
	snapTrackMaxMinutes, getPresetTrackMax, setPresetTrackMax,
	snapCounterSizePct, setCounterRangeFillPct, refreshPresetCounterSizeRangeFills,
	rebuildTrackMaxTicks, loadCounterSizePct, applyCounterSizePct,
	loadSoundsFromStorage, saveSoundsToStorage,
	loadSoundNamesFromStorage, saveSoundNamesToStorage,
	loadSoundSourceFromStorage, saveSoundSourceToStorage,
	loadPreloadedSoundSelectionsFromStorage, savePreloadedSoundSelectionsToStorage,
	loadAppBgStateFromStorage, loadPresetTrackMax,
} from "./storage.js";
import {
	playFliptimerSound, syncAllPresetFileDrops, syncPresetFileDropFromInput,
	fliptimerUnlockHtmlAudioIfNeeded, assignFileToInput,
} from "./sound-manager.js";
import {
	PRESET_COLOR_SWATCHES, normalizeHexColor, applyCounterContrastFromPresetColor,
} from "./colors.js";
import {
	generatePresetId, minutesToStartTime, normalizePreset,
	formatPresetMinuteLabel, loadPresetsFromStorage, savePresetsToStorage,
	loadActivePresetIdFromStorage, saveActivePresetIdToStorage,
	loadSliderThumbsFromStorage, normalizeSliderThumbState,
	getPresetMinuteSliderStep, snapPresetMinutesToStep, formatPresetMinuteSliderLabel,
	PRESET_SLIDER_OVERLAP_THRESH_PCT, PRESET_THUMB_RGB,
	presetSliderCompleted01, presetSumRgbToHex, presetContrastTextOnRgb,
	saveSliderThumbsToStorage, fetchPresetTimersDocument,
	applySoundsFromJsonRoot, optimizeImageFileForBackground, blobToDataUrlString,
	persistAppBgState, applyAppBackgroundState, syncPresetJsonToProjectFile,
	presetActionIcon, getAppBackgroundDataUrlForSync,
} from "./presets-data.js";

/**
 * @param {Fliptimer} clock
 * @param {function(): void} refreshToolbar
 */
export function initPresetTimers(clock, refreshToolbar) {
	var presets = [];
	var editingId = null;
	var activePresetId = loadActivePresetIdFromStorage();

	var $activePreset = $("#active-preset");
	var $activeName = $("#active-preset-name");
	var $activeDur = $("#active-preset-duration");
	var $activeInt = $("#active-preset-interval");
	var $activeRounds = $("#active-preset-rounds");

	function setActivePresetUi(p) {
		var $cd = $(".countdown");
		if (!p) {
			activePresetId = null;
			saveActivePresetIdToStorage(null);
			applyCounterContrastFromPresetColor($cd, null);
			$activePreset.attr("hidden", "hidden").attr("aria-hidden", "true");
			return;
		}
		activePresetId = p.id;
		saveActivePresetIdToStorage(p.id);
		applyCounterContrastFromPresetColor($cd, p.color);
		$activePreset.removeAttr("hidden").attr("aria-hidden", "false");
		$activeName.text(p.name);
		$activeDur.text(formatPresetMinuteLabel(p.minutes));
		$activeInt.text(formatPresetMinuteLabel(p.intervalMinutes));
		$activeRounds.text(String(p.rounds));
	}

	function syncActivePresetFromList() {
		if (!activePresetId) {
			return;
		}
		for (var i = 0; i < presets.length; i++) {
			if (presets[i].id === activePresetId) {
				setActivePresetUi(presets[i]);
				return;
			}
		}
		activePresetId = null;
		setActivePresetUi(null);
	}

	var $modal = $("#preset-modal");
	var $panel = $modal.find(".preset-modal__panel");
	var $presetModalHeader = $modal.find(".preset-modal__header");
	var $list = $("#preset-list-body");
	var $form = $("#preset-form");
	var $name = $("#preset-name");
	var $color = $("#preset-color");
	var $swatches = $("#preset-color-swatches");
	var $colorPopover = $("#preset-color-popover");
	var $colorTrigger = $("#preset-color-trigger");
	var $colorSwatchPreview = $colorTrigger.find(".preset-color-trigger__swatch");
	var $colorNative = $("#preset-color-native");
	var $colorHex = $("#preset-color-hex");

	function setPresetColorUi(hex) {
		var c = normalizeHexColor(hex);
		$color.val(c);
		$colorSwatchPreview.css("background-color", c);
		$colorNative.val(c);
		$colorHex.val(c);
		$swatches.find(".preset-color-swatch").each(function () {
			var $b = $(this);
			var hc = String($b.attr("data-color")).toLowerCase();
			var on = hc === c.toLowerCase();
			$b.toggleClass("is-selected", on).attr("aria-pressed", on ? "true" : "false");
		});
	}

	function openColorPopover() {
		$colorPopover.removeAttr("hidden");
		$colorTrigger.attr("aria-expanded", "true");
	}

	function closeColorPopover() {
		$colorPopover.attr("hidden", "hidden");
		$colorTrigger.attr("aria-expanded", "false");
	}

	function buildPresetColorSwatches() {
		$swatches.empty();
		for (var i = 0; i < PRESET_COLOR_SWATCHES.length; i++) {
			var s = PRESET_COLOR_SWATCHES[i];
			var $b = $("<button>", {
				type: "button",
				class: "preset-color-swatch",
				"data-color": s.hex,
				"aria-label": s.label,
				"aria-pressed": s.hex === PRESET_COLOR_SWATCHES[0].hex ? "true" : "false",
				css: { backgroundColor: s.hex },
			});
			if (s.hex === PRESET_COLOR_SWATCHES[0].hex) {
				$b.addClass("is-selected");
			}
			$swatches.append($b);
		}
		$swatches.on("click", ".preset-color-swatch", function (e) {
			e.preventDefault();
			setPresetColorUi($(this).attr("data-color"));
			closeColorPopover();
		});
	}

	buildPresetColorSwatches();
	setPresetColorUi("#ffffff");

	$colorNative.on("input change", function () {
		setPresetColorUi($(this).val());
	});

	$colorHex.on("blur", function () {
		var v = String($(this).val() || "").trim();
		if (v.length > 0 && v.charAt(0) !== "#") {
			v = "#" + v;
		}
		setPresetColorUi(v);
	});

	$colorHex.on("keydown", function (e) {
		if (e.key === "Enter") {
			e.preventDefault();
			$(this).blur();
		}
	});

	$colorTrigger.on("click", function (e) {
		e.stopPropagation();
		if ($colorPopover.is("[hidden]")) {
			openColorPopover();
		} else {
			closeColorPopover();
		}
	});

	$(document).on("mousedown.presetColorPop", function (e) {
		if ($colorPopover.is("[hidden]")) {
			return;
		}
		var $t = $(e.target);
		if ($t.closest("#preset-color-popover").length || $t.closest("#preset-color-trigger").length) {
			return;
		}
		closeColorPopover();
	});

	var $minutes = $("#preset-minutes");
	var $interval = $("#preset-interval");
	var $rounds = $("#preset-rounds");
	var $minutesSlider = $("#preset-minutes-slider");
	var $legendMinutes = $("#preset-legend-minutes");
	var $legendInterval = $("#preset-legend-interval");
	var $legendRounds = $("#preset-legend-rounds");
	var $sliderClusterOut = $("#preset-slider-cluster");
	var $sliderOutputs = $minutesSlider.find("> output.preset-minutes-slider__output:not(.preset-minutes-slider__output--cluster)");

	/** Rounds: range input is 0–10 so the thumb matches tick positions; value snapped to whole 1–10 for storage. */
	function snapRoundsToWhole(rEl) {
		var n = Math.round(Number(rEl.value));
		if (Number.isNaN(n)) {
			n = 1;
		}
		n = Math.min(10, Math.max(1, n));
		var s = String(n);
		if (rEl.value !== s) {
			rEl.value = s;
		}
		return s;
	}

	function syncPresetMultiSlider() {
		var mEl = $minutes[0];
		var iEl = $interval[0];
		var rEl = $rounds[0];
		var wrap = $minutesSlider[0];
		if (!mEl || !iEl || !rEl || !wrap) {
			return;
		}
		var minV = 0;
		var maxM = getPresetTrackMax();
		var minuteStep = getPresetMinuteSliderStep(maxM);
		var stepStr = String(minuteStep);
		$minutes.attr("step", stepStr);
		$interval.attr("step", stepStr);
		mEl.setAttribute("step", stepStr);
		iEl.setAttribute("step", stepStr);
		var mSnap = snapPresetMinutesToStep(mEl.value, maxM);
		var iSnap = snapPresetMinutesToStep(iEl.value, maxM);
		if (String(mSnap) !== String(mEl.value)) {
			mEl.value = String(mSnap);
		}
		if (String(iSnap) !== String(iEl.value)) {
			iEl.value = String(iSnap);
		}
		var r = snapRoundsToWhole(rEl);
		var m = mEl.value;
		var i = iEl.value;
		wrap.style.setProperty("--value-a", m);
		wrap.style.setProperty("--value-b", i);
		wrap.style.setProperty("--value-c", r);
		wrap.style.setProperty("--text-value-a", JSON.stringify(m));
		wrap.style.setProperty("--text-value-b", JSON.stringify(i));
		wrap.style.setProperty("--text-value-c", JSON.stringify(r));

		var maxRoundsTrack = 10;
		wrap.style.setProperty("--min", String(minV));
		wrap.style.setProperty("--max", String(maxM));
		wrap.style.setProperty("--step", stepStr);
		wrap.style.setProperty("--rounds-min", "0");
		wrap.style.setProperty("--rounds-max", String(maxRoundsTrack));
		var pos = [presetSliderCompleted01(mEl, minV, maxM), presetSliderCompleted01(iEl, minV, maxM), presetSliderCompleted01(rEl, minV, maxRoundsTrack)];
		var parent = [0, 1, 2];
		function ufFind(x) {
			if (parent[x] !== x) {
				parent[x] = ufFind(parent[x]);
			}
			return parent[x];
		}
		function ufUnion(a, b) {
			var pa = ufFind(a);
			var pb = ufFind(b);
			if (pa !== pb) {
				parent[pa] = pb;
			}
		}
		var ti;
		var tj;
		for (ti = 0; ti < 3; ti++) {
			for (tj = ti + 1; tj < 3; tj++) {
				if (Math.abs(pos[ti] - pos[tj]) < PRESET_SLIDER_OVERLAP_THRESH_PCT) {
					ufUnion(ti, tj);
				}
			}
		}
		var groups = {};
		for (ti = 0; ti < 3; ti++) {
			var root = ufFind(ti);
			if (!groups[root]) {
				groups[root] = [];
			}
			groups[root].push(ti);
		}
		var mergedGroup = null;
		for (var gk in groups) {
			if (groups.hasOwnProperty(gk) && groups[gk].length >= 2) {
				mergedGroup = groups[gk].slice();
				break;
			}
		}
		var clips = ["none", "none", "none"];
		if (mergedGroup) {
			mergedGroup.sort(function (a, b) {
				if (pos[a] !== pos[b]) {
					return pos[a] - pos[b];
				}
				return a - b;
			});
			if (mergedGroup.length === 2) {
				clips[mergedGroup[0]] = "inset(0 50% 0 0)";
				clips[mergedGroup[1]] = "inset(0 0 0 50%)";
			} else if (mergedGroup.length === 3) {
				clips[mergedGroup[0]] = "inset(0 66.666% 0 0)";
				clips[mergedGroup[1]] = "inset(0 33.333% 0 33.333%)";
				clips[mergedGroup[2]] = "inset(0 0 0 66.666%)";
			}
		}
		wrap.style.setProperty("--thumb-clip-1", clips[0]);
		wrap.style.setProperty("--thumb-clip-2", clips[1]);
		wrap.style.setProperty("--thumb-clip-3", clips[2]);

		var els = [mEl, iEl, rEl];
		var clusterAria = [];
		var clusterVisibleLabel = "";
		if (mergedGroup && mergedGroup.length >= 2) {
			var sumR = 0;
			var sumG = 0;
			var sumB = 0;
			for (ti = 0; ti < mergedGroup.length; ti++) {
				var gi = mergedGroup[ti];
				var c = PRESET_THUMB_RGB[gi];
				sumR += c[0];
				sumG += c[1];
				sumB += c[2];
				var partLabel = gi === 2 ? r : formatPresetMinuteSliderLabel(els[gi].value, maxM);
				clusterAria.push(["Duration", "Interval", "Rounds"][gi] + " " + partLabel);
			}
			sumR = Math.min(255, sumR);
			sumG = Math.min(255, sumG);
			sumB = Math.min(255, sumB);
			var clusterBg = presetSumRgbToHex(
				mergedGroup.map(function (ix) {
					return PRESET_THUMB_RGB[ix];
				}),
			);
			var clusterFg = presetContrastTextOnRgb(sumR, sumG, sumB);
			// One visible number: leftmost thumb on the track (mergedGroup is sorted by position).
			var leftGi = mergedGroup[0];
			clusterVisibleLabel = leftGi === 2 ? r : formatPresetMinuteSliderLabel(els[leftGi].value, maxM);
			// Horizontal position 0–1: same scale as `pos[]` / native thumbs (minutes vs 0–10 rounds).
			wrap.style.setProperty("--cluster-pos-01", String(pos[leftGi] / 100));
			wrap.style.setProperty("--cluster-label-bg", clusterBg);
			wrap.style.setProperty("--cluster-label-fg", clusterFg);
		} else {
			wrap.style.removeProperty("--cluster-pos-01");
			wrap.style.removeProperty("--cluster-label-bg");
			wrap.style.removeProperty("--cluster-label-fg");
		}

		if ($sliderOutputs.length) {
			$sliderOutputs.removeClass("preset-minutes-slider__output--suppressed");
			if (mergedGroup && mergedGroup.length >= 2) {
				for (ti = 0; ti < mergedGroup.length; ti++) {
					$sliderOutputs.eq(mergedGroup[ti]).addClass("preset-minutes-slider__output--suppressed");
				}
			}
		}
		if ($sliderClusterOut.length) {
			if (mergedGroup && mergedGroup.length >= 2 && clusterAria.length) {
				$sliderClusterOut.removeAttr("hidden");
				$sliderClusterOut.attr("aria-hidden", "false");
				$sliderClusterOut.attr("aria-label", clusterAria.join(", "));
				$sliderClusterOut.text(clusterVisibleLabel);
			} else {
				$sliderClusterOut.attr("hidden", "hidden");
				$sliderClusterOut.attr("aria-hidden", "true");
				$sliderClusterOut.removeAttr("aria-label");
				$sliderClusterOut.text("");
			}
		}

		mEl.setAttribute("aria-valuenow", m);
		mEl.setAttribute("aria-valuemax", String(maxM));
		mEl.setAttribute("aria-valuetext", m + " min");
		iEl.setAttribute("aria-valuenow", i);
		iEl.setAttribute("aria-valuemax", String(maxM));
		iEl.setAttribute("aria-valuetext", i + " min");
		rEl.setAttribute("aria-valuenow", r);
		rEl.setAttribute("aria-valuemin", "1");
		rEl.setAttribute("aria-valuemax", "10");
		rEl.setAttribute("aria-valuetext", r + " rounds");
		if ($legendMinutes.length) {
			$legendMinutes.text(formatPresetMinuteSliderLabel(m, maxM));
		}
		if ($legendInterval.length) {
			$legendInterval.text(formatPresetMinuteSliderLabel(i, maxM));
		}
		if ($legendRounds.length) {
			$legendRounds.text(r);
		}
		// Recalculate tick stripe / min-max labels when --max etc. change (avoids stale gradient in some browsers).
		void wrap.offsetHeight;
		saveSliderThumbsToStorage(mEl, iEl, rEl);
	}

	function applyTrackMaxToSliders() {
		var n = getPresetTrackMax();
		var stepStr = String(getPresetMinuteSliderStep(n));
		$minutes.attr({ max: n, step: stepStr, "aria-valuemax": n });
		$interval.attr({ max: n, step: stepStr, "aria-valuemax": n });
		var mv = snapPresetMinutesToStep(Number($minutes.val()) || 0, n);
		var iv = snapPresetMinutesToStep(Number($interval.val()) || 0, n);
		$minutes.val(String(mv));
		$interval.val(String(iv));
		syncPresetMultiSlider();
	}

	$minutes.add($interval).add($rounds).on("input change", syncPresetMultiSlider);

	// Rounds: DOM min=0 keeps the thumb on the same 0–10 tick scale; stored minimum is 1 (tick 1). Block keys that would land on 0.
	$rounds.on("keydown", function (e) {
		var el = this;
		if (e.key === "Home") {
			e.preventDefault();
			el.value = "1";
			syncPresetMultiSlider();
			return;
		}
		var v = Number(el.value);
		if (v <= 1 && (e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "PageDown")) {
			e.preventDefault();
		}
	});
	var savedThumbs = loadSliderThumbsFromStorage();
	var normalizedThumbs = normalizeSliderThumbState(savedThumbs);
	if (normalizedThumbs) {
		$minutes.val(String(normalizedThumbs.minutes));
		$interval.val(String(normalizedThumbs.intervalMinutes));
		$rounds.val(String(normalizedThumbs.rounds));
	}
	applyTrackMaxToSliders();
	var $editId = $("#preset-edit-id");
	var $saveBtn = $("#preset-save-btn");
	var $presetFormHeading = $("#preset-form-heading");
	var $resetEdit = $("#preset-form-reset");
	var $openBtn = $("#preset-open-btn");
	var $settingsFrame = $("#preset-settings-frame");
	/** Single source of truth for Timer settings visibility (do not rely on `[hidden]` alone — browsers / jQuery can disagree). Set only in open/closePresetSettings. */
	var PRESET_SETTINGS_EXPANDED_ATTR = "data-settings-expanded";

	function isPresetTimerSettingsExpanded() {
		if ($settingsFrame.attr(PRESET_SETTINGS_EXPANDED_ATTR) === "true") {
			return true;
		}
		var el = $settingsFrame[0];
		return !!(el && !el.hasAttribute("hidden"));
	}

	var $settingsOpenBtn = $("#preset-settings-open-btn");
	var $counterSize = $("#fliptimer-counter-size");
	var $counterSizeOut = $("#fliptimer-counter-size-out");
	var $trackMax = $("#fliptimer-preset-track-max");
	var $trackMaxOut = $("#fliptimer-preset-track-max-out");

	function closePresetSettings() {
		$settingsFrame.removeAttr(PRESET_SETTINGS_EXPANDED_ATTR);
		$settingsFrame.attr("hidden", "hidden").attr("aria-hidden", "true");
		$settingsOpenBtn.attr("aria-expanded", "false");
	}

	/** @param {{ focus?: boolean }} [opts] Pass `{ focus: false }` to show the frame without moving focus (e.g. after Add/Save preset). */
	function openPresetSettings(opts) {
		opts = opts || {};
		var shouldFocusTrack = opts.focus !== false;
		closeColorPopover();
		$settingsFrame.attr(PRESET_SETTINGS_EXPANDED_ATTR, "true");
		$settingsFrame.removeAttr("hidden").attr("aria-hidden", "false");
		$settingsOpenBtn.attr("aria-expanded", "true");
		var tmOpen = snapTrackMaxMinutes(getPresetTrackMax());
		$trackMax.val(String(tmOpen)).attr("aria-valuenow", String(tmOpen));
		$trackMaxOut.text(tmOpen + " min");
		setCounterRangeFillPct($trackMax[0], tmOpen);
		// Rail width is 0 while the frame is hidden; rebuild ticks after layout when visible.
		requestAnimationFrame(function () {
			requestAnimationFrame(function () {
				rebuildTrackMaxTicks();
				setCounterRangeFillPct($trackMax[0], Number($trackMax.val()) || tmOpen);
			});
		});
		var pctOpen = loadCounterSizePct();
		$counterSize.val(String(pctOpen)).attr("aria-valuenow", String(pctOpen));
		$counterSizeOut.text(pctOpen + "%");
		if (shouldFocusTrack) {
			setTimeout(function () {
				$trackMax.trigger("focus");
			}, 0);
		}
		setCounterRangeFillPct($counterSize[0], $counterSize.val());
		refreshTimerSoundSettingsUi();
	}

	function togglePresetSettings() {
		if (isPresetTimerSettingsExpanded()) {
			closePresetSettings();
		} else {
			openPresetSettings();
		}
	}

	function finalizePresetTrackMaxChange() {
		for (var pi = 0; pi < presets.length; pi++) {
			presets[pi] = normalizePreset(presets[pi]);
		}
		savePresetsToStorage(presets);
		syncPresetJsonToProjectFile(presets);
		renderList();
		syncActivePresetFromList();
	}

	$settingsOpenBtn.on("click", function (e) {
		e.stopPropagation();
		togglePresetSettings();
	});
	$trackMax.on("input", function () {
		var raw = Number($(this).val());
		var v = snapTrackMaxMinutes(raw);
		if (v !== raw) {
			$(this).val(String(v));
		}
		$(this).attr("aria-valuenow", String(v));
		if (v === getPresetTrackMax()) {
			$trackMaxOut.text(v + " min");
			setCounterRangeFillPct(this, v);
			return;
		}
		setPresetTrackMax(v);
		try {
			localStorage.setItem(PRESET_TRACK_MAX_KEY, String(v));
		} catch (e) {
			/* ignore */
		}
		applyTrackMaxToSliders();
		$trackMaxOut.text(v + " min");
		setCounterRangeFillPct(this, v);
	});
	$trackMax.on("change", function () {
		var v = snapTrackMaxMinutes(Number($(this).val()));
		$(this).val(String(v));
		$(this).attr("aria-valuenow", String(v));
		setPresetTrackMax(v);
		try {
			localStorage.setItem(PRESET_TRACK_MAX_KEY, String(v));
		} catch (e) {
			/* ignore */
		}
		applyTrackMaxToSliders();
		$trackMaxOut.text(v + " min");
		setCounterRangeFillPct(this, v);
		finalizePresetTrackMaxChange();
	});
	$(".preset-settings-file").on("change", function () {
		var input = this;
		var kind = $(input).attr("data-sound-kind");
		var file = input.files && input.files[0];
		if (kind) {
			if (!file) {
				syncPresetFileDropFromInput(input);
				return;
			}
			var reader = new FileReader();
			reader.onload = function () {
				var sounds = loadSoundsFromStorage();
				sounds[kind] = reader.result;
				saveSoundsToStorage(sounds);
				var names = loadSoundNamesFromStorage();
				names[kind] = file.name;
				saveSoundNamesToStorage(names);
				input.value = "";
				syncPresetFileDropFromInput(input);
				syncPresetJsonToProjectFile(presets);
			};
			reader.readAsDataURL(file);
			return;
		}
		if ($(input).hasClass("preset-settings-file--bg")) {
			if (!file || !file.type || file.type.indexOf("image/") !== 0) {
				input.value = "";
				syncPresetFileDropFromInput(input);
				return;
			}
			optimizeImageFileForBackground(file, function (err, blob) {
				if (err || !blob) {
					window.alert(err && err.message ? err.message : "Could not process the image.");
					input.value = "";
					syncPresetFileDropFromInput(input);
					return;
				}
				blobToDataUrlString(blob, function (dataUrl) {
					if (typeof dataUrl !== "string" || !dataUrl) {
						window.alert("Could not save background.");
						input.value = "";
						syncPresetFileDropFromInput(input);
						return;
					}
					persistAppBgState({ dataUrl: dataUrl, fileName: file.name });
					applyAppBackgroundState({ dataUrl: dataUrl });
					syncPresetJsonToProjectFile(presets);
					input.value = "";
					syncPresetFileDropFromInput(input);
				});
			});
		}
	});
	$settingsFrame.on("click", ".preset-file-drop__btn", function (e) {
		e.preventDefault();
		var $drop = $(this).closest(".preset-file-drop");
		var input = $drop.find(".preset-file-drop__input")[0];
		if (!input) {
			return;
		}
		var kind = $(input).attr("data-sound-kind");
		var isBg = $(input).hasClass("preset-settings-file--bg");
		var hasFile = false;
		if (kind) {
			var soundsChk = loadSoundsFromStorage();
			var urlChk = soundsChk[kind];
			hasFile = typeof urlChk === "string" && urlChk.length > 0;
		} else if (isBg) {
			var stChk = loadAppBgStateFromStorage();
			hasFile = !!(stChk && stChk.dataUrl);
		}
		if (hasFile) {
			if (kind) {
				var soundsDel = loadSoundsFromStorage();
				delete soundsDel[kind];
				saveSoundsToStorage(soundsDel);
				var namesDel = loadSoundNamesFromStorage();
				delete namesDel[kind];
				saveSoundNamesToStorage(namesDel);
				input.value = "";
				syncPresetFileDropFromInput(input);
				syncPresetJsonToProjectFile(presets);
			} else {
				persistAppBgState(null);
				applyAppBackgroundState(null);
				syncPresetJsonToProjectFile(presets);
				input.value = "";
				syncPresetFileDropFromInput(input);
			}
		} else {
			input.click();
		}
	});
	$settingsFrame.on("dragover", ".preset-file-drop__zone", function (e) {
		e.preventDefault();
		e.stopPropagation();
		$(this).addClass("preset-file-drop__zone--dragover");
	});
	$settingsFrame.on("dragleave", ".preset-file-drop__zone", function (e) {
		var rel = e.relatedTarget;
		if (rel && this.contains(rel)) {
			return;
		}
		$(this).removeClass("preset-file-drop__zone--dragover");
	});
	$settingsFrame.on("drop", ".preset-file-drop__zone", function (e) {
		e.preventDefault();
		e.stopPropagation();
		var zone = this;
		$(zone).removeClass("preset-file-drop__zone--dragover");
		var input = $(zone).find(".preset-file-drop__input")[0];
		if (!input || !e.originalEvent || !e.originalEvent.dataTransfer) {
			return;
		}
		var dropped = e.originalEvent.dataTransfer.files;
		if (!dropped || !dropped.length) {
			return;
		}
		var droppedFile = dropped[0];
		var kindDrop = $(input).attr("data-sound-kind");
		var isBgDrop = $(input).hasClass("preset-settings-file--bg");
		if (kindDrop) {
			if (droppedFile.type && droppedFile.type.indexOf("audio/") !== 0) {
				return;
			}
		} else if (isBgDrop) {
			if (droppedFile.type && droppedFile.type.indexOf("image/") !== 0) {
				return;
			}
		} else {
			return;
		}
		if (assignFileToInput(input, droppedFile)) {
			$(input).trigger("change");
		}
	});

	function applyTimerSoundSourceUi() {
		var mode = loadSoundSourceFromStorage();
		var $pre = $("#preset-sound-source-preloaded-btn");
		var $up = $("#preset-sound-source-upload-btn");
		var $panelPre = $("#preset-settings-sounds-preloaded-panel");
		var $panelUp = $("#preset-settings-sounds-upload-panel");
		if (!$pre.length || !$up.length || !$panelPre.length || !$panelUp.length) {
			return;
		}
		var isPre = mode === "preloaded";
		$pre.attr("aria-selected", isPre ? "true" : "false");
		$up.attr("aria-selected", isPre ? "false" : "true");
		$pre.attr("tabindex", isPre ? "0" : "-1");
		$up.attr("tabindex", isPre ? "-1" : "0");
		if (isPre) {
			$panelPre.removeAttr("hidden");
			$panelUp.attr("hidden", "hidden");
		} else {
			$panelPre.attr("hidden", "hidden");
			$panelUp.removeAttr("hidden");
		}
	}

	function populatePreloadedSoundSelects(fileList) {
		var files = Array.isArray(fileList) ? fileList.slice() : [];
		var cur = loadPreloadedSoundSelectionsFromStorage();
		for (var psi = 0; psi < PRESET_SOUND_KINDS.length; psi++) {
			var skind = PRESET_SOUND_KINDS[psi];
			var $sel = $("#preset-sound-preloaded-" + skind);
			if (!$sel.length) {
				continue;
			}
			$sel.empty();
			$sel.append($("<option>", { value: "", text: "— None —" }));
			for (var fi = 0; fi < files.length; fi++) {
				var fn = files[fi];
				$sel.append($("<option>", { value: fn, text: fn }));
			}
			var val = cur[skind];
			if (val && files.indexOf(val) >= 0) {
				$sel.val(val);
			} else {
				$sel.val("");
			}
		}
	}

	function fetchSoundsManifestAndPopulate() {
		$.ajax({
			url: SOUNDS_MANIFEST_URL,
			dataType: "json",
			cache: false,
		})
			.done(function (data) {
				var files = data && Array.isArray(data.files) ? data.files : [];
				populatePreloadedSoundSelects(files);
			})
			.fail(function () {
				populatePreloadedSoundSelects([]);
			});
	}

	function refreshTimerSoundSettingsUi() {
		applyTimerSoundSourceUi();
		fetchSoundsManifestAndPopulate();
	}

	function initTimerSoundSettingsUi() {
		applyTimerSoundSourceUi();
		fetchSoundsManifestAndPopulate();
		$("#preset-sound-source-preloaded-btn").on("click", function () {
			saveSoundSourceToStorage("preloaded");
			refreshTimerSoundSettingsUi();
			syncPresetJsonToProjectFile(presets);
		});
		$("#preset-sound-source-upload-btn").on("click", function () {
			saveSoundSourceToStorage("upload");
			applyTimerSoundSourceUi();
			syncAllPresetFileDrops();
			syncPresetJsonToProjectFile(presets);
		});
		$settingsFrame.on("change", ".preset-settings-sound-preloaded-select", function () {
			var pkind = $(this).attr("data-sound-kind");
			if (!pkind) {
				return;
			}
			var nextSel = loadPreloadedSoundSelectionsFromStorage();
			nextSel[pkind] = String($(this).val() || "");
			savePreloadedSoundSelectionsToStorage(nextSel);
			syncPresetJsonToProjectFile(presets);
		});
	}

	syncAllPresetFileDrops();
	initTimerSoundSettingsUi();
	$counterSize.on("input", function () {
		var raw = Number($(this).val());
		var v = snapCounterSizePct(raw);
		if (v !== raw) {
			$(this).val(String(v));
		}
		$counterSizeOut.text(v + "%");
		$(this).attr("aria-valuenow", String(v));
		setCounterRangeFillPct(this, v);
		try {
			localStorage.setItem(FLIPTIMER_COUNTER_PCT_KEY, String(v));
		} catch (e) {
			/* ignore */
		}
		applyCounterSizePct(v, clock);
	});
	$counterSize.on("change", function () {
		var v = snapCounterSizePct(Number($(this).val()));
		$(this).val(String(v));
		$counterSizeOut.text(v + "%");
		$(this).attr("aria-valuenow", String(v));
		setCounterRangeFillPct(this, v);
		try {
			localStorage.setItem(FLIPTIMER_COUNTER_PCT_KEY, String(v));
		} catch (e) {
			/* ignore */
		}
		applyCounterSizePct(v, clock);
	});

	function presetRowGradient(hex) {
		var c = normalizeHexColor(hex);
		return "linear-gradient(to top, " + c + " 0%, transparent 100%)";
	}

	function reorderPresetsByDrag(dragId, dropId) {
		if (!dragId || !dropId || dragId === dropId) {
			return;
		}
		var fromIdx = -1;
		var toIdx = -1;
		for (var i = 0; i < presets.length; i++) {
			if (presets[i].id === dragId) {
				fromIdx = i;
			}
			if (presets[i].id === dropId) {
				toIdx = i;
			}
		}
		if (fromIdx < 0 || toIdx < 0) {
			return;
		}
		var item = presets.splice(fromIdx, 1)[0];
		var insertAt = fromIdx < toIdx ? toIdx - 1 : toIdx;
		presets.splice(insertAt, 0, item);
		savePresetsToStorage(presets);
		syncPresetJsonToProjectFile(presets);
		renderList();
	}

	function renderList() {
		$list.empty();
		$list.off(".presetDrag").off(".presetTouchReorder");
		if (presets.length === 0) {
			$list.append($("<tr>").append($("<td>", { colspan: 5, class: "preset-table__empty" }).text("No presets yet. Add one below.")));
			syncActivePresetFromList();
			return;
		}
		for (var i = 0; i < presets.length; i++) {
			var p = presets[i];
			var $tr = $("<tr>", {
				class: "preset-table__row",
				draggable: true,
				"data-preset-id": p.id,
				title: "Drag or slide on row to reorder · " + p.color,
			});
			$tr.css("background", presetRowGradient(p.color));
			$tr.append($("<td>").text(p.name));
			$tr.append($("<td>").text(String(p.minutes)));
			$tr.append($("<td>").text(String(p.intervalMinutes)));
			$tr.append($("<td>").text(String(p.rounds)));
			var $actions = $("<td>", { class: "preset-table__actions" });
			$actions.append(
				$("<button>", {
					type: "button",
					class: "preset-icon-btn",
					"data-id": p.id,
					"data-action": "apply",
					"aria-label": "Apply preset",
					title: "Apply",
					html: presetActionIcon("apply"),
				}),
			);
			$actions.append(
				$("<button>", {
					type: "button",
					class: "preset-icon-btn",
					"data-id": p.id,
					"data-action": "edit",
					"aria-label": "Edit preset",
					title: "Edit",
					html: presetActionIcon("edit"),
				}),
			);
			$actions.append(
				$("<button>", {
					type: "button",
					class: "preset-icon-btn preset-icon-btn--danger",
					"data-id": p.id,
					"data-action": "delete",
					"aria-label": "Delete preset",
					title: "Delete",
					html: presetActionIcon("delete"),
				}),
			);
			$tr.append($actions);
			$list.append($tr);
		}

		$list.on("dragstart.presetDrag", "tr.preset-table__row", function (e) {
			var ev = e.originalEvent;
			var id = $(this).attr("data-preset-id");
			if (ev.dataTransfer) {
				ev.dataTransfer.setData("application/x-preset-id", id);
				ev.dataTransfer.effectAllowed = "move";
			}
			$(this).addClass("preset-table__row--dragging");
		});
		$list.on("dragend.presetDrag", "tr.preset-table__row", function () {
			$(this).removeClass("preset-table__row--dragging");
		});
		$list.on("dragover.presetDrag", "tr.preset-table__row", function (e) {
			e.preventDefault();
			var ev = e.originalEvent;
			if (ev.dataTransfer) {
				ev.dataTransfer.dropEffect = "move";
			}
		});
		$list.on("drop.presetDrag", "tr.preset-table__row", function (e) {
			e.preventDefault();
			var ev = e.originalEvent;
			var dragId = ev.dataTransfer ? ev.dataTransfer.getData("application/x-preset-id") : "";
			var dropId = $(this).attr("data-preset-id");
			reorderPresetsByDrag(dragId, dropId);
		});

		// Touch: HTML5 drag often fails on mobile; slide a row onto another to reorder.
		$list.on("touchstart.presetTouchReorder", "tr.preset-table__row", function (e) {
			var oev = e.originalEvent;
			if (!oev.touches || oev.touches.length !== 1) {
				return;
			}
			if ($(e.target).closest("button, a, input, label, .preset-icon-btn").length) {
				return;
			}
			var $tr = $(this);
			var dragId = $tr.attr("data-preset-id");
			var x0 = oev.touches[0].clientX;
			var y0 = oev.touches[0].clientY;
			var dragging = false;
			var threshold = 14;

			function onTouchMove(ev) {
				var t = ev.touches[0];
				var dx = Math.abs(t.clientX - x0);
				var dy = Math.abs(t.clientY - y0);
				if (!dragging && dx + dy > threshold) {
					dragging = true;
					$tr.addClass("preset-table__row--dragging");
				}
				if (dragging) {
					ev.preventDefault();
				}
			}

			function onTouchEnd(ev) {
				document.removeEventListener("touchmove", onTouchMove, { passive: false });
				document.removeEventListener("touchend", onTouchEnd);
				document.removeEventListener("touchcancel", onTouchEnd);
				if (ev.type === "touchcancel") {
					$tr.removeClass("preset-table__row--dragging");
					return;
				}
				var t = ev.changedTouches && ev.changedTouches[0];
				if (dragging && t) {
					var el = document.elementFromPoint(t.clientX, t.clientY);
					var dropTr = el && el.closest ? el.closest("tr.preset-table__row[data-preset-id]") : null;
					if (dropTr) {
						var dropId = dropTr.getAttribute("data-preset-id");
						reorderPresetsByDrag(dragId, dropId);
					}
				}
				$tr.removeClass("preset-table__row--dragging");
			}

			document.addEventListener("touchmove", onTouchMove, { passive: false });
			document.addEventListener("touchend", onTouchEnd);
			document.addEventListener("touchcancel", onTouchEnd);
		});

		syncActivePresetFromList();
	}

	var PRESET_PANEL_DRAG_PAD = 16;

	function isPresetModalMobilePortraitFullscreen() {
		try {
			return window.matchMedia("(max-width: 767px) and (orientation: portrait)").matches;
		} catch (e) {
			return window.innerWidth <= 767 && window.innerHeight >= window.innerWidth;
		}
	}

	function clampPresetPanelPosition(left, top) {
		var el = $panel[0];
		var w = el.offsetWidth;
		var h = el.offsetHeight;
		var vw = window.innerWidth;
		var vh = window.innerHeight;
		var pad = PRESET_PANEL_DRAG_PAD;
		var maxL = vw - w - pad;
		var maxT = vh - h - pad;
		if (maxL < pad) {
			maxL = pad;
		}
		if (maxT < pad) {
			maxT = pad;
		}
		left = Math.min(Math.max(pad, left), maxL);
		top = Math.min(Math.max(pad, top), maxT);
		return { left: Math.round(left), top: Math.round(top) };
	}

	function centerPresetModalPanel() {
		if (isPresetModalMobilePortraitFullscreen()) {
			$panel.css({
				left: "0",
				top: "0",
				right: "0",
				bottom: "0",
				margin: "0",
				transform: "none",
			});
			return;
		}
		var el = $panel[0];
		var w = el.offsetWidth;
		var vw = window.innerWidth;
		var pad = PRESET_PANEL_DRAG_PAD;
		var left = (vw - w) / 2;
		var top = pad;
		var c = clampPresetPanelPosition(left, top);
		$panel.css({
			left: c.left + "px",
			top: c.top + "px",
			right: "auto",
			bottom: "auto",
			margin: "0",
			transform: "none",
		});
	}

	var presetModalPanelDrag = null;

	function applyPresetModalPanelDrag(clientX, clientY) {
		if (!presetModalPanelDrag) {
			return;
		}
		var dx = clientX - presetModalPanelDrag.startX;
		var dy = clientY - presetModalPanelDrag.startY;
		var left = presetModalPanelDrag.origLeft + dx;
		var top = presetModalPanelDrag.origTop + dy;
		var c = clampPresetPanelPosition(left, top);
		$panel.css({ left: c.left + "px", top: c.top + "px" });
	}

	function endPresetModalPanelDrag() {
		if (!presetModalPanelDrag) {
			return;
		}
		presetModalPanelDrag = null;
		$presetModalHeader.removeClass("preset-modal__header--dragging");
		$(document).off(".presetModalPanelDrag");
		document.removeEventListener("touchmove", onPresetModalPanelTouchMove, { passive: false });
		document.removeEventListener("touchend", onPresetModalPanelTouchEnd);
		document.removeEventListener("touchcancel", onPresetModalPanelTouchEnd);
	}

	function onPresetModalPanelTouchMove(e) {
		if (!presetModalPanelDrag || presetModalPanelDrag.touchId === undefined) {
			return;
		}
		var t = null;
		for (var i = 0; i < e.touches.length; i++) {
			if (e.touches[i].identifier === presetModalPanelDrag.touchId) {
				t = e.touches[i];
				break;
			}
		}
		if (!t) {
			return;
		}
		e.preventDefault();
		applyPresetModalPanelDrag(t.clientX, t.clientY);
	}

	function onPresetModalPanelTouchEnd(e) {
		if (!presetModalPanelDrag || presetModalPanelDrag.touchId === undefined) {
			return;
		}
		var ended = false;
		for (var j = 0; j < e.changedTouches.length; j++) {
			if (e.changedTouches[j].identifier === presetModalPanelDrag.touchId) {
				ended = true;
				break;
			}
		}
		if (!ended) {
			return;
		}
		endPresetModalPanelDrag();
	}

	$presetModalHeader.on("mousedown.presetModalPanelDrag", function (e) {
		if (isPresetModalMobilePortraitFullscreen()) {
			return;
		}
		if (e.button !== 0) {
			return;
		}
		if ($(e.target).closest("button, a, input, select, textarea, label").length) {
			return;
		}
		e.preventDefault();
		var rect = $panel[0].getBoundingClientRect();
		presetModalPanelDrag = {
			startX: e.clientX,
			startY: e.clientY,
			origLeft: rect.left,
			origTop: rect.top,
		};
		$presetModalHeader.addClass("preset-modal__header--dragging");
		$(document).on("mousemove.presetModalPanelDrag", function (ev) {
			applyPresetModalPanelDrag(ev.clientX, ev.clientY);
		});
		$(document).on("mouseup.presetModalPanelDrag", endPresetModalPanelDrag);
	});

	$presetModalHeader.on("touchstart.presetModalPanelDrag", function (e) {
		if (isPresetModalMobilePortraitFullscreen()) {
			return;
		}
		if ($(e.target).closest("button, a, input, select, textarea, label").length) {
			return;
		}
		if (e.touches.length !== 1) {
			return;
		}
		var t = e.touches[0];
		var rect = $panel[0].getBoundingClientRect();
		presetModalPanelDrag = {
			startX: t.clientX,
			startY: t.clientY,
			origLeft: rect.left,
			origTop: rect.top,
			touchId: t.identifier,
		};
		$presetModalHeader.addClass("preset-modal__header--dragging");
		document.addEventListener("touchmove", onPresetModalPanelTouchMove, { passive: false });
		document.addEventListener("touchend", onPresetModalPanelTouchEnd);
		document.addEventListener("touchcancel", onPresetModalPanelTouchEnd);
	});

	$(window).on("resize.presetModalPanel", function () {
		if ($modal.is("[hidden]")) {
			return;
		}
		if (isPresetModalMobilePortraitFullscreen()) {
			centerPresetModalPanel();
			return;
		}
		var cur = $panel[0].getBoundingClientRect();
		var c = clampPresetPanelPosition(cur.left, cur.top);
		$panel.css({ left: c.left + "px", top: c.top + "px" });
	});

	function openModal() {
		closeColorPopover();
		$modal.removeAttr("hidden").attr("aria-hidden", "false");
		$openBtn.attr("aria-expanded", "true");
		renderList();
		setTimeout(function () {
			$name.trigger("focus");
		}, 0);
		requestAnimationFrame(function () {
			centerPresetModalPanel();
			refreshPresetCounterSizeRangeFills();
		});
	}

	function closeModal() {
		closeColorPopover();
		savePresetsToStorage(presets);
		syncPresetJsonToProjectFile(presets);
		$modal.attr("hidden", "hidden").attr("aria-hidden", "true");
		$openBtn.attr("aria-expanded", "false");
	}

	function resetForm() {
		editingId = null;
		$editId.val("");
		$name.val("");
		$minutes.val("5");
		$interval.val("0");
		$rounds.val("1");
		syncPresetMultiSlider();
		setPresetColorUi("#ffffff");
		closeColorPopover();
		$presetFormHeading.text("New Timer");
		$saveBtn.text("Save timer");
		$resetEdit.attr("hidden", "hidden");
	}

	function startEdit(id) {
		var p = null;
		for (var i = 0; i < presets.length; i++) {
			if (presets[i].id === id) {
				p = presets[i];
				break;
			}
		}
		if (!p) {
			return;
		}
		editingId = id;
		$editId.val(id);
		$name.val(p.name);
		setPresetColorUi(p.color);
		$minutes.val(p.minutes);
		$interval.val(p.intervalMinutes);
		$rounds.val(p.rounds);
		syncPresetMultiSlider();
		$presetFormHeading.text("Edit Timer");
		$saveBtn.text("Save timer");
		$resetEdit.removeAttr("hidden");
	}

	function applyPreset(p) {
		if (typeof clock.exitIdleWallClockMode === "function") {
			clock.exitIdleWallClockMode(false);
		}
		clock.cancelPrepCountdown();
		var mmss = minutesToStartTime(p.minutes);
		clock.stop();
		clock.options.startTime = mmss;
		clock.setToTime(mmss);
		setActivePresetUi(p);
		refreshToolbar();
	}

	function tryRestoreActivePresetFromStorage() {
		var id = loadActivePresetIdFromStorage();
		if (!id) {
			setActivePresetUi(null);
			return;
		}
		for (var i = 0; i < presets.length; i++) {
			if (presets[i].id === id) {
				applyPreset(presets[i]);
				return;
			}
		}
		saveActivePresetIdToStorage(null);
		setActivePresetUi(null);
	}

	// Initial load: localStorage wins if key exists; else seed from fliptimer.json
	var stored = loadPresetsFromStorage();
	if (stored !== null) {
		presets = stored;
		renderList();
		tryRestoreActivePresetFromStorage();
	} else {
		fetchPresetTimersDocument().then(function (doc) {
			presets = doc.presets;
			savePresetsToStorage(presets);
			if (doc.appBackgroundDataUrl) {
				persistAppBgState({ dataUrl: doc.appBackgroundDataUrl });
				applyAppBackgroundState({ dataUrl: doc.appBackgroundDataUrl });
			} else if (doc.appBackgroundFile) {
				applyAppBackgroundState({ dataUrl: doc.appBackgroundFile });
			}
			if (doc.jsonRoot) {
				applySoundsFromJsonRoot(doc.jsonRoot);
			}
			syncPresetJsonToProjectFile(presets);
			renderList();
			tryRestoreActivePresetFromStorage();
			syncAllPresetFileDrops();
			refreshTimerSoundSettingsUi();
		});
	}

	$("#active-preset-clear").on("click", function () {
		clock.cancelPrepCountdown();
		if (typeof clock.exitIdleWallClockMode === "function") {
			clock.exitIdleWallClockMode(true);
		}
		setActivePresetUi(null);
		refreshToolbar();
	});

	$openBtn.on("click", function () {
		if (typeof clock.exitIdleWallClockMode === "function") {
			clock.exitIdleWallClockMode(true);
		}
		refreshToolbar();
		openModal();
	});

	$modal.find("[data-preset-close]").on("click", function () {
		closeModal();
	});

	$(document).on("keydown.presetModal", function (e) {
		if (e.key !== "Escape" || $modal.is("[hidden]")) {
			return;
		}
		if (isPresetTimerSettingsExpanded()) {
			closePresetSettings();
			e.preventDefault();
			return;
		}
		if (!$colorPopover.is("[hidden]")) {
			closeColorPopover();
			e.preventDefault();
			return;
		}
		closeModal();
	});

	$list.on("click", function (e) {
		var $btn = $(e.target).closest("button[data-action]");
		if (!$btn.length) {
			return;
		}
		var id = $btn.attr("data-id");
		var action = $btn.attr("data-action");
		if (action === "delete") {
			if (window.confirm("Delete this preset?")) {
				presets = presets.filter(function (p) {
					return p.id !== id;
				});
				savePresetsToStorage(presets);
				syncPresetJsonToProjectFile(presets);
				renderList();
				if (editingId === id) {
					resetForm();
				}
			}
			return;
		}
		if (action === "edit") {
			startEdit(id);
			return;
		}
		if (action === "apply") {
			for (var i = 0; i < presets.length; i++) {
				if (presets[i].id === id) {
					applyPreset(presets[i]);
					closeModal();
					break;
				}
			}
		}
	});

	function commitPresetForm() {
		var name = String($name.val() || "").trim();
		if (!name) {
			$name.trigger("focus");
			return;
		}
		var timerSettingsWereOpen = isPresetTimerSettingsExpanded();
		var entry = normalizePreset({
			id: editingId || generatePresetId(),
			name: name,
			color: $color.val(),
			minutes: $minutes.val(),
			intervalMinutes: $interval.val(),
			rounds: $rounds.val(),
		});
		if (editingId) {
			for (var i = 0; i < presets.length; i++) {
				if (presets[i].id === editingId) {
					presets[i] = entry;
					break;
				}
			}
		} else {
			presets.push(entry);
		}
		savePresetsToStorage(presets);
		syncPresetJsonToProjectFile(presets);
		resetForm();
		renderList();
		if (timerSettingsWereOpen) {
			window.setTimeout(function () {
				openPresetSettings({ focus: false });
			}, 0);
		}
	}

	$saveBtn.on("click", function (e) {
		e.preventDefault();
		e.stopPropagation();
		commitPresetForm();
	});

	$form.on("submit", function (e) {
		e.preventDefault();
		e.stopPropagation();
		commitPresetForm();
		return false;
	});

	$name.on("keydown", function (e) {
		if (e.key === "Enter") {
			e.preventDefault();
			commitPresetForm();
		}
	});

	$("#preset-form-reset").on("click", function () {
		resetForm();
	});
}

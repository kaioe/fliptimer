/**
 * Fliptimer — entry point (ES module)
 * Bootstraps the app after DOMContentLoaded.
 */
import { Fliptimer, getLocalTimeHhMmString } from "./src/fliptimer-clock.js";
import {
	PRESET_TRACK_MAX_KEY,
	DEFAULT_BG_FILE,
	migrateLocalStorage,
	snapTrackMaxMinutes,
	getPresetTrackMax,
	setPresetTrackMax,
	initPresetCounterSizeTicks,
	refreshPresetCounterSizeRangeFills,
	setCounterRangeFillPct,
	loadCounterSizePct,
	applyCounterSizePct,
	loadAppBgStateFromStorage,
} from "./src/storage.js";

/* Migrate old flipclock-* localStorage keys before anything reads them. */
migrateLocalStorage();
import {
	FLIPTIMER_PREP_FLIP_MS,
	FLIPTIMER_COUNTDOWN_TICK_BUFFER_MS,
	fliptimerUnlockHtmlAudioIfNeeded,
	playFliptimerSound,
} from "./src/sound-manager.js";
import { initFliptimerChromeDimming, initFliptimerToolbar } from "./src/toolbar.js";
import { initPresetTimers } from "./src/presets-ui.js";
import { applyAppBackgroundState } from "./src/presets-data.js";

const $ = window.jQuery;

$(function () {
	document.addEventListener("click", fliptimerUnlockHtmlAudioIfNeeded, { once: true, capture: true });
	document.addEventListener("touchstart", fliptimerUnlockHtmlAudioIfNeeded, { once: true, capture: true, passive: true });
	document.addEventListener("keydown", fliptimerUnlockHtmlAudioIfNeeded, { once: true, capture: true });

	initPresetCounterSizeTicks();
	var bgState = loadAppBgStateFromStorage();
	if (!bgState) {
		bgState = { dataUrl: DEFAULT_BG_FILE };
	}
	applyAppBackgroundState(bgState);
	var clock = new Fliptimer({
		isCountdown: false,
		startTime: getLocalTimeHhMmString(),
		maxTime: "23:59",
		minTime: "00:00",
		tickDuration: 60000,
		containerElement: $(".countdown"),
		face: {
			hours: { maxValue: 23 },
			minutes: { maxValue: 59 },
		},
	});
	window.fliptimerInstance = clock;
	clock.setDimensions();
	$(window).on("resize.fliptimerCounter", function () {
		if (window.fliptimerInstance && typeof window.fliptimerInstance.setDimensions === "function") {
			window.fliptimerInstance.setDimensions();
		}
		refreshPresetCounterSizeRangeFills();
	});
	if (window.visualViewport) {
		window.visualViewport.addEventListener("resize", function () {
			if (window.fliptimerInstance && typeof window.fliptimerInstance.setDimensions === "function") {
				window.fliptimerInstance.setDimensions();
			}
			refreshPresetCounterSizeRangeFills();
		});
	}
	var applyChromeDim = initFliptimerChromeDimming(clock);
	var refreshToolbar = initFliptimerToolbar(clock, applyChromeDim);
	$(".countdown").on("fliptimer:countdown-complete", function () {
		playFliptimerSound("finish");
		refreshToolbar();
	});
	initPresetTimers(clock, refreshToolbar);
	var pct0 = loadCounterSizePct();
	applyCounterSizePct(pct0, clock);
	$(".countdown").addClass("fliptimer-ready");
	var $counterSizeInit = $("#fliptimer-counter-size");
	var $counterSizeOutInit = $("#fliptimer-counter-size-out");
	if ($counterSizeInit.length) {
		$counterSizeInit.val(String(pct0)).attr("aria-valuenow", String(pct0));
		$counterSizeOutInit.text(pct0 + "%");
		setCounterRangeFillPct($counterSizeInit[0], pct0);
	}
	var $trackMaxInit = $("#fliptimer-preset-track-max");
	var $trackMaxOutInit = $("#fliptimer-preset-track-max-out");
	if ($trackMaxInit.length) {
		var tm0 = snapTrackMaxMinutes(getPresetTrackMax());
		setPresetTrackMax(tm0);
		try {
			localStorage.setItem(PRESET_TRACK_MAX_KEY, String(tm0));
		} catch (e) {
			/* ignore */
		}
		$trackMaxInit.val(String(tm0)).attr("aria-valuenow", String(tm0));
		$trackMaxOutInit.text(tm0 + " min");
		setCounterRangeFillPct($trackMaxInit[0], tm0);
	}
});

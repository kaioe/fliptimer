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
import { applyAppBackgroundState, minutesToStartTime } from "./src/presets-data.js";

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
	var $playPauseBtn = $("#clock-play-pause-btn");

	// Handle round completion
	$(".countdown").on("fliptimer:countdown-complete", function () {
		if (clock.intervalMinutes > 0) {
			// Play interval before next round
			playFliptimerSound("finish");
			if (clock.hasNextRound()) {
				clock.nextRound();
			}
			if (typeof window.updateFliptimerRoundIndicator === "function") {
				window.updateFliptimerRoundIndicator(clock);
			}
			setTimeout(function() {
				startIntervalTimer();
			}, 1000);
		} else if (clock.hasNextRound()) {
			// Start next round immediately
			playFliptimerSound("finish");
			clock.nextRound();
			if (typeof window.updateFliptimerRoundIndicator === "function") {
				window.updateFliptimerRoundIndicator(clock);
			}
			clock.stop();
			// Trigger prep countdown via play button
			$playPauseBtn.trigger("click");
		} else {
			// All rounds complete
			playFliptimerSound("finish");
			clock.resetRounds();
		}
		refreshToolbar();
	});

	// Handle interval completion
	$(".countdown").on("fliptimer:interval-complete", function () {
		if (typeof window.hideFliptimerIntervalIndicator === "function") {
			window.hideFliptimerIntervalIndicator();
		}
		if (clock.hasNextRound()) {
			// Start next round after interval
			playFliptimerSound("start");
			clock.endIntervalMode();
			if (typeof window.updateFliptimerRoundIndicator === "function") {
				window.updateFliptimerRoundIndicator(clock);
			}
			// Rebuild timer for next round
			var activePresetId = localStorage.getItem("fliptimer-active-preset-id");
			if (activePresetId) {
				// Find and apply the active preset
				var stored = localStorage.getItem("fliptimer-presets");
				if (stored) {
					try {
						var data = JSON.parse(stored);
						if (data && data.presets) {
							var preset = data.presets.find(function(p) { return p.id === activePresetId; });
							if (preset) {
								var mmss = minutesToStartTime(preset.minutes);
								clock.rebuildFace({
									isCountdown: true,
									startTime: mmss,
									maxTime: mmss,
									minTime: "00:00",
									tickDuration: FLIPTIMER_PREP_FLIP_MS + FLIPTIMER_COUNTDOWN_TICK_BUFFER_MS,
								});
								clock.start();
							}
						}
					} catch (e) {}
				}
			}
		}
		refreshToolbar();
	});

	function startIntervalTimer() {
		if (clock.intervalMinutes <= 0) {
			return;
		}
		var intervalTimeStr = minutesToStartTime(clock.intervalMinutes);
		clock.rebuildFace({
			isCountdown: true,
			startTime: intervalTimeStr,
			maxTime: intervalTimeStr,
			minTime: "00:00",
			tickDuration: FLIPTIMER_PREP_FLIP_MS + FLIPTIMER_COUNTDOWN_TICK_BUFFER_MS,
			face: {
				minutes: { maxValue: 59 },
				seconds: { maxValue: 59 },
			},
		});
		clock.startIntervalMode();
		clock.stop();
		if (typeof window.showFliptimerIntervalIndicator === "function") {
			window.showFliptimerIntervalIndicator();
		}
		// Trigger prep countdown via play button
		setTimeout(function() {
			$playPauseBtn.trigger("click");
		}, 100);
	}

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

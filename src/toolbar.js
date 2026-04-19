/**
 * Toolbar — chrome dimming, play/pause, prep countdown, idle clock.
 */
const $ = window.jQuery;
"use strict";

import { comparableIntToMmSsString, prepStepToMmSs, getLocalTimeHhMmString } from "./fliptimer-clock.js";
import {
	playFliptimerSound, playPrepCountdownBeep,
	fliptimerUnlockHtmlAudioIfNeeded,
	FLIPTIMER_PREP_FLIP_MS, FLIPTIMER_PREP_FLIP_FALLBACK_PAD_MS,
} from "./sound-manager.js";

/**
 * @param {Fliptimer} clock
 * @returns {function(): void}
 */
export const TOOLBAR_ICON_PLAY = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="8 5 8 19 19 12 8 5"/></svg>';
export const TOOLBAR_ICON_PAUSE = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>';

/** Ms of no pointer/touch/keyboard activity before chrome dims again while the countdown runs. */
export const FLIPTIMER_CHROME_IDLE_MS = 3000;

/**
 * While the countdown is running, dims `.fliptimer-toolbar` and `.active-preset` until the user
 * interacts (pointer, touch, or keyboard); after **{@link FLIPTIMER_CHROME_IDLE_MS}** with no
 * interaction, chrome fades dim again until the next interaction or `fliptimer:countdown-complete`.
 * @param {Fliptimer} clock
 * @returns {function(): void}
 */
export function initFliptimerChromeDimming(clock) {
	var userRevealedChrome = false;
	var chromeIdleTimer = null;
	var $toolbar = $(".fliptimer-toolbar");
	var $activePreset = $("#active-preset");

	function clockIsActiveForChromeDim() {
		return clock.options.isCountdown === true && (clock.tickInterval !== false || clock.prepCountdownActive === true);
	}

	function clearChromeIdleTimer() {
		if (chromeIdleTimer !== null) {
			window.clearTimeout(chromeIdleTimer);
			chromeIdleTimer = null;
		}
	}

	function scheduleChromeDimAfterIdle() {
		clearChromeIdleTimer();
		chromeIdleTimer = window.setTimeout(function () {
			chromeIdleTimer = null;
			if (!clockIsActiveForChromeDim()) {
				return;
			}
			userRevealedChrome = false;
			applyChromeDim();
		}, FLIPTIMER_CHROME_IDLE_MS);
	}

	function applyChromeDim() {
		var running = clockIsActiveForChromeDim();
		if (!running) {
			clearChromeIdleTimer();
			userRevealedChrome = false;
		}
		var dim = running && !userRevealedChrome;
		$toolbar.toggleClass("fliptimer-chrome-dimmed", dim);
		$activePreset.toggleClass("fliptimer-chrome-dimmed", dim);
	}

	function onInteractionRevealChrome() {
		if (!clockIsActiveForChromeDim()) {
			return;
		}
		userRevealedChrome = true;
		applyChromeDim();
		scheduleChromeDimAfterIdle();
	}

	$(document).on("mousemove.fliptimerChromeDim keydown.fliptimerChromeDim", onInteractionRevealChrome);
	document.addEventListener(
		"touchstart",
		function fliptimerTouchRevealChrome() {
			onInteractionRevealChrome();
		},
		{ passive: true, capture: true },
	);
	document.addEventListener(
		"touchmove",
		function fliptimerTouchMoveRevealChrome() {
			onInteractionRevealChrome();
		},
		{ passive: true, capture: true },
	);

	$(".countdown").on("fliptimer:countdown-complete.fliptimerChromeDim", function () {
		userRevealedChrome = false;
		clearChromeIdleTimer();
		applyChromeDim();
	});

	return applyChromeDim;
}

/**
 * @param {Fliptimer} clock
 * @param {function(): void} [onAfterToolbarRefresh] — e.g. sync toolbar/active-preset dimming
 */
export function initFliptimerToolbar(clock, onAfterToolbarRefresh) {
	var $playPause = $("#clock-play-pause-btn");
	var $reset = $("#clock-reset-btn");
	var $toolbar = $(".fliptimer-toolbar");
	var $activePresetIdle = $("#active-preset");
	var $fullscreenBtn = $("#fullscreen-btn");

	var fullscreenIconExpand = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>';
	var fullscreenIconShrink = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>';

	function isFullscreen() {
		return !!(document.fullscreenElement || document.webkitFullscreenElement);
	}

	function updateFullscreenIcon() {
		var fs = isFullscreen();
		$fullscreenBtn.html(fs ? fullscreenIconShrink : fullscreenIconExpand);
		$fullscreenBtn.attr("aria-label", fs ? "Exit fullscreen" : "Fullscreen");
	}

	$fullscreenBtn.on("click", function () {
		if (isFullscreen()) {
			var exit = document.exitFullscreen || document.webkitExitFullscreen;
			if (typeof exit === "function") { exit.call(document); }
		} else {
			var el = document.documentElement;
			var req = el.requestFullscreen || el.webkitRequestFullscreen;
			if (typeof req === "function") { req.call(el); }
		}
	});

	document.addEventListener("fullscreenchange", updateFullscreenIcon);
	if (document.webkitFullscreenElement !== undefined) {
		document.addEventListener("webkitfullscreenchange", updateFullscreenIcon);
	}

	var prepTimeoutId = null;
	/** Clears prep flip `animationend` listener + fallback timer (see `beginPrepCountdown`). */
	var prepFlipCleanup = null;
	/** Snapshot of `MM:SS` to restore after prep (or if prep is cancelled). */
	var prepResumeTimeStr = null;

	/* Provide a no-op so consumers (presets-ui) don't need feature-check branches. */
	clock.exitIdleWallClockMode = function () {};

	function clearPrepSchedule() {
		if (typeof prepFlipCleanup === "function") {
			prepFlipCleanup();
			prepFlipCleanup = null;
		}
		if (prepTimeoutId !== null) {
			window.clearTimeout(prepTimeoutId);
			prepTimeoutId = null;
		}
	}

	function cancelPrepCountdown() {
		if (!clock.prepCountdownActive) {
			return;
		}
		clearPrepSchedule();
		clock.prepCountdownActive = false;
		if (prepResumeTimeStr) {
			clock.setToTime(prepResumeTimeStr);
			prepResumeTimeStr = null;
		}
	}

	/** Exposed so preset apply / reset paths can clear prep without duplicating logic. */
	clock.cancelPrepCountdown = cancelPrepCountdown;

	function finishPrepAndStartTimer() {
		clearPrepSchedule();
		clock.prepCountdownActive = false;
		var resume = prepResumeTimeStr;
		prepResumeTimeStr = null;
		if (resume) {
			clock.setToTime(resume);
		}
		clock.start(true);
		playFliptimerSound("start");
		refresh();
	}

	function beginPrepCountdown() {
		cancelPrepCountdown();
		prepResumeTimeStr = comparableIntToMmSsString(clock.getCurrentTime());
		clock.prepCountdownActive = true;
		var step = 0;
		function runStep() {
			if (!clock.prepCountdownActive) {
				return;
			}
			if (step >= 5) {
				finishPrepAndStartTimer();
				return;
			}
			var n = 5 - step;
			clock.setToTime(prepStepToMmSs(n));
			step++;
			/**
			 * Wait until the CSS flip **finishes** before beep + next `setToTime`. A fixed delay or rAF could
			 * still call `removeClass("play")` mid-animation and leave mismatched top/bottom halves (see flip
			 * `flip-turn-down` / `flip-turn-up`). Debounce coalesces multiple digit columns.
			 */
			var root = clock.options.containerElement[0];
			var settled = false;
			var debounceTimer = null;
			function prepChainDone() {
				if (settled || !clock.prepCountdownActive) {
					return;
				}
				settled = true;
				if (root) {
					root.removeEventListener("animationend", onPrepFlipAnimEnd, true);
				}
				if (debounceTimer !== null) {
					window.clearTimeout(debounceTimer);
					debounceTimer = null;
				}
				if (prepTimeoutId !== null) {
					window.clearTimeout(prepTimeoutId);
					prepTimeoutId = null;
				}
				prepFlipCleanup = null;
				playPrepCountdownBeep();
				runStep();
			}
			function schedulePrepChainDoneAfterPaint() {
				var raf =
					typeof window.requestAnimationFrame === "function"
						? window.requestAnimationFrame.bind(window)
						: function (cb) {
								window.setTimeout(cb, 0);
							};
				raf(function () {
					raf(function () {
						prepChainDone();
					});
				});
			}
			function onPrepFlipAnimEnd(ev) {
				var name = ev && ev.animationName ? String(ev.animationName) : "";
				if (name.indexOf("flip-turn-down") === -1) {
					return;
				}
				if (debounceTimer !== null) {
					window.clearTimeout(debounceTimer);
				}
				debounceTimer = window.setTimeout(function () {
					debounceTimer = null;
					schedulePrepChainDoneAfterPaint();
				}, 0);
			}
			prepFlipCleanup = function prepFlipCleanupFn() {
				if (settled) {
					return;
				}
				settled = true;
				if (root) {
					root.removeEventListener("animationend", onPrepFlipAnimEnd, true);
				}
				if (debounceTimer !== null) {
					window.clearTimeout(debounceTimer);
					debounceTimer = null;
				}
				if (prepTimeoutId !== null) {
					window.clearTimeout(prepTimeoutId);
					prepTimeoutId = null;
				}
				prepFlipCleanup = null;
			};
			if (root) {
				root.addEventListener("animationend", onPrepFlipAnimEnd, true);
			}
			prepTimeoutId = window.setTimeout(function () {
				if (settled || !clock.prepCountdownActive) {
					return;
				}
				schedulePrepChainDoneAfterPaint();
			}, FLIPTIMER_PREP_FLIP_MS + FLIPTIMER_PREP_FLIP_FALLBACK_PAD_MS);
		}
		runStep();
	}

	function refresh() {
		var running = (clock.options.isCountdown === true) && (clock.tickInterval !== false || clock.prepCountdownActive === true);
		if (running) {
			$playPause.html(TOOLBAR_ICON_PAUSE).attr("aria-label", "Pause").addClass("is-playing");
		} else {
			$playPause.html(TOOLBAR_ICON_PLAY).attr("aria-label", "Play").removeClass("is-playing");
		}
		if (typeof onAfterToolbarRefresh === "function") {
			onAfterToolbarRefresh();
		}
	}

	/* Do NOT call clock.stop() here — the clock should tick immediately in clock mode. */
	refresh();

	$playPause.on("click", function () {
		/* Play/Pause only makes sense in countdown mode */
		if (clock.options.isCountdown !== true) {
			return;
		}
		fliptimerUnlockHtmlAudioIfNeeded();
		if (clock.tickInterval !== false) {
			clock.stop();
			playFliptimerSound("pause");
		} else if (clock.prepCountdownActive) {
			cancelPrepCountdown();
			playFliptimerSound("pause");
		} else {
			beginPrepCountdown();
		}
		refresh();
	});

	$reset.on("click", function () {
		if (clock.options.isCountdown === true) {
			/* Countdown mode: reset to start time and stop */
			cancelPrepCountdown();
			clock.stop();
			clock.setToTime(clock.options.startTime);
		} else {
			/* Clock mode: snap to current local time (noop-ish, but handles edge cases) */
			clock.stop();
			clock.snapToTime(getLocalTimeHhMmString());
			clock.start(true);
		}
		refresh();
	});

	return refresh;
}

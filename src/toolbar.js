/**
 * Toolbar — chrome dimming, play/pause, prep countdown, idle clock.
 */
const $ = window.jQuery;
"use strict";

import { comparableIntToMmSsString, prepStepToMmSs } from "./fliptimer-clock.js";
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
		return clock.tickInterval !== false || clock.prepCountdownActive === true;
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
/** Ms after which a paused/stopped timer shows local wall time (HH:MM) and hides the toolbar. */
export const FLIPTIMER_IDLE_WALL_CLOCK_MS = 10000;

export function initFliptimerToolbar(clock, onAfterToolbarRefresh) {
	var $playPause = $("#clock-play-pause-btn");
	var $reset = $("#clock-reset-btn");
	var $toolbar = $(".fliptimer-toolbar");
	var $activePresetIdle = $("#active-preset");
	var prepTimeoutId = null;
	/** Clears prep flip `animationend` listener + fallback timer (see `beginPrepCountdown`). */
	var prepFlipCleanup = null;
	/** Snapshot of `MM:SS` to restore after prep (or if prep is cancelled). */
	var prepResumeTimeStr = null;

	var becameInactiveAt = null;
	var idleWallClockActive = false;
	var idleWallClockTickId = null;
	/** Last pointer time while wall-clock idle (toolbar + active-preset revealed); after {@link FLIPTIMER_IDLE_WALL_CLOCK_MS} with no activity, both fade off again. */
	var lastIdleToolbarPointerAt = null;
	/** Snapshot of round time when entering idle wall-clock mode (restored on Play / Presets unless cleared). */
	var pausedTimeBeforeIdleWallClock = null;

	function getLocalTimeHhMmString() {
		var d = new Date();
		var h = d.getHours();
		var m = d.getMinutes();
		return (h < 10 ? "0" + h : String(h)) + ":" + (m < 10 ? "0" + m : String(m));
	}

	function exitIdleWallClockMode(restorePausedFace) {
		if (!idleWallClockActive) {
			return;
		}
		if (idleWallClockTickId !== null) {
			window.clearInterval(idleWallClockTickId);
			idleWallClockTickId = null;
		}
		$toolbar.removeClass("fliptimer-idle-clock");
		$activePresetIdle.removeClass("fliptimer-idle-clock");
		lastIdleToolbarPointerAt = null;
		var snap = pausedTimeBeforeIdleWallClock;
		pausedTimeBeforeIdleWallClock = null;
		idleWallClockActive = false;
		if (restorePausedFace !== false && snap !== null) {
			clock.setToTime(snap);
		}
	}

	function enterIdleWallClockMode() {
		if (clock.tickInterval !== false || clock.prepCountdownActive) {
			return;
		}
		if (idleWallClockActive) {
			return;
		}
		pausedTimeBeforeIdleWallClock = comparableIntToMmSsString(clock.getCurrentTime());
		idleWallClockActive = true;
		lastIdleToolbarPointerAt = null;
		clock.setToTime(getLocalTimeHhMmString());
		$toolbar.addClass("fliptimer-idle-clock");
		$activePresetIdle.addClass("fliptimer-idle-clock");
		idleWallClockTickId = window.setInterval(function () {
			if (clock.tickInterval !== false || clock.prepCountdownActive) {
				exitIdleWallClockMode(false);
				return;
			}
			if (!idleWallClockActive) {
				return;
			}
			clock.setToTime(getLocalTimeHhMmString());
		}, 60000);
	}

	function pollIdleWallClock() {
		if (clock.tickInterval !== false || clock.prepCountdownActive) {
			becameInactiveAt = null;
			exitIdleWallClockMode(false);
			return;
		}
		if (idleWallClockActive) {
			if (
				!$toolbar.hasClass("fliptimer-idle-clock") &&
				lastIdleToolbarPointerAt !== null &&
				Date.now() - lastIdleToolbarPointerAt >= FLIPTIMER_IDLE_WALL_CLOCK_MS
			) {
				$toolbar.addClass("fliptimer-idle-clock");
				$activePresetIdle.addClass("fliptimer-idle-clock");
			}
			return;
		}
		if (becameInactiveAt === null) {
			return;
		}
		if (Date.now() - becameInactiveAt < FLIPTIMER_IDLE_WALL_CLOCK_MS) {
			return;
		}
		enterIdleWallClockMode();
	}

	clock.exitIdleWallClockMode = exitIdleWallClockMode;

	/**
	 * While wall-clock idle, pointer motion restores full opacity on `.fliptimer-toolbar` and `.active-preset`
	 * and records activity so both can fade off again after {@link FLIPTIMER_IDLE_WALL_CLOCK_MS} with no further pointer input.
	 */
	function onIdleWallClockPointerActivity() {
		if (!idleWallClockActive) {
			return;
		}
		lastIdleToolbarPointerAt = Date.now();
		$toolbar.removeClass("fliptimer-idle-clock");
		$activePresetIdle.removeClass("fliptimer-idle-clock");
	}

	$(document).on("mousemove.fliptimerIdleToolbarReveal", onIdleWallClockPointerActivity);
	document.addEventListener(
		"touchstart",
		function fliptimerIdleToolbarTouchReveal() {
			onIdleWallClockPointerActivity();
		},
		{ passive: true, capture: true },
	);
	document.addEventListener(
		"touchmove",
		function fliptimerIdleToolbarTouchMoveReveal() {
			onIdleWallClockPointerActivity();
		},
		{ passive: true, capture: true },
	);

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
		var running = clock.tickInterval !== false || clock.prepCountdownActive === true;
		if (running) {
			becameInactiveAt = null;
			exitIdleWallClockMode(false);
			$playPause.html(TOOLBAR_ICON_PAUSE).attr("aria-label", "Pause").addClass("is-playing");
		} else {
			becameInactiveAt = Date.now();
			$playPause.html(TOOLBAR_ICON_PLAY).attr("aria-label", "Play").removeClass("is-playing");
		}
		if (typeof onAfterToolbarRefresh === "function") {
			onAfterToolbarRefresh();
		}
	}

	clock.stop();
	refresh();

	window.setInterval(pollIdleWallClock, 1000);

	$playPause.on("click", function () {
		fliptimerUnlockHtmlAudioIfNeeded();
		exitIdleWallClockMode(true);
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
		cancelPrepCountdown();
		exitIdleWallClockMode(false);
		clock.stop();
		clock.setToTime(clock.options.startTime);
		refresh();
	});

	return refresh;
}

/**
 * Fliptimer clock class.
 */
const $ = window.jQuery;
"use strict";

// -------------------------------------------------------------------------
// Module helpers (no DOM)
// -------------------------------------------------------------------------

/** Strip ":" and parse as integer (e.g. "23:59:59" → 235959) */
function timeStringToComparableInt(timeStr) {
	return parseInt(String(timeStr).replace(/:/g, ""), 10);
}

/** Inverse of {@link timeStringToComparableInt} for 4-digit MM:SS faces (pads to 4 digits). */
export function comparableIntToMmSsString(t) {
	var n = Math.max(0, Math.min(5959, parseInt(String(t), 10) || 0));
	var s = String(n);
	while (s.length < 4) {
		s = "0" + s;
	}
	return s.slice(0, 2) + ":" + s.slice(2, 4);
}

/** Inverse of {@link timeStringToComparableInt} for 4-digit HH:MM faces (pads to 4 digits). */
export function comparableIntToHhMmString(t) {
	var n = Math.max(0, Math.min(2359, parseInt(String(t), 10) || 0));
	var s = String(n);
	while (s.length < 4) {
		s = "0" + s;
	}
	return s.slice(0, 2) + ":" + s.slice(2, 4);
}

/** Returns current local time as "HH:MM" string. */
export function getLocalTimeHhMmString() {
	var d = new Date();
	var h = d.getHours();
	var m = d.getMinutes();
	return (h < 10 ? "0" + h : String(h)) + ":" + (m < 10 ? "0" + m : String(m));
}

/** Prep step 5…1 → `00:05`…`00:01` on the flip clock. */
export function prepStepToMmSs(seconds) {
	var sec = Math.max(1, Math.min(5, seconds | 0));
	return "00:" + (sec < 10 ? "0" + sec : String(sec));
}

var transitionSupportComputed = false;
var transitionSupport = false;

function getTransitionSupport() {
	if (!transitionSupportComputed) {
		transitionSupportComputed = true;
		var body = document.body || document.documentElement;
		var style = body.style;
		transitionSupport = style.transition !== undefined || style.WebkitTransition !== undefined || style.MozTransition !== undefined || style.MsTransition !== undefined || style.OTransition !== undefined;
	}
	return transitionSupport;
}

// -------------------------------------------------------------------------
// Constructor
// -------------------------------------------------------------------------

/**
 * @param {Object} options — merged with defaults via createConfig
 * @constructor
 */
export function Fliptimer(options) {
	this.tickInterval = false;
	/** True while the 5s prep countdown runs (before the main interval starts). */
	this.prepCountdownActive = false;
	this.digitSelectors = [];
	this.options = this.createConfig(options);
	this.init();
}

// -------------------------------------------------------------------------
// Configuration
// -------------------------------------------------------------------------

Fliptimer.prototype.createConfig = function (options) {
	return $.extend({}, this.getDefaultConfig(), options);
};

Fliptimer.prototype.getDefaultConfig = function () {
	return {
		tickDuration: 1000,
		isCountdown: false,
		startTime: "23:59:51",
		maxTime: "23:59:59",
		minTime: "00:00:00",
		containerElement: $(".container"),
		segmentSelectorPrefix: "fliptimer-",
		face: {
			hours: { maxValue: 23 },
			minutes: { maxValue: 59 },
			seconds: { maxValue: 59 },
		},
	};
};

// -------------------------------------------------------------------------
// Feature detection
// -------------------------------------------------------------------------

Fliptimer.prototype.initFeatureDetection = function () {
	if (typeof $.support === "undefined") {
		$.support = {};
	}
	$.support.transition = getTransitionSupport();
};

/**
 * @param {string} feature — e.g. "transition"
 * @returns {boolean}
 */
Fliptimer.prototype.isFeatureSupported = function (feature) {
	if (!feature || typeof $.support === "undefined") {
		return false;
	}
	return $.support[feature] === true;
};

// -------------------------------------------------------------------------
// Lifecycle & layout
// -------------------------------------------------------------------------

Fliptimer.prototype.init = function () {
	var container = this.options.containerElement;
	container.empty();

	if (this.tickInterval !== false) {
		clearInterval(this.tickInterval);
		this.tickInterval = false;
	}

	this.appendMarkupToContainer();
	this.setDimensions();
	this.setupFallbacks();
	this.start();
};

Fliptimer.prototype.setupFallbacks = function () {
	this.initFeatureDetection();
	var container = this.options.containerElement;
	var firstFlip = $("ul.flip li:first-child", container);

	if (this.isFeatureSupported("transition")) {
		firstFlip.css("z-index", 2);
	} else {
		firstFlip.css("z-index", 3);
		$("ul.flip:nth-child(2n+2):not(:last-child)", container).addClass("nth-child-2np2-notlast");
	}
};

Fliptimer.prototype.setDimensions = function () {
	var container = this.options.containerElement;
	var el = container[0];
	var flipHeight = container.height();
	var flipWidth = flipHeight / 1.5;

	if (el && el.style) {
		el.style.setProperty("--fc-flip-h", flipHeight + "px");
		el.style.setProperty("--fc-flip-w", flipWidth + "px");
	}

	$("ul.flip", container)
		.css({
			width: flipWidth,
			fontSize: (flipHeight * 0.85) + "px",
		});
};

// -------------------------------------------------------------------------
// Markup: segments & digits
// -------------------------------------------------------------------------

Fliptimer.prototype.createSegment = function (faceSegmentGroupName) {
	var faceSegmentGroup = this.options.face[faceSegmentGroupName];
	var addons = ["-ten", "-one"];
	var prefix = this.options.segmentSelectorPrefix;
	var rounded = Math.ceil(faceSegmentGroup.maxValue / 10);

	if (faceSegmentGroup.maxValue / 10 > 1) {
		return [
			{ selector: prefix + faceSegmentGroupName + addons[0], ticks: rounded },
			{ selector: prefix + faceSegmentGroupName + addons[1], ticks: 10 },
		];
	}
	return [{ selector: prefix + faceSegmentGroupName + addons[1], ticks: 10 }];
};

Fliptimer.prototype.appendMarkupToContainer = function () {
	var baseZIndex = 0;
	var container = this.options.containerElement;
	var face = this.options.face;

	for (var faceSegmentGroup in face) {
		if (!Object.prototype.hasOwnProperty.call(face, faceSegmentGroup)) {
			continue;
		}
		face[faceSegmentGroup].segments = this.createSegment(faceSegmentGroup);
		var segments = face[faceSegmentGroup].segments;

		for (var i = 0; i < segments.length; i++) {
			var faceSegmentElement = this.createFaceSegment(segments[i]);
			this.digitSelectors.push(segments[i].selector);
			container.append(faceSegmentElement);
			faceSegmentElement.data("face-segment-group", faceSegmentGroup);
			faceSegmentElement.addClass(faceSegmentGroup);
			faceSegmentElement.css("z-index", baseZIndex++);
		}
	}

	this.digitSelectors.reverse();
};

Fliptimer.prototype.createFaceSegment = function (faceSegment) {
	var faceElement = $("<ul>", { class: "flip " + faceSegment.selector });
	for (var i = 0; i < faceSegment.ticks; i++) {
		faceElement.append(this.createFaceDigit(i));
	}
	return faceElement;
};

Fliptimer.prototype.createFaceDigit = function (digit) {
	var inner = '<div class="shadow"></div><div class="inn">' + digit + "</div>";
	var span = '<div class="up">' + inner + "</div>" + '<div class="down">' + inner + "</div>";
	return "<li data-digit=" + digit + " ><span>" + span + "</span></li>";
};

// -------------------------------------------------------------------------
// Public clock API
// -------------------------------------------------------------------------

/**
 * @param {boolean} [resumeOnly] — if true, keep the current face state (use after pause). If false/omitted, snap display to `startTime` (initial run / full restart).
 */
Fliptimer.prototype.start = function (resumeOnly) {
	if (!resumeOnly) {
		this.snapToTime(this.options.startTime);
	}
	var self = this;
	this.tickInterval = setInterval(function () {
		self.tick();
	}, this.options.tickDuration);
};

Fliptimer.prototype.stop = function () {
	clearInterval(this.tickInterval);
	this.tickInterval = false;
};

/**
 * Dynamically swap the face configuration (e.g. clock HH:MM ↔ countdown MM:SS).
 * Rebuilds the DOM, reapplies dimensions, and restarts ticking.
 * @param {Object} newOpts — partial options to merge: { face, isCountdown, startTime, maxTime, minTime, tickDuration }
 */
Fliptimer.prototype.rebuildFace = function (newOpts) {
	this.stop();
	$.extend(this.options, newOpts);
	this.digitSelectors = [];
	this.init();
};

Fliptimer.prototype.resetDigits = function () {
	var container = this.options.containerElement;
	container.removeClass("play");

	for (var i = 0; i < this.digitSelectors.length; i++) {
		var sel = this.getDigitSelectorByIndex(i);
		var active = $(sel + ".current", container);
		var all = $(sel, container);
		var first = $(sel + ":first-child", container);

		all.eq(0).addClass("clockFix");
		all.removeClass("current");
		first.addClass("current");
		all.removeClass("previous");
		active.addClass("previous");
	}

	container.addClass("play");
};

Fliptimer.prototype.snapToTime = function (time) {
	var timeArray = time.replace(/:/g, "").split("").reverse();
	var container = this.options.containerElement;

	container.addClass("play no-flip");
	for (var i = 0; i < this.digitSelectors.length; i++) {
		var sel = this.getDigitSelectorByIndex(i);
		var $col = $(sel, container);
		$col.removeClass("current previous countdownFix clockFix");
		var di = parseInt(timeArray[i], 10);
		if (Number.isNaN(di)) {
			di = 0;
		}
		$col.eq(di).addClass("current");
	}
	// Remove no-flip after a frame so subsequent ticks animate normally
	var self = this;
	requestAnimationFrame(function () {
		requestAnimationFrame(function () {
			container.removeClass("no-flip");
		});
	});
};

Fliptimer.prototype.setToTime = function (time) {
	var timeArray = time.replace(/:/g, "").split("").reverse();
	var container = this.options.containerElement;

	container.removeClass("play");

	for (var i = 0; i < this.digitSelectors.length; i++) {
		var sel = this.getDigitSelectorByIndex(i);
		var $col = $(sel, container);
		$col.removeClass("current previous countdownFix clockFix");
		var di = parseInt(timeArray[i], 10);
		if (Number.isNaN(di)) {
			di = 0;
		}
		$col.eq(di).addClass("current");
	}

	container.addClass("play");
};

Fliptimer.prototype.setFaceSegmentGroupMaxValue = function (segmentGroupName) {
	var self = this;
	var container = this.options.containerElement;
	var group = this.getFaceSegmentGroupDom(segmentGroupName);

	group.each(function (idx) {
		container.removeClass("play");
		var maxValue = self.options.face[segmentGroupName].maxValue.toString().split("");
		$(this).find("li.current").removeClass("current");
		$(this)
			.find('li[data-digit="' + maxValue[idx] + '"]')
			.addClass("current");
		container.addClass("play");
	});
};

Fliptimer.prototype.tick = function () {
	this.doTick(0);
};

// -------------------------------------------------------------------------
// Time queries & selectors
// -------------------------------------------------------------------------

Fliptimer.prototype.getCurrentTime = function () {
	var currentTime = [];
	$("li.current", this.options.containerElement).each(function () {
		currentTime.push($(this).data("digit"));
	});
	return parseInt(currentTime.join(""), 10);
};

Fliptimer.prototype.getDigitSelectorByIndex = function (digitIndex) {
	return "ul." + this.digitSelectors[digitIndex] + " li";
};

Fliptimer.prototype.getFaceSegmentGroupNameByDigitElement = function (digitElement) {
	return digitElement.parent().data("face-segment-group");
};

Fliptimer.prototype.getFaceSegmentByDigitElement = function (digitElement) {
	return this.options.face[this.getFaceSegmentGroupNameByDigitElement(digitElement)];
};

Fliptimer.prototype.getFaceSegmentGroupDom = function (segmentGroupName) {
	return $("." + segmentGroupName, this.options.containerElement);
};

Fliptimer.prototype.getCurrentDigitDom = function (segmentGroupName) {
	return $("." + segmentGroupName + " li.current", this.options.containerElement);
};

Fliptimer.prototype.getCurrentFaceSegmentGroupValue = function (digitElement) {
	var segmentGroupName = this.getFaceSegmentGroupNameByDigitElement(digitElement);
	var values = [];
	this.getCurrentDigitDom(segmentGroupName).each(function (idx) {
		values[idx] = $(this).data("digit");
	});
	return values.join("");
};

Fliptimer.prototype.isMaxTimeReached = function () {
	return this.getCurrentTime() >= timeStringToComparableInt(this.options.maxTime);
};

Fliptimer.prototype.isMinTimeReached = function () {
	return this.getCurrentTime() <= timeStringToComparableInt(this.options.minTime);
};

// -------------------------------------------------------------------------
// Tick engine
// -------------------------------------------------------------------------

Fliptimer.prototype.doTick = function (digitIndex) {
	var opts = this.options;
	var container = opts.containerElement;
	var isDown = opts.isCountdown === true;
	var pseudoSelector = isDown ? ":first-child" : ":last-child";
	var digitSel = this.getDigitSelectorByIndex(digitIndex);
	var activeDigit = $(digitSel + ".current", container);
	var nextDigit;

	if (opts.isCountdown === false && this.isMaxTimeReached()) {
		this.resetDigits();
		return;
	}

	container.removeClass("play");

	if (!activeDigit.length) {
		if (isDown) {
			activeDigit = $(digitSel + ":last-child", container);
			nextDigit = activeDigit.prev("li");
		} else {
			activeDigit = $(digitSel, container).eq(0);
			nextDigit = activeDigit.next("li");
		}
		activeDigit.addClass("previous").removeClass("current");
		nextDigit.addClass("current");
	} else if (activeDigit.is(pseudoSelector)) {
		$(digitSel, container).removeClass("previous");

		if (isDown && this.isMinTimeReached()) {
			this.stop();
			opts.containerElement.trigger("fliptimer:countdown-complete");
			return;
		}

		activeDigit.addClass("previous").removeClass("current");

		if (isDown) {
			activeDigit.addClass("countdownFix");
			activeDigit = $(digitSel + ":last-child", container);
		} else {
			activeDigit = $(digitSel, container).eq(0);
			activeDigit.addClass("clockFix");
		}

		activeDigit.addClass("current");

		if (this.digitSelectors[digitIndex + 1] !== undefined) {
			this.doTick(digitIndex + 1);
		}
	} else {
		$(digitSel, container).removeClass("previous");
		activeDigit.addClass("previous").removeClass("current");
		nextDigit = isDown ? activeDigit.prev("li") : activeDigit.next("li");
		nextDigit.addClass("current");
	}

	var group = this.getFaceSegmentByDigitElement(activeDigit);
	if (this.getCurrentFaceSegmentGroupValue(activeDigit) > group.maxValue) {
		this.setFaceSegmentGroupMaxValue(this.getFaceSegmentGroupNameByDigitElement(activeDigit));
	}

	container.addClass("play");
	this.cleanZIndexFix(activeDigit, this.digitSelectors[digitIndex]);
};

Fliptimer.prototype.cleanZIndexFix = function (activeDigit, selector) {
	var container = this.options.containerElement;
	if (this.options.isCountdown === true) {
		var fix = $("." + selector + " .countdownFix", container);
		if (fix.length > 0 && !fix.hasClass("previous") && !fix.hasClass("current")) {
			fix.removeClass("countdownFix");
		}
	} else {
		activeDigit.siblings().removeClass("clockFix");
	}
};

// -------------------------------------------------------------------------
// Export & page bootstrap
// -------------------------------------------------------------------------


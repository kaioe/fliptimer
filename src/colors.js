/**
 * Colors — swatches, hex normalization, contrast.
 */
"use strict";

export const PRESET_COLOR_SWATCHES = [
	{ hex: "#ffffff", label: "White" },
	{ hex: "#cccccc", label: "Light gray" },
	{ hex: "#888888", label: "Gray" },
	{ hex: "#333333", label: "Dark gray" },
	{ hex: "#000000", label: "Black" },
	{ hex: "#127c02", label: "Green" },
	{ hex: "#1e5a8c", label: "Blue" },
	{ hex: "#6b2d9c", label: "Purple" },
	{ hex: "#c41e3a", label: "Red" },
	{ hex: "#e6a800", label: "Amber" },
	{ hex: "#0d7377", label: "Teal" },
	{ hex: "#ff6b35", label: "Orange" },
];

export function normalizeHexColor(hex) {
	var s = String(hex == null ? "" : hex).trim();
	if (/^#[0-9A-Fa-f]{6}$/.test(s)) {
		return s.toLowerCase();
	}
	if (/^#[0-9A-Fa-f]{3}$/.test(s)) {
		var h = s.slice(1);
		return ("#" + h[0] + h[0] + h[1] + h[1] + h[2] + h[2]).toLowerCase();
	}
	return "#ffffff";
}

/** WCAG relative luminance (0–1); higher = lighter. @param {string} hex Normalized #rrggbb */
export function relativeLuminanceFromHex(hex) {
	var h = normalizeHexColor(hex);
	var r = parseInt(h.slice(1, 3), 16) / 255;
	var g = parseInt(h.slice(3, 5), 16) / 255;
	var b = parseInt(h.slice(5, 7), 16) / 255;
	function lin(c) {
		return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
	}
	return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * Digit + colon colors for preset background (light bg → dark text).
 * @param {string} hex Normalized #rrggbb
 */
export function flipDigitContrastFromBgHex(hex) {
	var L = relativeLuminanceFromHex(hex);
	if (L > 0.55) {
		return {
			fg: "#000000",
			textShadow: "0 1px 0 rgba(255, 255, 255, 0.35)",
			colonFg: "#000000",
			colonTextShadow: "0 1px 2px rgba(255, 255, 255, 0.45)",
		};
	}
	return {
		fg: "#cccccc",
		textShadow: "0 1px 2px #000",
		colonFg: "#ffffff",
		colonTextShadow: "1px 1px 3px rgba(0, 0, 0, 0.6)",
	};
}

/**
 * Sets or clears `--flip-digit-bg` and matching contrast vars on `.countdown`.
 * @param {jQuery} $cd
 * @param {string | null} hex Preset color or null to clear
 */
export function applyCounterContrastFromPresetColor($cd, hex) {
	var el = $cd[0];
	if (!el || !el.style) {
		return;
	}
	if (hex == null) {
		el.style.removeProperty("--flip-digit-bg");
		el.style.removeProperty("--flip-digit-fg");
		el.style.removeProperty("--flip-digit-text-shadow");
		el.style.removeProperty("--flip-colon-fg");
		el.style.removeProperty("--flip-colon-text-shadow");
		return;
	}
	var norm = normalizeHexColor(hex);
	var c = flipDigitContrastFromBgHex(norm);
	$cd.css({
		"--flip-digit-bg": norm,
		"--flip-digit-fg": c.fg,
		"--flip-digit-text-shadow": c.textShadow,
		"--flip-colon-fg": c.colonFg,
		"--flip-colon-text-shadow": c.colonTextShadow,
	});
}

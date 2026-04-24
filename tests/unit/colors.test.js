import { describe, it, expect } from "vitest";

const {
	normalizeHexColor,
	relativeLuminanceFromHex,
	flipDigitContrastFromBgHex,
} = await import("../../src/colors.js");

describe("normalizeHexColor", () => {
	it("should expand shorthand #abc to #aabbcc", () => {
		expect(normalizeHexColor("#abc")).toBe("#aabbcc");
	});

	it("should lowercase full hex", () => {
		expect(normalizeHexColor("#AABBCC")).toBe("#aabbcc");
	});

	it("should pass through valid 6-digit hex", () => {
		expect(normalizeHexColor("#123456")).toBe("#123456");
	});

	it("should default null to #ffffff", () => {
		expect(normalizeHexColor(null)).toBe("#ffffff");
	});

	it("should default empty string to #ffffff", () => {
		expect(normalizeHexColor("")).toBe("#ffffff");
	});

	it("should default garbage to #ffffff", () => {
		expect(normalizeHexColor("garbage")).toBe("#ffffff");
	});
});

describe("relativeLuminanceFromHex", () => {
	it("should return 0 for black", () => {
		expect(relativeLuminanceFromHex("#000000")).toBe(0);
	});

	it("should return 1 for white", () => {
		expect(relativeLuminanceFromHex("#ffffff")).toBe(1);
	});

	it("should return value between 0 and 1", () => {
		const val = relativeLuminanceFromHex("#888888");
		expect(val).toBeGreaterThan(0);
		expect(val).toBeLessThan(1);
	});
});

describe("flipDigitContrastFromBgHex", () => {
	it("should return dark text for light background", () => {
		const result = flipDigitContrastFromBgHex("#ffffff");
		expect(result.fg).toBe("#000000");
	});

	it("should return light text for dark background", () => {
		const result = flipDigitContrastFromBgHex("#000000");
		expect(result.fg).toBe("#cccccc");
	});

	it("should always return required contrast fields", () => {
		const result = flipDigitContrastFromBgHex("#127c02");
		expect(result).toHaveProperty("fg");
		expect(result).toHaveProperty("textShadow");
		expect(result).toHaveProperty("colonFg");
		expect(result).toHaveProperty("colonTextShadow");
	});
});

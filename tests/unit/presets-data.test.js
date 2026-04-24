import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
	globalThis.jQuery = {};
});

const {
	generatePresetId,
	minutesToStartTime,
	normalizePreset,
} = await import("../../src/presets-data.js");

describe("normalizePreset", () => {
	it("should return a valid preset object with all required fields", () => {
		const result = normalizePreset({ name: "test", minutes: 5, rounds: 3 });
		expect(result).toHaveProperty("id");
		expect(result).toHaveProperty("name", "test");
		expect(result).toHaveProperty("color");
		expect(result).toHaveProperty("minutes", 5);
		expect(result).toHaveProperty("rounds", 3);
		expect(result).toHaveProperty("intervalMinutes");
	});

	it("should default empty name to 'Untitled'", () => {
		const result = normalizePreset({ name: "", minutes: 5 });
		expect(result.name).toBe("Untitled");
	});

	it("should expand shorthand hex color to full form", () => {
		const result = normalizePreset({ name: "Timer", color: "#abc" });
		expect(result.color).toBe("#aabbcc");
	});

	it("should default invalid color to #ffffff", () => {
		const result = normalizePreset({ name: "Timer", color: "garbage" });
		expect(result.color).toBe("#ffffff");
	});

	it("should clamp rounds to minimum 1", () => {
		const result = normalizePreset({ name: "Timer", minutes: 5, intervalMinutes: 2, rounds: 0 });
		expect(result.rounds).toBeGreaterThanOrEqual(1);
	});

	it("should clamp rounds to maximum 10", () => {
		const result = normalizePreset({ name: "Timer", rounds: 15 });
		expect(result.rounds).toBeLessThanOrEqual(10);
	});
});

describe("minutesToStartTime", () => {
	it("should format whole minutes", () => {
		expect(minutesToStartTime(5)).toBe("05:00");
	});

	it("should handle zero", () => {
		expect(minutesToStartTime(0)).toBe("00:00");
	});

	it("should handle fractional minutes", () => {
		expect(minutesToStartTime(5.5)).toBe("05:30");
	});

	it("should handle 99 minutes", () => {
		expect(minutesToStartTime(99)).toBe("99:00");
	});

	it("should cap at 99:59", () => {
		expect(minutesToStartTime(150)).toBe("99:59");
	});
});

describe("generatePresetId", () => {
	it("should return string starting with 'preset-'", () => {
		const id = generatePresetId();
		expect(id).toMatch(/^preset-/);
	});

	it("should return unique ids", () => {
		const ids = new Set(Array.from({ length: 10 }, () => generatePresetId()));
		expect(ids.size).toBe(10);
	});
});

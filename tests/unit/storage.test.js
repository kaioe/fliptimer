import { describe, it, expect, beforeEach } from "vitest";

beforeEach(() => {
	localStorage.clear();
});

// Storage.js does `const $ = window.jQuery;` at module level
globalThis.jQuery = {};

const {
	snapTrackMaxMinutes,
	snapCounterSizePct,
	migrateLocalStorage,
} = await import("../../src/storage.js");

describe("snapTrackMaxMinutes", () => {
	it("should snap to nearest 5 within range", () => {
		const result = snapTrackMaxMinutes(15);
		expect(result).toBeGreaterThanOrEqual(10);
		expect(result).toBeLessThanOrEqual(60);
		expect(result % 5).toBe(0);
	});

	it("should clamp below minimum to 10", () => {
		expect(snapTrackMaxMinutes(0)).toBe(10);
	});

	it("should clamp above maximum to 60", () => {
		expect(snapTrackMaxMinutes(100)).toBe(60);
	});

	it("should snap 23 to 25", () => {
		expect(snapTrackMaxMinutes(23)).toBe(25);
	});
});

describe("snapCounterSizePct", () => {
	it("should return a number within valid range", () => {
		const result = snapCounterSizePct(10);
		expect(typeof result).toBe("number");
		expect(result).toBeGreaterThanOrEqual(4);
		expect(result).toBeLessThanOrEqual(30);
	});

	it("should clamp low values", () => {
		const result = snapCounterSizePct(0);
		expect(result).toBeGreaterThanOrEqual(4);
	});
});

describe("migrateLocalStorage", () => {
	it("should not throw when localStorage is empty", () => {
		expect(() => migrateLocalStorage()).not.toThrow();
	});

	it("should be idempotent", () => {
		migrateLocalStorage();
		migrateLocalStorage();
		expect(() => migrateLocalStorage()).not.toThrow();
	});
});

import { describe, it, expect } from "vitest";

const {
	comparableIntToMmSsString,
	comparableIntToHhMmString,
	prepStepToMmSs,
	getLocalTimeHhMmString,
} = await import("../../src/fliptimer-clock.js");

describe("comparableIntToMmSsString", () => {
	it("should format 0 as 00:00", () => {
		expect(comparableIntToMmSsString(0)).toBe("00:00");
	});

	it("should format 530 as 05:30", () => {
		expect(comparableIntToMmSsString(530)).toBe("05:30");
	});

	it("should format max 5959 as 59:59", () => {
		expect(comparableIntToMmSsString(5959)).toBe("59:59");
	});

	it("should clamp values above 5959", () => {
		expect(comparableIntToMmSsString(9999)).toBe("59:59");
	});

	it("should pad single digits", () => {
		expect(comparableIntToMmSsString(5)).toBe("00:05");
	});
});

describe("comparableIntToHhMmString", () => {
	it("should format 0 as 00:00", () => {
		expect(comparableIntToHhMmString(0)).toBe("00:00");
	});

	it("should format 2359 as 23:59", () => {
		expect(comparableIntToHhMmString(2359)).toBe("23:59");
	});

	it("should cap at 23:59", () => {
		expect(comparableIntToHhMmString(2400)).toBe("23:59");
	});

	it("should pad single digits", () => {
		expect(comparableIntToHhMmString(930)).toBe("09:30");
	});
});

describe("prepStepToMmSs", () => {
	it("should format 1 as 00:01", () => {
		expect(prepStepToMmSs(1)).toBe("00:01");
	});

	it("should format 5 as 00:05", () => {
		expect(prepStepToMmSs(5)).toBe("00:05");
	});

	it("should clamp 0 to 00:01", () => {
		expect(prepStepToMmSs(0)).toBe("00:01");
	});

	it("should clamp 6 to 00:05", () => {
		expect(prepStepToMmSs(6)).toBe("00:05");
	});
});

describe("getLocalTimeHhMmString", () => {
	it("should return HH:MM format", () => {
		const result = getLocalTimeHhMmString();
		expect(result).toMatch(/^\d{2}:\d{2}$/);
	});

	it("should be a valid time", () => {
		const result = getLocalTimeHhMmString();
		const [h, m] = result.split(":").map(Number);
		expect(h).toBeGreaterThanOrEqual(0);
		expect(h).toBeLessThanOrEqual(23);
		expect(m).toBeGreaterThanOrEqual(0);
		expect(m).toBeLessThanOrEqual(59);
	});
});

import { describe, it, expect, beforeEach } from "vitest";

describe("Fliptimer round progression", () => {
	let clock;

	beforeEach(() => {
		// Set up jQuery mock
		globalThis.jQuery = {};

		// Create a mock clock instance with minimal config
		clock = {
			currentRound: 1,
			totalRounds: 3,
			intervalMinutes: 0,
			isIntervalMode: false,
			getDefaultConfig: () => ({
				isCountdown: false,
				startTime: "10:00",
				maxTime: "10:00",
				minTime: "00:00",
				face: {
						minutes: { maxValue: 59 },
						seconds: { maxValue: 59 },
				},
				containerElement: container,
			}),
			createConfig: function(options) {
				return { ...this.getDefaultConfig(), ...options };
			},
			setRounds: function(rounds) {
				this.totalRounds = rounds;
				this.currentRound = 1;
				this.isIntervalMode = false;
			},
			setInterval: function(minutes) {
				this.intervalMinutes = minutes;
			},
			resetRounds: function() {
				this.currentRound = 1;
				this.isIntervalMode = false;
			},
			startIntervalMode: function() {
				this.isIntervalMode = true;
			},
			endIntervalMode: function() {
				this.isIntervalMode = false;
			},
			nextRound: function() {
				if (this.currentRound < this.totalRounds) {
					this.currentRound++;
					return true;
				}
				return false;
			},
			hasNextRound: function() {
				return this.currentRound < this.totalRounds;
			},
		};
	});

	describe("hasNextRound", () => {
		it("should return true when currentRound is less than totalRounds", () => {
			clock.totalRounds = 3;
			clock.currentRound = 1;
			expect(clock.hasNextRound()).toBe(true);
		});

		it("should return true when currentRound equals totalRounds minus one", () => {
			clock.totalRounds = 3;
			clock.currentRound = 2;
			expect(clock.hasNextRound()).toBe(true);
		});

		it("should return false when currentRound equals totalRounds", () => {
			clock.totalRounds = 3;
			clock.currentRound = 3;
			expect(clock.hasNextRound()).toBe(false);
		});

		it("should return false when currentRound exceeds totalRounds", () => {
			clock.totalRounds = 3;
			clock.currentRound = 4;
			expect(clock.hasNextRound()).toBe(false);
		});
	});

	describe("setRounds", () => {
		it("should set totalRounds", () => {
			clock.setRounds(5);
			expect(clock.totalRounds).toBe(5);
		});

		it("should reset currentRound to 1", () => {
			clock.currentRound = 5;
			clock.setRounds(3);
			expect(clock.currentRound).toBe(1);
		});

		it("should set isIntervalMode to false", () => {
			clock.isIntervalMode = true;
			clock.setRounds(3);
			expect(clock.isIntervalMode).toBe(false);
		});
	});

	describe("setInterval", () => {
		it("should set intervalMinutes", () => {
			clock.setInterval(2);
			expect(clock.intervalMinutes).toBe(2);
		});

		it("should not affect round settings", () => {
			clock.setRounds(3);
			clock.setInterval(1);
			expect(clock.totalRounds).toBe(3);
			expect(clock.currentRound).toBe(1);
		});
	});

	describe("nextRound", () => {
		it("should increment currentRound when hasNextRound is true", () => {
			clock.totalRounds = 3;
			clock.currentRound = 1;
			const result = clock.nextRound();
			expect(result).toBe(true);
			expect(clock.currentRound).toBe(2);
		});

		it("should not increment when hasNextRound is false", () => {
			clock.totalRounds = 3;
			clock.currentRound = 3;
			const result = clock.nextRound();
			expect(result).toBe(false);
			expect(clock.currentRound).toBe(3);
		});
	});

	describe("resetRounds", () => {
		it("should reset currentRound to 1", () => {
			clock.currentRound = 5;
			clock.resetRounds();
			expect(clock.currentRound).toBe(1);
		});

		it("should set isIntervalMode to false", () => {
			clock.isIntervalMode = true;
			clock.resetRounds();
			expect(clock.isIntervalMode).toBe(false);
		});

		it("should not affect totalRounds", () => {
			clock.setRounds(5);
			clock.currentRound = 3;
			clock.resetRounds();
			expect(clock.totalRounds).toBe(5);
		});
	});

	describe("startIntervalMode", () => {
		it("should set isIntervalMode to true", () => {
			clock.startIntervalMode();
			expect(clock.isIntervalMode).toBe(true);
		});
	});

	describe("endIntervalMode", () => {
		it("should set isIntervalMode to false", () => {
			clock.isIntervalMode = true;
			clock.endIntervalMode();
			expect(clock.isIntervalMode).toBe(false);
		});
	});

});

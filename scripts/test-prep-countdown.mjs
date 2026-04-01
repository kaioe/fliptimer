/**
 * Prep countdown E2E (requires BrowserSync: npm run dev:serve or npm run dev).
 *
 * Playwright fake clock must be installed BEFORE page.goto.
 *
 * Run: npm run test:prep
 * URL: FLIPCLOCK_TEST_URL (default http://127.0.0.1:3000/flipClock)
 */
import { chromium } from "playwright";

const baseUrl = process.env.FLIPCLOCK_TEST_URL || "http://127.0.0.1:3000/flipClock";

function assert(cond, msg) {
	if (!cond) {
		throw new Error(msg);
	}
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
	await page.clock.install();
	await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 45000 });

	await page.waitForFunction(() => typeof window.flipClockInstance !== "undefined" && window.flipClockInstance !== null, {
		timeout: 15000,
	});

	await page.evaluate(() => {
		const c = window.flipClockInstance;
		c.stop();
		c.setToTime("04:30");
	});

	let prepActive = await page.evaluate(() => window.flipClockInstance.prepCountdownActive);
	assert(prepActive === false, `prep should start inactive, got ${prepActive}`);

	await page.click("#clock-play-pause-btn");

	prepActive = await page.evaluate(() => window.flipClockInstance.prepCountdownActive);
	assert(prepActive === true, "prep should be active after Play");

	let cur = await page.evaluate(() => window.flipClockInstance.getCurrentTime());
	assert(cur === 5, `first prep frame 00:05 -> getCurrentTime 5, got ${cur}`);

	/** Prep waits for `animationend` or fallback (1000ms + 400ms); fake clock must advance past fallback. */
	const prepAdvanceMs = 1400;

	/** `fastForward` runs timers but not `requestAnimationFrame`; prep schedules `prepChainDone` after double rAF. */
	async function flushDoubleRaf() {
		await page.evaluate(() =>
			new Promise((resolve) => {
				const raf = window.requestAnimationFrame.bind(window);
				raf(() => raf(resolve));
			}),
		);
	}

	const expectedAfterEachSecond = [4, 3, 2, 1];
	for (let i = 0; i < expectedAfterEachSecond.length; i++) {
		await page.clock.fastForward(prepAdvanceMs);
		await flushDoubleRaf();
		cur = await page.evaluate(() => window.flipClockInstance.getCurrentTime());
		assert(
			cur === expectedAfterEachSecond[i],
			`after +${i + 1}s virtual: expected ${expectedAfterEachSecond[i]}, got ${cur}`,
		);
	}

	await page.clock.fastForward(prepAdvanceMs);
	await flushDoubleRaf();
	const running = await page.evaluate(() => window.flipClockInstance.tickInterval !== false);
	const afterPrep = await page.evaluate(() => window.flipClockInstance.getCurrentTime());
	const prepOff = await page.evaluate(() => window.flipClockInstance.prepCountdownActive === false);

	assert(prepOff, "prepCountdownActive should be false after handoff");
	assert(running, "main tickInterval should be running after prep");
	assert(afterPrep === 430, `face should restore 04:30 -> 430, got ${afterPrep}`);

	// Cancel mid-prep (same page: stop running timer, new round time)
	await page.evaluate(() => {
		const c = window.flipClockInstance;
		c.stop();
		c.setToTime("10:00");
	});
	await page.click("#clock-play-pause-btn");
	await page.clock.fastForward(500);
	await page.click("#clock-play-pause-btn");
	const restored = await page.evaluate(() => window.flipClockInstance.getCurrentTime());
	const prepOff2 = await page.evaluate(() => window.flipClockInstance.prepCountdownActive === false);
	assert(prepOff2, "prep should clear after pause");
	assert(restored === 1000, `cancel prep should restore 10:00 -> 1000, got ${restored}`);

	process.stdout.write(
		[
			"OK: prep 00:05..00:01 (getCurrentTime 5..1), restore 04:30 + start; cancel mid-prep restores 10:00.",
			"Analysis: docs/prep-countdown-analysis.md",
			"",
		].join("\n"),
	);
	process.exitCode = 0;
} catch (e) {
	process.stderr.write(`${e.message || e}\n`);
	process.exitCode = 1;
} finally {
	await browser.close();
}

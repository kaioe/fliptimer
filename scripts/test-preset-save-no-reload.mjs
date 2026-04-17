/**
 * Requires BrowserSync (npm run dev:serve) on BASE_URL.
 * Asserts: saving a preset does not trigger a full document reload (window globals survive).
 */
import { chromium } from "playwright";

const baseUrl = process.env.FLIPCLOCK_TEST_URL || "http://127.0.0.1:3000/flipClock";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

let loadEventCount = 0;
page.on("load", () => {
	loadEventCount += 1;
});

try {
	await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 45000 });
	await page.waitForSelector("#preset-open-btn", { state: "visible", timeout: 15000 });

	await page.evaluate(() => {
		window.__fliptimerNoReloadMarker = "preset-save-test";
	});

	await page.click("#preset-open-btn");
	await page.waitForSelector("#preset-modal:not([hidden])", { timeout: 5000 });
	await page.waitForSelector("#preset-name", { state: "visible" });

	const uniqueName = `e2e-${Date.now()}`;
	await page.fill("#preset-name", uniqueName);
	await page.click("#preset-save-btn");

	await page.waitForTimeout(1200);

	// Edit path (same commit + sync as new preset save)
	await page.locator('button[data-action="edit"]').first().click();
	await page.waitForSelector("#preset-form-reset:not([hidden])", { timeout: 5000 });
	await page.fill("#preset-name", `${uniqueName}-edited`);
	await page.click("#preset-save-btn");

	await page.waitForTimeout(1200);

	const marker = await page.evaluate(() => window.__fliptimerNoReloadMarker);
	const modalOpen = await page.evaluate(() => {
		const m = document.getElementById("preset-modal");
		return m && !m.hasAttribute("hidden");
	});

	if (marker !== "preset-save-test") {
		throw new Error(
			`Full reload suspected: window.__fliptimerNoReloadMarker is ${JSON.stringify(marker)} (expected "preset-save-test"). loadEventCount=${loadEventCount}`,
		);
	}
	if (loadEventCount !== 1) {
		throw new Error(`Expected exactly 1 window "load" event, got ${loadEventCount}`);
	}
	if (!modalOpen) {
		throw new Error("Preset modal closed unexpectedly after save (check commitPresetForm / UI).");
	}

	process.stdout.write(
		`OK: no full reload on Save timer (marker preserved, load events=${loadEventCount}).\n`,
	);
	process.exitCode = 0;
} catch (e) {
	process.stderr.write(`${e.message || e}\n`);
	process.exitCode = 1;
} finally {
	await browser.close();
}

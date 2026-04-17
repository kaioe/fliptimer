/**
 * Headless Chromium via Playwright: prints console + page errors + failed requests.
 * Usage: node scripts/browser-console.mjs [url]
 * Default: http://127.0.0.1:3000/ (same page as index.html)
 */
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:3000/";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on("console", (msg) => {
	const loc = msg.location();
	const where = loc.url ? ` (${loc.url}:${loc.lineNumber})` : "";
	process.stdout.write(`[console.${msg.type()}] ${msg.text()}${where}\n`);
});

page.on("pageerror", (err) => {
	process.stdout.write(`[pageerror] ${err.message}\n`);
});

page.on("requestfailed", (req) => {
	const fail = req.failure();
	process.stdout.write(`[requestfailed] ${req.url()} ${fail?.errorText || ""}\n`);
});

try {
	const res = await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
	if (res) {
		process.stdout.write(`[navigation] ${res.status()} ${url}\n`);
	}
	await page.waitForTimeout(1500);
} catch (e) {
	process.stdout.write(`[goto] ${e.message}\n`);
	process.exitCode = 1;
} finally {
	await browser.close();
}

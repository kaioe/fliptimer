/**
 * Browser-sync: static server and map /flipClock (no .html) to flipClock.html.
 * POST /__flipclock__/save-preset-timers writes the request body to ./preset-timers.json (dev only).
 * The JSON may include presets and optional appBackgroundDataUrl (base64 data URL).
 */
const fs = require("fs");
const path = require("path");

const PRESET_TIMERS_PATH = path.join(__dirname, "preset-timers.json");

function savePresetTimersMiddleware(req, res, next) {
	const url = req.url.indexOf("?") === -1 ? req.url : req.url.slice(0, req.url.indexOf("?"));
	if (url !== "/__flipclock__/save-preset-timers" || req.method !== "POST") {
		next();
		return;
	}
	const chunks = [];
	req.on("data", function (chunk) {
		chunks.push(chunk);
	});
	req.on("end", function () {
		var body = Buffer.concat(chunks).toString("utf8");
		try {
			JSON.parse(body);
		} catch (e) {
			res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
			res.end("Invalid JSON");
			return;
		}
		try {
			fs.writeFileSync(PRESET_TIMERS_PATH, body, "utf8");
			res.writeHead(204);
			res.end();
		} catch (err) {
			res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
			res.end(err && err.message ? String(err.message) : "Write failed");
		}
	});
}

module.exports = {
	// Top-level middleware is what Browser-Sync merges into the stack (server.middleware alone can be skipped if another tool merges options oddly).
	server: {
		baseDir: ".",
	},
	middleware: [
		savePresetTimersMiddleware,
		function flipClockHtml(req, res, next) {
			const q = req.url.indexOf("?");
			const pathOnly = q === -1 ? req.url : req.url.slice(0, q);
			const qs = q === -1 ? "" : req.url.slice(q);
			if (pathOnly === "/flipClock" || pathOnly === "/flipClock/") {
				req.url = "/flipClock.html" + qs;
			}
			next();
		},
	],
	// Do NOT watch preset-timers.json: dev sync writes it on every preset save and would full-reload the page.
	files: ["flipClock.css", "flipClock.html", "flipClock.js"],
	watch: true,
	notify: false,
	// Live reload: injects a small script before </body>. Set false if you add strict CSP and block inline scripts.
	snippet: true,
	port: 3000,
	startPath: "/flipClock",
};

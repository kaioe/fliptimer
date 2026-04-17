/**
 * Browser-sync: static server.
 * POST /__fliptimer__/save-preset-timers writes the request body to ./fliptimer.json (dev only).
 * GET /sounds/manifest.json returns a live { files: [...] } from ./sounds (audio only) for the Preloaded dropdown.
 * The JSON may include presets, optional appBackgroundFile (file path), or optional appBackgroundDataUrl (base64 data URL for user uploads).
 */
const fs = require("fs");
const path = require("path");

const FLIPTIMER_JSON_PATH = path.join(__dirname, "fliptimer.json");
const SOUNDS_DIR = path.join(__dirname, "sounds");

/** Serves GET /sounds/manifest.json from the filesystem so the Preloaded list updates when files are added (no manual JSON edit). */
function soundsManifestMiddleware(req, res, next) {
	if (req.method !== "GET") {
		next();
		return;
	}
	const q = req.url.indexOf("?");
	const pathOnly = q === -1 ? req.url : req.url.slice(0, q);
	if (pathOnly !== "/sounds/manifest.json") {
		next();
		return;
	}
	var files = [];
	try {
		var names = fs.readdirSync(SOUNDS_DIR, { withFileTypes: true });
		var audioExt = /\.(mp3|wav|ogg|opus|m4a|aac|flac|webm)$/i;
		for (var i = 0; i < names.length; i++) {
			var d = names[i];
			if (!d.isFile()) {
				continue;
			}
			var name = d.name;
			if (name === "manifest.json") {
				continue;
			}
			if (!audioExt.test(name)) {
				continue;
			}
			files.push(name);
		}
		files.sort(function (a, b) {
			return a.localeCompare(b, undefined, { sensitivity: "base" });
		});
	} catch (err) {
		files = [];
	}
	var body = JSON.stringify({ files: files }, null, 2);
	res.writeHead(200, {
		"Content-Type": "application/json; charset=utf-8",
		"Cache-Control": "no-store, no-cache, must-revalidate",
		Pragma: "no-cache",
	});
	res.end(body);
}

function savePresetTimersMiddleware(req, res, next) {
	const url = req.url.indexOf("?") === -1 ? req.url : req.url.slice(0, req.url.indexOf("?"));
	if (url !== "/__fliptimer__/save-preset-timers" || req.method !== "POST") {
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
			fs.writeFileSync(FLIPTIMER_JSON_PATH, body, "utf8");
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
		soundsManifestMiddleware,
		function redirectOldPaths(req, res, next) {
			const q = req.url.indexOf("?");
			const pathOnly = q === -1 ? req.url : req.url.slice(0, q);
			const qs = q === -1 ? "" : req.url.slice(q);
			if (pathOnly === "/fliptimer" || pathOnly === "/fliptimer/" || pathOnly === "/fliptimer.html") {
				req.url = "/" + qs;
			}
			next();
		},
	],
	// `watch: true` merges server baseDir (`.`) into watched paths — not only `files`. Ignore JSON
	// we rewrite on every preset save, or Chokidar fires and BrowserSync full-reloads the page.
	files: ["fliptimer.css", "index.html", "fliptimer.js", "sounds/**/*"],
	watch: true,
	watchOptions: {
		ignoreInitial: true,
		ignored: ["fliptimer.json"],
	},
	notify: false,
	// Live reload: injects a small script before </body>. Set false if you add strict CSP and block inline scripts.
	snippet: true,
	port: 3000,
	startPath: "/",
};

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

const AUDIO_EXT = /\.(mp3|wav|ogg|opus|m4a|aac|flac|webm)$/i;

function listSoundsDir() {
	var files = [];
	try {
		var names = fs.readdirSync(SOUNDS_DIR, { withFileTypes: true });
		for (var i = 0; i < names.length; i++) {
			var d = names[i];
			if (!d.isFile()) { continue; }
			var name = d.name;
			if (name === "manifest.json") { continue; }
			if (!AUDIO_EXT.test(name)) { continue; }
			files.push(name);
		}
		files.sort(function (a, b) { return a.localeCompare(b, undefined, { sensitivity: "base" }); });
	} catch (err) {
		files = [];
	}
	return files;
}

function uploadSoundMiddleware(req, res, next) {
	var q = req.url.indexOf("?");
	var pathOnly = q === -1 ? req.url : req.url.slice(0, q);
	if (pathOnly !== "/__fliptimer__/upload-sound" || req.method !== "POST") {
		next();
		return;
	}
	var chunks = [];
	req.on("data", function (chunk) { chunks.push(chunk); });
	req.on("end", function () {
		var contentType = req.headers["content-type"] || "";
		var boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^\s;]+))/);
		var boundary = boundaryMatch ? (boundaryMatch[1] || boundaryMatch[2]) : null;
		if (!boundary) {
			res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
			res.end("Missing boundary");
			return;
		}
		var buf = Buffer.concat(chunks);
		var boundaryBuf = Buffer.from("--" + boundary);
		var parts = [];
		var start = buf.indexOf(boundaryBuf);
		while (start !== -1) {
			var end = buf.indexOf(boundaryBuf, start + boundaryBuf.length);
			if (end === -1) { break; }
			var part = buf.slice(start + boundaryBuf.length, end);
			if (part.length > 4 && part[0] === 0x0d && part[1] === 0x0a) {
				parts.push(part);
			}
			start = end;
		}
		var fileName = null;
		var fileData = null;
		for (var pi = 0; pi < parts.length; pi++) {
			var part = parts[pi];
			var headerEnd = part.indexOf(Buffer.from("\r\n\r\n"));
			if (headerEnd === -1) { continue; }
			var header = part.slice(0, headerEnd).toString("utf8");
			var body = part.slice(headerEnd + 4);
			if (body.length >= 2 && body[body.length - 2] === 0x0d && body[body.length - 1] === 0x0a) {
				body = body.slice(0, -2);
			}
			var cdMatch = header.match(/Content-Disposition:\s*form-data;\s*name="file";\s*filename="([^"]+)"/i);
			if (cdMatch) {
				fileName = cdMatch[1].replace(/[\/\\]/g, "_").trim();
				fileData = body;
				break;
			}
		}
		if (!fileName || !fileData || fileData.length === 0) {
			res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
			res.end("No file in request");
			return;
		}
		if (!AUDIO_EXT.test(fileName)) {
			res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
			res.end("Not an audio file");
			return;
		}
		var safeName = fileName.replace(/[^a-zA-Z0-9._\-\s()]/g, "_");
		var targetPath = path.join(SOUNDS_DIR, safeName);
		try {
			if (!fs.existsSync(SOUNDS_DIR)) { fs.mkdirSync(SOUNDS_DIR, { recursive: true }); }
			fs.writeFileSync(targetPath, fileData);
			res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
			res.end(JSON.stringify({ file: safeName }));
		} catch (err) {
			res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
			res.end(err && err.message ? String(err.message) : "Write failed");
		}
	});
}

function deleteSoundMiddleware(req, res, next) {
	var q = req.url.indexOf("?");
	var pathOnly = q === -1 ? req.url : req.url.slice(0, q);
	if (pathOnly !== "/__fliptimer__/delete-sound" || req.method !== "POST") {
		next();
		return;
	}
	var chunks = [];
	req.on("data", function (chunk) { chunks.push(chunk); });
	req.on("end", function () {
		var body;
		try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch (e) {
			res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
			res.end("Invalid JSON");
			return;
		}
		var fileName = body && body.file;
		if (typeof fileName !== "string" || fileName.trim() === "") {
			res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
			res.end("Missing file name");
			return;
		}
		if (fileName.indexOf("..") !== -1 || fileName.indexOf("/") !== -1 || fileName.indexOf("\\") !== -1) {
			res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
			res.end("Invalid file name");
			return;
		}
		var targetPath = path.join(SOUNDS_DIR, fileName);
		try {
			if (fs.existsSync(targetPath)) {
				fs.unlinkSync(targetPath);
			}
			var remaining = listSoundsDir();
			res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
			res.end(JSON.stringify({ files: remaining }));
		} catch (err) {
			res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
			res.end(err && err.message ? String(err.message) : "Delete failed");
		}
	});
}

/** Serves GET /sounds/manifest.json from the filesystem so the list updates when files are added or removed. */
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
	var files = listSoundsDir();
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
		uploadSoundMiddleware,
		deleteSoundMiddleware,
		soundsManifestMiddleware,
		function redirectOldPaths(req, res, next) {
			const q = req.url.indexOf("?");
			const pathOnly = q === -1 ? req.url : req.url.slice(0, q);
			const qs = q === -1 ? "" : req.url.slice(q);
			const oldPaths = [
				"/fliptimer", "/fliptimer/", "/fliptimer.html",
				"/flipclock", "/flipclock/", "/flipclock.html",
				"/flipClock", "/flipClock/", "/flipClock.html"
			];
			if (oldPaths.includes(pathOnly)) {
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

/**
 * Builds `dist/` with only files needed to serve the app on a static host.
 * - Compiles fliptimer.scss → fliptimer.css
 * - Copies HTML (rewrites jQuery + fliptimer.js to relative paths), JS, CSS, JSON, favicon, sounds/
 * - Vendors jquery.min.js (no node_modules on the server)
 */
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");

const JQUERY_SRC = path.join(root, "node_modules", "jquery", "dist", "jquery.min.js");
const JQUERY_DEST_DIR = path.join(dist, "vendor");
const JQUERY_DEST = path.join(JQUERY_DEST_DIR, "jquery.min.js");

function rmrf(p) {
	fs.rmSync(p, { recursive: true, force: true });
}

function copyFile(src, dest) {
	fs.mkdirSync(path.dirname(dest), { recursive: true });
	fs.copyFileSync(src, dest);
}

function copyDirRecursive(srcDir, destDir) {
	if (!fs.existsSync(srcDir)) {
		return;
	}
	fs.mkdirSync(destDir, { recursive: true });
	for (const ent of fs.readdirSync(srcDir, { withFileTypes: true })) {
		const s = path.join(srcDir, ent.name);
		const d = path.join(destDir, ent.name);
		if (ent.isDirectory()) {
			copyDirRecursive(s, d);
		} else if (ent.isFile()) {
			fs.copyFileSync(s, d);
		}
	}
}

function transformHtmlForDist(html) {
	return html
		.replace(
			/src="https:\/\/code\.jquery\.com\/jquery-3\.7\.1\.min\.js"/g,
			'src="./vendor/jquery.min.js"'
		)
		.replace(/src="\.\/fliptimer\.js(?:\?[^"]*)?"/g, 'src="./fliptimer.js"');
}

function main() {
	execSync("npx sass fliptimer.scss fliptimer.css --no-source-map", {
		cwd: root,
		stdio: "inherit",
		shell: true,
	});

	if (!fs.existsSync(JQUERY_SRC)) {
		console.error("Missing jQuery bundle. Run npm install from the project root.");
		process.exit(1);
	}

	rmrf(dist);
	fs.mkdirSync(dist, { recursive: true });

	const htmlPath = path.join(root, "index.html");
	const html = fs.readFileSync(htmlPath, "utf8");
	const htmlOut = transformHtmlForDist(html);
	fs.writeFileSync(path.join(dist, "index.html"), htmlOut, "utf8");

	copyFile(path.join(root, "fliptimer.css"), path.join(dist, "fliptimer.css"));
	copyFile(path.join(root, "fliptimer.js"), path.join(dist, "fliptimer.js"));

	const jsonPath = path.join(root, "fliptimer.json");
	if (fs.existsSync(jsonPath)) {
		copyFile(jsonPath, path.join(dist, "fliptimer.json"));
	} else {
		console.warn("fliptimer.json not found; dist will not include a preset seed file.");
	}

	const favicon = path.join(root, "favicon.svg");
	if (fs.existsSync(favicon)) {
		copyFile(favicon, path.join(dist, "favicon.svg"));
	}

	fs.mkdirSync(JQUERY_DEST_DIR, { recursive: true });
	fs.copyFileSync(JQUERY_SRC, JQUERY_DEST);

	copyDirRecursive(path.join(root, "sounds"), path.join(dist, "sounds"));

	console.log("dist/ ready:", dist);
}

main();

// Build step: moves the start page's inline script into /hub.js and obfuscates it.
// Usage: node obfuscate.mjs <public folder>
//
// Only the copy inside the Docker image is changed. The readable source stays in the repo.
// This makes the code hard to read; it does not hide it, since a browser must be able to run it.
import fs from "node:fs";
import path from "node:path";
import JavaScriptObfuscator from "javascript-obfuscator";

const dir = process.argv[2] || "public";
const htmlPath = path.join(dir, "index.html");
let html = fs.readFileSync(htmlPath, "utf8");

// The page's own script is the only <script> tag without attributes.
const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
if (inline.length !== 1) {
	throw new Error(`Expected exactly 1 inline script in index.html, found ${inline.length}`);
}
const [tag, source] = inline[0];

const obfuscated = JavaScriptObfuscator.obfuscate(source, {
	target: "browser",
	compact: true,
	simplify: true,
	identifierNamesGenerator: "hexadecimal",
	// The script is one function, so no globals are renamed. Globals it uses from other
	// scripts (BareMux, search, $scramjetLoadController, ...) must keep their names.
	renameGlobals: false,
	renameProperties: false,
	transformObjectKeys: false,
	stringArray: true,
	stringArrayEncoding: ["base64"],
	stringArrayThreshold: 0.8,
	rotateStringArray: true,
	shuffleStringArray: true,
	splitStrings: true,
	splitStringsChunkLength: 8,
	numbersToExpressions: true,
	// Options that slow the page or can break it are left off.
	controlFlowFlattening: false,
	deadCodeInjection: false,
	selfDefending: false,
	debugProtection: false,
	disableConsoleOutput: false,
}).getObfuscatedCode();

fs.writeFileSync(path.join(dir, "hub.js"), obfuscated);

html = html.replace(tag, '<script src="/hub.js"></script>');
html = html.replace(/<!--[\s\S]*?-->/g, ""); // drop HTML comments
fs.writeFileSync(htmlPath, html);

console.log(`Obfuscated ${source.length} -> ${obfuscated.length} characters, wrote ${path.join(dir, "hub.js")}`);

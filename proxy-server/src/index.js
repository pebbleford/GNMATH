// Server for the Scramjet proxy and its start page.
//
//   /              the start page (public/index.html), tabs and settings
//   /scram/        Scramjet files, its service worker is /sw.js (scope /)
//   /libcurl/      the transport used to reach the internet
//   /baremux/      the connection layer
//   /wisp/         websocket the transport talks to
//
// Based on the server files of Scramjet-App.
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { hostname } from "node:os";
import express from "express";
import wisp from "wisp-server-node";

import { scramjetPath } from "@mercuryworkshop/scramjet/path";
import { libcurlPath } from "@mercuryworkshop/libcurl-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

const publicPath = fileURLToPath(new URL("../public/", import.meta.url));

const app = express();
app.use(express.static(publicPath));
app.use("/scram/", express.static(scramjetPath));
app.use("/libcurl/", express.static(libcurlPath));
app.use("/baremux/", express.static(baremuxPath));

app.use((req, res) => {
	res.status(404).sendFile("404.html", { root: publicPath });
});

const server = createServer();

server.on("request", (req, res) => {
	// Scramjet needs cross-origin isolation.
	res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
	res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
	app(req, res);
});

server.on("upgrade", (req, socket, head) => {
	if (req.url.endsWith("/wisp/")) {
		wisp.routeRequest(req, socket, head);
		return;
	}
	socket.end();
});

let port = parseInt(process.env.PORT || "");
if (isNaN(port)) port = 8080;

server.on("listening", () => {
	const address = server.address();
	console.log("Listening on:");
	console.log(`\thttp://localhost:${address.port}`);
	console.log(`\thttp://${hostname()}:${address.port}`);
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
	console.log("Shutting down");
	server.close();
	process.exit(0);
}

server.listen({ port });

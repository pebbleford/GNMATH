// Scramjet service worker (from Scramjet-App). Registered at scope "/".
// Requests that aren't Scramjet's are passed through untouched, so it doesn't
// interfere with Ultraviolet, whose own worker (/uv/sw.js) covers /uv/.
importScripts("/scram/scramjet.all.js");

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();

async function handleRequest(event) {
	await scramjet.loadConfig();
	if (scramjet.route(event)) {
		return scramjet.fetch(event);
	}
	return fetch(event.request);
}

self.addEventListener("fetch", (event) => {
	event.respondWith(handleRequest(event));
});

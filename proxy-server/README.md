# Br Br Hub server

A small Node server that runs the [Scramjet](https://github.com/MercuryWorkshop/scramjet) web proxy and serves the tabbed start page, all on port 8080.

- **One engine:** Scramjet. (Ultraviolet was removed. Scramjet handled modern sites, such as NVIDIA's login, that Ultraviolet broke on.)
- **The page:** tabs, back, forward, reload, an address bar, and a Settings panel (gear icon) for the search engine. `public/index.html` is a copy of [`../proxy-ui/index.html`](../proxy-ui/index.html). Change that one first, then copy it here.
- **The connection:** the libcurl transport, through a Wisp websocket at `/wisp/`.

**Not tested end to end.** If something fails, send the error.

## Run with Docker

```sh
cd proxy-server
docker build -t gnmath-proxy .
docker run -d --name gnmath-proxy --restart unless-stopped -p 8080:8080 gnmath-proxy
```

Open `http://localhost:8080` (on a server, `http://<ip>:8080`). Press Ctrl+F5 after an update so the browser doesn't show the old page.

## Notes

- **HTTPS:** service workers only run on `localhost` or HTTPS, so on a server you need HTTPS in front (for example a bunny.net pull zone with WebSockets on).
- **Old containers:** if you ran `ultraviolet-app` or `scramjet-app` before, remove them (`docker rm -f ultraviolet-app scramjet-app`). Everything is on 8080 now.
- **Licence:** Scramjet is AGPL-3.0. If you run this for other people, you must offer them the source.
- **Datacenter IPs:** some sites and CAPTCHAs work less reliably from a cloud server address.

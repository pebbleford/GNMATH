# Proxy server: Ultraviolet and Scramjet on one address

One Node server, one port (8080), one start page. Both engines run side by side, so one address (for example one bunny.net pull zone) serves both.

- **Ultraviolet** and **Scramjet** are both available in the page's tabs. In the page's **Settings** (gear icon), choose which engine the next page uses. Tabs keep the engine they were opened with, so you can mix them.
- Both engines share one connection to the internet (the libcurl transport).
- `public/index.html` is a copy of [`../proxy-ui/index.html`](../proxy-ui/index.html). Change that one first, then copy it here.

**Not tested end to end.** The pieces come from the Ultraviolet-App and Scramjet-App servers and were put together by reading their code. If one engine fails, try the other, and send the error.

## Run with Docker

```sh
cd proxy-server
docker build -t gnmath-proxy .
docker run -d --name gnmath-proxy --restart unless-stopped -p 8080:8080 gnmath-proxy
```

Open `http://localhost:8080` (on a server, `http://<ip>:8080`). Press Ctrl+F5 after an update so the browser doesn't show the old page.

## Notes

- **HTTPS:** service workers only run on `localhost` or HTTPS, so on a server you need HTTPS in front (for example a bunny.net pull zone with WebSockets on).
- **Port 8081 isn't used any more.** Everything is on 8080.
- **Licences:** Ultraviolet is GPL-3.0 and Scramjet is AGPL-3.0. If you run this for other people, you must offer them the source.
- **Datacenter IPs:** some sites and CAPTCHAs work less reliably from a cloud server address.

# Br Br Hub start page

`index.html` is the proxy's start page: tabs, a toolbar (back, forward, reload, home, address bar) and a Settings panel (gear icon) for the search engine. It runs the Scramjet engine.

It's the **source** for the page. The server that runs it is in [`../proxy-server/`](../proxy-server/), which has a copy at `proxy-server/public/index.html`. After changing this file, copy it over that one:

```powershell
Copy-Item proxy-ui\index.html proxy-server\public\index.html -Force
```

To run it, see [`../proxy-server/README.md`](../proxy-server/README.md).

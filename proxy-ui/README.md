# Proxy start page

`index.html` is the proxy's start page: tabs, a toolbar (back, forward, reload, home, address bar), an engine choice (Ultraviolet or Scramjet) and a Settings panel (gear icon).

It's the **source** for the page. The server that runs both engines is in [`../proxy-server/`](../proxy-server/), which has a copy at `proxy-server/public/index.html`. After changing this file, copy it over that one:

```powershell
Copy-Item proxy-ui\index.html proxy-server\public\index.html -Force
```

To run it, see [`../proxy-server/README.md`](../proxy-server/README.md).

The page also works with Ultraviolet only. If the server has no `/scram/` files, it hides the Scramjet option and uses the epoxy transport, like the original Ultraviolet-App.

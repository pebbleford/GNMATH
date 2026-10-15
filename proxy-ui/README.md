# New proxy page

A dark, GNMATH-style start page for your Ultraviolet-App proxy. It replaces the original `public/index.html`. The proxy engine scripts and the form wiring (`uv-form`, `uv-address`, `uv-frame`, the search engine field) are kept the same, so the proxy itself isn't changed.

It adds a big search box, quick links (DuckDuckGo, Wikipedia, Bing, YouTube), and a **Home** / **Reload** bar while you browse. Typed words search DuckDuckGo.

**Not tested against a running proxy.** It was written against the original page's scripts, but I could not run it with the real proxy engine. If something breaks, put your old `index.html` back.

## Install

1. Back up the old page: copy `ultraviolet-app/public/index.html` to `index.html.bak`.
2. Replace it with `proxy-ui/index.html` from this repo.
3. Rebuild and restart the container:

```powershell
cd ~/ultraviolet-app
docker rm -f ultraviolet-app
docker build -t ultraviolet-app .
docker run -d --name ultraviolet-app --restart unless-stopped -p 8080:8080 ultraviolet-app
```

4. Open the proxy and hold-refresh (Ctrl+F5) so the browser doesn't show the old page.

On a server, use `sudo docker` and the same steps. The proxy still needs HTTPS to work outside `localhost`.

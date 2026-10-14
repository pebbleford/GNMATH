# GNMATH

A fast, clean browser game site built on the [gn-math](https://github.com/gn-math) game library: 800+ games including ports, Flash classics, emulated console games and FNF mods.

It's a static site with no build step and no backend. It reads gn-math's live catalog when the page loads, so new games show up automatically.

## Features

- **Search**: matches game names and authors. Press <kbd>/</kbd> to focus the search box.
- **Categories**: Featured, Favorites, HTML5, Ports, Flash, Emulators, FNF and more, with counts. The list is generated from the catalog's tags.
- **Sorting**: Newest, Oldest, A–Z.
- **Favorites and Continue playing**: saved per device in `localStorage`.
- **Random**: plays a random game from whatever is currently shown.
- **Player**: restart, fullscreen, open in a new tab and favorite controls. Every game has a shareable link (`/#/play/<id>`).
- **Fallbacks**: every asset has a backup source (jsDelivr ⇄ raw GitHub), and the catalog is cached so the site still lists games if the catalog can't be reached.

## Fern Proxy

The real [fern-proxy](https://github.com/fern-proxy/fern-proxy) source (commit `788d27e`, Apache-2.0, license included) is embedded in [`fern-proxy/`](fern-proxy/). It is a Rust PostgreSQL proxy, so it can't run in the browser. See [`fern-proxy.html`](fern-proxy.html) for setup steps.

## Settings panel

The **Settings** button (bottom right) is built in `assets/extras.js`. Everything is saved per device:

- **Tab disguise**: change the tab name and icon, with presets (Classroom, Docs, Drive, Slides, Wikipedia) or your own name and icon URL.
- **Site name and accent color**.
- **Panic key**: press a key to jump to a page you choose.
- **about:blank launcher**: opens the site inside a blank tab.
- **Web proxy address**: where the top-bar **Proxy** button opens. It defaults to `http://localhost:8080`.
- **My game links**: add a link to any game site and it appears in the library.
- **Fern Proxy demo**: link to the in-browser masking simulation.

## Web proxy (optional, needs a server)

A static site can't proxy other websites. [`scripts/setup-web-proxy.sh`](scripts/setup-web-proxy.sh) runs the open-source [Ultraviolet-App](https://github.com/titaniumnetwork-dev/Ultraviolet-App) in Docker on a VM. It is a separate program from Fern proxy, it needs HTTPS to work properly, and its authors no longer maintain it. Only use it where your network's rules allow it.

## Run it locally

Any static file server works:

```sh
python3 -m http.server 8080
# then open http://localhost:8080
```

## Deploy on GitHub Pages

1. Push this repo to GitHub.
2. Go to **Settings → Pages**, set **Source** to *Deploy from a branch*, then pick `main` and `/ (root)`.
3. Your site will be live at `https://<your-username>.github.io/<repo>/`.

It also works on Netlify, Vercel, Cloudflare Pages or any static host. Just upload the folder.

## Customizing

All settings are at the top of [`assets/app.js`](assets/app.js) in `CONFIG`:

| Setting | What it does |
| --- | --- |
| `siteName` | Name shown in the tab title and header |
| `zones` | Catalog URLs (gn-math's `zones.json`), tried in order |
| `covers` | Base URLs for cover images, filling in `{COVER_URL}` |
| `html` | Base URLs for game pages, filling in `{HTML_URL}` |
| `recentLimit` | How many games "Continue playing" remembers |

Colors and fonts are CSS variables at the top of [`assets/style.css`](assets/style.css).

## How games load

Each game in the catalog is a self-contained HTML page hosted in [`gn-math/html`](https://github.com/gn-math/html). The site fetches that page and writes it into an iframe on your site's origin, the same way gn-math does, so game saves in `localStorage` keep working. The iframe is sandboxed without `allow-top-navigation`, so a game can't redirect the whole site. Game code still runs on your site's origin, though, so only point `CONFIG` at sources you trust.

## Credits

The game library, covers and game pages come from [gn-math](https://github.com/gn-math). Every game belongs to its original creators, and each one is credited and linked in the player.

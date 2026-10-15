# Proxy setup instructions (for Claude in Chrome)

Hand this file to Claude in Chrome. It sets up the Ultraviolet web proxy on the user's own Oracle Cloud VM, using only the browser.

## Setting it up again

This file can be run again on a machine that already has some of it. Every step below is safe to repeat: it updates the existing copy and replaces the old container instead of failing. Before step 1, ask the user whether the proxy should run on:

- **their own PC** (already works for them at `http://localhost:8080`): you cannot run commands on their PC from the browser, so give them the commands in the "Own PC" section at the end and let them run them in PowerShell, or
- **their Oracle VM** (steps 1 to 8), which needs HTTPS to work properly.

## Goal

Run the open-source [Ultraviolet-App](https://github.com/titaniumnetwork-dev/Ultraviolet-App) web proxy in Docker on the user's existing Oracle Cloud Ubuntu VM, so the user can reach it from a browser. Give it a new start page (`proxy-ui/index.html`, also in Appendix A) that uses DuckDuckGo as its search engine, because Google shows a robot check for proxied traffic.

## Rules (read first)

- Work only with the user's own Oracle Cloud account and VM. Do not create new paid resources, and never enter payment details.
- If you hit a login, 2FA, captcha or SSH key prompt, **stop and ask the user**. Do not guess or try to bypass it.
- Never ask for, copy or paste the user's password or private key into any chat. The user uploads or selects their own key.
- Before changing any firewall or network rule, show the user the exact rule and wait for a yes.
- Do not open any port to the whole internet (`0.0.0.0/0`) unless the user explicitly says to. Prefer the user's own public IP.
- This kind of proxy can get around school or work web filters. Remind the user to use it only where their network's rules allow it.
- If a step fails, show the user the exact error text and stop. Do not retry blindly.

## What you need from the user

1. They are logged in to `cloud.oracle.com`.
2. The name of the VM (Compute, Instances) to use, and confirmation that it runs Ubuntu.
3. Their SSH private key file. Cloud Shell needs it to log in to the VM, and the user has to upload it themselves.

## Steps

### 1. Open Cloud Shell
In the Oracle console, click the terminal icon (`>_`) at the top right. Wait for the shell to start.

### 2. Log in to the VM
Ask the user to upload their key with Cloud Shell's upload option (gear or menu icon). Then run, replacing the names:
```sh
chmod 600 <keyfile>
ssh -i <keyfile> ubuntu@<vm-public-ip>
```
The public IP is on the instance's details page. Type `yes` if it asks about the fingerprint. The prompt should change to `ubuntu@...`.

### 3. Install Docker if it is missing
```sh
docker --version || (sudo apt-get update && sudo apt-get install -y docker.io git)
sudo systemctl enable --now docker
```

### 4. Get the proxy, install the new page, and build
First get or update the proxy code:
```sh
if [ -d ~/ultraviolet-app/.git ]; then git -C ~/ultraviolet-app checkout -- public/index.html && git -C ~/ultraviolet-app pull --ff-only; else git clone --depth 1 https://github.com/titaniumnetwork-dev/Ultraviolet-App ~/ultraviolet-app; fi
cd ~/ultraviolet-app
```
Then install the **new proxy page**. It's `proxy-ui/index.html` in the repo `pebbleford/gnmath`, so download it straight over the old start page:
```sh
curl -fsSL https://raw.githubusercontent.com/pebbleford/gnmath/main/proxy-ui/index.html -o public/index.html
```
If that download fails, the page's full text is also in **Appendix A** at the end of this file. Copy it **exactly, with no changes**, and write it with this command (the page text goes between the two `PAGE_EOF` lines):
```sh
cat > public/index.html <<'PAGE_EOF'
<paste the whole of Appendix A here>
PAGE_EOF
```
Check it worked, then build:
```sh
head -3 public/index.html
grep -c "uv-form" public/index.html
sudo docker build -t ultraviolet-app .
```
`head` should show `<!doctype html>`, and the `grep` count should be `1` or more. The new page already uses DuckDuckGo as its search engine, so nothing else needs editing. The build can take several minutes. If it errors, show the user the last 20 lines. If anything looks wrong with the new page, restore the original with `git checkout -- public/index.html` before building again.

### 5. Run it
```sh
sudo docker rm -f ultraviolet-app 2>/dev/null
sudo docker run -d --name ultraviolet-app --restart unless-stopped -p 8080:8080 ultraviolet-app
sudo docker ps
```
`docker ps` should show `ultraviolet-app` with `0.0.0.0:8080->8080/tcp`.

### 6. Open the port (ask the user first)
Oracle blocks ports in two places. Show the user each change before making it.

a. **In the Oracle console:** open the instance, then its subnet, then its **Security List** (or Network Security Group). Add an **Ingress Rule**:
   - Source CIDR: the user's own public IP followed by `/32` (ask the user for it, or have them look it up). Use `0.0.0.0/0` only if the user explicitly says so.
   - IP protocol: TCP
   - Destination port: 8080

b. **On the VM:**
```sh
sudo iptables -I INPUT -p tcp --dport 8080 -j ACCEPT
sudo apt-get install -y iptables-persistent
sudo netfilter-persistent save
```

### 7. HTTPS (needed for the proxy to work properly)
Ultraviolet uses service workers, which browsers only allow on HTTPS pages or on `localhost`. Plain `http://<vm-ip>:8080` will most likely not work.

**Stop here and ask the user how they want to get HTTPS.** Do not set up any tunnel or public exposure yourself. Common choices are a domain with a certificate in front of the proxy, or running the proxy on their own PC (where `http://localhost:8080` works) instead of the VM. Only continue once the user has chosen and told you exactly what to do.

### 8. Check it works
Open the HTTPS address the user chose in step 7 in Chrome or Edge. Type `duckduckgo.com` or a search term in the box. A page should load. If the browser says the service worker failed or the page is blank, the usual cause is that the address is not HTTPS.

### 9. Point the website at the proxy
The user's website is already hosted on **bunny.net** and already set up. Do not set up any hosting, and do not touch GitHub Pages. Just switch to the new UI:
1. Open the user's bunny.net site address (ask the user for it if you do not have it).
2. Check that it shows the **new UI**: a **Proxy** button in the top bar and a **Settings** button at the bottom right. If it does, continue at step 4.
3. If it still shows the old UI, hold-refresh the page. There is no "switch UI" option in bunny.net: the new UI is just the newer site files from the repo `pebbleford/gnmath` (`index.html`, the `assets/` folder and `fern-proxy.html`). If the old UI persists, ask the user how their bunny.net site gets its files, then follow the matching case below. Ask before changing anything in the dashboard:
   - **Pull zone with an origin URL:** the new files must be at the origin. If they are, purge the cache (bunny.net, **CDN**, the pull zone, **Caching**, **Purge Cache**).
   - **Storage zone:** the user (or you, with their permission) uploads the new files over the old ones in the storage zone's file manager, then purges the pull zone's cache.
   Do not guess which case applies.
4. Click **Settings**, find **Web proxy**, enter the proxy address from step 7, and click **Save**.
5. Click **Proxy** in the top bar. The proxy should open in a new tab.

The address is saved in that browser only, so it has to be set on each device.

## Own PC (give these to the user to run themselves)
Docker Desktop must be open and running ("Engine running"). In PowerShell:
```powershell
cd ~/ultraviolet-app
Invoke-WebRequest https://raw.githubusercontent.com/pebbleford/gnmath/main/proxy-ui/index.html -OutFile public\index.html
docker rm -f ultraviolet-app
docker build -t ultraviolet-app .
docker run -d --name ultraviolet-app --restart unless-stopped -p 8080:8080 ultraviolet-app
```
If `~/ultraviolet-app` does not exist yet, first run `git clone https://github.com/titaniumnetwork-dev/Ultraviolet-App ~/ultraviolet-app`. Then open `http://localhost:8080` in Chrome or Edge and hold-refresh (Ctrl+F5).

## Report back to the user
Say plainly what worked and what did not. Include:
- the address to use,
- the commands to stop and start it: `sudo docker stop ultraviolet-app` and `sudo docker start ultraviolet-app`,
- anything that failed, with the exact error text.

## Notes
- Ultraviolet-App is licensed GPL-3.0, and its authors no longer maintain it (they point to Scramjet).
- This is a separate program from Fern proxy, which is a PostgreSQL data-masking proxy and cannot proxy websites.
- The new page was written against the original page's scripts but has not been tested with a running proxy. If it breaks, restore the original with `git checkout -- public/index.html`.
- None of these steps have been run by the author of this file. Expect to troubleshoot.

## Appendix A: new proxy page (public/index.html)
Copy everything inside the code block below, exactly:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Proxy</title>
  <meta name="theme-color" content="#0a0d12">
  <link rel="shortcut icon" href="favicon.ico">

  <!-- Proxy engine (same scripts as the original Ultraviolet-App page; do not remove) -->
  <script src="baremux/index.js"></script>
  <script src="uv/uv.bundle.js"></script>
  <script src="uv/uv.config.js"></script>

  <style>
    :root {
      --bg: #0a0d12; --bg-raise: #11161e; --surface: #151b25; --surface-hi: #1c2431;
      --line: #232d3b; --text: #e8edf4; --dim: #9aa6b6; --faint: #6b7788;
      --accent: #6cf0b0; --accent-ink: #052618; --danger: #ff7a7a;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; height: 100%; }
    body {
      background: radial-gradient(900px 500px at 50% -10%, rgba(108,240,176,.10), transparent 70%), var(--bg);
      color: var(--text);
      font: 16px/1.5 "Space Grotesk", system-ui, -apple-system, "Segoe UI", sans-serif;
      display: flex; flex-direction: column; min-height: 100%;
    }
    main { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 16px; text-align: center; }
    .mark { width: 64px; height: 64px; border-radius: 18px; background: var(--accent); color: var(--accent-ink);
            display: grid; place-items: center; font-size: 34px; font-weight: 700; margin-bottom: 14px; }
    h1 { margin: 0 0 6px; font-size: clamp(30px, 6vw, 48px); letter-spacing: -.02em; }
    .sub { margin: 0 0 26px; color: var(--dim); }
    form { width: min(640px, 100%); display: flex; gap: 8px; }
    input[type=text] {
      flex: 1; min-width: 0; background: var(--surface); color: var(--text);
      border: 1px solid var(--line); border-radius: 14px; padding: 15px 18px; font: inherit; outline: none;
    }
    input[type=text]:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(108,240,176,.16); }
    button.go {
      background: var(--accent); color: var(--accent-ink); border: 0; border-radius: 14px; padding: 0 22px;
      font: 700 16px inherit; font-family: inherit; cursor: pointer;
    }
    button.go:active { transform: scale(.97); }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 18px; max-width: 640px; }
    .chip {
      background: var(--surface); color: var(--text); border: 1px solid var(--line); border-radius: 999px;
      padding: 8px 14px; font: 500 14px inherit; font-family: inherit; cursor: pointer;
    }
    .chip:hover { background: var(--surface-hi); border-color: var(--accent); }
    #uv-error { color: var(--danger); min-height: 1.4em; margin: 18px 0 0; }
    #uv-error-code { color: var(--faint); font-size: 12px; white-space: pre-wrap; max-width: 640px; margin: 4px 0 0; }
    .note { margin-top: 26px; font-size: 13px; color: var(--faint); max-width: 520px; }
    footer { padding: 16px; text-align: center; font-size: 12px; color: var(--faint); }
    footer a { color: var(--dim); }

    /* Browsing view */
    #bar { display: none; position: fixed; top: 0; left: 0; right: 0; height: 52px; z-index: 5;
           align-items: center; gap: 8px; padding: 0 10px; background: var(--bg-raise); border-bottom: 1px solid var(--line); }
    #bar button { background: var(--surface); color: var(--text); border: 1px solid var(--line); border-radius: 10px;
                  padding: 8px 14px; font: 600 14px inherit; font-family: inherit; cursor: pointer; }
    #bar button:hover { border-color: var(--accent); }
    #bar .title { color: var(--dim); font-size: 14px; margin-left: auto; }
    body.browsing #bar { display: flex; }
    body.browsing main, body.browsing footer { display: none; }
    #uv-frame { position: fixed; top: 52px; left: 0; width: 100%; height: calc(100% - 52px); border: 0; background: #fff; }
  </style>
</head>
<body>
  <div id="bar">
    <button type="button" id="home">&larr; Home</button>
    <button type="button" id="reload">Reload</button>
    <span class="title">Proxy</span>
  </div>

  <main>
    <div class="mark" aria-hidden="true">&sum;</div>
    <h1>Proxy</h1>
    <p class="sub">Type a website or search.</p>

    <form id="uv-form" autocomplete="off">
      <!-- Search engine used when you type words instead of a website address -->
      <input id="uv-search-engine" value="https://duckduckgo.com/?q=%s" type="hidden">
      <input id="uv-address" type="text" placeholder="Search or enter a website" aria-label="Search or enter a website" spellcheck="false" autofocus>
      <button class="go" type="submit">Go</button>
    </form>

    <div class="chips" id="chips">
      <button class="chip" type="button" data-go="https://duckduckgo.com/">DuckDuckGo</button>
      <button class="chip" type="button" data-go="https://en.wikipedia.org/">Wikipedia</button>
      <button class="chip" type="button" data-go="https://www.bing.com/">Bing</button>
      <button class="chip" type="button" data-go="https://www.youtube.com/">YouTube</button>
    </div>

    <p id="uv-error" role="alert"></p>
    <pre id="uv-error-code"></pre>

    <p class="note">Some sites block proxies or won't load. Use this only where your network's rules allow it.</p>
  </main>

  <footer>
    Powered by <a href="https://github.com/titaniumnetwork-dev/Ultraviolet-App">Ultraviolet</a> ·
    <a href="credits.html">Credits</a>
  </footer>

  <iframe style="display: none" id="uv-frame" title="Proxied page"></iframe>

  <!-- Original page scripts (unchanged) -->
  <script src="register-sw.js"></script>
  <script src="search.js"></script>
  <script src="index.js"></script>

  <script>
    // Added by the new page: quick links, Home and Reload buttons.
    (function () {
      var frame = document.getElementById('uv-frame');
      var form = document.getElementById('uv-form');
      var address = document.getElementById('uv-address');

      document.getElementById('chips').addEventListener('click', function (e) {
        var b = e.target.closest('[data-go]');
        if (!b) return;
        address.value = b.getAttribute('data-go');
        if (form.requestSubmit) form.requestSubmit(); else form.dispatchEvent(new Event('submit', { cancelable: true }));
      });

      // The original script shows the frame; switch to the browsing layout when it does.
      new MutationObserver(function () {
        document.body.classList.toggle('browsing', frame.style.display === 'block');
      }).observe(frame, { attributes: true, attributeFilter: ['style'] });

      document.getElementById('home').addEventListener('click', function () {
        frame.style.display = 'none';
        frame.removeAttribute('src');
        address.focus();
      });
      document.getElementById('reload').addEventListener('click', function () {
        try { frame.contentWindow.location.reload(); } catch (e) { frame.src = frame.src; }
      });
    })();
  </script>
</body>
</html>
```

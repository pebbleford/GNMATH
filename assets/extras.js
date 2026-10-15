// Extras: tab disguise, panic key, about:blank launcher, theme, site name.
// Self-contained: injects its own button, panel and styles. Settings live in localStorage.
(() => {
  'use strict';
  const KEY = 'gnmath:extras';
  const PRESETS = {
    none:      { label: 'Off (GNMATH)', title: '', icon: '' },
    classroom: { label: 'Google Classroom', title: 'Classroom', icon: 'https://www.google.com/s2/favicons?domain=classroom.google.com&sz=64' },
    docs:      { label: 'Google Docs', title: 'Untitled document - Google Docs', icon: 'https://www.google.com/s2/favicons?domain=docs.google.com&sz=64' },
    drive:     { label: 'Google Drive', title: 'My Drive - Google Drive', icon: 'https://www.google.com/s2/favicons?domain=drive.google.com&sz=64' },
    slides:    { label: 'Google Slides', title: 'Untitled presentation - Google Slides', icon: 'https://www.google.com/s2/favicons?domain=slides.google.com&sz=64' },
    wiki:      { label: 'Wikipedia', title: 'Wikipedia, the free encyclopedia', icon: 'https://www.google.com/s2/favicons?domain=wikipedia.org&sz=64' },
  };
  const DEFAULTS = { preset: 'none', title: '', icon: '', siteName: '', accent: '', panicKey: '`', panicUrl: 'https://classroom.google.com', proxyUrl: 'http://localhost:8080', scramUrl: '' };

  const load = () => { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { ...DEFAULTS }; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch { /* storage blocked */ } };
  const cfg = load();
  const safeUrl = (u) => /^(https?:\/\/|data:image\/)/i.test(u || '') ? u : '';
  const origTitle = document.title;
  const origIcon = (document.querySelector('link[rel~="icon"]') || {}).href || '';

  // ---- Tab disguise -------------------------------------------------------
  let applying = false;
  function currentCloak() {
    if (cfg.preset !== 'none' && PRESETS[cfg.preset]) return PRESETS[cfg.preset];
    return { title: cfg.title, icon: cfg.icon };
  }
  function applyCloak() {
    const c = currentCloak();
    applying = true;
    if (c.title && document.title !== c.title) document.title = c.title;
    let link = document.querySelector('link[rel~="icon"]');
    const icon = safeUrl(c.icon);
    if (icon) {
      if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
      link.removeAttribute('type');
      link.href = icon;
    } else if (link && origIcon && !c.title) {
      link.href = origIcon;
    }
    applying = false;
  }
  // The app rewrites the title when a game opens or closes; keep our title on top.
  const titleEl = document.querySelector('title');
  if (titleEl) new MutationObserver(() => { if (!applying && currentCloak().title && document.title !== currentCloak().title) applyCloak(); })
    .observe(titleEl, { childList: true, characterData: true, subtree: true });

  // ---- Site name, theme ---------------------------------------------------
  function applySiteName() {
    document.querySelectorAll('[data-site-name]').forEach((n) => { n.textContent = cfg.siteName || 'GNMATH'; });
  }
  function applyAccent() {
    const root = document.documentElement.style;
    if (/^#[0-9a-f]{6}$/i.test(cfg.accent)) {
      root.setProperty('--accent', cfg.accent);
      root.setProperty('--accent-soft', cfg.accent + '24');
    } else { root.removeProperty('--accent'); root.removeProperty('--accent-soft'); }
  }

  // ---- Panic key ----------------------------------------------------------
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (cfg.panicKey && e.key === cfg.panicKey && safeUrl(cfg.panicUrl)) location.replace(cfg.panicUrl);
  });

  // ---- about:blank launcher ----------------------------------------------
  function openBlank() {
    const w = window.open('about:blank', '_blank');
    if (!w) { alert('Your browser blocked the new tab. Allow pop-ups for this site and try again.'); return; }
    const c = currentCloak();
    w.document.title = c.title || 'about:blank';
    const f = w.document.createElement('iframe');
    f.src = location.href;
    f.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0';
    w.document.body.style.margin = '0';
    w.document.body.appendChild(f);
    location.replace(safeUrl(cfg.panicUrl) || 'https://classroom.google.com');
  }

  // ---- UI -----------------------------------------------------------------
  const css = document.createElement('style');
  css.textContent = `
  .xt-btn{position:fixed;right:14px;bottom:14px;z-index:60;border:0;background:var(--grad,var(--surface,#151b25));color:#fff;border-radius:999px;padding:10px 16px;font:600 14px system-ui;cursor:pointer;box-shadow:0 4px 18px rgba(0,0,0,.4)}
  .xt-panel{position:fixed;inset:0;z-index:70;background:rgba(0,0,0,.6);display:flex;align-items:flex-end;justify-content:center}
  .xt-panel[hidden]{display:none}
  .xt-card{background:var(--bg-raise,#11161e);color:var(--text,#fff);border:1px solid var(--line,#333);width:min(560px,100%);max-height:90vh;overflow:auto;border-radius:16px 16px 0 0;padding:18px 18px 28px;font:15px/1.5 system-ui}
  @media(min-width:700px){.xt-panel{align-items:center}.xt-card{border-radius:16px}}
  .xt-card h2{margin:0 0 4px;font-size:20px} .xt-card h3{margin:18px 0 6px;font-size:14px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-dim,#9aa)}
  .xt-card label{display:block;font-size:13px;color:var(--text-dim,#9aa);margin:8px 0 3px}
  .xt-card input,.xt-card select{width:100%;box-sizing:border-box;background:var(--surface,#151b25);color:var(--text,#fff);border:1px solid var(--line,#333);border-radius:8px;padding:9px;font:inherit}
  .xt-card input[type=color]{padding:2px;height:40px}
  .xt-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
  .xt-card button{border:1px solid var(--line,#333);background:var(--surface-hi,#1c2431);color:var(--text,#fff);border-radius:8px;padding:9px 14px;font:600 14px system-ui;cursor:pointer}
  .xt-card button.xt-main{background:var(--accent,#b36bff);color:var(--accent-ink,#052618);border-color:transparent}
  .xt-note{font-size:13px;color:var(--text-dim,#9aa);margin:4px 0 0}
  .xt-card a{color:var(--accent,#b36bff)}`;
  document.head.appendChild(css);

  const btn = document.createElement('button');
  btn.className = 'xt-btn'; btn.type = 'button'; btn.textContent = '⚙ Settings';
  const panel = document.createElement('div');
  panel.className = 'xt-panel'; panel.hidden = true;
  panel.innerHTML = `
  <div class="xt-card" role="dialog" aria-modal="true" aria-label="Settings">
    <h2>Settings</h2>
    <p class="xt-note">Saved on this device only.</p>

    <h3>Tab disguise</h3>
    <label for="xt-preset">Preset</label>
    <select id="xt-preset"></select>
    <label for="xt-title">Custom tab name</label>
    <input id="xt-title" type="text" placeholder="e.g. My Drive" autocomplete="off">
    <label for="xt-icon">Custom tab icon (image URL)</label>
    <input id="xt-icon" type="url" placeholder="https://…/icon.png" autocomplete="off">
    <p class="xt-note">A preset overrides the custom fields. Choose "Off" to use the custom name and icon.</p>

    <h3>Site</h3>
    <label for="xt-name">Site name in the header</label>
    <input id="xt-name" type="text" placeholder="GNMATH" autocomplete="off">
    <label for="xt-accent">Accent color</label>
    <input id="xt-accent" type="color" value="#b36bff">

    <h3>Web proxy</h3>
    <label for="xt-proxy">Ultraviolet proxy address (opened by the Proxy button)</label>
    <input id="xt-proxy" type="url" placeholder="http://localhost:8080" autocomplete="off">
    <label for="xt-scram">Scramjet proxy address (optional)</label>
    <input id="xt-scram" type="url" placeholder="http://localhost:8081" autocomplete="off">
    <p class="xt-note">If both are set, the Proxy button asks which one to open.</p>
    <p class="xt-note">Run your own proxy and put its address here. See <a href="proxysetup.md">proxysetup.md</a> and the README.</p>

    <h3>Panic key</h3>
    <label for="xt-pkey">Key (press it anywhere outside a text box)</label>
    <input id="xt-pkey" type="text" maxlength="1" autocomplete="off">
    <label for="xt-purl">Go to this page</label>
    <input id="xt-purl" type="url" autocomplete="off">

    <h3>My game links</h3>
    <p class="xt-note">Add a link to any game site. It shows up in the library and opens in a new tab.</p>
    <label for="xt-lname">Name</label>
    <input id="xt-lname" type="text" autocomplete="off">
    <label for="xt-lurl">Link</label>
    <input id="xt-lurl" type="url" placeholder="https://…" autocomplete="off">
    <div class="xt-row"><button type="button" id="xt-ladd">Add link</button></div>
    <div id="xt-llist"></div>

    <h3>Tools</h3>
    <div class="xt-row">
      <button type="button" id="xt-blank">Open in about:blank</button>
      <a href="fern-proxy.html#demo"><button type="button">Fern Proxy demo</button></a>
    </div>
    <p class="xt-note">"about:blank" opens this site inside a blank tab, then sends this tab to the panic page.</p>

    <div class="xt-row">
      <button type="button" class="xt-main" id="xt-save">Save</button>
      <button type="button" id="xt-reset">Reset</button>
      <button type="button" id="xt-close">Close</button>
    </div>
  </div>`;

  const $ = (id) => panel.querySelector('#' + id);
  function fill() {
    const sel = $('xt-preset'); sel.replaceChildren();
    Object.entries(PRESETS).forEach(([k, p]) => { const o = document.createElement('option'); o.value = k; o.textContent = p.label; sel.appendChild(o); });
    sel.value = cfg.preset; $('xt-title').value = cfg.title; $('xt-icon').value = cfg.icon;
    $('xt-name').value = cfg.siteName; $('xt-accent').value = /^#[0-9a-f]{6}$/i.test(cfg.accent) ? cfg.accent : '#b36bff';
    $('xt-proxy').value = cfg.proxyUrl; $('xt-scram').value = cfg.scramUrl; $('xt-pkey').value = cfg.panicKey; $('xt-purl').value = cfg.panicUrl;
  }
  const open = () => { fill(); renderLinks(); panel.hidden = false; };
  const close = () => { panel.hidden = true; };
  function commit() {
    cfg.preset = $('xt-preset').value; cfg.title = $('xt-title').value.trim(); cfg.icon = $('xt-icon').value.trim();
    cfg.siteName = $('xt-name').value.trim(); cfg.accent = $('xt-accent').value;
    cfg.proxyUrl = $('xt-proxy').value.trim(); cfg.scramUrl = $('xt-scram').value.trim(); cfg.panicKey = $('xt-pkey').value; cfg.panicUrl = $('xt-purl').value.trim();
    save(); applyAll();
  }
  function applyAll() { applyCloak(); applySiteName(); applyAccent(); }

  const LKEY = 'gnmath:links';
  const getLinks = () => { try { return JSON.parse(localStorage.getItem(LKEY) || '[]'); } catch { return []; } };
  const setLinks = (v) => { try { localStorage.setItem(LKEY, JSON.stringify(v)); } catch { /* blocked */ } };
  function renderLinks() {
    const box = $('xt-llist'); box.replaceChildren();
    getLinks().forEach((l, i) => {
      const row = document.createElement('div'); row.className = 'xt-row';
      const t = document.createElement('span'); t.textContent = l.name; t.style.flex = '1';
      const rm = document.createElement('button'); rm.type = 'button'; rm.textContent = 'Remove';
      rm.onclick = () => { const a = getLinks(); a.splice(i, 1); setLinks(a); renderLinks(); };
      row.append(t, rm); box.appendChild(row);
    });
  }
  $('xt-ladd').onclick = () => {
    const name = $('xt-lname').value.trim(), url = $('xt-lurl').value.trim();
    if (!name || !/^https?:\/\//i.test(url)) { alert('Enter a name and a link starting with http:// or https://'); return; }
    const a = getLinks(); a.push({ name, url }); setLinks(a);
    $('xt-lname').value = ''; $('xt-lurl').value = ''; renderLinks();
    alert('Added. Reload the page to see it in the library.');
  };

  btn.onclick = open;
  panel.addEventListener('click', (e) => { if (e.target === panel) close(); });
  panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  $('xt-save').onclick = () => { commit(); close(); };
  $('xt-close').onclick = close;
  $('xt-reset').onclick = () => { Object.assign(cfg, DEFAULTS); save(); document.title = origTitle; applyAll(); fill(); };
  $('xt-blank').onclick = () => { commit(); openBlank(); };

  // Proxy button in the top bar: opens the user's own proxy in a new tab.
  const bar = document.querySelector('.topbar__inner');
  if (bar) {
    const pb = document.createElement('button');
    pb.className = 'btn'; pb.type = 'button'; pb.id = 'xt-proxybtn'; pb.title = 'Open your web proxy';
    pb.innerHTML = '<span>Proxy</span>';
    pb.querySelector('span').style.display = 'inline';
    pb.style.width = 'auto'; pb.style.padding = '0 14px';
    // Small menu under the button, shown when a Scramjet address is set too.
    const menu = document.createElement('div');
    menu.hidden = true;
    menu.style.cssText = 'position:fixed;z-index:65;min-width:190px;padding:6px;border-radius:14px;background:var(--bg-raise,#140d26);border:1px solid var(--line,#34255c);box-shadow:0 16px 40px -12px rgba(0,0,0,.8)';
    const addItem = (label, url) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = label;
      b.style.cssText = 'display:block;width:100%;text-align:left;padding:10px 12px;border:0;border-radius:10px;background:transparent;color:var(--text,#fff);font:600 14px var(--font,system-ui);cursor:pointer';
      b.onmouseenter = () => { b.style.background = 'var(--surface-hi,#261a46)'; };
      b.onmouseleave = () => { b.style.background = 'transparent'; };
      b.onclick = () => { menu.hidden = true; window.open(url, '_blank', 'noopener'); };
      menu.appendChild(b);
    };
    document.body.appendChild(menu);
    document.addEventListener('click', (e) => { if (!menu.hidden && !pb.contains(e.target) && !menu.contains(e.target)) menu.hidden = true; });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') menu.hidden = true; });

    pb.onclick = () => {
      const uv = safeUrl(cfg.proxyUrl), sj = safeUrl(cfg.scramUrl);
      if (!uv && !sj) { alert('Set your proxy address in Settings first.'); open(); return; }
      if (uv && !sj) { window.open(uv, '_blank', 'noopener'); return; }
      if (sj && !uv) { window.open(sj, '_blank', 'noopener'); return; }
      menu.replaceChildren();
      addItem('Ultraviolet', uv);
      addItem('Scramjet', sj);
      const r = pb.getBoundingClientRect();
      menu.style.top = (r.bottom + 6) + 'px';
      menu.style.right = Math.max(8, window.innerWidth - r.right) + 'px';
      menu.hidden = !menu.hidden;
    };
    bar.appendChild(pb);
  }

  document.body.append(btn, panel);
  applyAll();
})();

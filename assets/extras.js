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
  const DEFAULTS = { preset: 'none', title: '', icon: '', siteName: '', accent: '', panicKey: '`', panicUrl: 'https://classroom.google.com' };

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
  .xt-btn{position:fixed;right:14px;bottom:14px;z-index:60;border:1px solid var(--line,#333);background:var(--surface,#151b25);color:var(--text,#fff);border-radius:999px;padding:10px 16px;font:600 14px system-ui;cursor:pointer;box-shadow:0 4px 18px rgba(0,0,0,.4)}
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
  .xt-card button.xt-main{background:var(--accent,#6cf0b0);color:var(--accent-ink,#052618);border-color:transparent}
  .xt-note{font-size:13px;color:var(--text-dim,#9aa);margin:4px 0 0}
  .xt-card a{color:var(--accent,#6cf0b0)}`;
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
    <input id="xt-accent" type="color" value="#6cf0b0">

    <h3>Panic key</h3>
    <label for="xt-pkey">Key (press it anywhere outside a text box)</label>
    <input id="xt-pkey" type="text" maxlength="1" autocomplete="off">
    <label for="xt-purl">Go to this page</label>
    <input id="xt-purl" type="url" autocomplete="off">

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
    $('xt-name').value = cfg.siteName; $('xt-accent').value = /^#[0-9a-f]{6}$/i.test(cfg.accent) ? cfg.accent : '#6cf0b0';
    $('xt-pkey').value = cfg.panicKey; $('xt-purl').value = cfg.panicUrl;
  }
  const open = () => { fill(); panel.hidden = false; };
  const close = () => { panel.hidden = true; };
  function commit() {
    cfg.preset = $('xt-preset').value; cfg.title = $('xt-title').value.trim(); cfg.icon = $('xt-icon').value.trim();
    cfg.siteName = $('xt-name').value.trim(); cfg.accent = $('xt-accent').value;
    cfg.panicKey = $('xt-pkey').value; cfg.panicUrl = $('xt-purl').value.trim();
    save(); applyAll();
  }
  function applyAll() { applyCloak(); applySiteName(); applyAccent(); }

  btn.onclick = open;
  panel.addEventListener('click', (e) => { if (e.target === panel) close(); });
  panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  $('xt-save').onclick = () => { commit(); close(); };
  $('xt-close').onclick = close;
  $('xt-reset').onclick = () => { Object.assign(cfg, DEFAULTS); save(); document.title = origTitle; applyAll(); fill(); };
  $('xt-blank').onclick = () => { commit(); openBlank(); };

  document.body.append(btn, panel);
  applyAll();
})();

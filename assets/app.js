(() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // Config. Every source list is tried in order, so if one CDN is down or
  // blocked the next one takes over.
  // ---------------------------------------------------------------------------
  const CONFIG = {
    siteName: 'GNMATH',
    zones: [
      'https://raw.githubusercontent.com/gn-math/assets/main/zones.json',
      'https://cdn.jsdelivr.net/gh/gn-math/assets@main/zones.json',
    ],
    covers: [
      'https://cdn.jsdelivr.net/gh/gn-math/covers@main',
      'https://raw.githubusercontent.com/gn-math/covers/main',
    ],
    html: [
      'https://cdn.jsdelivr.net/gh/gn-math/html@main',
      'https://raw.githubusercontent.com/gn-math/html/main',
    ],
    // Games bundled with this site (relative URLs, no catalog needed).
    localGames: [
      { id: 900001, name: 'Fern Proxy', author: 'Fern Proxy', special: ['tools'], featured: true,
        url: 'games/fern-proxy.html', cover: '', local: true },
    ],
    recentLimit: 16,
    connectTimeout: 15000,
  };

  // gn-math "special" tags -> chip label and short card badge.
  const TAGS = {
    port: ['Ports', 'Port'],
    flash: ['Flash', 'Flash'],
    emulator: ['Emulators', 'Emu'],
    fnf: ['FNF', 'FNF'],
    nds: ['Nintendo DS', 'DS'],
    dos: ['DOS', 'DOS'],
    tools: ['Tools', 'Tool'],
    psx: ['PlayStation', 'PS1'],
    gba: ['Game Boy Advance', 'GBA'],
    nes: ['NES', 'NES'],
    n64: ['Nintendo 64', 'N64'],
  };
  // Most specific tag wins when a game has several.
  const BADGE_ORDER = ['nds', 'psx', 'gba', 'nes', 'n64', 'dos', 'fnf', 'flash', 'port', 'emulator', 'tools'];

  const KEY = {
    zones: 'gnmath:zones',
    favs: 'gnmath:favs',
    recent: 'gnmath:recent',
    sort: 'gnmath:sort',
  };

  const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/></svg>';

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const $ = (sel) => document.querySelector(sel);

  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch { /* storage full or blocked: favorites just won't persist */ }
    },
  };

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  const normalize = (s) => String(s || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  const titleCase = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  const fill = (template, bases, token) => (
    template.includes(token) ? bases.map((b) => template.replace(token, b)) : [template]
  );

  // Tries each URL in turn. The timeout only covers connecting; large game
  // files are allowed to take as long as they need to download.
  async function fetchFirst(urls, { as = 'text', cache = 'default' } = {}) {
    let lastError = new Error('No sources');
    for (const url of urls) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), CONFIG.connectTimeout);
      try {
        const res = await fetch(url, { signal: ctrl.signal, cache });
        clearTimeout(timer);
        if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`);
        const data = as === 'json' ? await res.json() : await res.text();
        return { data, url };
      } catch (err) {
        clearTimeout(timer);
        lastError = err;
      }
    }
    throw lastError;
  }

  let toastTimer;
  function toast(msg) {
    let el = $('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    requestAnimationFrame(() => el.classList.add('is-on'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-on'), 2600);
  }

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const state = {
    games: [],
    byId: new Map(),
    loaded: false,
    filter: 'all',
    query: '',
    sort: store.get(KEY.sort, 'new'),
    favs: new Set(store.get(KEY.favs, [])),
    recent: store.get(KEY.recent, []),
  };

  const el = {
    grid: $('#grid'),
    chips: $('#chips'),
    state: $('#state'),
    count: $('#result-count'),
    heroCount: $('#hero-count'),
    browseTitle: $('#browse-title'),
    search: $('#search'),
    sort: $('#sort'),
    random: $('#random'),
    recentShelf: $('#shelf-recent'),
    recentRow: $('#recent-row'),
    featuredShelf: $('#shelf-featured'),
    featuredRow: $('#featured-row'),
    sourceMeta: $('#source-meta'),
    player: $('#player'),
    stage: $('#player-stage'),
    msg: $('#player-msg'),
    pTitle: $('#player-title'),
    pAuthor: $('#player-author'),
    pFav: $('#player-fav'),
    background: [$('.topbar'), $('#library'), $('.footer')],
  };

  // ---------------------------------------------------------------------------
  // Catalog
  // ---------------------------------------------------------------------------
  function ingest(raw) {
    if (!Array.isArray(raw)) throw new Error('Unexpected catalog format');
    const games = [];
    [...raw, ...CONFIG.localGames].forEach((z) => {
      if (!z || typeof z.id !== 'number' || z.id < 0 || !z.url || !z.name) return;
      const name = String(z.name).trim();
      // "[!] ..." entries are gn-math's own notices (suggestion box, comments).
      if (name.startsWith('[!]')) return;
      const url = String(z.url);
      const external = !z.local && !url.includes('{HTML_URL}');
      if (external && !/^https?:\/\//.test(url)) return;
      const author = z.author ? String(z.author).trim() : '';
      const tags = Array.isArray(z.special) ? z.special.map(String) : [];
      const nameNorm = normalize(name);
      games.push({
        id: z.id,
        name,
        author,
        authorLink: typeof z.authorLink === 'string' && /^https?:\/\//.test(z.authorLink) ? z.authorLink : '',
        tags,
        featured: !!z.featured,
        url,
        cover: z.cover ? String(z.cover) : '',
        external,
        nameNorm,
        nameCompact: nameNorm.replace(/ /g, ''),
        haystack: `${nameNorm} ${normalize(author)}`,
      });
    });
    if (!games.length) throw new Error('The catalog is empty');

    state.games = games;
    state.byId = new Map(games.map((g) => [g.id, g]));
    state.loaded = true;
    gridCards.clear();

    // Drop saved ids for games that no longer exist.
    state.recent = state.recent.filter((id) => state.byId.has(id));
    el.heroCount.textContent = games.length.toLocaleString();
    el.search.placeholder = `Search ${games.length.toLocaleString()} games`;
    el.random.disabled = false;
    renderChips();
    renderShelves();
    renderGrid();
  }

  async function loadCatalog() {
    const cached = store.get(KEY.zones, null);
    let shown = false;
    if (cached && Array.isArray(cached.data)) {
      try {
        ingest(cached.data);
        shown = true;
        setSourceMeta(`saved copy from ${new Date(cached.t).toLocaleString()}`);
        route();
      } catch { /* bad cache, fetch fresh below */ }
    }
    if (!shown) renderSkeletons();

    try {
      const { data, url } = await fetchFirst(CONFIG.zones, { as: 'json', cache: 'no-cache' });
      const changed = !shown || JSON.stringify(data) !== JSON.stringify(cached.data);
      store.set(KEY.zones, { t: Date.now(), data });
      if (changed) {
        ingest(data);
        route();
      }
      setSourceMeta(`live from ${new URL(url).host}`);
    } catch (err) {
      if (shown) {
        toast('Showing your saved game list. Could not reach the catalog.');
        return;
      }
      showState({
        title: 'Couldn’t load the game library',
        body: `The catalog servers didn’t respond (${err.message}). Check your connection and try again.`,
        action: { label: 'Try again', run: () => { hideState(); loadCatalog(); } },
      });
      el.grid.setAttribute('aria-busy', 'false');
      el.grid.replaceChildren();
    }
  }

  function setSourceMeta(text) {
    el.sourceMeta.textContent = `${state.games.length.toLocaleString()} games · catalog ${text}`;
  }

  // ---------------------------------------------------------------------------
  // Cards
  // ---------------------------------------------------------------------------
  const gridCards = new Map();

  function badgeFor(g) {
    const tag = BADGE_ORDER.find((t) => g.tags.includes(t)) || g.tags[0];
    if (!tag) return '';
    return TAGS[tag] ? TAGS[tag][1] : titleCase(tag);
  }

  function playHref(g) {
    return g.external ? g.url : `#/play/${g.id}`;
  }

  function makeCard(g) {
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.id = g.id;
    const badge = badgeFor(g);
    const fav = state.favs.has(g.id);
    card.innerHTML = `
      <a class="card__link" href="${esc(playHref(g))}"${g.external ? ' target="_blank" rel="noopener"' : ''}>
        <div class="card__art">
          <img alt="" width="256" height="256" loading="lazy" decoding="async">
          <div class="card__ph" aria-hidden="true">${esc(g.name.replace(/[^\p{L}\p{N}]/gu, '').charAt(0) || '?')}</div>
          ${badge ? `<span class="card__tag">${esc(badge)}</span>` : ''}
        </div>
        <h3 class="card__title">${esc(g.name)}</h3>
        <p class="card__by">${esc(g.author || 'Unknown creator')}</p>
      </a>
      <button class="fav" type="button" aria-pressed="${fav}" aria-label="${fav ? 'Remove' : 'Add'} ${esc(g.name)} ${fav ? 'from' : 'to'} favorites">${STAR}</button>`;

    const img = card.querySelector('img');
    const sources = g.cover ? fill(g.cover, CONFIG.covers, '{COVER_URL}') : [];
    let i = 0;
    img.addEventListener('load', () => img.classList.add('is-loaded'));
    img.addEventListener('error', () => {
      i += 1;
      if (i < sources.length) img.src = sources[i];
    });
    if (sources.length) img.src = sources[0];
    return card;
  }

  function gridCard(g) {
    let card = gridCards.get(g.id);
    if (!card) {
      card = makeCard(g);
      gridCards.set(g.id, card);
    }
    return card;
  }

  function renderSkeletons() {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 18; i++) {
      const s = document.createElement('div');
      s.className = 'card skel';
      s.setAttribute('aria-hidden', 'true');
      s.innerHTML = '<div class="card__art"></div><div class="card__title"></div><div class="card__by"></div>';
      frag.appendChild(s);
    }
    el.grid.replaceChildren(frag);
  }

  // ---------------------------------------------------------------------------
  // Filtering, sorting, search
  // ---------------------------------------------------------------------------
  function filterLabel(key) {
    if (key === 'all') return 'All games';
    if (key === 'featured') return 'Featured';
    if (key === 'favorites') return 'Favorites';
    if (key === 'untagged') return 'HTML5';
    const tag = key.slice(4);
    return TAGS[tag] ? TAGS[tag][0] : titleCase(tag);
  }

  function matchesFilter(g, key) {
    if (key === 'all') return true;
    if (key === 'featured') return g.featured;
    if (key === 'favorites') return state.favs.has(g.id);
    if (key === 'untagged') return g.tags.length === 0;
    return g.tags.includes(key.slice(4));
  }

  // Lower is a better match.
  function relevance(g, q, qCompact) {
    if (g.nameNorm === q) return 0;
    if (g.nameNorm.startsWith(q)) return 1;
    if (` ${g.nameNorm}`.includes(` ${q}`)) return 2;
    if (g.nameNorm.includes(q) || g.nameCompact.includes(qCompact)) return 3;
    return 4;
  }

  const SORTS = {
    new: (a, b) => b.id - a.id,
    old: (a, b) => a.id - b.id,
    az: (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }),
  };

  function visibleGames() {
    const q = normalize(state.query);
    const qCompact = q.replace(/ /g, '');
    const terms = q ? q.split(' ') : [];
    let list = state.games.filter((g) => matchesFilter(g, state.filter));
    if (q) {
      list = list.filter((g) => terms.every((t) => g.haystack.includes(t)) || g.nameCompact.includes(qCompact));
    }
    const bySort = SORTS[state.sort] || SORTS.new;
    if (q) {
      const score = new Map(list.map((g) => [g.id, relevance(g, q, qCompact)]));
      return list.sort((a, b) => score.get(a.id) - score.get(b.id) || bySort(a, b));
    }
    return list.sort(bySort);
  }

  function renderGrid() {
    if (!state.loaded) return;
    const list = visibleGames();
    const frag = document.createDocumentFragment();
    for (const g of list) frag.appendChild(gridCard(g));
    el.grid.replaceChildren(frag);
    el.grid.setAttribute('aria-busy', 'false');

    const filtering = !!state.query.trim() || state.filter !== 'all';
    document.body.classList.toggle('is-filtering', filtering);
    el.browseTitle.textContent = state.query.trim()
      ? `Results for “${state.query.trim()}”`
      : filterLabel(state.filter);
    el.count.textContent = `${list.length.toLocaleString()} ${list.length === 1 ? 'game' : 'games'}`;

    if (list.length) {
      hideState();
    } else if (state.filter === 'favorites' && !state.query.trim()) {
      showState({
        title: 'No favorites yet',
        body: 'Tap the star on any game and it will be saved here on this device.',
        action: { label: 'Browse all games', run: () => setFilter('all') },
      });
    } else {
      showState({
        title: 'No games found',
        body: state.filter === 'all'
          ? `Nothing matches “${state.query.trim()}”. Try a shorter or different search.`
          : `Nothing in ${filterLabel(state.filter)} matches “${state.query.trim()}”.`,
        action: { label: 'Clear search and filters', run: resetBrowse },
      });
    }
  }

  function renderChips() {
    const counts = new Map();
    let untagged = 0;
    for (const g of state.games) {
      if (!g.tags.length) untagged++;
      for (const t of g.tags) counts.set(t, (counts.get(t) || 0) + 1);
    }
    const favCount = state.games.filter((g) => state.favs.has(g.id)).length;
    const filters = [
      ['all', state.games.length],
      ['featured', state.games.filter((g) => g.featured).length],
      ['favorites', favCount],
      ...(untagged ? [['untagged', untagged]] : []),
      ...[...counts].sort((a, b) => b[1] - a[1]).map(([t, n]) => [`tag:${t}`, n]),
    ].filter(([key, n]) => n > 0 || key === 'favorites' || key === 'all');

    if (!filters.some(([key]) => key === state.filter)) state.filter = 'all';

    el.chips.innerHTML = filters.map(([key, n]) => `
      <button class="chip" type="button" data-filter="${esc(key)}" aria-pressed="${key === state.filter}">
        ${key === 'favorites' ? STAR : ''}
        ${esc(key === 'all' ? 'All' : filterLabel(key))}<span class="chip__n">${n}</span>
      </button>`).join('');
  }

  function renderShelves() {
    const recent = state.recent.map((id) => state.byId.get(id)).filter(Boolean);
    el.recentRow.replaceChildren(...recent.map(makeCard));
    el.recentShelf.hidden = !recent.length;

    const featured = state.games.filter((g) => g.featured).sort(SORTS.new);
    el.featuredRow.replaceChildren(...featured.map(makeCard));
    el.featuredShelf.hidden = !featured.length;
  }

  function setFilter(key) {
    state.filter = key;
    for (const chip of el.chips.querySelectorAll('.chip')) {
      chip.setAttribute('aria-pressed', String(chip.dataset.filter === key));
    }
    renderGrid();
    const active = el.chips.querySelector('[aria-pressed="true"]');
    active?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    const top = el.chips.getBoundingClientRect().top;
    if (top < 64) window.scrollTo({ top: Math.max(0, window.scrollY + top - 140) });
  }

  function resetBrowse() {
    state.query = '';
    el.search.value = '';
    setFilter('all');
  }

  function showState({ title, body, action }) {
    el.state.innerHTML = `<h3>${esc(title)}</h3><p>${esc(body)}</p>${action ? `<button class="btn" type="button">${esc(action.label)}</button>` : ''}`;
    if (action) el.state.querySelector('button').addEventListener('click', action.run);
    el.state.hidden = false;
  }

  function hideState() {
    el.state.hidden = true;
  }

  // ---------------------------------------------------------------------------
  // Favorites & recently played
  // ---------------------------------------------------------------------------
  function toggleFav(id) {
    const g = state.byId.get(id);
    if (!g) return;
    const on = !state.favs.has(id);
    if (on) state.favs.add(id); else state.favs.delete(id);
    store.set(KEY.favs, [...state.favs]);

    for (const btn of document.querySelectorAll(`.card[data-id="${id}"] .fav`)) {
      btn.setAttribute('aria-pressed', String(on));
      btn.setAttribute('aria-label', `${on ? 'Remove' : 'Add'} ${g.name} ${on ? 'from' : 'to'} favorites`);
    }
    if (current && current.game.id === id) syncPlayerFav();

    const chipN = el.chips.querySelector('[data-filter="favorites"] .chip__n');
    if (chipN) chipN.textContent = state.games.filter((x) => state.favs.has(x.id)).length;
    if (state.filter === 'favorites' && !current) renderGrid();
    toast(on ? `Added ${g.name} to favorites` : `Removed ${g.name} from favorites`);
  }

  function addRecent(id) {
    state.recent = [id, ...state.recent.filter((x) => x !== id)].slice(0, CONFIG.recentLimit);
    store.set(KEY.recent, state.recent);
    renderShelves();
  }

  // ---------------------------------------------------------------------------
  // Player
  // ---------------------------------------------------------------------------
  let current = null; // { game, html, token }
  let lastFocus = null;
  let landedOnGame = /^#\/play\//.test(location.hash);

  function setBackgroundInert(on) {
    for (const node of el.background) {
      if (on) node.setAttribute('inert', ''); else node.removeAttribute('inert');
    }
  }

  function syncPlayerFav() {
    const on = state.favs.has(current.game.id);
    el.pFav.setAttribute('aria-pressed', String(on));
    el.pFav.title = on ? 'Remove from favorites' : 'Add to favorites';
  }

  function showPlayerMsg(html) {
    el.msg.innerHTML = html;
    el.msg.hidden = false;
  }

  function removeFrame() {
    el.stage.querySelector('iframe')?.remove();
  }

  function mountFrame(html) {
    removeFrame();
    const frame = document.createElement('iframe');
    frame.title = current.game.name;
    frame.allow = 'fullscreen; autoplay; gamepad; clipboard-write; screen-wake-lock; accelerometer; gyroscope';
    frame.setAttribute('allowfullscreen', '');
    // Same-origin so saves work, but no top-navigation: a game can't
    // redirect the whole site away.
    frame.setAttribute('sandbox', [
      'allow-scripts', 'allow-same-origin', 'allow-forms', 'allow-modals', 'allow-pointer-lock',
      'allow-popups', 'allow-popups-to-escape-sandbox', 'allow-downloads', 'allow-orientation-lock',
      'allow-presentation',
    ].join(' '));
    el.stage.appendChild(frame);

    const doc = frame.contentDocument;
    doc.open();
    doc.write(html);
    doc.close();
    el.msg.hidden = true;
    frame.focus();
  }

  async function loadGame() {
    const token = {};
    current.token = token;
    current.html = null;
    removeFrame();
    showPlayerMsg('<div class="spinner" aria-hidden="true"></div><p>Loading game…</p>');
    try {
      const { data } = await fetchFirst(fill(current.game.url, CONFIG.html, '{HTML_URL}'));
      if (!current || current.token !== token) return; // closed or switched meanwhile
      current.html = data;
      mountFrame(data);
    } catch (err) {
      if (!current || current.token !== token) return;
      showPlayerMsg(`
        <h3>This game didn’t load</h3>
        <p>${esc(err.message || 'Network error')}. The game server may be busy or blocked on this network.</p>
        <button class="btn btn--accent" type="button" data-retry>Try again</button>`);
      el.msg.querySelector('[data-retry]').addEventListener('click', loadGame);
    }
  }

  function openPlayer(g) {
    if (current && current.game.id === g.id) return;
    if (!current) lastFocus = document.activeElement;
    current = { game: g, html: null, token: null };

    el.pTitle.textContent = g.name;
    el.pAuthor.textContent = g.author ? `by ${g.author}` : '';
    if (g.authorLink) el.pAuthor.href = g.authorLink; else el.pAuthor.removeAttribute('href');
    syncPlayerFav();

    el.player.hidden = false;
    document.body.classList.add('is-playing');
    setBackgroundInert(true);
    document.title = `${g.name} · ${CONFIG.siteName}`;
    $('#player-back').focus();

    addRecent(g.id);
    loadGame();
  }

  function closePlayer() {
    landedOnGame = false;
    if (!current) return;
    current = null;
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    removeFrame();
    el.msg.hidden = true;
    el.player.hidden = true;
    document.body.classList.remove('is-playing');
    setBackgroundInert(false);
    document.title = CONFIG.siteName;
    if (state.filter === 'favorites') renderGrid();
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }

  function leavePlayer() {
    if (landedOnGame) {
      // Opened straight from a shared link: there is no in-app page to go back to.
      landedOnGame = false;
      history.replaceState(null, '', location.pathname + location.search);
      route();
    } else {
      history.back();
    }
  }

  function goFullscreen() {
    const target = el.stage;
    const request = target.requestFullscreen || target.webkitRequestFullscreen;
    if (!request) {
      toast('Fullscreen isn’t supported in this browser');
      return;
    }
    Promise.resolve(request.call(target)).catch(() => toast('Fullscreen was blocked'));
  }

  function popOut() {
    if (!current || !current.html) {
      toast('Wait for the game to finish loading first');
      return;
    }
    const url = URL.createObjectURL(new Blob([current.html], { type: 'text/html' }));
    const win = window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    if (!win) {
      toast('Your browser blocked the new tab');
      return;
    }
    leavePlayer();
  }

  // ---------------------------------------------------------------------------
  // Routing: #/play/<id>
  // ---------------------------------------------------------------------------
  function route() {
    const m = location.hash.match(/^#\/play\/(\d+)$/);
    if (!m) {
      closePlayer();
      return;
    }
    if (!state.loaded) return; // route() runs again once the catalog arrives
    const g = state.byId.get(Number(m[1]));
    if (g && !g.external) {
      openPlayer(g);
    } else {
      closePlayer();
      history.replaceState(null, '', location.pathname + location.search);
      toast('That game isn’t in the library anymore');
    }
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------
  function onCardAreaClick(e) {
    const fav = e.target.closest('.fav');
    if (fav) {
      e.preventDefault();
      toggleFav(Number(fav.closest('.card').dataset.id));
    }
  }
  [el.grid, el.recentRow, el.featuredRow].forEach((node) => node.addEventListener('click', onCardAreaClick));

  el.chips.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (chip) setFilter(chip.dataset.filter);
  });

  document.querySelector('[data-jump="featured"]').addEventListener('click', () => setFilter('featured'));

  $('#clear-recent').addEventListener('click', () => {
    state.recent = [];
    store.set(KEY.recent, []);
    renderShelves();
  });

  let searchTimer;
  el.search.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.query = el.search.value;
      renderGrid();
    }, 90);
  });
  el.search.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') el.search.blur();
    if (e.key === 'Escape' && el.search.value) {
      el.search.value = '';
      state.query = '';
      renderGrid();
    }
  });

  el.sort.value = SORTS[state.sort] ? state.sort : 'new';
  el.sort.addEventListener('change', () => {
    state.sort = el.sort.value;
    store.set(KEY.sort, state.sort);
    renderGrid();
  });

  el.random.addEventListener('click', () => {
    const visible = visibleGames();
    const pool = (visible.length ? visible : state.games).filter((g) => !g.external);
    if (!pool.length) return;
    const g = pool[Math.floor(Math.random() * pool.length)];
    location.hash = `#/play/${g.id}`;
  });

  $('.brand').addEventListener('click', (e) => {
    e.preventDefault();
    resetBrowse();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  $('#player-back').addEventListener('click', leavePlayer);
  $('#player-reload').addEventListener('click', () => {
    if (!current) return;
    if (current.html) mountFrame(current.html); else loadGame();
  });
  $('#player-full').addEventListener('click', goFullscreen);
  $('#player-popout').addEventListener('click', popOut);
  el.pFav.addEventListener('click', () => current && toggleFav(current.game.id));

  document.addEventListener('keydown', (e) => {
    if (e.key !== '/' || current) return;
    const t = e.target;
    if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement || t.isContentEditable) return;
    e.preventDefault();
    el.search.focus();
    el.search.select();
  });

  window.addEventListener('hashchange', route);

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------
  document.title = CONFIG.siteName;
  for (const node of document.querySelectorAll('[data-site-name]')) node.textContent = CONFIG.siteName;
  el.random.disabled = true;
  loadCatalog();
})();

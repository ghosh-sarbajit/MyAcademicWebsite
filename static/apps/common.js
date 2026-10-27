// Shared helpers for the apps in /apps/ (Literature Finder, Citation Download).
// The pure functions (normTitle, sim, csv, bib parsing) also load in Node for tests:
//   const A = require('./common.js');
(function (root) {
  'use strict';

  // ------------------------------------------------------------------ text

  // Same as norm_title() in MyBibliography/scrape.py and citationDownload.py
  function normTitle(t) {
    t = String(t || '').normalize('NFKD').replace(/[^\x00-\x7F]/g, '');
    t = t.toLowerCase().replace(/[{}\\$]/g, '');
    return (t.match(/[a-z0-9]+/g) || []).join(' ');
  }

  // difflib.SequenceMatcher(None, a, b).ratio(), including difflib's "autojunk"
  // rule for strings of 200+ characters, so scores match the Python scripts.
  function ratio(a, b) {
    const la = a.length, lb = b.length;
    if (!la && !lb) return 1;
    const b2j = new Map();
    for (let j = 0; j < lb; j++) {
      if (!b2j.has(b[j])) b2j.set(b[j], []);
      b2j.get(b[j]).push(j);
    }
    if (lb >= 200) {
      const ntest = Math.floor(lb / 100) + 1;
      for (const [c, idx] of b2j) if (idx.length > ntest) b2j.delete(c);
    }
    function longest(alo, ahi, blo, bhi) {
      let besti = alo, bestj = blo, bestsize = 0, j2len = new Map();
      for (let i = alo; i < ahi; i++) {
        const next = new Map();
        for (const j of b2j.get(a[i]) || []) {
          if (j < blo) continue;
          if (j >= bhi) break;
          const k = (j2len.get(j - 1) || 0) + 1;
          next.set(j, k);
          if (k > bestsize) { besti = i - k + 1; bestj = j - k + 1; bestsize = k; }
        }
        j2len = next;
      }
      while (besti > alo && bestj > blo && a[besti - 1] === b[bestj - 1]) {
        besti--; bestj--; bestsize++;
      }
      while (besti + bestsize < ahi && bestj + bestsize < bhi &&
             a[besti + bestsize] === b[bestj + bestsize]) bestsize++;
      return [besti, bestj, bestsize];
    }
    let matches = 0;
    const queue = [[0, la, 0, lb]];
    while (queue.length) {
      const [alo, ahi, blo, bhi] = queue.pop();
      const [i, j, k] = longest(alo, ahi, blo, bhi);
      if (!k) continue;
      matches += k;
      if (alo < i && blo < j) queue.push([alo, i, blo, j]);
      if (i + k < ahi && j + k < bhi) queue.push([i + k, ahi, j + k, bhi]);
    }
    return 2 * matches / (la + lb);
  }

  function sim(a, b) { return ratio(normTitle(a), normTitle(b)); }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // html.unescape() for text scraped from HTML index pages
  function unescapeHtml(s) {
    if (typeof document === 'undefined') { // Node tests: the common entities only
      return String(s).replace(/&#(x?)([0-9a-f]+);/gi, (m, x, n) => String.fromCodePoint(parseInt(n, x ? 16 : 10)))
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
        .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
    }
    const ta = document.createElement('textarea'); // a textarea never runs markup
    ta.innerHTML = s;
    return ta.value;
  }

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // ------------------------------------------------------------------ CSV

  function csvCell(v) {
    v = v == null ? '' : String(v);
    return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }
  // Python's csv.writer ends rows with \r\n
  function toCsv(rows) { return rows.map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n'; }

  function parseCsv(text) {
    const rows = [];
    let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(r => r.length > 1 || r[0]);
  }

  // ------------------------------------------------------------------ BibTeX

  // The same title / key patterns the Python scripts use to find known papers
  function bibTitles(txt) {
    return [...txt.matchAll(/^\s*title\s*=\s*\{(.*)\},\s*$/gm)].map(m => normTitle(m[1]));
  }
  function bibKeys(txt) {
    return [...txt.matchAll(/^@\w+\{([^,]+),/gm)].map(m => m[1]);
  }

  // ------------------------------------------------------------------ storage

  function load(key, dflt) {
    try { const v = localStorage.getItem(key); return v == null ? dflt : JSON.parse(v); }
    catch (e) { return dflt; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) { return false; }
  }
  function forget(key) { try { localStorage.removeItem(key); } catch (e) { /* ignore */ } }

  const SETTINGS_KEY = 'apps.settings';
  const BIB_KEY = 'apps.bibliography';
  const HANDOFF_KEY = 'apps.handoff';

  function settings() { return Object.assign({ proxy: '', s2key: '', mailto: '' }, load(SETTINGS_KEY, {})); }

  // The bibliography the visitor loaded: {files: {name: {titles: [...], keys: [...]}}}
  function bibliography() {
    const files = (load(BIB_KEY, {}) || {}).files || {};
    const titles = new Set(), keys = new Set();
    for (const f of Object.values(files)) {
      (f.titles || []).forEach(t => titles.add(t));
      (f.keys || []).forEach(k => keys.add(k));
    }
    return { files, titles, keys };
  }

  // ------------------------------------------------------------------ network

  // Scholarly APIs differ in whether they allow browser requests (CORS). Each host
  // is tried directly first, then through the visitor's own proxy (Settings), then
  // through public CORS proxies; the route that worked is reused for that host.
  const PUBLIC_PROXIES = [
    u => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
    u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    u => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}`,
  ];
  const ROUTE = {};      // host -> index into routes()
  const DISABLED = new Set();
  const FAILS = {};

  function routes() {
    const custom = settings().proxy.trim();
    const list = [u => u];
    if (custom) {
      list.push(custom.includes('{url}')
        ? u => custom.replace('{url}', encodeURIComponent(u))
        : u => custom + encodeURIComponent(u));
    }
    return list.concat(PUBLIC_PROXIES);
  }

  function withParams(url, params) {
    if (!params) return url;
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v != null && v !== '') q.append(k, v);
    return url + (url.includes('?') ? '&' : '?') + q.toString();
  }

  async function fetchRoute(url, i, headers, timeout) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeout);
    try {
      return await fetch(routes()[i](url), {
        headers: i === 0 ? headers : undefined, signal: ctl.signal, credentials: 'omit',
      });
    } finally { clearTimeout(timer); }
  }

  // One request over the first route that answers. A direct answer is final;
  // a proxy answering with an error is treated like an unreachable route.
  async function route(url, headers, timeout) {
    const host = new URL(url).host, all = routes();
    const order = [...all.keys()];
    if (ROUTE[host] != null && ROUTE[host] < all.length) {
      order.splice(order.indexOf(ROUTE[host]), 1);
      order.unshift(ROUTE[host]);
    }
    let lastErr = null;
    for (const i of order) {
      try {
        const r = await fetchRoute(url, i, headers, timeout);
        if (i === 0 || r.ok) { ROUTE[host] = i; return r; }
        lastErr = new Error(`proxy HTTP ${r.status}`);
      } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error('unreachable');
  }

  // GET with backoff on 429/5xx, like get() in citationDownload.py: 401/403, or
  // two network failures in a row, disable the source for the rest of the run.
  async function get(url, source, opts = {}) {
    const { params, headers, retries = 3, timeout = 25000, log = () => {} } = opts;
    if (DISABLED.has(source)) return null;
    const full = withParams(url, params);
    let delay = 3000;
    for (let attempt = 0; attempt < retries; attempt++) {
      if (opts.signal && opts.signal.aborted) return null;
      let r;
      try {
        r = await route(full, headers, timeout);
      } catch (e) {
        if (attempt < retries - 1) { await sleep(delay); delay *= 2; continue; }
        FAILS[source] = (FAILS[source] || 0) + 1;
        log(`[${source}] network error: ${e.name === 'AbortError' ? 'timeout' : e.message}`);
        if (FAILS[source] >= 2) { DISABLED.add(source); log(`[${source}] unreachable; disabled for this run`); }
        return null;
      }
      FAILS[source] = 0;
      if (r.ok) return r;
      if ([429, 500, 502, 503, 504].includes(r.status) && attempt < retries - 1) {
        const ra = r.headers.get('Retry-After') || '';
        await sleep(Math.min(/^\d+$/.test(ra) ? +ra * 1000 : delay, 30000));
        delay *= 2;
        continue;
      }
      if (r.status === 401 || r.status === 403) {
        DISABLED.add(source);
        log(`[${source}] HTTP ${r.status}; disabled for this run`);
      } else log(`[${source}] HTTP ${r.status}`);
      return null;
    }
    return null;
  }

  function resetSources() {
    DISABLED.clear();
    for (const k of Object.keys(FAILS)) delete FAILS[k];
  }

  // ------------------------------------------------------------------ browser UI

  function download(name, text, type = 'text/plain') {
    const url = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function copy(text, btn) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = Object.assign(document.createElement('textarea'), { value: text });
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e2) { /* ignore */ }
      ta.remove();
    }
    if (btn) {
      const old = btn.textContent;
      btn.textContent = 'Copied';
      setTimeout(() => { btn.textContent = old; }, 1200);
    }
  }

  const readFile = f => new Promise((ok, err) => {
    const r = new FileReader();
    r.onload = () => ok(r.result);
    r.onerror = () => err(r.error);
    r.readAsText(f);
  });

  // A small log panel: <pre data-log>
  function logger(el) {
    return {
      line(msg, cls) {
        const s = document.createElement('span');
        if (cls) s.className = cls;
        s.textContent = msg + '\n';
        el.appendChild(s);
        el.scrollTop = el.scrollHeight;
        el.hidden = false;
      },
      clear() { el.textContent = ''; },
    };
  }

  // "Your bibliography" panel, shared by both apps: <div data-bib-panel>
  function bibPanel(el, onChange) {
    function render() {
      const b = bibliography(), names = Object.keys(b.files);
      el.querySelector('[data-bib-status]').innerHTML = names.length
        ? `<b>${b.titles.size}</b> title${b.titles.size === 1 ? '' : 's'} from ${names.map(n => `<code>${escapeHtml(n)}</code>`).join(', ')}`
        : 'No bibliography loaded: papers you already have will not be skipped.';
      el.querySelector('[data-bib-forget]').hidden = !names.length;
    }
    el.querySelector('[data-bib-input]').addEventListener('change', async e => {
      const stored = load(BIB_KEY, {}) || {};
      stored.files = stored.files || {};
      for (const f of e.target.files) {
        const txt = await readFile(f);
        stored.files[f.name] = { titles: bibTitles(txt), keys: bibKeys(txt) };
      }
      if (!save(BIB_KEY, stored)) alert('Your browser blocked storage; the files are used for this visit only.');
      e.target.value = '';
      render();
      onChange && onChange();
    });
    el.querySelector('[data-bib-forget]').addEventListener('click', () => {
      forget(BIB_KEY); render(); onChange && onChange();
    });
    render();
  }

  // Settings panel: <form data-settings> with inputs named proxy, s2key, mailto
  function settingsPanel(form) {
    const s = settings();
    for (const el of form.elements) if (el.name in s) el.value = s[el.name];
    form.addEventListener('input', () => {
      const next = settings();
      for (const el of form.elements) if (el.name in next) next[el.name] = el.value.trim();
      save(SETTINGS_KEY, next);
      for (const k of Object.keys(ROUTE)) delete ROUTE[k];
    });
  }

  const api = {
    normTitle, ratio, sim, escapeHtml, unescapeHtml, sleep, toCsv, parseCsv,
    bibTitles, bibKeys, load, save, forget, settings, bibliography, get, withParams,
    resetSources, DISABLED, download, copy, readFile, logger, bibPanel, settingsPanel,
    HANDOFF_KEY,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Apps = api;
})(this);

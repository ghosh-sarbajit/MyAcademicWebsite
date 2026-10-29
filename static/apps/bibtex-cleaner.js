// BibTeX Cleaner: tidy a .bib file in the browser — remove duplicate entries, sort,
// protect capitals in titles, drop unwanted fields, write authors as "Last, First" and
// page ranges with "--". The parser and cleaner also load in Node for tests:
//   const B = require('./bibtex-cleaner.js');
(function (root) {
  'use strict';

  const A = typeof module !== 'undefined' && module.exports ? require('./common.js') : root.Apps;

  // ------------------------------------------------------------------ parsing

  // text -> [{type: 'entry', kind, key, fields: [{name, raw, text}], open, close}
  //          | {type: 'string' | 'preamble' | 'comment', raw} | {type: 'text', raw}]
  // `raw` of a field is its value as written ({…}, "…", 2024, a @string name or a # b);
  // `text` is the inside of a single {…} or "…" value, or the number, else null.
  function parse(src) {
    const items = [];
    let i = 0, textStart = 0;
    const flushText = end => {
      const t = src.slice(textStart, end);
      if (t.trim()) items.push({ type: 'text', raw: t.replace(/^\s*\n|\s+$/g, '') });
    };
    while (i < src.length) {
      const at = src.indexOf('@', i);
      if (at < 0) break;
      const m = /^@\s*([A-Za-z]+)\s*([{(])/.exec(src.slice(at, at + 60));
      if (!m) { i = at + 1; continue; }
      const kind = m[1].toLowerCase(), open = m[2], close = open === '{' ? '}' : ')';
      const body = at + m[0].length, end = matching(src, body, open, close);
      if (end < 0) { i = at + 1; continue; } // unbalanced: leave it as loose text
      flushText(at);
      const inner = src.slice(body, end), raw = src.slice(at, end + 1);
      if (kind === 'comment' || kind === 'preamble' || kind === 'string') items.push({ type: kind, raw });
      else items.push(entry(kind, inner));
      i = textStart = end + 1;
    }
    flushText(src.length);
    return items;
  }

  // index of the delimiter closing the one just before `from`, skipping nested braces
  function matching(s, from, open, close) {
    let depth = 0;
    for (let j = from; j < s.length; j++) {
      const c = s[j];
      if (c === '\\') { j++; continue; }
      if (c === '{') depth++;
      else if (c === '}') { if (depth === 0 && close === '}') return j; depth--; if (depth < 0) return -1; }
      else if (c === close && depth === 0) return j;
      else if (c === '@' && depth === 0 && /^@\s*[A-Za-z]+\s*[{(]/.test(s.slice(j, j + 40)) && close === '}') return -1;
    }
    return -1;
  }

  function entry(kind, inner) {
    const comma = topLevel(inner, ',');
    const key = (comma < 0 ? inner : inner.slice(0, comma)).trim();
    const fields = [];
    let rest = comma < 0 ? '' : inner.slice(comma + 1);
    while (rest.trim()) {
      const eq = rest.indexOf('=');
      if (eq < 0) break;
      const name = rest.slice(0, eq).trim().toLowerCase().replace(/^,\s*/, '');
      rest = rest.slice(eq + 1);
      const c = topLevel(rest, ',');
      const raw = (c < 0 ? rest : rest.slice(0, c)).trim();
      rest = c < 0 ? '' : rest.slice(c + 1);
      if (name) fields.push({ name, raw, text: simple(raw) });
    }
    return { type: 'entry', kind, key, fields };
  }

  // position of `ch` outside braces and quotes, or -1
  function topLevel(s, ch) {
    let depth = 0, quote = false;
    for (let j = 0; j < s.length; j++) {
      const c = s[j];
      if (c === '\\') { j++; continue; }
      if (c === '{') depth++;
      else if (c === '}') depth--;
      else if (c === '"' && depth === 0) quote = !quote;
      else if (c === ch && depth === 0 && !quote) return j;
    }
    return -1;
  }

  function simple(raw) {
    if (/^\d+$/.test(raw)) return raw;
    if (raw[0] === '{' && matching(raw, 1, '{', '}') === raw.length - 1) return raw.slice(1, -1);
    if (raw[0] === '"' && raw.length > 1 && raw[raw.length - 1] === '"' && topLevel(raw.slice(1, -1), '"') < 0) return raw.slice(1, -1);
    return null;
  }

  const field = (e, n) => { const f = e.fields.find(x => x.name === n); return f ? (f.text != null ? f.text : f.raw) : ''; };

  // ------------------------------------------------------------------ cleaning

  // wrap words with a capital after their first letter (BERT, GPT, PyTorch, iPhone) in braces,
  // so bibliography styles do not lowercase them. Text already in braces, math and
  // commands are left alone.
  function protectCaps(t) {
    let out = '', depth = 0, math = false;
    for (let j = 0; j < t.length;) {
      const c = t[j];
      if (c === '\\') {
        const m = /^\\([A-Za-z]+|.)/.exec(t.slice(j));
        out += m[0]; j += m[0].length; continue;
      }
      if (c === '$') math = !math;
      if (c === '{') depth++;
      if (c === '}') depth--;
      if (depth === 0 && !math && /[A-Za-z0-9]/.test(c)) {
        const w = /^[A-Za-z0-9]+/.exec(t.slice(j))[0];
        out += /[A-Z]/.test(w.slice(1)) ? `{${w}}` : w;
        j += w.length; continue;
      }
      out += c; j++;
    }
    return out;
  }

  // split on a word outside braces ("and" between names)
  function splitTop(s, re) {
    const parts = [];
    let depth = 0, start = 0;
    for (let j = 0; j < s.length; j++) {
      const c = s[j];
      if (c === '{') depth++;
      else if (c === '}') depth--;
      else if (depth === 0) {
        const m = re.exec(s.slice(j));
        if (m && m.index === 0 && (j === 0 || /\s/.test(s[j - 1]) || /^\s/.test(m[0]))) {
          parts.push(s.slice(start, j)); j += m[0].length - 1; start = j + 1;
        }
      }
    }
    parts.push(s.slice(start));
    return parts.map(p => p.trim()).filter(Boolean);
  }

  // "Ada Lovelace and Charles von Neumann" -> "Lovelace, Ada and von Neumann, Charles"
  function lastFirst(authors) {
    return splitTop(authors.replace(/\s+/g, ' '), /^\s+and\s+/i).map(name => {
      if (name === 'others' || topLevel(name, ',') >= 0) return name;
      const words = splitTop(name, /^\s+/);
      if (words.length < 2) return name;
      let von = words.findIndex((w, k) => k > 0 && k < words.length - 1 && /^[a-z]/.test(w));
      if (von < 0) von = words.length - 1;
      return `${words.slice(von).join(' ')}, ${words.slice(0, von).join(' ')}`;
    }).join(' and ');
  }

  const fixPages = p => p.replace(/(\w)\s*(?:-+|–|—)\s*(?=\w)/g, '$1--');

  const firstAuthor = e => {
    const a = splitTop(field(e, 'author') || field(e, 'editor'), /^\s+and\s+/i)[0] || '';
    const last = topLevel(a, ',') >= 0 ? a.slice(0, topLevel(a, ',')) : a.split(/\s+/).pop();
    return A.normTitle(last);
  };

  // two titles count as the same paper when they match after normalising, or score
  // at least `at` by difflib's ratio (as in the bibliography scripts)
  function sameTitle(a, b, at) {
    if (!a || !b) return false;
    if (a === b) return true;
    const la = a.length, lb = b.length;
    if (Math.min(la, lb) < 0.8 * Math.max(la, lb)) return false;
    const wa = new Set(a.split(' ')), wb = b.split(' ');
    if (wb.filter(w => wa.has(w)).length < 0.6 * Math.max(wa.size, wb.length)) return false;
    return A.ratio(a, b) >= at;
  }

  const DEFAULTS = {
    dedupe: true, threshold: 0.95, sort: 'none', caps: true, authors: true, pages: true,
    drop: ['abstract', 'keywords', 'file', 'timestamp', 'biburl', 'bibsource', 'owner', 'groups', 'annote', 'mendeley-tags'],
    keepText: true, indent: '    ',
  };

  // text -> {text, report: {entries, out, duplicates: [{key, of, why}], renamed, dropped, protected, comments}}
  function clean(src, opts) {
    const o = Object.assign({}, DEFAULTS, opts);
    const drop = new Set(o.drop.map(s => s.trim().toLowerCase()).filter(Boolean));
    const items = parse(src);
    const report = { entries: 0, out: 0, duplicates: [], renamed: [], dropped: 0, protected: 0, comments: 0 };
    let entries = [];
    const kept = [];
    for (const it of items) {
      if (it.type !== 'entry') { kept.push(it); continue; }
      report.entries++;
      entries.push(it);
    }

    // duplicates: keep the first place, with the fuller of the two entries
    if (o.dedupe) {
      const out = [], byKey = new Map();
      for (const e of entries) {
        const t = A.normTitle(field(e, 'title'));
        const same = out.find(x => x.norm && sameTitle(x.norm, t, o.threshold) &&
          (!field(x.e, 'year') || !field(e, 'year') || field(x.e, 'year') === field(e, 'year')));
        if (same) {
          report.duplicates.push({ key: e.key, of: same.e.key, why: same.e.key.toLowerCase() === e.key.toLowerCase() ? 'same key and title' : 'same title' });
          if (e.fields.length > same.e.fields.length) Object.assign(same.e, { kind: e.kind, fields: e.fields });
          continue;
        }
        let key = e.key;
        if (byKey.has(key.toLowerCase())) {
          let n = 1;
          while (byKey.has((key + String.fromCharCode(97 + n)).toLowerCase())) n++;
          key += String.fromCharCode(97 + n);
          report.renamed.push({ from: e.key, to: key });
          e.key = key;
        }
        byKey.set(key.toLowerCase(), true);
        out.push({ e, norm: t });
      }
      entries = out.map(x => x.e);
    }

    if (o.sort !== 'none') {
      const year = e => parseInt(field(e, 'year'), 10) || 0;
      const sorts = {
        key: (a, b) => a.key.localeCompare(b.key, 'en', { sensitivity: 'base' }),
        author: (a, b) => firstAuthor(a).localeCompare(firstAuthor(b)) || year(a) - year(b),
        year: (a, b) => year(b) - year(a) || sorts.author(a, b), // newest first
      };
      const by = sorts[o.sort];
      entries = entries.map((e, k) => [e, k]).sort((x, y) => by(x[0], y[0]) || x[1] - y[1]).map(x => x[0]);
    }

    const show = e => {
      const lines = [];
      for (const f of e.fields) {
        if (drop.has(f.name)) { report.dropped++; continue; }
        let v = f.text;
        if (v != null) {
          v = v.replace(/\s*\n\s*/g, ' ').trim();
          if (o.caps && f.name === 'title') { const p = protectCaps(v); if (p !== v) report.protected++; v = p; }
          if (o.authors && (f.name === 'author' || f.name === 'editor')) v = lastFirst(v);
          if (o.pages && f.name === 'pages') v = fixPages(v);
          v = /^\d+$/.test(v) && f.raw === v ? v : `{${v}}`;
        }
        lines.push(`${o.indent}${f.name} = ${v != null ? v : f.raw}`);
      }
      return `@${e.kind}{${e.key}${lines.length ? ',\n' + lines.join(',\n') : ','}\n}`;
    };

    const parts = [];
    const isNote = x => x.type === 'text' || x.type === 'comment';
    if (o.sort === 'none') {
      // the original order, with % comment lines where they were
      const keep = new Set(entries);
      for (const it of items) {
        if (it.type === 'entry') { if (keep.has(it)) parts.push(show(it)); }
        else if (!isNote(it)) parts.push(it.raw);
        else if (o.keepText) parts.push(it.raw);
        else report.comments++;
      }
    } else {
      // @string and @preamble first, as entries may use them
      for (const it of kept) if (!isNote(it)) parts.push(it.raw);
      for (const e of entries) parts.push(show(e));
      report.comments = kept.filter(isNote).length;
    }
    report.out = entries.length;
    return { text: parts.join('\n\n') + '\n', report };
  }

  const core = { parse, clean, protectCaps, lastFirst, fixPages, splitTop, DEFAULTS };
  if (typeof module !== 'undefined' && module.exports) { module.exports = core; return; }

  // ------------------------------------------------------------------ page

  const $ = (sel, el = document) => el.querySelector(sel);
  const app = $('[data-app="bibtex-cleaner"]');
  if (!app) return;
  const esc = A.escapeHtml;
  const KEY = 'apps.bibtex-cleaner';
  const form = $('[data-input]', app), results = $('[data-results]', app);
  const output = $('[data-output]', app), summary = $('[data-summary]', app);
  let last = null;

  const saved = A.load(KEY, null) || {};
  for (const el of form.elements) {
    if (!el.name || el.name === 'bib' || !(el.name in saved)) continue;
    if (el.type === 'checkbox') el.checked = !!saved[el.name]; else el.value = saved[el.name];
  }

  function options() {
    const f = form.elements;
    return {
      dedupe: f.dedupe.checked, sort: f.sort.value, caps: f.caps.checked, authors: f.authors.checked,
      pages: f.pages.checked, keepText: f.keepText.checked, drop: f.drop.value.split(/[\s,]+/),
    };
  }

  function store() {
    const s = {};
    for (const el of form.elements) if (el.name && el.name !== 'bib') s[el.name] = el.type === 'checkbox' ? el.checked : el.value;
    A.save(KEY, s);
  }

  function run() {
    const src = form.elements.bib.value;
    if (!src.trim()) { results.hidden = true; return; }
    const { text, report: r } = clean(src, options());
    last = text;
    output.textContent = text;
    const plural = (n, w) => `${n} ${n === 1 ? w : w.replace(/y$/, 'ie') + 's'}`;
    const notes = [`${plural(r.entries, 'entry')} read, ${r.out} written`];
    if (r.duplicates.length) notes.push(`${plural(r.duplicates.length, 'duplicate')} removed`);
    if (r.renamed.length) notes.push(`${plural(r.renamed.length, 'clashing key')} renamed`);
    if (r.protected) notes.push(`capitals protected in ${plural(r.protected, 'title')}`);
    if (r.dropped) notes.push(`${plural(r.dropped, 'field')} dropped`);
    if (r.comments) notes.push(`${plural(r.comments, 'comment block')} left out`);
    summary.innerHTML = esc(notes.join(' · ')) +
      (r.duplicates.length ? `<ul class="dups">${r.duplicates.map(d => `<li><code>${esc(d.key)}</code> is a duplicate of <code>${esc(d.of)}</code> (${esc(d.why)})</li>`).join('')}</ul>` : '') +
      (r.renamed.length ? `<ul class="dups">${r.renamed.map(d => `<li><code>${esc(d.from)}</code> was used by another paper; renamed <code>${esc(d.to)}</code></li>`).join('')}</ul>` : '');
    results.hidden = false;
  }

  form.addEventListener('input', e => { if (e.target.name !== 'bib') store(); });
  form.addEventListener('submit', e => { e.preventDefault(); run(); results.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  $('[data-file]', app).addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    form.elements.bib.value = await A.readFile(f);
    form.dataset.name = f.name.replace(/\.bib$/i, '');
    e.target.value = '';
    run();
  });
  $('[data-copy]', app).addEventListener('click', e => last && A.copy(last, e.currentTarget));
  $('[data-download]', app).addEventListener('click', () => last && A.download(`${form.dataset.name || 'references'}-clean.bib`, last));
})(this);

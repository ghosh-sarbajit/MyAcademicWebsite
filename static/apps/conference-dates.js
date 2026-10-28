// Conference Dates: when and where the next edition of each security conference I
// follow takes place, and its submission deadlines. The dates come from the
// community-maintained Security and Privacy Deadlines list (https://sec-deadlines.github.io),
// read from its data file on GitHub each time the page opens, so a new edition shows
// up here as soon as someone adds it to that list.
(function (root) {
  'use strict';
  const A = typeof module !== 'undefined' && module.exports ? require('./common.js') : root.Apps;

  const SITE = 'https://sec-deadlines.github.io';
  const REPO = 'https://github.com/sec-deadlines/sec-deadlines.github.io';
  const DATA = 'https://raw.githubusercontent.com/sec-deadlines/sec-deadlines.github.io/master/_data/conferences.yml';
  const EDIT = REPO + '/edit/master/_data/conferences.yml';
  const HISTORY = REPO + '/commits/master/_data/conferences.yml';
  const COMMITS = 'https://api.github.com/repos/sec-deadlines/sec-deadlines.github.io/commits?path=_data/conferences.yml&per_page=1';
  const SAVED_KEY = 'apps.conference-dates';

  // [short name, full name, CORE rank, name in the list, DBLP key]
  const CONFERENCES = [
    ['IEEE S&P', 'IEEE Symposium on Security and Privacy', 'A*', 'S&P (Oakland)', 'sp'],
    ['ACM CCS', 'ACM Conference on Computer and Communications Security', 'A*', 'CCS', 'ccs'],
    ['USENIX Security', 'USENIX Security Symposium', 'A*', 'USENIX Security', 'uss'],
    ['IEEE EuroS&P', 'IEEE European Symposium on Security and Privacy', 'A', 'Euro S&P', 'eurosp'],
    ['ESORICS', 'European Symposium on Research in Computer Security', 'A', 'ESORICS', 'esorics'],
    ['PETS / PoPETs', 'Privacy Enhancing Technologies Symposium', 'A', 'PETS', 'pet'],
    ['ACSAC', 'Annual Computer Security Applications Conference', 'A', 'ACSAC', 'acsac'],
    ['RAID', 'International Symposium on Research in Attacks, Intrusions and Defenses', 'A', 'RAID', 'raid'],
    ['ACM AsiaCCS', 'ACM Asia Conference on Computer and Communications Security', 'A', 'ASIA CCS', 'asiaccs'],
    ['IEEE CSF', 'IEEE Computer Security Foundations Symposium', 'A', 'CSF', 'csfw'],
    ['SOUPS', 'Symposium on Usable Privacy and Security', 'A', 'SOUPS', 'soups'],
    ['IEEE/IFIP DSN', 'International Conference on Dependable Systems and Networks', 'A', 'DSN', 'dsn'],
  ].map(([short, full, rank, listName, dblp]) => ({ short, full, rank, listName, dblp }));

  const DAY = 864e5;
  const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const AOE = 'Etc/GMT+12'; // the list's default: Anywhere on Earth (UTC-12)

  // ------------------------------------------------------------------ the list

  // _data/conferences.yml is a YAML list of flat records: "key: value", inline lists
  // ("tags: [SEC, CONF]") and indented lists ("deadline:" then "- ..." lines).
  // This reads that much YAML, which is all the file uses.
  function parseList(text) {
    const out = [];
    let cur = null, listKey = null;
    for (const raw of String(text).split(/\r?\n/)) {
      const line = stripComment(raw);
      if (!line.trim()) continue;
      let m;
      if ((m = line.match(/^-\s+(.*)$/))) { cur = {}; out.push(cur); field(m[1]); }
      else if (!cur) continue;
      else if (listKey && (m = line.match(/^\s+-\s+(.*)$/))) cur[listKey].push(scalar(m[1]));
      else if ((m = line.match(/^\s+(\S.*)$/))) field(m[1]);
    }
    function field(s) {
      const m = s.match(/^([A-Za-z_][\w-]*)\s*:(?:\s+(.*))?$/);
      listKey = null;
      if (!m) return;
      if (m[2] == null || m[2].trim() === '') { cur[m[1]] = []; listKey = m[1]; }
      else cur[m[1]] = value(m[2].trim());
    }
    return out;
  }

  // "#" starts a comment at the start of a line or after a space, outside quotes
  function stripComment(line) {
    let q = '';
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === '\\' && q === '"') i++; else if (c === q) q = ''; }
      else if (c === '"' || c === "'") q = c;
      else if (c === '#' && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i);
    }
    return line;
  }

  function value(s) {
    if (!(s.startsWith('[') && s.endsWith(']'))) return scalar(s);
    const items = [];
    let q = '', item = '';
    for (const c of s.slice(1, -1)) {
      if (q) { if (c === q) q = ''; item += c; }
      else if (c === '"' || c === "'") { q = c; item += c; }
      else if (c === ',') { items.push(item); item = ''; }
      else item += c;
    }
    if (item.trim()) items.push(item);
    return items.map(scalar);
  }

  function scalar(s) {
    s = s.trim();
    if (s.length > 1 && s[0] === '"' && s.endsWith('"')) {
      try { return JSON.parse(s); } catch (e) { return s.slice(1, -1); }
    }
    if (s.length > 1 && s[0] === "'" && s.endsWith("'")) return s.slice(1, -1).replace(/''/g, "'");
    return s;
  }

  function dblpKey(url) {
    const m = String(url || '').match(/dblp\.org\/db\/conf\/([^/]+)\//);
    return m ? m[1] : '';
  }

  // the list's records for one of CONFERENCES, by name or DBLP page
  function editionsOf(conf, list) {
    return list.filter(e => e.name === conf.listName || dblpKey(e.dblp) === conf.dblp);
  }

  // ------------------------------------------------------------------ dates

  // "May 17-20", "June 30 - July 2", "Dec 7-11", "November 15-19, 2026", "June 2026",
  // "June 16-17 or June 30-July 1 (tentative)" -> {start, end} as local dates; TBA -> null
  function conferenceDays(text, year) {
    const s = String(text || '').split(/\s+or\s+/i)[0];
    const y4 = s.match(/\b(\d{4})\b/);
    const y = y4 ? +y4[1] : +year;
    let month = -1;
    const days = [];
    for (const t of s.replace(/\b\d{4}\b/g, ' ').match(/[A-Za-z]+|\d+/g) || []) {
      if (/^\d+$/.test(t)) { if (month >= 0) days.push([month, +t]); }
      else if (MONTHS.includes(t.slice(0, 3).toLowerCase())) month = MONTHS.indexOf(t.slice(0, 3).toLowerCase());
    }
    if (month < 0 || !y) return null;
    if (!days.length) return { start: new Date(y, month, 1), end: new Date(y, month + 1, 0) };
    const [m0, d0] = days[0], [m1, d1] = days[days.length - 1];
    return { start: new Date(y, m0, d0), end: new Date(m1 < m0 ? y + 1 : y, m1, d1) };
  }

  // minutes the zone is ahead of UTC at this instant
  function zoneOffset(ms, zone) {
    const p = {};
    new Intl.DateTimeFormat('en-US', {
      timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
    }).formatToParts(new Date(ms)).forEach(x => { p[x.type] = x.value; });
    return (Date.UTC(+p.year, p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - ms) / 6e4;
  }

  function validZone(zone) {
    try { new Intl.DateTimeFormat('en-US', { timeZone: zone }); return true; } catch (e) { return false; }
  }

  // "2026-11-17 23:59" in the record's timezone -> {ms, text}. As on sec-deadlines.github.io,
  // "%y" is the conference's year, "%Y" the year before, and a deadline on the hour
  // ("12:00") means one second earlier ("11:59:59").
  function deadline(raw, year, zone) {
    const s = String(raw).replace('%y', year).replace('%Y', year - 1);
    const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (!m) return null;
    const [y, mo, d] = [+m[1], +m[2], +m[3]];
    const [h, mi, se] = m[4] == null ? [23, 59, 0] : [+m[4], +m[5], +(m[6] || 0)];
    const guess = Date.UTC(y, mo - 1, d, h, mi, se);
    let ms = guess - zoneOffset(guess, zone) * 6e4;
    ms = guess - zoneOffset(ms, zone) * 6e4;
    if (m[4] != null && mi === 0 && se === 0) ms -= 1000;
    return { ms, date: new Date(y, mo - 1, d), time: `${String(h).padStart(2, '0')}:${m[5] || '59'}` };
  }

  // The list has no field for abstract deadlines; they are in the comment, as
  // "Abstract registration required (1 week before deadline AoE)" or with a date,
  // "Mandatory abstract submission deadline January 8, 2027 (AoE)".
  // -> [{ms, date, time, paper}], each tied to the paper deadline it comes before
  function abstractDeadlines(text, papers, year, zone) {
    if (!/abstract/i.test(text) || !papers.length) return [];
    const iso = d => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    const before = text.match(/\b(\d+|one|two)\s+(week|day)s?\s+before/i);
    if (before) {
      const n = /^\d+$/.test(before[1]) ? +before[1] : before[1].toLowerCase() === 'one' ? 1 : 2;
      const back = n * (/week/i.test(before[2]) ? 7 : 1);
      return papers.map(p => {
        const d = new Date(p.date.getFullYear(), p.date.getMonth(), p.date.getDate() - back);
        return Object.assign(deadline(`${iso(d)} ${p.time}`, year, zone), { paper: p });
      });
    }
    const on = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b(?:,?\s+(\d{4}))?/i);
    if (!on) return [];
    const years = on[3] ? [+on[3]] : [year, year - 1];
    for (const y of years) {
      const a = deadline(`${y}-${MONTHS.indexOf(on[1].toLowerCase()) + 1}-${on[2]} 23:59`, year, zone);
      const paper = a && papers.find(p => p.ms >= a.ms);
      if (paper && paper.ms - a.ms <= 60 * DAY) return [Object.assign(a, { paper })];
    }
    return [];
  }

  function zoneLabel(zone) {
    if (zone === AOE) return 'AoE';
    if (/^(Etc\/)?(UTC|GMT)$/.test(zone)) return 'UTC';
    const m = zone.match(/^Etc\/GMT([+-])(\d+)$/); // the sign is inverted in these names
    if (m) return `UTC${m[1] === '+' ? '−' : '+'}${m[2]}`;
    return zone;
  }

  // one record of the list -> what the page shows, relative to `now`
  function edition(e, now) {
    const year = parseInt(e.year, 10);
    const zone = e.timezone && validZone(e.timezone) ? e.timezone : AOE;
    const days = conferenceDays(e.date, year);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let status;
    if (days) status = days.end < today ? 'over' : days.start <= today ? 'now' : 'upcoming';
    else status = year < today.getFullYear() ? 'over' : 'upcoming';
    const deadlines = (Array.isArray(e.deadline) ? e.deadline : [e.deadline])
      .map(d => deadline(d, year, zone)).filter(Boolean).sort((a, b) => a.ms - b.ms);
    const abstracts = abstractDeadlines([e.comment, e.note].filter(Boolean).join(' '), deadlines, year, zone);
    const next = deadlines.find(d => d.ms > now.getTime()) || null;
    return {
      record: e, year, zone, days, status,
      startsIn: days ? Math.round((days.start - today) / DAY) : null,
      deadlines, abstracts, next,
      nextAbstract: next && abstracts.find(a => a.paper === next) || null,
      when: days ? whenText(e.date, year) : 'Dates not announced yet',
    };
  }

  function whenText(text, year) {
    let s = String(text).replace(/\s*\(tentative\)/i, '').replace(/\s*[-–]\s*/g, '–').trim();
    if (!/\b\d{4}\b/.test(s)) s += `, ${year}`;
    return s + (/tentative|\bor\b/i.test(text) ? ' (tentative)' : '');
  }

  // CONFERENCES with their next edition (or, when none is listed yet, the last one)
  function conferences(list, now) {
    return CONFERENCES.map(conf => {
      const all = editionsOf(conf, list).map(e => edition(e, now)).sort((a, b) => a.year - b.year);
      const coming = all.filter(x => x.status !== 'over');
      return Object.assign({}, conf, {
        found: all.length > 0,
        current: coming[0] || null,
        later: coming.slice(1),
        last: all.length ? all[all.length - 1] : null,
      });
    });
  }

  // time left until ms: "12 days", "5 hours", "less than an hour"
  function timeLeft(ms, now) {
    const t = ms - now, d = Math.floor(t / DAY), h = Math.floor(t / 36e5);
    if (d >= 1) return { n: d, unit: d === 1 ? 'day' : 'days' };
    if (h >= 1) return { n: h, unit: h === 1 ? 'hour' : 'hours' };
    return { n: '<1', unit: 'hour' };
  }

  const core = {
    CONFERENCES, parseList, stripComment, conferenceDays, deadline, abstractDeadlines, zoneLabel,
    edition, conferences, dblpKey, timeLeft,
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = core; return; }

  // ------------------------------------------------------------------ page

  const $ = (sel, el = document) => el.querySelector(sel);
  const app = $('[data-app="conference-dates"]');
  if (!app) return;
  const esc = A.escapeHtml;
  const list = $('[data-list]', app), meta = $('[data-meta]', app), tools = $('[data-tools]', app);
  const state = { records: null, loaded: null, saved: false };

  const dateFmt = { day: 'numeric', month: 'short', year: 'numeric' };
  const fmtDay = d => d.toLocaleDateString('en-GB', dateFmt);
  const fmtLocal = ms => new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  function inDays(n) {
    return n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`;
  }

  // one deadline in the list; `kind` is "Abstract" or "Paper" when the conference has both
  function deadlineItem(d, x, now, kind) {
    const zone = zoneLabel(x.zone), label = kind ? `<span class="kind">${kind}</span> ` : '';
    const when = `${esc(fmtDay(d.date))}, ${esc(d.time)} ${esc(zone)}`;
    if (d.ms <= now) return `<li class="done">${label}${when}</li>`;
    const t = timeLeft(d.ms, now);
    const next = d === x.next || d === x.nextAbstract;
    return `<li${next ? ' class="next"' : ''}>${label}${when}
      · <b>${esc(t.n)} ${t.unit} left</b>
      <span class="hint">(your time: ${esc(fmtLocal(d.ms))})</span></li>`;
  }

  // the big numbers on the right: time left to register the abstract and to submit
  function countdown(x, now) {
    if (!x.next) return '<div class="count"><div class="score closed"><b>—</b><span>submissions <br>closed</span></div></div>';
    const box = (d, what) => {
      if (d.ms <= now) return `<div class="score closed"><b>—</b><span>${what} <br>closed</span></div>`;
      const t = timeLeft(d.ms, now);
      return `<div class="score"><b>${esc(t.n)}</b><span>${t.unit} to <br>${what}</span></div>`;
    };
    return `<div class="count" title="Time left until the next deadline">${x.nextAbstract ? box(x.nextAbstract, 'abstract') : ''}${box(x.next, 'submit')}</div>`;
  }

  function card(c, now) {
    const x = c.current, rank = `<span class="rank">CORE ${esc(c.rank)}</span>`;
    const links = [];
    if (x || c.last) links.push(`<a href="${esc((x || c.last).record.link)}" target="_blank" rel="noopener">Conference website</a>`);
    links.push(`<a href="https://dblp.org/db/conf/${esc(c.dblp)}/index.html" target="_blank" rel="noopener">DBLP</a>`);
    links.push(`<a href="${EDIT}" target="_blank" rel="noopener">Suggest a correction</a>`);

    if (!x) {
      const l = c.last;
      return `<article class="conf waiting" data-rank="${esc(c.rank)}">
        <div class="conf-main">
          <h3 class="pub-title">${esc(c.short)} ${rank}</h3>
          <p class="conf-full">${esc(c.full)}</p>
          <p class="conf-when">Next edition not in the list yet.</p>
          <p class="hint">${l ? `Last listed: ${esc(c.short)} ${l.year}, ${esc(l.when)}${l.record.place ? ', ' + esc(l.record.place) : ''}.` : 'The list has no entry for this conference.'}
            The dates appear here once someone adds them to the community list.</p>
          <p class="paper-links">${links.join('')}</p>
        </div>
      </article>`;
    }

    const e = x.record;
    const both = x.abstracts.length > 0;
    const items = x.deadlines.flatMap(d => [
      ...x.abstracts.filter(a => a.paper === d).map(a => deadlineItem(a, x, now.getTime(), 'Abstract')),
      deadlineItem(d, x, now.getTime(), both ? 'Paper' : ''),
    ]);
    const deadlines = x.deadlines.length
      ? `<ul class="deadlines">${items.join('')}</ul>
         ${x.next ? '' : '<p class="hint">All listed deadlines have passed.</p>'}`
      : '';
    const later = c.later.map(l => `${esc(c.short)} ${l.year}: ${esc(l.when)}${l.record.place ? ', ' + esc(l.record.place) : ''}`);
    return `<article class="conf" data-rank="${esc(c.rank)}">
      <div class="conf-main">
        <h3 class="pub-title"><a href="${esc(e.link)}" target="_blank" rel="noopener">${esc(c.short)} ${x.year}</a> ${rank}</h3>
        <p class="conf-full">${esc(c.full)}</p>
        <p class="conf-when"><b>${esc(x.when)}</b>${e.place ? ' · ' + esc(e.place) : ''}
          · ${x.status === 'now' ? 'happening now' : x.startsIn != null ? 'starts ' + inDays(x.startsIn) : 'dates to be announced'}</p>
        ${deadlines ? `<p class="label">Submission deadlines</p>${deadlines}` : ''}
        ${e.comment ? `<p class="hint">${esc(e.comment)}</p>` : ''}
        ${later.length ? `<p class="hint">Also listed: ${later.join('; ')}.</p>` : ''}
        <p class="paper-links">${links.join('')}</p>
      </div>
      ${countdown(x, now.getTime())}
    </article>`;
  }

  function render() {
    const now = new Date();
    const rank = tools.rank.value, sort = tools.sort.value;
    const all = conferences(state.records, now).filter(c => rank === 'all' || c.rank === rank);
    const key = c => sort === 'deadline'
      ? (c.current && c.current.next ? Math.min(...[c.current.nextAbstract, c.current.next].filter(d => d && d.ms > now).map(d => d.ms)) : Infinity)
      : (c.current ? (c.current.days ? +c.current.days.start : new Date(c.current.year, 11, 31).getTime()) : Infinity);
    const coming = all.filter(c => c.current).sort((a, b) => key(a) - key(b));
    const waiting = all.filter(c => !c.current);
    list.innerHTML = (coming.length ? coming.map(c => card(c, now)).join('') : '<p class="empty">No upcoming editions are listed.</p>') +
      (waiting.length ? `<p class="label waiting-head">Waiting for the next edition</p>${waiting.map(c => card(c, now)).join('')}` : '');
    const open = coming.filter(c => c.current.next).length;
    meta.innerHTML = [
      `${coming.length} upcoming`,
      `${open} open for submissions`,
      state.saved ? `<span class="warn-text">saved copy from ${esc(fmtLocal(state.loaded))}: the list could not be reached</span>`
        : `list read ${esc(fmtLocal(state.loaded))}`,
    ].join(' · ') + `<span data-changed></span>`;
  }

  // when the community list was last changed (GitHub's API; skipped if it does not answer)
  async function lastChanged() {
    try {
      const r = await fetch(COMMITS, { headers: { Accept: 'application/vnd.github+json' } });
      if (!r.ok) return;
      const c = (await r.json())[0];
      const when = c && c.commit && c.commit.committer && c.commit.committer.date;
      const el = $('[data-changed]', meta);
      if (when && el) el.innerHTML = ` · <a href="${HISTORY}" target="_blank" rel="noopener">list last changed ${esc(fmtDay(new Date(when)))}</a>`;
    } catch (e) { /* not needed */ }
  }

  function failed(err) {
    meta.textContent = '';
    list.innerHTML = `<p class="notice">The community list could not be reached (${esc(err.message || err)}).
      Try again later, or see the dates on <a href="${SITE}" target="_blank" rel="noopener">sec-deadlines.github.io</a>.</p>
      <ul class="fallback">${CONFERENCES.map(c => `<li><b>${esc(c.short)}</b> <span class="rank">CORE ${esc(c.rank)}</span>
        ${esc(c.full)} · <a href="https://dblp.org/db/conf/${esc(c.dblp)}/index.html" target="_blank" rel="noopener">DBLP</a></li>`).join('')}</ul>`;
  }

  async function start() {
    try {
      const r = await fetch(DATA, { cache: 'no-cache' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const text = await r.text();
      const records = parseList(text);
      if (!records.length) throw new Error('the list is empty');
      Object.assign(state, { records, loaded: Date.now(), saved: false });
      A.save(SAVED_KEY, { text, at: state.loaded });
      render();
      lastChanged();
    } catch (err) {
      const saved = A.load(SAVED_KEY, null);
      if (saved && saved.text) {
        Object.assign(state, { records: parseList(saved.text), loaded: saved.at, saved: true });
        render();
      } else failed(err);
    }
  }

  tools.addEventListener('input', () => { if (state.records) render(); });
  tools.addEventListener('submit', e => e.preventDefault());
  start();
})(this);

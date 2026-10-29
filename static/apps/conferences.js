// Upcoming Security Conferences and Upcoming ML Conferences: when and where the next
// edition of each conference takes place and how long is left to submit. The dates come
// from community-maintained lists on GitHub, read each time the page opens, so a new
// edition shows up here as soon as someone adds it there:
//   security: Security and Privacy Deadlines, https://sec-deadlines.github.io
//   ml:       CCF Deadlines, https://ccfddl.com (and Hugging Face's AI Deadlines for FAccT)
(function (root) {
  'use strict';
  const A = typeof module !== 'undefined' && module.exports ? require('./common.js') : root.Apps;

  const RAW = 'https://raw.githubusercontent.com/';
  const SOURCES = {
    sec: {
      name: 'Security and Privacy Deadlines', site: 'https://sec-deadlines.github.io',
      repo: 'https://github.com/sec-deadlines/sec-deadlines.github.io',
      file: () => 'sec-deadlines/sec-deadlines.github.io/master/_data/conferences.yml',
      edit: () => 'https://github.com/sec-deadlines/sec-deadlines.github.io/edit/master/_data/conferences.yml',
      commits: 'sec-deadlines/sec-deadlines.github.io/commits?path=_data/conferences.yml&per_page=1',
    },
    ccf: {
      name: 'CCF Deadlines', site: 'https://ccfddl.com',
      repo: 'https://github.com/ccfddl/ccf-deadlines',
      file: p => `ccfddl/ccf-deadlines/main/conference/${p}.yml`,
      edit: p => `https://github.com/ccfddl/ccf-deadlines/edit/main/conference/${p}.yml`,
      commits: 'ccfddl/ccf-deadlines/commits?path=conference&per_page=1',
    },
    hf: {
      name: 'AI Deadlines (Hugging Face)', site: 'https://huggingface.co/spaces/huggingface/ai-deadlines',
      repo: 'https://github.com/huggingface/ai-deadlines',
      file: p => `huggingface/ai-deadlines/main/src/data/conferences/${p}.yml`,
      edit: p => `https://github.com/huggingface/ai-deadlines/edit/main/src/data/conferences/${p}.yml`,
      commits: 'huggingface/ai-deadlines/commits?path=src/data/conferences&per_page=1',
    },
  };

  // [short name, full name, group, DBLP key, source, entry in the source, CORE search term]
  // The rank is not kept here: each card links to a search of the CORE portal, which has
  // the current rank. The search term defaults to the short name without the publisher.
  const conf = rows => rows.map(([short, full, group, dblp, from, key, core]) =>
    ({ short, full, group, dblp, from, key, core: core || short.replace(/^(IEEE\/IFIP|IEEE|ACM) /, '') }));
  const CORE_SOURCE = 'ICORE2026';
  const coreSearch = c => `https://portal.core.edu.au/conf-ranks/?search=${encodeURIComponent(c.core)}&by=all&source=${CORE_SOURCE}&sort=atitle&page=1`;
  const LISTS = {
    security: {
      groups: [['all', 'A* and A'], ['A*', 'A* only'], ['A', 'A only']],
      conferences: conf([
        ['IEEE S&P', 'IEEE Symposium on Security and Privacy', 'A*', 'sp', 'sec', 'S&P (Oakland)'],
        ['ACM CCS', 'ACM Conference on Computer and Communications Security', 'A*', 'ccs', 'sec', 'CCS'],
        ['USENIX Security', 'USENIX Security Symposium', 'A*', 'uss', 'sec', 'USENIX Security'],
        ['IEEE EuroS&P', 'IEEE European Symposium on Security and Privacy', 'A', 'eurosp', 'sec', 'Euro S&P'],
        ['ESORICS', 'European Symposium on Research in Computer Security', 'A', 'esorics', 'sec', 'ESORICS'],
        ['PETS / PoPETs', 'Privacy Enhancing Technologies Symposium', 'A', 'pet', 'sec', 'PETS', 'PETS'],
        ['ACSAC', 'Annual Computer Security Applications Conference', 'A', 'acsac', 'sec', 'ACSAC'],
        ['RAID', 'International Symposium on Research in Attacks, Intrusions and Defenses', 'A', 'raid', 'sec', 'RAID'],
        ['ACM AsiaCCS', 'ACM Asia Conference on Computer and Communications Security', 'A', 'asiaccs', 'sec', 'ASIA CCS'],
        ['IEEE CSF', 'IEEE Computer Security Foundations Symposium', 'A', 'csfw', 'sec', 'CSF'],
        ['SOUPS', 'Symposium on Usable Privacy and Security', 'A', 'soups', 'sec', 'SOUPS'],
        ['IEEE/IFIP DSN', 'International Conference on Dependable Systems and Networks', 'A', 'dsn', 'sec', 'DSN'],
      ]),
    },
    ml: {
      groups: [['all', 'All'], ['ml', 'A*: ML, AI & NLP'], ['theory', 'A*: Theory & Foundations'], ['a', 'A: ML, Theory, Data & NLP']],
      labels: { ml: 'ML, AI & NLP', theory: 'Theory', a: 'ML, Theory, Data & NLP' },
      conferences: conf([
        ['NeurIPS', 'Conference on Neural Information Processing Systems', 'ml', 'nips', 'ccf', 'AI/nips'],
        ['ICML', 'International Conference on Machine Learning', 'ml', 'icml', 'ccf', 'AI/icml'],
        ['ICLR', 'International Conference on Learning Representations', 'ml', 'iclr', 'ccf', 'AI/iclr'],
        ['AAAI', 'AAAI Conference on Artificial Intelligence', 'ml', 'aaai', 'ccf', 'AI/aaai'],
        ['IJCAI', 'International Joint Conference on Artificial Intelligence', 'ml', 'ijcai', 'ccf', 'AI/ijcai'],
        ['ACM KDD', 'ACM SIGKDD Conference on Knowledge Discovery and Data Mining', 'ml', 'kdd', 'ccf', 'DB/sigkdd', 'KDD'],
        ['ACL', 'Annual Meeting of the Association for Computational Linguistics', 'ml', 'acl', 'ccf', 'AI/acl'],
        ['EMNLP', 'Conference on Empirical Methods in Natural Language Processing', 'ml', 'emnlp', 'ccf', 'AI/emnlp'],
        ['STOC', 'ACM Symposium on Theory of Computing', 'theory', 'stoc', 'ccf', 'CT/stoc'],
        ['FOCS', 'IEEE Symposium on Foundations of Computer Science', 'theory', 'focs', 'ccf', 'CT/focs'],
        ['COLT', 'Conference on Learning Theory', 'theory', 'colt', 'ccf', 'AI/colt'],
        ['SODA', 'ACM-SIAM Symposium on Discrete Algorithms', 'theory', 'soda', 'ccf', 'CT/soda'],
        ['AISTATS', 'International Conference on Artificial Intelligence and Statistics', 'a', 'aistats', 'ccf', 'AI/aistats'],
        ['UAI', 'Conference on Uncertainty in Artificial Intelligence', 'a', 'uai', 'ccf', 'AI/uai'],
        ['NAACL', 'Annual Conference of the North American Chapter of the ACL', 'a', 'naacl', 'ccf', 'AI/naacl'],
        ['EACL', 'Conference of the European Chapter of the ACL', 'a', 'eacl', 'ccf', 'AI/eacl'],
        ['COLING', 'International Conference on Computational Linguistics', 'a', 'coling', 'ccf', 'AI/coling'],
        ['ECML-PKDD', 'European Conference on Machine Learning and Principles and Practice of Knowledge Discovery in Databases', 'a', 'pkdd', 'ccf', 'DB/pkdd', 'PKDD'],
        ['ALT', 'International Conference on Algorithmic Learning Theory', 'a', 'alt', 'ccf', 'AI/alt'],
        ['ITCS', 'Innovations in Theoretical Computer Science', 'a', 'innovations', null, null],
        ['ACM FAccT', 'ACM Conference on Fairness, Accountability, and Transparency', 'a', 'fat', 'hf', 'facct'],
        ['CIKM', 'ACM International Conference on Information and Knowledge Management', 'a', 'cikm', 'ccf', 'DB/cikm'],
        ['ICDM', 'IEEE International Conference on Data Mining', 'a', 'icdm', 'ccf', 'DB/icdm'],
      ]),
    },
  };

  const DAY = 864e5;
  const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const AOE = 'Etc/GMT+12'; // Anywhere on Earth (UTC-12), the default of all the lists

  // ------------------------------------------------------------------ YAML

  // The lists are YAML files of nested lists and maps with plain or quoted scalars and
  // inline lists ("tags: [SEC, CONF]"). This reads that much YAML, which is all they use.
  function parseYaml(text) {
    const lines = [];
    for (const raw of String(text).split(/\r?\n/)) {
      const line = stripComment(raw).replace(/\s+$/, '');
      if (line.trim() && !/^(---|\.\.\.)$/.test(line.trim())) lines.push({ ind: line.match(/^ */)[0].length, text: line.trim() });
    }
    let i = 0;

    function block(ind) {
      return lines[i] && /^-(\s|$)/.test(lines[i].text) ? list(ind) : map(ind);
    }
    function list(ind) {
      const out = [];
      while (i < lines.length && lines[i].ind === ind && /^-(\s|$)/.test(lines[i].text)) {
        const rest = lines[i].text.replace(/^-\s*/, '');
        if (!rest) { i++; out.push(i < lines.length && lines[i].ind > ind ? block(lines[i].ind) : null); }
        else if (/^-(\s|$)/.test(rest) || key(rest)) {
          // "- key: value" opens a map (or "- - x" a list) whose first line is on this line
          lines[i] = { ind: ind + lines[i].text.length - rest.length, text: rest };
          out.push(block(lines[i].ind));
        } else { i++; out.push(more(value(rest), ind)); }
      }
      return out;
    }
    function map(ind) {
      const out = {};
      while (i < lines.length && lines[i].ind === ind) {
        const k = key(lines[i].text);
        if (!k) { i++; continue; }
        i++;
        if (k[2] === '' || /^[|>][+-]?$/.test(k[2])) {
          if (/^[|>]/.test(k[2])) { // block scalar
            const parts = [];
            while (i < lines.length && lines[i].ind > ind) parts.push(lines[i++].text);
            out[k[1]] = parts.join(k[2][0] === '|' ? '\n' : ' ');
          } else if (i < lines.length && (lines[i].ind > ind || (lines[i].ind === ind && /^-(\s|$)/.test(lines[i].text)))) {
            out[k[1]] = block(lines[i].ind);
          } else out[k[1]] = null;
        } else out[k[1]] = more(value(k[2]), ind);
      }
      return out;
    }
    // a plain scalar may go on over more indented lines
    function more(v, ind) {
      while (typeof v === 'string' && i < lines.length && lines[i].ind > ind && !key(lines[i].text) && !/^-(\s|$)/.test(lines[i].text)) {
        v += ' ' + lines[i++].text;
      }
      return v;
    }
    return lines.length ? block(lines[0].ind) : null;
  }

  function key(s) {
    if (/^["']/.test(s)) {
      const m = s.match(/^("(?:[^"\\]|\\.)*"|'(?:[^']|'')*')\s*:(?:\s+(.*))?$/);
      return m && [m[0], scalar(m[1]), m[2] == null ? '' : m[2]];
    }
    const m = s.match(/^([^\s:#\[\]{},][^:#]*?)\s*:(?:\s+(.*))?$/);
    return m && [m[0], m[1], m[2] == null ? '' : m[2]];
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
    s = s.trim();
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
    if (s === '~' || s === 'null') return null;
    return s;
  }

  // ------------------------------------------------------------------ dates

  // "May 17-20", "June 30 - July 2", "Dec 7-11", "November 15-19, 2026", "June 2026",
  // "May 9-14 (in-person) and 6-7 (virtual), 2027", "June 16-17 or June 30-July 1 (tentative)"
  // -> {start, end} as local dates (first and last day mentioned); TBA -> null
  function conferenceDays(text, year) {
    const s = String(text || '').split(/\s+or\s+/i)[0];
    const y4 = s.match(/\b(\d{4})\b/);
    const y = y4 ? +y4[1] : +year;
    let month = -1, first = -1, wrap = 0;
    const days = [];
    for (const t of s.replace(/\b\d{4}\b/g, ' ').match(/[A-Za-z]+|\d+/g) || []) {
      if (/^\d+$/.test(t)) { if (month >= 0) days.push(new Date(y + wrap, month, +t)); }
      else if (MONTHS.includes(t.slice(0, 3).toLowerCase())) {
        const m = MONTHS.indexOf(t.slice(0, 3).toLowerCase());
        if (first < 0) first = m; else if (m < month) wrap = 1; // "December 30 - January 2"
        month = m;
      }
    }
    if (month < 0 || !y) return null;
    if (!days.length) return { start: new Date(y, first, 1), end: new Date(y, month + 1, 0) };
    return { start: new Date(Math.min(...days)), end: new Date(Math.max(...days)) };
  }

  // "AoE", "UTC-12", "UTC+0", "UTC-08", "PT", "Etc/GMT+5", "Europe/London" -> a tz name,
  // or minutes ahead of UTC for an offset with minutes ("UTC+5:30")
  function parseZone(s) {
    s = String(s == null ? '' : s).trim();
    if (!s || /^aoe$/i.test(s)) return AOE;
    if (/^(PT|PST|PDT)$/i.test(s)) return 'America/Los_Angeles';
    const m = s.match(/^(?:UTC|GMT)\s*(?:([+-])\s*(\d{1,2})(?::?(\d{2}))?)?$/i);
    if (m) {
      if (!m[1] || (+m[2] === 0 && !+m[3])) return 'UTC';
      if (!+m[3]) return `Etc/GMT${m[1] === '+' ? '-' : '+'}${+m[2]}`; // the sign is inverted in these names
      return (m[1] === '+' ? 1 : -1) * (+m[2] * 60 + +m[3]);
    }
    try { new Intl.DateTimeFormat('en-US', { timeZone: s }); return s; } catch (e) { return AOE; }
  }

  // minutes the zone is ahead of UTC at this instant
  function zoneOffset(ms, zone) {
    if (typeof zone === 'number') return zone;
    const p = {};
    new Intl.DateTimeFormat('en-US', {
      timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
    }).formatToParts(new Date(ms)).forEach(x => { p[x.type] = x.value; });
    return (Date.UTC(+p.year, p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - ms) / 6e4;
  }

  function zoneLabel(zone) {
    const hm = n => `${Math.floor(Math.abs(n) / 60)}${Math.abs(n) % 60 ? ':' + String(Math.abs(n) % 60).padStart(2, '0') : ''}`;
    if (typeof zone === 'number') return `UTC${zone < 0 ? '−' : '+'}${hm(zone)}`;
    if (zone === AOE) return 'AoE';
    if (/^(Etc\/)?(UTC|GMT)$/.test(zone)) return 'UTC';
    const m = zone.match(/^Etc\/GMT([+-])(\d+)$/);
    if (m) return `UTC${m[1] === '+' ? '−' : '+'}${m[2]}`;
    if (zone === 'America/Los_Angeles') return 'Pacific Time';
    return zone;
  }

  // "2026-11-17 23:59" in `zone` -> {ms, date, time}; anything else ("TBD") -> null.
  // onHour: as on sec-deadlines.github.io, a deadline on the hour ("12:00") means one
  // second earlier ("11:59:59").
  function deadline(raw, zone, onHour) {
    const m = String(raw == null ? '' : raw).trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (!m) return null;
    const [y, mo, d] = [+m[1], +m[2], +m[3]];
    const [h, mi, se] = m[4] == null ? [23, 59, 59] : [+m[4], +m[5], +(m[6] || 0)];
    const guess = Date.UTC(y, mo - 1, d, h, mi, se);
    let ms = guess - zoneOffset(guess, zone) * 6e4;
    ms = guess - zoneOffset(ms, zone) * 6e4;
    if (onHour && m[4] != null && mi === 0 && se === 0) ms -= 1000;
    return { ms, date: new Date(y, mo - 1, d), time: `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}` };
  }

  // time left until ms: "12 days", "5 hours", "<1 hour"
  function timeLeft(ms, now) {
    const t = ms - now, d = Math.floor(t / DAY), h = Math.floor(t / 36e5);
    if (d >= 1) return { n: d, unit: d === 1 ? 'day' : 'days' };
    if (h >= 1) return { n: h, unit: h === 1 ? 'hour' : 'hours' };
    return { n: '<1', unit: 'hour' };
  }

  // ------------------------------------------------------------------ the lists

  // Every source becomes the same shape: one record per edition,
  // {year, link, date, place, zone, papers: [{raw, label}], abstracts: [raw], comment, onHour}

  function dblpKey(url) {
    const m = String(url || '').match(/dblp\.org\/db\/conf\/([^/]+)\//);
    return m ? m[1] : '';
  }

  // sec-deadlines: a flat list with one record per conference (its latest edition).
  // Rolling deadlines use "%y" for the conference's year and "%Y" for the year before.
  // Abstract deadlines are only in the comment, as "Abstract registration required
  // (1 week before deadline AoE)" or with a date.
  function fromSec(list, c) {
    return list.filter(e => e.name === c.key || dblpKey(e.dblp) === c.dblp).map(e => {
      const year = parseInt(e.year, 10);
      const raws = (Array.isArray(e.deadline) ? e.deadline : [e.deadline])
        .map(d => String(d).replace('%y', year).replace('%Y', year - 1));
      return {
        year, link: e.link, date: e.date, place: e.place, zone: parseZone(e.timezone),
        papers: raws.map(raw => ({ raw, label: '' })), abstracts: [],
        abstractNote: [e.comment, e.note].filter(Boolean).join(' '),
        comment: e.comment || e.note || '', onHour: true,
      };
    });
  }

  // ccfddl: one file per conference, with all its editions under "confs"
  function fromCcf(data) {
    const d = Array.isArray(data) ? data[0] : data;
    return ((d && d.confs) || []).map(c => ({
      year: parseInt(c.year, 10), link: c.link, date: c.date, place: c.place, zone: parseZone(c.timezone),
      papers: (c.timeline || []).map(t => ({ raw: t.deadline, label: t.comment || '' })),
      abstracts: (c.timeline || []).map(t => t.abstract_deadline).filter(Boolean),
      comment: '', onHour: false,
    }));
  }

  // Hugging Face ai-deadlines: one file per conference, a list of editions; deadlines are
  // either "deadline"/"abstract_deadline" or a list of {type, label, date, timezone}
  function fromHf(data) {
    return (Array.isArray(data) ? data : []).map(e => {
      const zone = parseZone(e.timezone || (e.deadlines && e.deadlines[0] && e.deadlines[0].timezone));
      const items = Array.isArray(e.deadlines) ? e.deadlines : [];
      return {
        year: parseInt(e.year, 10), link: e.link, date: e.date,
        place: e.place || [e.city, e.country].filter(Boolean).join(', '), zone,
        papers: items.length
          ? items.filter(x => x.type === 'submission').map(x => ({ raw: x.date, label: x.label || '' }))
          : [{ raw: e.deadline, label: '' }],
        abstracts: items.length ? items.filter(x => x.type === 'abstract').map(x => x.date) : [e.abstract_deadline].filter(Boolean),
        comment: '', onHour: false,
      };
    });
  }

  function recordsOf(c, files) {
    if (!c.from) return null;
    const data = files[c.from + ':' + (c.from === 'sec' ? '' : c.key)];
    if (data == null) return null;
    return c.from === 'sec' ? fromSec(data, c) : c.from === 'ccf' ? fromCcf(data) : fromHf(data);
  }

  // abstract deadlines written in a comment: "N week(s)/days before" each paper deadline,
  // or a date ("by October 2, 2026", "(May 20 AoE)")
  function abstractsFromNote(text, papers, year, zone) {
    if (!/abstract/i.test(text || '') || !papers.length) return [];
    const iso = d => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    const before = text.match(/\b(\d+|one|two)\s+(week|day)s?\s+before/i);
    if (before) {
      const n = /^\d+$/.test(before[1]) ? +before[1] : before[1].toLowerCase() === 'one' ? 1 : 2;
      const back = n * (/week/i.test(before[2]) ? 7 : 1);
      return papers.map(p => {
        const d = new Date(p.date.getFullYear(), p.date.getMonth(), p.date.getDate() - back);
        return Object.assign(deadline(`${iso(d)} ${p.time}`, zone, true), { paper: p });
      });
    }
    const on = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b(?:,?\s+(\d{4}))?/i);
    if (!on) return [];
    for (const y of on[3] ? [+on[3]] : [year, year - 1]) {
      const a = deadline(`${y}-${MONTHS.indexOf(on[1].toLowerCase()) + 1}-${on[2]} 23:59`, zone, true);
      const paper = a && papers.find(p => p.ms >= a.ms);
      if (paper && paper.ms - a.ms <= 60 * DAY) return [Object.assign(a, { paper })];
    }
    return [];
  }

  // one edition -> what the page shows, relative to `now`
  function edition(r, now) {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const days = conferenceDays(r.date, r.year);
    let status;
    if (days) status = days.end < today ? 'over' : days.start <= today ? 'now' : 'upcoming';
    else status = r.year < today.getFullYear() ? 'over' : 'upcoming';
    const papers = r.papers.map(p => {
      const d = deadline(p.raw, r.zone, r.onHour);
      return d && Object.assign(d, { label: p.label });
    }).filter(Boolean).sort((a, b) => a.ms - b.ms);
    const abstracts = r.abstractNote != null
      ? abstractsFromNote(r.abstractNote, papers, r.year, r.zone)
      : r.abstracts.map(raw => deadline(raw, r.zone, r.onHour)).filter(Boolean)
        .map(a => Object.assign(a, { paper: papers.find(p => p.ms >= a.ms) })).filter(a => a.paper);
    const next = papers.find(d => d.ms > now.getTime()) || null;
    return {
      record: r, year: r.year, zone: r.zone, days, status,
      startsIn: days ? Math.round((days.start - today) / DAY) : null,
      endedAgo: days ? Math.round((today - days.end) / DAY) : null,
      papers, abstracts, next,
      nextAbstract: (next && abstracts.find(a => a.paper === next)) || null,
      pending: r.papers.length > 0 && papers.length < r.papers.length, // "TBD"
      when: days ? whenText(r.date, r.year) : 'Dates not announced yet',
    };
  }

  function whenText(text, year) {
    let s = String(text).replace(/\s*\(tentative\)/i, '').replace(/\s+[-–]\s+/g, '–')
      .replace(/(\d)\s*[-–]\s*(?=\w)/g, '$1–').trim(); // "May 9 - 14", "May 9-June 2", not "in-person"
    if (!/\b\d{4}\b/.test(s)) s += `, ${year}`;
    return s + (/tentative|\bor\b/i.test(text) ? ' (tentative)' : '');
  }

  // each conference with its next edition, any later ones and its latest past one
  function conferences(list, files, now) {
    return list.conferences.map(c => {
      const records = recordsOf(c, files);
      const all = (records || []).map(r => edition(r, now)).sort((a, b) => a.year - b.year);
      const coming = all.filter(x => x.status !== 'over');
      const past = all.filter(x => x.status === 'over');
      return Object.assign({}, c, {
        read: records !== null, found: all.length > 0,
        current: coming[0] || null, later: coming.slice(1), past: past[past.length - 1] || null,
      });
    });
  }

  function filesFor(list) {
    const want = {};
    for (const c of list.conferences) {
      if (!c.from) continue;
      const id = c.from + ':' + (c.from === 'sec' ? '' : c.key);
      want[id] = RAW + SOURCES[c.from].file(c.key);
    }
    return want;
  }

  const core = {
    SOURCES, LISTS, parseYaml, stripComment, conferenceDays, parseZone, zoneLabel, deadline, timeLeft,
    abstractsFromNote, edition, conferences, filesFor, dblpKey, coreSearch,
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = core; return; }

  // ------------------------------------------------------------------ page

  const $ = (sel, el = document) => el.querySelector(sel);
  const app = $('[data-app="conferences"]');
  if (!app) return;
  const LIST = LISTS[app.dataset.list];
  const esc = A.escapeHtml;
  const box = $('[data-list]', app), meta = $('[data-meta]', app), tools = $('[data-tools]', app);
  const SAVED_KEY = 'apps.conferences.' + app.dataset.list;
  const state = { files: null, loaded: null, savedAt: null, reached: 0, changed: '' };

  tools.group.innerHTML = LIST.groups.map(([v, label]) => `<option value="${esc(v)}">${esc(label)}</option>`).join('');

  const fmtDay = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const fmtLocal = ms => new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const inDays = n => n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`;
  const ago = n => n === 0 ? 'today' : n === 1 ? 'yesterday' : `${n} days ago`;
  const dblp = c => `https://dblp.org/db/conf/${encodeURIComponent(c.dblp)}/index.html`;
  const rankLink = c => `<a class="rank" href="${esc(coreSearch(c))}" target="_blank" rel="noopener"
    title="Look up ${esc(c.short)} in the CORE rankings (opens a new tab)">See CORE rank ↗</a>`;

  // one deadline in a card; `kind` is "Abstract" or "Paper" when the edition has both
  function deadlineItem(d, x, now, kind) {
    const label = kind ? `<span class="kind">${kind}</span> ` : '';
    const when = `${esc(fmtDay(d.date))}, ${esc(d.time)} ${esc(zoneLabel(x.zone))}`;
    const note = d.label ? ` <span class="hint">${esc(d.label)}</span>` : '';
    if (d.ms <= now) return `<li class="done">${label}<s>${when}</s>${note}</li>`;
    const t = timeLeft(d.ms, now);
    const next = d === x.next || d === x.nextAbstract;
    return `<li${next ? ' class="next"' : ''}>${label}${when} · <b>${esc(t.n)} ${t.unit} left</b>${note}
      <span class="hint">(your time: ${esc(fmtLocal(d.ms))})</span></li>`;
  }

  // the big numbers on the right
  function countdown(x, now) {
    if (x.status === 'over') {
      return `<div class="count"><div class="score closed"><b>${x.endedAgo == null ? '—' : esc(x.endedAgo)}</b><span>days <br>ago</span></div></div>`;
    }
    if (!x.next) {
      const why = x.pending && !x.papers.some(d => d.ms > now) ? 'deadline <br>not set' : 'submissions <br>closed';
      return `<div class="count"><div class="score closed"><b>—</b><span>${why}</span></div></div>`;
    }
    const one = (d, what) => {
      if (d.ms <= now) return `<div class="score closed"><b>—</b><span>${what} <br>closed</span></div>`;
      const t = timeLeft(d.ms, now);
      return `<div class="score"><b>${esc(t.n)}</b><span>${t.unit} to <br>${what}</span></div>`;
    };
    return `<div class="count" title="Time left until the next deadline">${x.nextAbstract ? one(x.nextAbstract, 'abstract') : ''}${one(x.next, 'submit')}</div>`;
  }

  function links(c, x) {
    const out = [];
    if (x && x.record.link) out.push(`<a href="${esc(x.record.link)}" target="_blank" rel="noopener">Conference website</a>`);
    out.push(`<a href="${dblp(c)}" target="_blank" rel="noopener">DBLP</a>`);
    if (c.from) out.push(`<a href="${esc(SOURCES[c.from].edit(c.key))}" target="_blank" rel="noopener">Suggest a correction</a>`);
    return `<p class="paper-links">${out.join('')}</p>`;
  }

  function heading(c, x) {
    const name = x ? `${esc(c.short)} ${x.year}` : esc(c.short);
    const area = LIST.labels ? ` <span class="area">${esc(LIST.labels[c.group])}</span>` : '';
    return `<h3 class="pub-title">${x && x.record.link ? `<a href="${esc(x.record.link)}" target="_blank" rel="noopener">${name}</a>` : name}
      ${rankLink(c)}${area}</h3>
      <p class="conf-full">${esc(c.full)}</p>`;
  }

  // an edition: upcoming, happening now, or over
  function card(c, x, now) {
    const r = x.record;
    const when = x.status === 'over' ? 'ended ' + ago(x.endedAgo)
      : x.status === 'now' ? 'happening now' : x.startsIn != null ? 'starts ' + inDays(x.startsIn) : 'dates to be announced';
    const both = x.abstracts.length > 0;
    const items = x.papers.flatMap(d => [
      ...x.abstracts.filter(a => a.paper === d).map(a => deadlineItem(a, x, now, 'Abstract')),
      deadlineItem(d, x, now, both ? 'Paper' : ''),
    ]);
    let deadlines = items.length ? `<ul class="deadlines">${items.join('')}</ul>` : '';
    if (x.pending) deadlines += '<p class="hint">A deadline is not announced yet.</p>';
    else if (items.length && !x.next && x.status !== 'over') deadlines += '<p class="hint">All listed deadlines have passed.</p>';
    const later = x.status === 'over' ? [] : c.later.map(l => `${esc(c.short)} ${l.year}: ${esc(l.when)}${l.record.place ? ', ' + esc(l.record.place) : ''}`);
    return `<article class="conf${x.status === 'over' ? ' past' : ''}" data-group="${esc(c.group)}">
      <div class="conf-main">
        ${heading(c, x)}
        <p class="conf-when"><b>${esc(x.when)}</b>${r.place ? ' · ' + esc(r.place) : ''} · ${when}</p>
        ${deadlines ? `<p class="label">Submission deadlines</p>${deadlines}` : ''}
        ${r.comment ? `<p class="hint">${esc(r.comment)}</p>` : ''}
        ${later.length ? `<p class="hint">Also listed: ${later.join('; ')}.</p>` : ''}
        ${links(c, x)}
      </div>
      ${countdown(x, now)}
    </article>`;
  }

  // a conference with no upcoming edition in the list, or none at all
  function waitingCard(c) {
    const l = c.past;
    const why = !c.from ? `None of the community lists this page reads has ${esc(c.short)} yet.`
      : !c.read ? `Its entry in ${esc(SOURCES[c.from].name)} could not be read just now.`
      : `Next edition not in the list yet.`;
    const last = l ? `Last listed: ${esc(c.short)} ${l.year}, ${esc(l.when)}${l.record.place ? ', ' + esc(l.record.place) : ''}.` : '';
    return `<article class="conf waiting" data-group="${esc(c.group)}">
      <div class="conf-main">
        ${heading(c, null)}
        <p class="conf-when">${why}</p>
        ${last || c.from ? `<p class="hint">${last} ${c.from && c.read ? 'The dates appear here once someone adds them to the community list.' : ''}</p>` : ''}
        ${links(c, l)}
      </div>
    </article>`;
  }

  function render() {
    const now = new Date(), t = now.getTime();
    const group = tools.group.value, show = tools.show.value, sort = tools.sort.value;
    const all = conferences(LIST, state.files, now).filter(c => group === 'all' || c.group === group);
    tools.sort.disabled = show === 'past';

    const soonest = c => c.current.next ? Math.min(...[c.current.nextAbstract, c.current.next].filter(d => d && d.ms > t).map(d => d.ms)) : Infinity;
    const starts = c => c.current.days ? +c.current.days.start : new Date(c.current.year, 11, 31).getTime();
    const coming = all.filter(c => c.current).sort((a, b) => sort === 'deadline'
      ? soonest(a) - soonest(b) || starts(a) - starts(b) : starts(a) - starts(b));
    const ended = x => x.days ? +x.days.end : new Date(x.year, 0, 1).getTime();
    const past = all.filter(c => c.past).sort((a, b) => ended(b.past) - ended(a.past));
    const waiting = all.filter(c => !c.current);

    let html = '';
    if (show !== 'past') {
      html += coming.length ? coming.map(c => card(c, c.current, t)).join('') : '<p class="empty">No upcoming editions are listed.</p>';
    }
    if (show === 'upcoming' && waiting.length) {
      html += `<p class="label group-head">Waiting for the next edition</p>${waiting.map(waitingCard).join('')}`;
    }
    if (show !== 'upcoming') {
      if (show === 'all') html += '<p class="label group-head">Past editions</p>';
      html += past.length ? past.map(c => card(c, c.past, t)).join('') : '<p class="empty">No past editions are listed.</p>';
      const none = all.filter(c => !c.found);
      if (none.length) html += `<p class="label group-head">Not in the lists</p>${none.map(waitingCard).join('')}`;
    }
    box.innerHTML = html;

    const open = coming.filter(c => c.current.next).length;
    meta.innerHTML = [
      `${coming.length} upcoming`,
      `${open} open for submissions`,
      !state.reached ? `<span class="warn-text">saved copy from ${esc(fmtLocal(state.loaded))}: the list could not be reached</span>`
        : `read ${esc(fmtLocal(state.loaded))}` +
          (state.savedAt ? ` <span class="warn-text">(some entries from a saved copy of ${esc(fmtLocal(state.savedAt))})</span>` : ''),
    ].join(' · ') + '<span data-changed></span>';
    if (state.changed) $('[data-changed]', meta).innerHTML = state.changed;
  }

  // when each list was last changed (GitHub's API; skipped if it does not answer)
  async function lastChanged() {
    const used = [...new Set(LIST.conferences.map(c => c.from).filter(Boolean))];
    const parts = await Promise.all(used.map(async s => {
      try {
        const r = await fetch('https://api.github.com/repos/' + SOURCES[s].commits, { headers: { Accept: 'application/vnd.github+json' } });
        const c = r.ok && (await r.json())[0];
        const when = c && c.commit && c.commit.committer && c.commit.committer.date;
        return when ? `<a href="${SOURCES[s].repo}/commits" target="_blank" rel="noopener">${used.length > 1 ? esc(SOURCES[s].name) + ' ' : 'list '}changed ${esc(fmtDay(new Date(when)))}</a>` : '';
      } catch (e) { return ''; }
    }));
    const text = parts.filter(Boolean).join(' · ');
    if (!text) return;
    state.changed = ' · ' + text;
    const el = $('[data-changed]', meta);
    if (el) el.innerHTML = state.changed;
  }

  function failed(err) {
    meta.textContent = '';
    const used = [...new Set(LIST.conferences.map(c => c.from).filter(Boolean))].map(s => SOURCES[s]);
    box.innerHTML = `<p class="notice">The community list could not be reached (${esc(err.message || err)}).
      Try again later, or see the dates on ${used.map(s => `<a href="${s.site}" target="_blank" rel="noopener">${esc(s.site.replace(/^https:\/\//, ''))}</a>`).join(' or ')}.</p>
      <ul class="fallback">${LIST.conferences.map(c => `<li><b>${esc(c.short)}</b> ${rankLink(c)}
        ${esc(c.full)} · <a href="${dblp(c)}" target="_blank" rel="noopener">DBLP</a></li>`).join('')}</ul>`;
  }

  async function start() {
    const want = filesFor(LIST), saved = A.load(SAVED_KEY, null) || {}, savedAt = saved.at;
    const ids = Object.keys(want), files = {};
    let reached = 0, usedSaved = false, error = null;
    await Promise.all(ids.map(async id => {
      try {
        const r = await fetch(want[id], { cache: 'no-cache' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const text = await r.text();
        files[id] = parseYaml(text);
        saved[id] = text;
        reached++;
      } catch (err) {
        error = error || err;
        if (saved[id] != null) { files[id] = parseYaml(saved[id]); usedSaved = true; }
      }
    }));
    if (!Object.keys(files).length) { failed(error || new Error('nothing to read')); return; }
    if (reached) { saved.at = Date.now(); A.save(SAVED_KEY, saved); }
    Object.assign(state, { files, loaded: reached ? Date.now() : savedAt, savedAt: usedSaved ? savedAt : null, reached });
    render();
    if (reached) lastChanged();
  }

  tools.addEventListener('input', () => { if (state.files) render(); });
  tools.addEventListener('submit', e => e.preventDefault());
  start();
})(this);

// Citation Download: a browser version of MyBibliography/citationDownload.py.
// For each title it asks DBLP, OpenReview, Crossref, Semantic Scholar, arXiv,
// OpenAlex and the PMLR / NeurIPS proceedings indexes, then builds a BibTeX entry
// in the bibliography's Google-Scholar style with howpublished and comment
// fields, and suggests the topic file. Google Scholar is not asked: it does not
// answer browsers on other sites.
(function (root) {
  'use strict';
  const A = typeof module !== 'undefined' && module.exports ? require('./common.js') : root.Apps;

  const MATCH_OK = 0.90; // normalized-title similarity needed to accept a hit
  const { sim, normTitle } = A;

  // ------------------------------------------------------------------ utils

  function splitName(full) {
    full = String(full || '').trim().replace(/\s+\d{4}$/, ''); // DBLP homonym suffix
    if (full.includes(',')) {
      const i = full.indexOf(',');
      return [full.slice(i + 1).trim(), full.slice(0, i).trim()];
    }
    const parts = full.split(/\s+/).filter(Boolean);
    if (!parts.length) return ['', ''];
    if (parts.length === 1) return ['', parts[0]];
    const particles = new Set(['van', 'von', 'der', 'den', 'de', 'del', 'della', 'di', 'da',
      'dos', 'du', 'la', 'le', 'ter', 'ten']);
    let i = parts.length - 1;
    while (i > 1 && particles.has(parts[i - 1].toLowerCase())) i--;
    return [parts.slice(0, i).join(' '), parts.slice(i).join(' ')];
  }

  // True when names look like 'N. Parmar' (S2 style) rather than full
  const abbreviated = authors => authors.some(([f]) => /^([A-Z]\.\s*)+$/.test(f.trim()));

  function texEscape(s) {
    return String(s).replace(/(?<!\\)&/g, '\\&').replace(/(?<!\\)%/g, '\\%')
      .replace(/(?<!\\)#/g, '\\#').replace(/\s+/g, ' ').trim();
  }

  function yearIn(s) {
    const m = String(s || '').match(/\b(19|20)\d{2}\b/);
    return m ? m[0] : null;
  }

  const ORDINALS = ['', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth',
    'Seventh', 'Eighth', 'Ninth', 'Tenth', 'Eleventh', 'Twelfth',
    'Thirteenth', 'Fourteenth', 'Fifteenth', 'Sixteenth',
    'Seventeenth', 'Eighteenth', 'Nineteenth', 'Twentieth'];

  function nth(n) {
    const suf = n % 100 >= 10 && n % 100 <= 20 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
    return `${n}${suf}`;
  }

  // Python's "a or b or c": first value that is not empty
  const first = (...vals) => vals.find(v => v != null && v !== '' && v !== false && v !== 0) || null;
  const o = x => x || {};

  // ------------------------------------------------------------------ source parsers

  function parseDblp(j, title) {
    const hits = o(o(o(j).result).hits).hit || [];
    const out = [];
    for (const h of hits) {
      const info = h.info || {};
      if (sim(info.title || '', title) < MATCH_OK) continue;
      let authors = o(info.authors).author || [];
      authors = Array.isArray(authors) ? authors : [authors];
      let venue = info.venue || '';
      venue = Array.isArray(venue) ? venue.join(' ') : venue;
      const ee = info.ee == null ? [] : info.ee;
      const type = info.type || '';
      out.push({
        src: 'dblp', title: (info.title || '').replace(/\.+$/, ''),
        authors: authors.map(a => splitName(a.text || '')),
        year: info.year || null, venue,
        volume: info.volume || null, number: info.number || null, pages: info.pages || null,
        conf: type.includes('Conference'),
        preprint: venue === 'CoRR' || type.includes('Informal'),
        doi: info.doi || null,
        urls: Array.isArray(ee) ? ee : [ee],
      });
    }
    return out;
  }

  function parseOpenreview(j, title) {
    const out = [];
    for (const n of o(j).notes || []) {
      const c = n.content || {};
      const g = k => (c[k] && typeof c[k] === 'object' && !Array.isArray(c[k]) ? c[k].value : c[k]);
      const t = g('title') || '';
      if (sim(t, title) < MATCH_OK) continue;
      const venue = g('venue') || '', vid = g('venueid') || '';
      if (/submission|workshop|\/ARR\/|withdrawn|rejected/i.test(`${venue} ${vid}`) || !venue) continue;
      const bib = g('_bibtex') || '';
      const pages = bib.match(/pages\s*=\s*\{([^}]*)\}/);
      const native = !vid.startsWith('dblp.org') && vid !== 'OpenReview.net/Archive';
      const urls = [g('html')].filter(Boolean);
      if (native) urls.push(`https://openreview.net/forum?id=${n.forum}`);
      out.push({
        src: 'openreview', title: t, venue, venueid: vid,
        authors: (g('authors') || []).map(a => splitName(
          a && typeof a === 'object' ? (a.fullname || a.name || '') : a)),
        year: yearIn(vid) || yearIn(venue),
        pages: pages ? pages[1] : null,
        preprint: vid.toUpperCase().includes('CORR') || venue.startsWith('CoRR'),
        native, urls, abstract: g('abstract') || null,
      });
    }
    return out;
  }

  function parseCrossref(j, title) {
    const out = [];
    for (const it of o(o(j).message).items || []) {
      const t = (it.title || [''])[0] || '';
      if (sim(t, title) < MATCH_OK) continue;
      const date = o(it.issued)['date-parts'] || [[null]];
      const y = date && date[0] && date[0][0];
      const doi = it.DOI || '';
      out.push({
        src: 'crossref', title: t,
        authors: (it.author || []).map(a => [a.given || '', a.family != null ? a.family : (a.name || '')]),
        year: y ? String(y) : null,
        container: (it['container-title'] || [''])[0] || '',
        pages: it.page || null, volume: it.volume || null, number: it.issue || null,
        publisher: it.publisher || null,
        conf: it.type === 'proceedings-article',
        preprint: !['proceedings-article', 'journal-article', 'book-chapter'].includes(it.type)
          || doi.startsWith('10.48550'),
        doi: it.DOI || null,
      });
    }
    return out;
  }

  function parseS2(j, title) {
    const data = (o(j).data || [null])[0];
    if (!data || sim(data.title || '', title) < MATCH_OK) return null;
    return {
      src: 's2', title: data.title,
      authors: (data.authors || []).map(a => splitName(a.name)),
      year: data.year ? String(data.year) : null,
      venue: data.venue || '',
      ext: data.externalIds || {},
      abstract: data.abstract || null,
    };
  }

  const ATOM = 'http://www.w3.org/2005/Atom', AX = 'http://arxiv.org/schemas/atom';
  function parseArxiv(xml, title) {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) return null;
    const txt = (el, ns, tag) => { const n = el.getElementsByTagNameNS(ns, tag)[0]; return n ? n.textContent : ''; };
    const clean = s => s.split(/\s+/).join(' ').trim();
    let best = null, bestS = 0;
    for (const e of Array.from(doc.getElementsByTagNameNS(ATOM, 'entry'))) {
      const t = clean(txt(e, ATOM, 'title'));
      const s = sim(t, title);
      if (s >= MATCH_OK && s > bestS) {
        const aid = txt(e, ATOM, 'id').split('/abs/').pop();
        bestS = s;
        best = {
          src: 'arxiv', title: t, id: aid.replace(/v\d+$/, ''),
          authors: Array.from(e.getElementsByTagNameNS(ATOM, 'author')).map(a => splitName(txt(a, ATOM, 'name'))),
          year: txt(e, ATOM, 'published').slice(0, 4),
          abstract: clean(txt(e, ATOM, 'summary')),
          // e.g. "Accepted at NeurIPS 2017" / journal ref: venue hint
          note: clean(`${txt(e, AX, 'journal_ref')} ${txt(e, AX, 'comment')}`),
        };
      }
    }
    return best;
  }

  function parseOpenalex(j, title) {
    for (const w of o(j).results || []) {
      if (sim(w.title || '', title) < MATCH_OK) continue;
      let aid = null;
      for (const loc of w.locations || []) {
        const m = (loc.landing_page_url || '').match(/arxiv\.org\/abs\/([\w.\-/]+?)(v\d+)?$/);
        if (m) { aid = m[1]; break; }
      }
      return { src: 'openalex', title: w.title, arxiv: aid,
               authors: (w.authorships || []).map(a => splitName(a.author.display_name)) };
    }
    return null;
  }

  // PMLR volume numbers (proceedings.mlr.press/v<N>/)
  const PMLR_VOL = {
    icml: { 2013: 28, 2014: 32, 2015: 37, 2016: 48, 2017: 70, 2018: 80, 2019: 97,
            2020: 119, 2021: 139, 2022: 162, 2023: 202, 2024: 235, 2025: 267 },
    aistats: { 2017: 54, 2018: 84, 2019: 89, 2020: 108, 2021: 130, 2022: 151,
               2023: 206, 2024: 238, 2025: 258 },
  };

  function parsePmlr(txt, title) {
    for (const block of txt.split('<div class="paper">').slice(1)) {
      const t = block.match(/<p class="title">([\s\S]*?)<\/p>/);
      if (!t || sim(A.unescapeHtml(t[1]), title) < MATCH_OK) continue;
      const a = block.match(/<span class="authors">([\s\S]*?)<\/span>/);
      const p = block.match(/PMLR \d+:([\d-]+)/);
      const u = block.match(/href="(https:\/\/proceedings\.mlr\.press\/v\d+\/[^"]+\.html)"/);
      return {
        src: 'pmlr', url: u ? u[1] : null, pages: p ? p[1] : null,
        authors: (a ? a[1] : '').replace(/&nbsp;/g, ' ').split(/,\s*/)
          .filter(x => x.trim()).map(x => splitName(A.unescapeHtml(x))),
      };
    }
    return null;
  }

  function parseNeurips(txt, title) {
    for (const [, href, t] of txt.matchAll(/<a title="paper title" href="([^"]+)">([\s\S]*?)<\/a>/g)) {
      if (sim(A.unescapeHtml(t), title) >= MATCH_OK) return { src: 'neurips', url: 'https://papers.nips.cc' + href };
    }
    return null;
  }

  // ------------------------------------------------------------------ Scholar styling

  const KEY_STOP = new Set(['a', 'an', 'the', 'on', 'of', 'in', 'for', 'to', 'and', 'or', 'is',
    'are', 'what', 'how', 'why', 'when', 'where', 'which', 'who',
    'with', 'from', 'by', 'at', 'as', 'into', 'via']);

  function scholarKey(authors, year, title) {
    let last = authors.length ? authors[0][1] : '';
    last = last.normalize('NFKD').replace(/[^\x00-\x7F]/g, '');
    const w0 = last.split(/\s+/).filter(Boolean)[0];
    last = w0 ? w0.toLowerCase().replace(/[^a-z]/g, '') : '';
    const words = normTitle(title).split(' ').filter(w => w && !KEY_STOP.has(w));
    return `${last || 'anon'}${year || ''}${words[0] || ''}`;
  }

  function venueFamily(v) {
    v = String(v || '').toLowerCase();
    for (const [fam, pat] of [
      ['icml', /\bicml\b|international conference on machine learning/],
      ['neurips', /neurips|\bnips\b|neural information processing systems/],
      ['iclr', /\biclr\b|international conference on learning representations/],
      ['aistats', /\baistats\b|artificial intelligence and statistics/],
      ['usenix', /usenix security|\buss\b/],
      ['tmlr', /\btmlr\b|transactions on machine learning research/],
      ['colm', /\bcolm\b|conference on language modeling/],
      ['acl', /\b(acl|emnlp|naacl|eacl|aacl|coling|tacl|findings)\b|computational linguistics/]]) {
      if (pat.test(v)) return fam;
    }
    return null;
  }

  // Scholar's wording for well-known venues -> [entry_type, fields]
  function scholarVenue(fam, year) {
    const y = year && /^\d+$/.test(String(year)) ? parseInt(year, 10) : null;
    if (fam === 'icml') return ['inproceedings', { booktitle: 'International conference on machine learning', organization: 'PMLR' }];
    if (fam === 'neurips') return ['article', Object.assign({ journal: 'Advances in neural information processing systems' }, y ? { volume: String(y - 1987) } : {})];
    if (fam === 'iclr') {
      const n = y ? y - 2012 : 0;
      return ['inproceedings', { booktitle: n > 0 && n < ORDINALS.length
        ? `The ${ORDINALS[n]} International Conference on Learning Representations`
        : 'International Conference on Learning Representations' }];
    }
    if (fam === 'aistats') return ['inproceedings', { booktitle: 'International Conference on Artificial Intelligence and Statistics', organization: 'PMLR' }];
    if (fam === 'usenix') return ['inproceedings', { booktitle: y
      ? `${nth(y - 1991)} USENIX security symposium (USENIX Security ${String(y).slice(2)})`
      : 'USENIX security symposium' }];
    if (fam === 'tmlr') return ['article', { journal: 'Transactions on Machine Learning Research' }];
    if (fam === 'colm') return ['inproceedings', { booktitle: y === 2024 ? 'First Conference on Language Modeling' : 'Conference on Language Modeling' }];
    return [null, {}];
  }

  // Merge source records into a Scholar-style entry description. pmlr / nips are
  // looked up with the venue and year found here, through the lookups callback.
  async function build(title, dblp, orv, cr, s2, ax, oa, lookups) {
    const flags = [];
    const dblpPub = dblp.find(d => !d.preprint) || null;
    const orvPub = orv.find(x => !x.preprint) || null;
    const crPub = cr.find(c => !c.preprint) || null;
    const s2Venue = s2 && s2.venue && !s2.venue.toLowerCase().includes('arxiv') ? s2.venue : '';

    // arXiv's journal-ref / comment ("Accepted at NeurIPS 2017") as a last resort
    const axNote = o(ax).note || '';
    const axVenue = venueFamily(axNote) && !/workshop|under review|submitted/i.test(axNote) ? axNote : '';
    const venue = first(o(dblpPub).venue, o(orvPub).venue, o(crPub).container, s2Venue, axVenue) || '';
    const fam = venueFamily(venue) || venueFamily(o(crPub).container);
    const published = Boolean(dblpPub || orvPub || crPub || s2Venue || axVenue);
    let year = first(o(dblpPub).year, o(orvPub).year, o(crPub).year, !s2Venue ? yearIn(axVenue) : null);
    if (!year) {
      year = first(o(s2).year, o(ax).year);
      if (s2Venue) flags.push(`year ${year} comes from Semantic Scholar and may be the arXiv year; check the ${s2Venue} year`);
    }

    const pmlr = fam in PMLR_VOL ? await lookups.pmlr(title, fam, year) : null;
    const nips = fam === 'neurips' ? await lookups.neurips(title, year) : null;
    if (venue === axVenue && axVenue && !(pmlr || nips)) {
      flags.push(`venue taken from the arXiv comment '${axNote}'; confirm venue, year, and find the official link`);
    }

    // authors: prefer full names
    let authors = [];
    for (const r of [ax, pmlr, oa, crPub, dblpPub, orvPub, s2]) {
      if (r && r.authors && r.authors.length && !abbreviated(r.authors)) { authors = r.authors; break; }
    }
    if (!authors.length && s2 && s2.authors.length) {
      authors = s2.authors;
      flags.push('author first names are abbreviated (only Semantic Scholar had them)');
    }

    // entry type and venue fields
    let [etype, fields] = scholarVenue(fam, year);
    const arxivId = first(o(ax).id, o(o(s2).ext).ArXiv, o(oa).arxiv);
    if (etype == null) {
      if (published && (crPub || dblpPub)) {
        const src = crPub || dblpPub;
        const name = o(crPub).container || venue;
        if (src.conf || o(dblpPub).conf) {
          [etype, fields] = ['inproceedings', { booktitle: name }];
          if (/\bIEEE\b/.test(o(crPub).publisher || '')) fields.organization = 'IEEE';
        } else {
          [etype, fields] = ['article', { journal: name }];
          for (const k of ['volume', 'number']) if (src[k]) fields[k] = src[k];
          if (o(crPub).publisher) fields.publisher = crPub.publisher;
        }
      } else if (published) {
        [etype, fields] = ['inproceedings', { booktitle: venue }];
        flags.push(`venue '${venue}' not confirmed by Crossref/DBLP; check the booktitle`);
      } else if (arxivId) {
        [etype, fields] = ['article', { journal: `arXiv preprint arXiv:${arxivId}` }];
        flags.push('only a preprint record was found: check whether a published version exists; if so, update the venue, year, key and link');
      } else {
        [etype, fields] = ['misc', {}];
        flags.push('no venue found: entry is @misc; fill the venue by hand');
      }
    }

    const pages = first(o(pmlr).pages, o(dblpPub).pages, o(crPub).pages, o(orvPub).pages);
    const journal = fields.journal || '';
    if (pages && (etype === 'inproceedings' || (journal && !journal.includes('arXiv') && fam !== 'neurips'))) {
      fields.pages = pages.replace(/\s*[-–]+\s*/g, '--');
    }

    // howpublished: DOI > official proceedings page > arXiv abs
    let doi = first(o(crPub).doi, o(dblpPub).doi, published ? o(o(s2).ext).DOI : null);
    if (doi && doi.toLowerCase().startsWith('10.48550')) doi = null;
    let official = first(o(pmlr).url, o(nips).url);
    if (!official) {
      for (const u of (o(dblpPub).urls || []).concat(o(orvPub).urls || [])) {
        if (u.includes('arxiv.org')) continue;
        const m = u.match(/^https?:\/\/(dx\.)?doi\.org\/(.+)/);
        if (m) {
          doi = doi || (m[2].startsWith('10.48550') ? null : m[2]);
          continue;
        }
        official = u.replace(/(aclanthology\.org\/[^/]+)\.pdf$/, '$1/');
        break;
      }
    }
    if (!official && s2 && s2.ext.ACL) official = `https://aclanthology.org/${s2.ext.ACL}/`;
    let url;
    if (doi) url = `https://doi.org/${doi}`;
    else if (official) url = official;
    else if (arxivId) {
      url = `https://arxiv.org/abs/${arxivId}`;
      if (published) flags.push(`published at '${venue}' but only an arXiv link was found; find the DOI or official proceedings page`);
    } else {
      url = '';
      flags.push('no link found; fill howpublished by hand');
    }

    if (!authors.length) flags.push('no authors found');
    if (!year) flags.push('no year found');
    const bestTitle = first(o(dblpPub).title, o(orvPub).title, o(crPub).title, o(s2).title,
      o(ax).title, o(oa).title) || title;
    return {
      etype, title: bestTitle, authors, year, fields, url,
      venue: published ? venue : 'arXiv', flags,
      used: [dblpPub, orvPub, crPub, s2, ax, oa, pmlr, nips].filter(Boolean).map(r => r.src),
    };
  }

  function formatAuthors(authors) {
    let names = authors.map(([f, l]) => `${l}, ${f}`.replace(/^[, ]+|[, ]+$/g, ''));
    if (names.length > 10) names = names.slice(0, 10).concat('others'); // Scholar keeps 10
    return names.join(' and ');
  }

  function render(e, key, comment) {
    const f = e.fields;
    const lines = [`    title={${texEscape(e.title)}},`, `    author={${formatAuthors(e.authors)}},`];
    for (const k of ['booktitle', 'journal', 'volume', 'number', 'pages']) {
      if (f[k]) lines.push(`    ${k}={${texEscape(String(f[k]))}},`);
    }
    if (e.year) lines.push(`    year={${e.year}},`);
    for (const k of ['organization', 'publisher']) if (f[k]) lines.push(`    ${k}={${texEscape(f[k])}},`);
    lines.push(`    howpublished = "\\url{${e.url}}",`);
    lines.push(`    comment = {${comment}}`);
    return `@${e.etype}{${key},\n` + lines.join('\n') + '\n}';
  }

  // ------------------------------------------------------------------ topic routing

  const TOPIC_FILES = { nlp: 'NLPPapers.bib', dp: 'CoreDPPapers.bib', other: 'OtherPapers.bib' };

  // Checked in order; the first topic with a hit wins, "nlp" is the default.
  const TOPIC_HINTS = {
    dp: [/differential(ly)? priva/, /\bdp[- ]?sgd\b/, /\brdp\b/, /r[ée]nyi/,
         /privacy accounting/, /privacy amplification/, /gaussian mechanism/,
         /laplace mechanism/, /private (fine-?tuning|training|learning|selection)/,
         /local differential/, /\bpdp\b/, /privacy budget/],
    other: [/knowledge graph/, /\bgraph/, /\bgnn/, /link prediction/,
            /node classification/, /graphrag/, /bootstrap/, /rank(s|ing) method/,
            /multiple test/, /hypothesis test/, /stochastically larger/],
  };

  function guessTopic(...texts) {
    const blob = texts.map(t => t || '').join(' ').toLowerCase();
    for (const [topic, pats] of Object.entries(TOPIC_HINTS)) if (pats.some(p => p.test(blob))) return topic;
    return 'nlp';
  }

  // papers.txt lines: "<title> || <comment>", with list bullets and # comments allowed
  function readInputs(text) {
    const items = [];
    for (let line of text.split(/\r?\n/)) {
      line = line.trim();
      if (!line || line.startsWith('#')) continue;
      const i = line.indexOf('||');
      const t = (i < 0 ? line : line.slice(0, i)).replace(/^\s*(\d+[.)]|[-*])\s+/, '').trim();
      items.push([t, i < 0 ? '' : line.slice(i + 2).trim()]);
    }
    return items;
  }

  // ------------------------------------------------------------------ fetch one

  function fetchers(opts) {
    const s = A.settings();
    const log = opts.log || (() => {});
    const cache = {};
    const json = async (url, src, o2) => { const r = await A.get(url, src, Object.assign({ log }, o2)); return r ? r.json().catch(() => null) : null; };
    const text = async (url, src, o2) => { const r = await A.get(url, src, Object.assign({ log }, o2)); return r ? r.text() : null; };
    const indexPage = async (url, src) => {
      if (!(url in cache)) cache[url] = (await text(url, src, { timeout: 60000 })) || '';
      return cache[url];
    };
    return {
      dblp: async t => parseDblp(await json('https://dblp.org/search/publ/api', 'dblp',
        { params: { q: t, format: 'json', h: 10 }, retries: 2 }), t),
      openreview: async t => parseOpenreview(await json('https://api2.openreview.net/notes/search', 'openreview',
        { params: { term: t, type: 'terms', content: 'all', source: 'forum', limit: 10 } }), t),
      crossref: async t => parseCrossref(await json('https://api.crossref.org/works', 'crossref',
        { params: { 'query.bibliographic': t, rows: 5, mailto: s.mailto,
                    select: 'DOI,title,author,container-title,page,volume,issue,publisher,type,issued' } }), t),
      s2: async t => parseS2(await json('https://api.semanticscholar.org/graph/v1/paper/search/match', 's2',
        { params: { query: t, fields: 'title,year,venue,externalIds,authors,abstract' },
          headers: s.s2key ? { 'x-api-key': s.s2key } : undefined, retries: 4 }), t),
      arxiv: async t => {
        const q = t.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean).join(' ');
        const x = await text('https://export.arxiv.org/api/query', 'arxiv',
          { params: { search_query: `ti:"${q}"`, max_results: 5 }, retries: 3, timeout: 40000 });
        return x ? parseArxiv(x, t) : null;
      },
      openalex: async t => parseOpenalex(await json('https://api.openalex.org/works', 'openalex',
        { params: { search: t, per_page: 5, select: 'title,doi,publication_year,authorships,locations' } }), t),
      pmlr: async (t, conf, year) => {
        const vol = year ? o(PMLR_VOL[conf])[parseInt(year, 10)] : null;
        return vol ? parsePmlr(await indexPage(`https://proceedings.mlr.press/v${vol}/`, 'pmlr'), t) : null;
      },
      neurips: async (t, year) => year
        ? parseNeurips(await indexPage(`https://papers.nips.cc/paper_files/paper/${year}`, 'neurips'), t) : null,
    };
  }

  async function processTitle(title, comment, usedKeys, F) {
    const [dblp, orv, cr] = [await F.dblp(title), await F.openreview(title), await F.crossref(title)];
    const s2 = await F.s2(title), ax = await F.arxiv(title);
    let oa = null;
    if (!ax || !(dblp.length || orv.length || cr.length || s2)) oa = await F.openalex(title);
    if (!(dblp.length || orv.length || cr.length || s2 || ax || oa)) {
      return { entry: null, rep: { query: title, status: 'NOT FOUND',
        flags: ['no source matched this title: check the spelling, or add the entry by hand'] } };
    }
    const e = await build(title, dblp, orv, cr, s2, ax, oa, F);
    const base = scholarKey(e.authors, e.year, e.title);
    let key = base, n = 0;
    while (usedKeys.has(key)) key = base + 'abcdefghijklmnopqrstuvwxyz'[n++];
    usedKeys.add(key);
    const abstract = first(o(s2).abstract, o(ax).abstract, (orv.find(x => x.abstract) || {}).abstract) || '';
    return { e, key, entry: render(e, key, comment), rep: {
      query: title, key, matched_title: e.title, venue: e.venue, year: e.year,
      howpublished: e.url, sources: e.used, abstract: abstract.slice(0, 600),
    } };
  }

  // status + flags of a result, given its current comment
  function review(res) {
    const flags = res.e.flags.slice();
    if (!res.comment) flags.push('comment is empty: write a short note (3-8 words)');
    return { flags, status: flags.length ? 'REVIEW' : 'OK' };
  }

  const core = { splitName, abbreviated, texEscape, scholarKey, venueFamily, scholarVenue, build,
    render, formatAuthors, guessTopic, readInputs, parseDblp, parseOpenreview, parseCrossref,
    parseS2, parseOpenalex, parsePmlr, parseArxiv, parseNeurips, processTitle, TOPIC_FILES };
  if (typeof module !== 'undefined' && module.exports) { module.exports = core; return; }

  // ================================================================== browser UI

  const $ = (sel, el = document) => el.querySelector(sel);
  const app = $('[data-app="citation-download"]');
  if (!app) return;
  const esc = A.escapeHtml;
  const form = $('[data-input]', app);
  const out = $('[data-results]', app);
  const list = $('[data-list]', out);
  const log = A.logger($('[data-log]', app));
  const results = [];   // {query, comment, topic, status, e, key, entry, rep}
  let running = null;

  A.bibPanel($('[data-bib-panel]', app));
  A.settingsPanel($('[data-settings]', app));

  // titles handed over by the Literature Finder (or a #titles= link)
  (function receive() {
    let titles = null;
    const m = location.hash.match(/^#titles=(.*)$/);
    if (m) {
      titles = decodeURIComponent(m[1]).split('\n');
      history.replaceState(null, '', location.pathname);
    } else {
      const h = A.load(A.HANDOFF_KEY, null);
      if (h && Array.isArray(h.titles)) titles = h.titles;
      A.forget(A.HANDOFF_KEY);
    }
    if (titles && titles.length) {
      form.titles.value = titles.join('\n');
      const note = $('[data-handoff]', app);
      note.textContent = `${titles.length} title${titles.length > 1 ? 's' : ''} from the Literature Finder. Add a comment after "||" if you like, then press Fetch BibTeX.`;
      note.hidden = false;
    }
  })();

  $('[data-load-titles]', app).addEventListener('change', async e => {
    const f = e.target.files[0];
    e.target.value = '';
    if (f) form.titles.value = (form.titles.value.trim() ? form.titles.value.trim() + '\n' : '') + await A.readFile(f);
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (running) { running.cancelled = true; return; }
    const items = readInputs(form.titles.value);
    if (!items.length) { alert('Write at least one paper title.'); return; }
    running = { cancelled: false };
    const btn = $('[data-run]', form);
    btn.textContent = 'Stop';
    btn.classList.add('running');
    log.clear();
    A.resetSources();
    const bib = A.bibliography();
    const have = form.skip.checked ? new Set(bib.titles) : new Set();
    const usedKeys = new Set(bib.keys);
    results.forEach(r => r.key && usedKeys.add(r.key));
    const F = fetchers({ log: m => log.line('  ' + m, 'warn') });
    const delay = Math.max(0, +form.sleep.value || 0) * 1000;
    out.hidden = false;

    for (let i = 0; i < items.length && !running.cancelled; i++) {
      const [title, comment] = items[i];
      log.line(`❯ ${title}`, 'cmd');
      if (have.has(normTitle(title))) {
        log.line('  already in your bibliography; skipped');
        results.unshift({ query: title, status: 'SKIPPED', flags: ['already in your bibliography'] });
        draw();
        continue;
      }
      let res;
      try {
        res = await processTitle(title, comment, usedKeys, F);
      } catch (err) {
        res = { entry: null, rep: { query: title, status: 'ERROR', flags: [err.message] } };
      }
      if (!res.entry) {
        results.unshift(Object.assign({ query: title }, res.rep));
        log.line('  ! ' + res.rep.flags[0], 'err');
      } else {
        have.add(normTitle(title));
        const r = Object.assign(res, { query: title, comment });
        r.topic = form.topic.value === 'auto'
          ? guessTopic(r.rep.matched_title, r.rep.venue, r.rep.abstract) : form.topic.value;
        Object.assign(r, review(r));
        results.unshift(r);
        log.line(`  → ${r.key} (${r.e.venue}${r.e.year ? ' ' + r.e.year : ''}) [${r.e.used.join(', ')}] ${TOPIC_FILES[r.topic]}`, r.status === 'OK' ? 'ok' : '');
      }
      draw();
      if (i < items.length - 1) await A.sleep(delay);
    }
    const found = results.filter(r => r.entry).length;
    log.line(`\n${found} entries ready, ${results.filter(r => r.status !== 'OK').length} need a look` +
             (A.DISABLED.size ? `; unavailable this run: ${[...A.DISABLED].sort().join(', ')}` : ''), 'ok');
    btn.textContent = 'Fetch BibTeX';
    btn.classList.remove('running');
    running = null;
  });

  const STATUS = { OK: 'ok', REVIEW: 'review', 'NOT FOUND': 'bad', ERROR: 'bad', SKIPPED: 'skip' };

  function cardHtml(r, i) {
    const head = `<span class="status ${STATUS[r.status]}">${esc(r.status)}</span>`;
    if (!r.entry) {
      return `<article class="cite" data-i="${i}">
        <div class="cite-head">${head}<h3 class="pub-title">${esc(r.query)}</h3></div>
        <ul class="flags">${(r.flags || []).map(f => `<li>${esc(f)}</li>`).join('')}</ul>
        <p class="paper-links"><a href="https://scholar.google.com/scholar?q=${encodeURIComponent(r.query)}" target="_blank" rel="noopener">Search Google Scholar</a>
        <a href="https://dblp.org/search?q=${encodeURIComponent(r.query)}" target="_blank" rel="noopener">Search DBLP</a></p>
      </article>`;
    }
    return `<article class="cite" data-i="${i}">
      <div class="cite-head">${head}
        <h3 class="pub-title">${r.e.url ? `<a href="${esc(r.e.url)}" target="_blank" rel="noopener">${esc(r.e.title)}</a>` : esc(r.e.title)}</h3>
      </div>
      <p class="pub-venue">${esc(r.e.venue)}${r.e.year ? ' · ' + esc(r.e.year) : ''} · <code>${esc(r.key)}</code> · from ${esc(r.e.used.join(', '))}</p>
      ${normTitle(r.query) !== normTitle(r.e.title) ? `<p class="muted small">You asked for: ${esc(r.query)}</p>` : ''}
      <ul class="flags" data-flags${r.flags.length ? '' : ' hidden'}>${r.flags.map(f => `<li>${esc(f)}</li>`).join('')}</ul>
      <div class="cite-controls">
        <label>Comment <input type="text" data-comment value="${esc(r.comment)}" placeholder="3-8 words, e.g. memorization in multilingual LMs"></label>
        <label>File <select data-file>${Object.entries(TOPIC_FILES).map(([k, v]) =>
          `<option value="${k}"${k === r.topic ? ' selected' : ''}>${v}</option>`).join('')}</select></label>
      </div>
      <pre class="bibtex" data-bib>${esc(r.entry)}</pre>
      ${r.rep.abstract ? `<details class="abstract"><summary>Abstract</summary><p>${esc(r.rep.abstract)}${r.rep.abstract.length >= 600 ? '…' : ''}</p></details>` : ''}
      <p class="paper-links">
        <button type="button" data-copy>Copy BibTeX</button>
        ${r.e.url ? `<a href="${esc(r.e.url)}" target="_blank" rel="noopener">Open link</a>` : ''}
        <a href="https://scholar.google.com/scholar?q=${encodeURIComponent(r.e.title)}" target="_blank" rel="noopener">Check on Google Scholar</a>
        <button type="button" data-remove>Remove</button>
      </p>
    </article>`;
  }

  function draw() {
    list.innerHTML = results.map(cardHtml).join('');
    summary();
  }

  function summary() {
    const ok = results.filter(r => r.entry);
    const counts = Object.keys(TOPIC_FILES).map(k => [k, ok.filter(r => r.topic === k).length]);
    $('[data-summary]', out).textContent = `${ok.length} entries · ${ok.filter(r => r.status === 'REVIEW').length} to review · ` +
      `${results.length - ok.length} not fetched`;
    for (const [k, n] of counts) {
      const b = $(`[data-dl="${k}"]`, out);
      b.disabled = !n;
      b.textContent = `${TOPIC_FILES[k]} (${n})`;
    }
    $('[data-dl="all"]', out).disabled = !ok.length;
    $('[data-dl="report"]', out).disabled = !results.length;
  }

  list.addEventListener('input', e => {
    if (!e.target.matches('[data-comment]')) return;
    const art = e.target.closest('.cite'), r = results[+art.dataset.i];
    r.comment = e.target.value.replace(/[{}]/g, '').trim();
    r.entry = render(r.e, r.key, r.comment);
    Object.assign(r, review(r));
    $('[data-bib]', art).textContent = r.entry;
    const st = $('.status', art);
    st.className = `status ${STATUS[r.status]}`;
    st.textContent = r.status;
    const fl = $('[data-flags]', art);
    fl.innerHTML = r.flags.map(f => `<li>${esc(f)}</li>`).join('');
    fl.hidden = !r.flags.length;
    summary();
  });
  list.addEventListener('change', e => {
    if (!e.target.matches('[data-file]')) return;
    results[+e.target.closest('.cite').dataset.i].topic = e.target.value;
    draw();
  });
  list.addEventListener('click', e => {
    const art = e.target.closest('.cite');
    if (!art) return;
    const i = +art.dataset.i;
    if (e.target.matches('[data-copy]')) A.copy(results[i].entry, e.target);
    if (e.target.matches('[data-remove]')) { results.splice(i, 1); draw(); }
  });

  const entriesFor = topic => results.filter(r => r.entry && (!topic || r.topic === topic)).reverse();
  const bibText = rs => rs.map(r => r.entry).join('\n\n') + '\n';

  // The same notes citationDownload.py writes to <topic file>.report.json
  function reportJson() {
    return JSON.stringify(results.slice().reverse().filter(r => r.status !== 'SKIPPED').map(r => r.entry
      ? Object.assign({}, r.rep, { status: r.status, flags: r.flags, topic: r.topic })
      : { query: r.query, status: r.status, flags: r.flags }), null, 2);
  }

  $('[data-downloads]', out).addEventListener('click', e => {
    const k = e.target.dataset.dl;
    if (!k) return;
    if (TOPIC_FILES[k]) A.download(TOPIC_FILES[k].replace('.bib', '_new.bib'), bibText(entriesFor(k)));
    if (k === 'all') A.download('citations.bib', bibText(entriesFor(null)));
    if (k === 'report') A.download('citations.report.json', reportJson(), 'application/json');
    if (k === 'copy') A.copy(bibText(entriesFor(null)), e.target);
    if (k === 'clear' && confirm('Clear all results?')) { results.length = 0; draw(); out.hidden = true; }
  });
})(this);

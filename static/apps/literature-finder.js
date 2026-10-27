// Literature Finder: a browser version of MyBibliography/scrape.py.
// Searches arXiv for recent papers on each topic, scores them by keyword hits in
// title + abstract, drops papers already in the visitor's bibliography, and shows
// the hits in an explorer with filters, expandable abstracts and downloads.
// It also opens the SearchReport.json / SearchReport_*.csv files scrape.py writes.
(function (root) {
  'use strict';
  const A = typeof module !== 'undefined' && module.exports ? require('./common.js') : root.Apps;

  const API = 'https://export.arxiv.org/api/query';
  const ATOM = 'http://www.w3.org/2005/Atom';
  const LM = '("language model" OR "language models" OR LLM OR LLMs)';

  // topic -> [suggested .bib, arXiv queries, relevance keywords]; keep in step with
  // TOPICS in scrape.py
  const TOPICS = {
    memorization: ['NLPPapers.bib',
      [`${LM} AND (memorization OR memorize OR memorized)`,
       `${LM} AND ("training data extraction" OR "extraction attack" OR "data leakage")`,
       'canary AND (exposure OR "secret sharer" OR memorization)'],
      ['memoriz', 'extraction', 'extractable', 'canary', 'canaries', 'exposure',
       'verbatim', 'eidetic', 'leakage', 'pii', 'regurgitat', 'training data']],
    multilingual_privacy: ['NLPPapers.bib',
      [`${LM} AND (multilingual OR cross-lingual OR "low-resource") AND ` +
       '(memorization OR privacy OR leakage OR "membership inference")',
       `${LM} AND (Indic OR Hindi OR Bengali OR Bangla OR "Indian languages") AND ` +
       '(memorization OR privacy OR tokenizer OR tokenization)'],
      ['multilingual', 'cross-lingual', 'low-resource', 'indic', 'hindi', 'bengali',
       'bangla', 'script', 'tokeniz', 'memoriz', 'privacy', 'leakage']],
    membership_inference: ['NLPPapers.bib',
      [`${LM} AND ("membership inference" OR "pretraining data detection" OR ` +
       '"training data detection" OR "data contamination")',
       '"membership inference" AND (attack OR audit) AND (fine-tuning OR LoRA)'],
      ['membership inference', 'min-k', 'zlib', 'reference model', 'calibrat',
       'detection', 'contamination', 'audit', 'shadow model', 'likelihood ratio']],
    dp_finetuning: ['CoreDPPapers.bib',
      [`${LM} AND ("differential privacy" OR "differentially private" OR DP-SGD)`,
       '("differentially private" OR DP-SGD) AND ("public data" OR "gradient subspace" ' +
       'OR projection OR "low-rank" OR LoRA)',
       '("privacy accounting" OR "Renyi differential privacy" OR "privacy amplification")'],
      ['differential', 'differentially private', 'dp-sgd', 'dpsgd', 'clipping',
       'noise', 'public data', 'subspace', 'projection', 'lora', 'accountant',
       'rényi', 'renyi', 'epsilon', 'fine-tun']],
    unlearning: ['NLPPapers.bib',
      [`${LM} AND (unlearning OR "machine unlearning" OR "knowledge removal")`],
      ['unlearn', 'forget', 'removal', 'erasure', 'retain', 'privacy', 'memoriz']],
    kg_llm: ['OtherPapers.bib',
      [`${LM} AND "knowledge graph" AND ("question answering" OR retrieval OR RAG)`,
       `${LM} AND (GraphRAG OR "graph retrieval" OR "graph-augmented")`],
      ['knowledge graph', 'graphrag', 'triple', 'entity', 'relation', 'retrieval',
       'question answering', 'qa', 'grounding', 'hallucinat']],
    legal_nlp: ['NLPPapers.bib',
      [`${LM} AND (legal OR "court judgment" OR "case law" OR judicial)`,
       '(legal OR "court judgments") AND (India OR Indian) AND (NLP OR "language model")'],
      ['legal', 'court', 'judgment', 'judgement', 'case law', 'statute', 'judicial',
       'india', 'lawyer', 'question answering', 'hallucinat', 'sycophan']],
    indic_llm: ['NLPPapers.bib',
      [`${LM} AND (Bangla OR Bengali OR Indic OR "Indian languages") AND ` +
       '(pretraining OR benchmark OR "instruction tuning" OR translation)'],
      ['bangla', 'bengali', 'indic', 'hindi', 'indian language', 'flores',
       'low-resource', 'tokeniz', 'translation', 'benchmark']],
    graph_privacy: ['OtherPapers.bib',
      ['("graph neural network" OR GNN OR "graph data") AND (privacy OR ' +
       '"membership inference" OR "differential privacy" OR "link stealing")'],
      ['graph', 'gnn', 'node', 'edge', 'link', 'privacy', 'membership',
       'differential', 'attack', 'inference']],
  };

  const LABELS = {
    memorization: 'LLM memorization', multilingual_privacy: 'Multilingual privacy',
    membership_inference: 'Membership inference', dp_finetuning: 'DP fine-tuning',
    unlearning: 'Unlearning', kg_llm: 'Knowledge graphs + LLMs', legal_nlp: 'Legal NLP',
    indic_llm: 'Indic / Bangla LLMs', graph_privacy: 'Graph privacy', custom: 'Your query',
  };

  // ------------------------------------------------------------------ search (as scrape.py)

  // Restrict every bare term / phrase to title+abstract ('all' adds comments etc.)
  function toArxivQuery(q) {
    return q.replace(/"[^"]+"|[\w-]+/g, tok =>
      ['AND', 'OR', 'ANDNOT'].includes(tok) ? tok : `(ti:${tok} OR abs:${tok})`);
  }

  // str.count(): non-overlapping occurrences
  function relevance(text, keywords) {
    text = text.toLowerCase();
    let n = 0;
    for (const k of keywords) {
      for (let i = text.indexOf(k); i !== -1; i = text.indexOf(k, i + k.length)) n++;
    }
    return n;
  }

  const ymd = d => d.toISOString().slice(0, 10).replace(/-/g, '');

  function parseArxiv(xml) {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('arXiv sent a page that is not XML');
    const text = (el, tag) => {
      const n = el.getElementsByTagNameNS(ATOM, tag)[0];
      return n ? n.textContent : '';
    };
    return Array.from(doc.getElementsByTagNameNS(ATOM, 'entry')).map(e => {
      const aid = text(e, 'id').split('/abs/').pop();
      return {
        arxiv_id: aid.replace(/v\d+$/, ''),
        title: text(e, 'title').split(/\s+/).join(' ').trim(),
        authors: Array.from(e.getElementsByTagNameNS(ATOM, 'author')).map(a => text(a, 'name')),
        published: text(e, 'published').slice(0, 10),
        abstract: text(e, 'summary').split(/\s+/).join(' ').trim(),
        categories: Array.from(e.getElementsByTagNameNS(ATOM, 'category')).map(c => c.getAttribute('term')),
      };
    });
  }

  // Yield arXiv entries for one query, newest first, from fromDate to today.
  async function* search(query, fromDate, maxResults, ctx) {
    const page = 100, today = new Date();
    const full = `(${toArxivQuery(query)}) AND submittedDate:[${ymd(fromDate)}0000 TO ${ymd(today)}2359]`;
    for (let start = 0; start < maxResults; start += page) {
      if (ctx.cancelled) return;
      const r = await A.get(API, 'arxiv', {
        params: { search_query: full, start, max_results: page,
                  sortBy: 'submittedDate', sortOrder: 'descending' },
        retries: 4, timeout: 60000, log: ctx.log,
      });
      if (!r) return;
      const entries = parseArxiv(await r.text());
      if (!entries.length) return;
      yield* entries;
      if (entries.length < page) return;
      await A.sleep(3000); // arXiv asks for one request every 3 s
    }
  }

  // A paper matching several topics keeps the topic where it scores best
  function addHit(papers, p, topic, bib, score) {
    const old = papers.get(p.arxiv_id);
    if (old && old.relevance >= score) {
      if (!old.topics.includes(topic)) old.topics.push(topic);
      return;
    }
    const topics = (old ? old.topics : []).filter(t => t !== topic).concat(topic);
    papers.set(p.arxiv_id, Object.assign({}, p, { topic, bib, relevance: score, topics }));
  }

  function rankRows(papers, minRel) {
    return papers.filter(p => p.relevance >= minRel)
      .sort((a, b) => b.relevance - a.relevance || (a.published < b.published ? -1 : a.published > b.published ? 1 : 0));
  }

  // ------------------------------------------------------------------ report files

  const absUrl = p => `https://arxiv.org/abs/${p.arxiv_id}`;
  const shortAuthors = p => p.authors.length
    ? p.authors[0] + (p.authors.length > 1 ? ' et al.' : '') : '';

  // Same columns as SearchReport_with_abstract.csv / _without_abstract.csv
  function reportCsv(rows, withAbstract) {
    const cols = ['title', 'authors', 'published', 'topic', 'also_matched', 'suggested_bib',
                  'relevance', 'url'].concat(withAbstract ? ['abstract'] : []);
    return A.toCsv([cols].concat(rows.map(p => [
      p.title, shortAuthors(p), p.published, p.topic,
      p.topics.filter(t => t !== p.topic).join(' '), p.bib, p.relevance, absUrl(p),
    ].concat(withAbstract ? [p.abstract] : []))));
  }

  function titlesTxt(rows, meta) {
    return `# arXiv hits since ${meta.from_date}, relevance >= ${meta.min_relevance}. ` +
      "Delete the ones you don't want, then run:\n" +
      '#   python3 citationDownload.py SearchReport_titles.txt --topic auto\n' +
      rows.map(p => p.title + '\n').join('');
  }

  function reportJson(papers, meta) {
    return JSON.stringify(Object.assign({}, meta, { papers }), null, 1);
  }

  // Read SearchReport.json, or either CSV that scrape.py writes
  function parseReport(text, name) {
    if (/^\s*\{/.test(text)) {
      const j = JSON.parse(text);
      if (!Array.isArray(j.papers)) throw new Error('this JSON file has no "papers" list');
      const papers = j.papers.map(p => Object.assign({ authors: [], categories: [], abstract: '' }, p, {
        topics: p.topics && p.topics.length ? p.topics : [p.topic],
        relevance: +p.relevance || 0,
      }));
      return { meta: Object.assign({}, j, { papers: undefined, source: name }), papers };
    }
    const [head, ...rows] = A.parseCsv(text);
    const col = Object.fromEntries((head || []).map((h, i) => [h.trim(), i]));
    if (col.title == null || col.url == null) throw new Error('expected a SearchReport CSV with title and url columns');
    const papers = rows.map(r => {
      const g = k => (col[k] == null ? '' : r[col[k]] || '');
      const topic = g('topic') || 'custom';
      return {
        arxiv_id: g('url').replace(/^.*\/abs\//, ''), title: g('title'),
        authors: g('authors') ? [g('authors')] : [], published: g('published'),
        abstract: g('abstract'), categories: [], topic, bib: g('suggested_bib'),
        relevance: +g('relevance') || 0,
        topics: [topic].concat(g('also_matched').split(/\s+/).filter(Boolean)),
      };
    });
    const minRel = Math.min(...papers.map(p => p.relevance));
    return { meta: { generator: 'scrape.py', source: name, min_relevance: isFinite(minRel) ? minRel : 0 }, papers };
  }

  const core = { TOPICS, toArxivQuery, relevance, addHit, rankRows, reportCsv, titlesTxt, parseReport };
  if (typeof module !== 'undefined' && module.exports) { module.exports = core; return; }

  // ================================================================== browser UI

  const $ = (sel, el = document) => el.querySelector(sel);
  const app = $('[data-app="literature-finder"]');
  if (!app) return;
  const esc = A.escapeHtml;
  const LAST_KEY = 'apps.literature.last';
  const PAGE = 60;

  const state = { papers: [], meta: null, selected: new Set(), shown: PAGE, topicFilter: new Set() };
  const log = A.logger($('[data-log]', app));
  let ctx = null;

  // ---- search form
  const form = $('[data-search]', app);
  const topicBox = $('[data-topics]', form);
  topicBox.innerHTML = Object.entries(TOPICS).map(([t, [bib, qs]]) => `
    <label class="toggle" title="${esc(qs.join('\n'))}">
      <input type="checkbox" name="topic" value="${t}" checked>
      <span>${esc(LABELS[t])}<small>${esc(bib.replace('.bib', ''))}</small></span>
    </label>`).join('');
  const d0 = new Date(Date.now() - 60 * 864e5);
  form.from.value = d0.toISOString().slice(0, 10);
  form.from.max = new Date().toISOString().slice(0, 10);

  $('[data-all-topics]', form).addEventListener('click', () => {
    const boxes = [...form.querySelectorAll('input[name=topic]')];
    const on = !boxes.every(b => b.checked);
    boxes.forEach(b => { b.checked = on; });
  });

  A.bibPanel($('[data-bib-panel]', app), () => { if (state.papers.length) render(); });
  A.settingsPanel($('[data-settings]', app));

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (ctx) { ctx.cancelled = true; return; }
    const topics = [...form.querySelectorAll('input[name=topic]:checked')].map(b => b.value);
    const custom = form.query.value.trim();
    if (!topics.length && !custom) { alert('Pick at least one topic or write a query.'); return; }
    const fromDate = new Date(form.from.value || d0);
    const maxResults = Math.max(1, +form.max.value || 200);
    const minRel = Math.max(0, +form.minrel.value || 0);

    const jobs = topics.map(t => [t].concat(TOPICS[t]));
    if (custom) {
      const kws = form.keywords.value.trim()
        ? form.keywords.value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
        : (custom.match(/"[^"]+"|[\w-]+/g) || []).map(s => s.replace(/"/g, '').toLowerCase())
            .filter(s => !['and', 'or', 'andnot'].includes(s));
      jobs.push(['custom', form.bib.value, [custom], kws]);
    }

    ctx = { cancelled: false, log: m => log.line('  ' + m, 'warn') };
    const btn = $('[data-run]', form);
    btn.textContent = 'Stop';
    btn.classList.add('running');
    log.clear();
    A.resetSources();
    const known = A.bibliography().titles;
    const papers = new Map();
    let skipped = 0;
    try {
      for (const [topic, bib, queries, keywords] of jobs) {
        let n = 0;
        for (const q of queries) {
          if (ctx.cancelled) break;
          log.line(`❯ ${LABELS[topic]}: ${q}`, 'cmd');
          for await (const p of search(q, fromDate, maxResults, ctx)) {
            n++;
            if (known.has(A.normTitle(p.title))) { skipped++; continue; }
            addHit(papers, p, topic, bib, relevance(p.title + ' ' + p.abstract, keywords));
          }
        }
        log.line(`  ${n} results for ${LABELS[topic]}`);
      }
    } catch (err) {
      log.line(`  stopped: ${err.message}`, 'err');
    }
    const all = [...papers.values()];
    const kept = rankRows(all, minRel).length;
    log.line(`\n${all.length} unique papers, ${kept} with relevance ≥ ${minRel}` +
             (skipped ? `, ${skipped} already in your bibliography` : '') +
             (ctx.cancelled ? ' (stopped early)' : ''), 'ok');
    if (!all.length && A.DISABLED.has('arxiv')) {
      log.line('arXiv could not be reached from this browser. Set a CORS proxy under Settings, or run scrape.py and open its SearchReport.json here.', 'err');
    }
    btn.textContent = 'Search arXiv';
    btn.classList.remove('running');
    ctx = null;
    if (all.length) {
      show(all, {
        generator: 'literature-finder', created: new Date().toISOString(),
        from_date: form.from.value, to_date: new Date().toISOString().slice(0, 10),
        min_relevance: minRel, max_results: maxResults, topics: jobs.map(j => j[0]),
        queries: Object.fromEntries(jobs.map(j => [j[0], j[2]])),
      });
    }
  });

  // ---- open a report
  $('[data-open]', app).addEventListener('change', async e => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const { meta, papers } = parseReport(await A.readFile(f), f.name);
      show(papers, meta);
    } catch (err) {
      alert(`Could not read ${f.name}: ${err.message}`);
    }
  });

  // ---- explorer
  const ex = $('[data-explorer]', app);
  const list = $('[data-list]', ex);
  const tools = $('[data-tools]', ex);

  function show(papers, meta) {
    state.papers = papers;
    state.meta = meta;
    state.selected.clear();
    state.topicFilter.clear();
    state.shown = PAGE;
    tools.minrel.value = meta.min_relevance != null ? meta.min_relevance : 0;
    tools.q.value = '';
    ex.hidden = false;
    A.save(LAST_KEY, { meta, papers });
    render();
    ex.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function filtered() {
    const q = tools.q.value.trim().toLowerCase();
    const minRel = +tools.minrel.value || 0;
    const known = A.bibliography().titles;
    const rows = state.papers.filter(p =>
      p.relevance >= minRel &&
      (!state.topicFilter.size || p.topics.some(t => state.topicFilter.has(t))) &&
      (!tools.hideknown.checked || !known.has(A.normTitle(p.title))) &&
      (!q || (p.title + ' ' + p.authors.join(' ') + ' ' + p.abstract + ' ' + p.arxiv_id).toLowerCase().includes(q)));
    const by = tools.sort.value;
    const cmp = {
      relevance: (a, b) => b.relevance - a.relevance || b.published.localeCompare(a.published),
      newest: (a, b) => b.published.localeCompare(a.published) || b.relevance - a.relevance,
      oldest: (a, b) => a.published.localeCompare(b.published) || b.relevance - a.relevance,
      title: (a, b) => a.title.localeCompare(b.title),
    }[by];
    return rows.sort(cmp);
  }

  // The rows the downloads use: the selection if there is one, otherwise the filtered list
  function scope() {
    const rows = filtered();
    if (!state.selected.size) return { rows, label: `the ${rows.length} papers shown` };
    const sel = state.papers.filter(p => state.selected.has(p.arxiv_id));
    return { rows: rankRows(sel, -Infinity), label: `the ${sel.length} selected papers` };
  }

  function highlight(text, keywords) {
    const ks = keywords.filter(Boolean).sort((a, b) => b.length - a.length)
      .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (!ks.length) return esc(text);
    return text.split(new RegExp(`(${ks.join('|')})`, 'gi'))
      .map((s, i) => (i % 2 ? `<mark>${esc(s)}</mark>` : esc(s))).join('');
  }

  function keywordsFor(p) {
    const custom = state.meta && state.meta.queries && state.meta.queries.custom;
    return p.topics.flatMap(t => (TOPICS[t] ? TOPICS[t][2]
      : t === 'custom' && custom ? (custom[0].match(/"[^"]+"|[\w-]+/g) || [])
        .map(s => s.replace(/"/g, '')).filter(s => !/^(AND|OR|ANDNOT)$/.test(s)) : []));
  }

  function card(p, known) {
    const id = esc(p.arxiv_id);
    const more = p.authors.length > 8 ? ` <span class="muted">+ ${p.authors.length - 8} more</span>` : '';
    const also = p.topics.filter(t => t !== p.topic);
    return `
    <article class="paper${state.selected.has(p.arxiv_id) ? ' picked' : ''}" data-id="${id}">
      <label class="pick" title="Select"><input type="checkbox" data-pick ${state.selected.has(p.arxiv_id) ? 'checked' : ''}><span class="sr">Select</span></label>
      <div class="paper-main">
        <h3 class="pub-title"><a href="${esc(absUrl(p))}" target="_blank" rel="noopener">${esc(p.title)}</a></h3>
        <p class="pub-authors">${esc(p.authors.slice(0, 8).join(', '))}${more}</p>
        <p class="pub-venue">${esc(p.published)} · arXiv:${id}${p.categories.length ? ' · ' + esc(p.categories.slice(0, 4).join(' ')) : ''}</p>
        <p class="paper-tags">
          <button type="button" class="tpc" data-topic="${esc(p.topic)}">${esc(LABELS[p.topic] || p.topic)}</button>
          ${also.map(t => `<button type="button" class="tpc also" data-topic="${esc(t)}">${esc(LABELS[t] || t)}</button>`).join('')}
          ${p.bib ? `<span class="file">→ ${esc(p.bib)}</span>` : ''}
          ${known.has(A.normTitle(p.title)) ? '<span class="have">in your bibliography</span>' : ''}
        </p>
        ${p.abstract ? `<details class="abstract"${tools.expand.checked ? ' open' : ''}>
          <summary>Abstract</summary><p>${highlight(p.abstract, keywordsFor(p))}</p></details>` : ''}
        <p class="paper-links">
          <a href="${esc(absUrl(p))}" target="_blank" rel="noopener">arXiv page</a>
          <a href="https://arxiv.org/pdf/${id}" target="_blank" rel="noopener">PDF</a>
          <a href="https://arxiv.org/html/${id}" target="_blank" rel="noopener">HTML</a>
          <button type="button" data-copy>Copy title</button>
          <button type="button" data-cite>Get BibTeX →</button>
        </p>
      </div>
      <div class="score" title="Relevance: keyword hits in title and abstract"><b>${p.relevance}</b><span>relevance</span></div>
    </article>`;
  }

  function render() {
    const rows = filtered();
    const known = A.bibliography().titles;
    const m = state.meta || {};
    $('[data-meta]', ex).innerHTML = [
      m.source ? `<code>${esc(m.source)}</code>` : (m.generator === 'scrape.py' ? 'scrape.py report' : 'Search in this browser'),
      m.from_date ? `arXiv ${esc(m.from_date)} → ${esc(m.to_date || 'today')}` : '',
      m.created ? `made ${esc(new Date(m.created).toLocaleString())}` : '',
      `${state.papers.length} papers`,
    ].filter(Boolean).join(' · ');

    // topic chips with counts
    const counts = {};
    state.papers.forEach(p => p.topics.forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
    $('[data-topic-filter]', ex).innerHTML = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).map(t =>
      `<button type="button" class="tpc${state.topicFilter.has(t) ? ' on' : ''}" data-topic="${esc(t)}">${esc(LABELS[t] || t)} <small>${counts[t]}</small></button>`).join('');

    $('[data-count]', ex).textContent = `${rows.length} of ${state.papers.length} papers` +
      (state.selected.size ? ` · ${state.selected.size} selected` : '');
    $('[data-scope]', ex).textContent = `Downloads use ${scope().label}.`;
    list.innerHTML = rows.length
      ? rows.slice(0, state.shown).map(p => card(p, known)).join('')
      : '<p class="empty">No papers match these filters.</p>';
    const moreBtn = $('[data-more]', ex);
    moreBtn.hidden = rows.length <= state.shown;
    moreBtn.textContent = `Show ${Math.min(PAGE, rows.length - state.shown)} more`;
  }

  tools.addEventListener('input', () => { state.shown = PAGE; render(); });
  tools.addEventListener('submit', e => e.preventDefault());
  $('[data-more]', ex).addEventListener('click', () => { state.shown += PAGE; render(); });

  ex.addEventListener('click', e => {
    const t = e.target.closest('[data-topic]');
    if (t) {
      const k = t.dataset.topic;
      state.topicFilter.has(k) ? state.topicFilter.delete(k) : state.topicFilter.add(k);
      state.shown = PAGE;
      render();
      return;
    }
    const art = e.target.closest('.paper');
    const p = art && state.papers.find(x => x.arxiv_id === art.dataset.id);
    if (e.target.matches('[data-copy]')) A.copy(p.title, e.target);
    if (e.target.matches('[data-cite]')) sendToCitation([p]);
  });
  ex.addEventListener('change', e => {
    if (!e.target.matches('[data-pick]')) return;
    const art = e.target.closest('.paper');
    e.target.checked ? state.selected.add(art.dataset.id) : state.selected.delete(art.dataset.id);
    art.classList.toggle('picked', e.target.checked);
    $('[data-count]', ex).textContent = `${filtered().length} of ${state.papers.length} papers` +
      (state.selected.size ? ` · ${state.selected.size} selected` : '');
    $('[data-scope]', ex).textContent = `Downloads use ${scope().label}.`;
  });

  $('[data-select-shown]', ex).addEventListener('click', () => {
    filtered().forEach(p => state.selected.add(p.arxiv_id));
    render();
  });
  $('[data-select-none]', ex).addEventListener('click', () => { state.selected.clear(); render(); });

  const stamp = () => new Date().toISOString().slice(0, 10);
  const metaFor = () => Object.assign({ from_date: '?' }, state.meta, { min_relevance: +tools.minrel.value || 0 });
  ex.querySelector('[data-downloads]').addEventListener('click', e => {
    const kind = e.target.dataset.dl;
    if (!kind) return;
    const { rows } = scope();
    if (kind === 'csv') A.download(`SearchReport_with_abstract_${stamp()}.csv`, reportCsv(rows, true), 'text/csv');
    if (kind === 'csv-short') A.download(`SearchReport_without_abstract_${stamp()}.csv`, reportCsv(rows, false), 'text/csv');
    if (kind === 'titles') A.download('SearchReport_titles.txt', titlesTxt(rows, metaFor()));
    if (kind === 'json') A.download(`SearchReport_${stamp()}.json`, reportJson(state.papers, state.meta), 'application/json');
    if (kind === 'cite') sendToCitation(rows);
  });

  function sendToCitation(rows) {
    if (!rows.length) return;
    const url = app.dataset.citationUrl;
    const titles = rows.map(p => p.title);
    if (A.save(A.HANDOFF_KEY, { titles, at: Date.now() })) location.href = url;
    else location.href = url + '#titles=' + encodeURIComponent(titles.join('\n'));
  }

  // reopen the last search
  const last = A.load(LAST_KEY, null);
  if (last && Array.isArray(last.papers) && last.papers.length) {
    state.papers = last.papers;
    state.meta = last.meta;
    tools.minrel.value = last.meta.min_relevance != null ? last.meta.min_relevance : 0;
    ex.hidden = false;
    render();
  }
})(this);

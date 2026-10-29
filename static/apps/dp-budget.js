// DP Budget Calculator: the total privacy cost of running several differentially private
// steps on the same data, under basic and advanced composition and zCDP, and the cost of
// k Gaussian mechanisms (as in DP-SGD without subsampling) by RDP and exactly.
// The maths also loads in Node for tests: const D = require('./dp-budget.js');
(function (root) {
  'use strict';

  const A = typeof module !== 'undefined' && module.exports ? require('./common.js') : root.Apps;

  // ------------------------------------------------------------------ composition

  // steps: [{eps, delta, k}] — each an (eps, delta)-DP mechanism run k times
  function basic(steps) {
    return {
      eps: steps.reduce((s, x) => s + x.k * x.eps, 0),
      delta: steps.reduce((s, x) => s + x.k * x.delta, 0),
    };
  }

  // Advanced composition (Dwork, Rothblum and Vadhan 2010; Dwork and Roth, Thm 3.20), in
  // the form that allows steps with different eps: for any slack d' > 0 the total is
  // (sqrt(2 ln(1/d') Σ k eps²) + Σ k eps (e^eps − 1), Σ k delta + d')
  function advanced(steps, slack) {
    const sq = steps.reduce((s, x) => s + x.k * x.eps * x.eps, 0);
    return {
      eps: Math.sqrt(2 * Math.log(1 / slack) * sq) + steps.reduce((s, x) => s + x.k * x.eps * Math.expm1(x.eps), 0),
      delta: basic(steps).delta + slack,
    };
  }

  // zero-concentrated DP (Bun and Steinke 2016): an eps-DP step is eps²/2-zCDP, rho adds up,
  // and rho-zCDP is (rho + 2 sqrt(rho ln(1/d')), d')-DP. Only for pure steps (delta = 0).
  function zcdp(steps, slack) {
    if (steps.some(x => x.delta > 0)) return null;
    const rho = steps.reduce((s, x) => s + x.k * x.eps * x.eps / 2, 0);
    return { eps: rho + 2 * Math.sqrt(rho * Math.log(1 / slack)), delta: slack, rho };
  }

  // ------------------------------------------------------------------ Gaussian mechanism

  // ln Φ(x) for the standard normal, accurate far into the tails (erfc from W. J. Cody's
  // rational approximations through the continued fraction for x < −5)
  function logPhi(x) {
    if (x > 5) return Math.log1p(-0.5 * erfc(x / Math.SQRT2));
    if (x > -5) return Math.log(0.5 * erfc(-x / Math.SQRT2));
    // Φ(x) = φ(x)/|x| · (1 − 1/x² + 3/x⁴ − …), by Lentz's continued fraction
    const z = -x;
    let f = z, C = z, D = 0;
    for (let n = 1; n < 200; n++) {
      D = z + n * D; D = D === 0 ? 1e-300 : 1 / D;
      C = z + n / C; if (C === 0) C = 1e-300;
      const d = C * D;
      f *= d;
      if (Math.abs(d - 1) < 1e-15) break;
    }
    return -z * z / 2 - 0.5 * Math.log(2 * Math.PI) - Math.log(f);
  }

  // erfc(x), relative error below 1e-15 (Numerical Recipes, 3rd ed., Erf.erfccheb)
  const ERFC_COF = [-1.3026537197817094, 6.4196979235649026e-1, 1.9476473204185836e-2, -9.561514786808631e-3,
    -9.46595344482036e-4, 3.66839497852761e-4, 4.2523324806907e-5, -2.0278578112534e-5, -1.624290004647e-6,
    1.303655835580e-6, 1.5626441722e-8, -8.5238095915e-8, 6.529054439e-9, 5.059343495e-9, -9.91364156e-10,
    -2.27365122e-10, 9.6467911e-11, 2.394038e-12, -6.886027e-12, 8.94487e-13, 3.13092e-13, -1.12708e-13,
    3.81e-16, 7.106e-15, -1.523e-15, -9.4e-17, 1.21e-16, -2.8e-17];
  function erfc(x) {
    if (x < 0) return 2 - erfc(-x);
    const t = 2 / (2 + x), ty = 4 * t - 2;
    let d = 0, dd = 0;
    for (let j = ERFC_COF.length - 1; j > 0; j--) { const tmp = d; d = ty * d - dd + ERFC_COF[j]; dd = tmp; }
    return t * Math.exp(-x * x + 0.5 * (ERFC_COF[0] + ty * d) - dd);
  }

  // k Gaussian mechanisms with noise multiplier sigma (noise sd / L2 sensitivity) together are
  // one Gaussian mechanism with mu = sqrt(k)/sigma (Gaussian DP, Dong, Roth and Su 2019), and
  // exactly (eps, delta)-DP with delta(eps) = Φ(−eps/mu + mu/2) − e^eps Φ(−eps/mu − mu/2)
  // (Balle and Wang 2018)
  function gaussDelta(eps, mu) {
    const a = logPhi(-eps / mu + mu / 2), b = eps + logPhi(-eps / mu - mu / 2);
    return a > b ? Math.exp(a) * -Math.expm1(b - a) : 0;
  }

  // the smallest eps with gaussDelta(eps) <= delta (delta falls as eps grows)
  function gaussExact(sigma, k, delta) {
    const mu = Math.sqrt(k) / sigma;
    if (gaussDelta(0, mu) <= delta) return { eps: 0, mu };
    let lo = 0, hi = 1;
    while (gaussDelta(hi, mu) > delta) { lo = hi; hi *= 2; if (hi > 1e6) return { eps: Infinity, mu }; }
    for (let i = 0; i < 200 && hi - lo > 1e-12 * hi; i++) {
      const mid = (lo + hi) / 2;
      if (gaussDelta(mid, mu) > delta) lo = mid; else hi = mid;
    }
    return { eps: hi, mu };
  }

  // the same by Rényi DP (Mironov 2017): order alpha costs k alpha / (2 sigma²), converted with
  // eps = rdp + ln((alpha−1)/alpha) − (ln delta + ln alpha)/(alpha − 1) (Balle et al. 2020, as
  // in Opacus), at the best alpha
  function gaussRdp(sigma, k, delta) {
    const f = a => k * a / (2 * sigma * sigma) + Math.log((a - 1) / a) - (Math.log(delta) + Math.log(a)) / (a - 1);
    let best = { eps: Infinity, alpha: NaN };
    for (let i = 0; i <= 4000; i++) {
      const a = 1 + Math.pow(10, -3 + i * 7 / 4000); // 1.001 … 10 000 001
      const e = f(a);
      if (e < best.eps) best = { eps: e, alpha: a };
    }
    return { eps: Math.max(0, best.eps), alpha: best.alpha };
  }

  // the noise multiplier that makes k Gaussian steps exactly (eps, delta)-DP
  function sigmaFor(eps, k, delta) {
    let lo = 1e-3, hi = 1;
    while (gaussExact(hi, k, delta).eps > eps) { lo = hi; hi *= 2; if (hi > 1e7) return Infinity; }
    for (let i = 0; i < 100 && hi - lo > 1e-9 * hi; i++) {
      const mid = (lo + hi) / 2;
      if (gaussExact(mid, k, delta).eps > eps) lo = mid; else hi = mid;
    }
    return hi;
  }

  const core = { basic, advanced, zcdp, logPhi, erfc, gaussDelta, gaussExact, gaussRdp, sigmaFor };
  if (typeof module !== 'undefined' && module.exports) { module.exports = core; return; }

  // ------------------------------------------------------------------ page

  const $ = (sel, el = document) => el.querySelector(sel);
  const app = $('[data-app="dp-budget"]');
  if (!app) return;
  const esc = A.escapeHtml;
  const KEY = 'apps.dp-budget';
  const stepsBox = $('[data-steps]', app), form = $('[data-form]', app), out = $('[data-total]', app);
  const gform = $('[data-gauss]', app), gout = $('[data-gauss-out]', app);

  const EXAMPLE = [
    { name: 'Counting query (Laplace)', eps: 0.1, delta: 0, k: 20 },
    { name: 'Histogram release', eps: 0.5, delta: 0, k: 2 },
    { name: 'Gaussian mean', eps: 0.3, delta: 1e-6, k: 5 },
  ];
  const saved = A.load(KEY, null) || {};
  let rows = Array.isArray(saved.rows) && saved.rows.length ? saved.rows : EXAMPLE.map(r => Object.assign({}, r));
  if (saved.slack) form.slack.value = saved.slack;
  for (const n of ['sigma', 'steps', 'delta', 'target']) if (saved[n] != null) gform[n].value = saved[n];

  const num = v => { const x = Number(String(v).trim()); return Number.isFinite(x) ? x : NaN; };
  const sig = (x, n = 4) => !Number.isFinite(x) ? '∞' : x === 0 ? '0' : Math.abs(x) >= 1e-3 && Math.abs(x) < 1e6
    ? String(Number(x.toPrecision(n))) : x.toExponential(n - 1).replace(/\.?0+e/, 'e');

  function store() {
    A.save(KEY, {
      rows, slack: form.slack.value,
      sigma: gform.sigma.value, steps: gform.steps.value, delta: gform.delta.value, target: gform.target.value,
    });
  }

  function drawSteps() {
    stepsBox.innerHTML = rows.map((r, i) => `<div class="dp-step" data-i="${i}">
      <label>Step <input type="text" name="name" value="${esc(r.name)}" placeholder="e.g. Laplace count"></label>
      <label>ε <input type="number" name="eps" value="${esc(r.eps)}" min="0" step="any" required></label>
      <label>δ <input type="number" name="delta" value="${esc(r.delta)}" min="0" max="1" step="any"></label>
      <label>Times <input type="number" name="k" value="${esc(r.k)}" min="1" step="1"></label>
      <button type="button" class="link-btn" data-remove aria-label="Remove step ${i + 1}">remove</button>
    </div>`).join('') || '<p class="empty">No steps: add one below.</p>';
  }

  function total() {
    const slack = num(form.slack.value);
    const steps = rows.map(r => ({ eps: num(r.eps), delta: num(r.delta) || 0, k: Math.round(num(r.k)) }));
    if (!steps.length) { out.innerHTML = ''; return; }
    if (steps.some(s => !(s.eps >= 0) || !(s.delta >= 0 && s.delta < 1) || !(s.k >= 1))) {
      out.innerHTML = '<p class="notice">Each step needs ε ≥ 0, 0 ≤ δ &lt; 1 and Times ≥ 1.</p>';
      return;
    }
    if (!(slack > 0 && slack < 1)) {
      out.innerHTML = '<p class="notice">The slack δ′ must be between 0 and 1, for example 1e-5.</p>';
      return;
    }
    const k = steps.reduce((s, x) => s + x.k, 0);
    const res = [
      ['Basic composition', basic(steps), 'Adds up ε and δ. Always valid, and tight for a few steps.'],
      ['Advanced composition', advanced(steps, slack), `Grows like √k instead of k; adds δ′ = ${sig(slack)} to δ. Better for many small steps.`],
    ];
    const z = zcdp(steps, slack);
    res.push(['zCDP', z, z ? `ρ = ${sig(z.rho)}. Each ε-DP step is ε²/2-zCDP; δ is the slack δ′.`
      : 'Only when every step is pure (δ = 0).']);
    const best = Math.min(...res.filter(r => r[1]).map(r => r[1].eps));
    out.innerHTML = `<p class="small">${steps.length} step${steps.length === 1 ? '' : 's'}, ${k} mechanism${k === 1 ? '' : 's'} run in all.</p>
      <div class="dp-results">${res.map(([name, r, note]) => `<div class="dp-result${r && r.eps === best ? ' best' : ''}${r ? '' : ' na'}">
        <p class="label">${esc(name)}${r && r.eps === best ? ' <span class="best-tag">smallest ε</span>' : ''}</p>
        <p class="dp-num">${r ? `ε = <b>${esc(sig(r.eps))}</b>, δ = <b>${esc(sig(r.delta, 3))}</b>` : '—'}</p>
        <p class="hint">${note}</p></div>`).join('')}</div>`;
  }

  function gauss() {
    const sigma = num(gform.sigma.value), k = Math.round(num(gform.steps.value)), delta = num(gform.delta.value);
    const target = gform.target.value.trim() === '' ? null : num(gform.target.value);
    if (!(sigma > 0) || !(k >= 1) || !(delta > 0 && delta < 1)) {
      gout.innerHTML = '<p class="notice">Enter σ &gt; 0, steps ≥ 1 and 0 &lt; δ &lt; 1.</p>';
      return;
    }
    const ex = gaussExact(sigma, k, delta), rdp = gaussRdp(sigma, k, delta);
    let html = `<div class="dp-results">
      <div class="dp-result best"><p class="label">Exact (Gaussian DP)</p>
        <p class="dp-num">ε = <b>${esc(sig(ex.eps))}</b></p>
        <p class="hint">The ${k} steps together are one Gaussian mechanism with μ = √k/σ = ${esc(sig(ex.mu))}.</p></div>
      <div class="dp-result"><p class="label">Rényi DP</p>
        <p class="dp-num">ε = <b>${esc(sig(rdp.eps))}</b></p>
        <p class="hint">At order α = ${esc(sig(rdp.alpha, 3))}, with the conversion Opacus uses.</p></div>
    </div>`;
    if (target != null) {
      html += target > 0
        ? `<p class="small">For ε = ${esc(sig(target))} at δ = ${esc(sig(delta, 3))} over ${k} steps, use σ ≥ <b>${esc(sig(sigmaFor(target, k, delta)))}</b>.</p>`
        : '<p class="notice">The target ε must be above 0.</p>';
    }
    gout.innerHTML = html + `<p class="hint">For full-batch steps. With minibatch sampling (DP-SGD's sampling rate q &lt; 1) the cost is lower; use an accountant such as Opacus or Google's dp-accounting for that.</p>`;
  }

  stepsBox.addEventListener('input', e => {
    const row = e.target.closest('[data-i]');
    if (!row) return;
    rows[+row.dataset.i][e.target.name] = e.target.value;
    store(); total();
  });
  stepsBox.addEventListener('click', e => {
    const row = e.target.closest('[data-remove]') && e.target.closest('[data-i]');
    if (!row) return;
    rows.splice(+row.dataset.i, 1);
    store(); drawSteps(); total();
  });
  $('[data-add]', app).addEventListener('click', () => {
    rows.push({ name: '', eps: 0.1, delta: 0, k: 1 });
    store(); drawSteps(); total();
    const inputs = stepsBox.querySelectorAll('[name="name"]');
    if (inputs.length) inputs[inputs.length - 1].focus();
  });
  $('[data-example]', app).addEventListener('click', () => {
    rows = EXAMPLE.map(r => Object.assign({}, r));
    store(); drawSteps(); total();
  });
  form.addEventListener('input', e => { if (e.target.name === 'slack') { store(); total(); } });
  form.addEventListener('submit', e => e.preventDefault());
  gform.addEventListener('input', () => { store(); gauss(); });
  gform.addEventListener('submit', e => e.preventDefault());

  drawSteps(); total(); gauss();
})(this);

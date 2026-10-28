// A viewer like a PDF reader: one slide (page) at a time, a sidebar with
// page thumbnails and the outline, a page box and full screen.
// Elements with data-s="n" appear at step n of their slide, like \pause in
// Beamer. Slides with data-section start a section of the outline.
// The address keeps the page (#12).
(function () {
  var frames = Array.prototype.slice.call(document.querySelectorAll('.deck > .frame'));
  if (!frames.length) return;
  var $ = function (sel) { return document.querySelector(sel); };
  var prevButton = $('[data-go="prev"]'), nextButton = $('[data-go="next"]');
  var sideButton = $('[data-go="side"]'), fullButton = $('[data-go="full"]');
  var pageInput = $('.page input'), side = $('#side');
  var current = 0, step = 1, thumbs = [], outlineLinks = [];

  pageInput.max = frames.length;
  $('[data-total]').textContent = '/ ' + frames.length;

  function steps(frame) {
    var n = +frame.getAttribute('data-steps') || 1;
    frame.querySelectorAll('[data-s]').forEach(function (el) { n = Math.max(n, +el.getAttribute('data-s')); });
    return n;
  }

  function titleOf(frame) {
    var el = frame.querySelector('.ft, .huge, .title');
    return el ? el.textContent.trim() : '';
  }

  function show(i, s) {
    current = Math.max(0, Math.min(frames.length - 1, i));
    var frame = frames[current];
    step = s === 'last' ? steps(frame) : Math.max(1, Math.min(steps(frame), s));
    frames.forEach(function (f, k) { f.classList.toggle('on', k === current); });
    frame.querySelectorAll('[data-s]').forEach(function (el) {
      el.classList.toggle('later', +el.getAttribute('data-s') > step);
    });
    prevButton.disabled = current === 0 && step === 1;
    nextButton.disabled = current === frames.length - 1 && step === steps(frame);
    if (document.activeElement !== pageInput) pageInput.value = current + 1;
    thumbs.forEach(function (t, k) {
      t.classList.toggle('on', k === current);
      if (k === current) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    });
    if (!side.hidden && thumbs[current]) thumbs[current].scrollIntoView({ block: 'nearest' });
    outlineLinks.forEach(function (link) {
      link.el.classList.toggle('on', link.from <= current && current <= link.to);
    });
    history.replaceState(null, '', '#' + (current + 1));
  }

  function next() {
    if (step < steps(frames[current])) show(current, step + 1);
    else if (current < frames.length - 1) show(current + 1, 1);
  }
  function prev() {
    if (step > 1) show(current, step - 1);
    else if (current > 0) show(current - 1, 'last');
  }

  // Pages: a small copy of every slide, as it looks after its last step.
  var thumbPanel = $('#thumbs');
  frames.forEach(function (frame, k) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'thumb';
    button.setAttribute('aria-label', 'Page ' + (k + 1) + (titleOf(frame) ? ': ' + titleOf(frame) : ''));
    var mini = document.createElement('div');
    mini.className = 'mini';
    mini.setAttribute('aria-hidden', 'true');
    var copy = frame.cloneNode(true);
    copy.classList.remove('on');
    copy.querySelectorAll('img').forEach(function (img) { img.loading = 'lazy'; img.alt = ''; });
    mini.appendChild(copy);
    var n = document.createElement('span');
    n.className = 'n';
    n.textContent = k + 1;
    button.appendChild(mini);
    button.appendChild(n);
    button.addEventListener('click', function () { show(k, 1); closeIfOverlay(); });
    thumbPanel.appendChild(button);
    thumbs.push(button);
  });

  // Outline: the sections, as in the PDF's bookmarks; each opens to its pages.
  var outline = $('.outline');
  var starts = frames.map(function (f, k) { return f.hasAttribute('data-section') ? k : -1; }).filter(function (k) { return k >= 0; });
  starts.forEach(function (from, j) {
    var to = j + 1 < starts.length ? starts[j + 1] - 1 : frames.length - 1;
    var li = document.createElement('li');
    var row = document.createElement('div');
    row.className = 'row';
    var twist = document.createElement('button');
    twist.type = 'button';
    twist.className = 'tw';
    twist.setAttribute('aria-expanded', 'false');
    twist.setAttribute('aria-label', 'Show pages');
    twist.textContent = '▸';
    row.appendChild(twist);
    row.appendChild(link(frames[from].getAttribute('data-section'), from, to));
    li.appendChild(row);
    var sub = document.createElement('ul');
    sub.hidden = true;
    for (var k = from; k <= to; k++) {
      var item = document.createElement('li');
      item.appendChild(link(titleOf(frames[k]) || 'Page ' + (k + 1), k, k));
      sub.appendChild(item);
    }
    li.appendChild(sub);
    twist.addEventListener('click', function () {
      sub.hidden = !sub.hidden;
      twist.textContent = sub.hidden ? '▸' : '▾';
      twist.setAttribute('aria-expanded', String(!sub.hidden));
    });
    outline.appendChild(li);
  });

  function link(text, from, to) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'go';
    var pg = document.createElement('span');
    pg.className = 'pg';
    pg.textContent = from + 1;
    button.appendChild(pg);
    button.appendChild(document.createTextNode(text));
    button.addEventListener('click', function () { show(from, 1); closeIfOverlay(); });
    outlineLinks.push({ el: button, from: from, to: to });
    return button;
  }

  // Tabs
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tabs [role="tab"]'));
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      if (tab.id === 'tab-thumbs' && thumbs[current]) thumbs[current].scrollIntoView({ block: 'nearest' });
    });
  });

  // Sidebar: open beside the slide on wide screens, over it on small ones.
  var small = window.matchMedia('(max-width: 700px)');
  function setSide(open) {
    side.hidden = !open;
    sideButton.setAttribute('aria-pressed', String(open));
    if (open && thumbs[current]) thumbs[current].scrollIntoView({ block: 'nearest' });
  }
  function closeIfOverlay() { if (small.matches) setSide(false); }
  sideButton.addEventListener('click', function () { setSide(side.hidden); });
  setSide(!small.matches);

  // Page box
  pageInput.addEventListener('change', function () {
    var n = parseInt(pageInput.value, 10);
    if (n >= 1 && n <= frames.length) show(n - 1, 1);
    else pageInput.value = current + 1;
  });
  pageInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { pageInput.dispatchEvent(new Event('change')); pageInput.blur(); }
  });
  pageInput.addEventListener('focus', function () { pageInput.select(); });
  pageInput.addEventListener('blur', function () { pageInput.value = current + 1; });

  // Full screen: only the slide; a click goes to the next step.
  var root = document.documentElement;
  if (!root.requestFullscreen) fullButton.hidden = true;
  function toggleFull() {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (root.requestFullscreen) root.requestFullscreen();
  }
  fullButton.addEventListener('click', toggleFull);
  document.addEventListener('fullscreenchange', function () {
    root.classList.toggle('fs', !!document.fullscreenElement);
  });
  $('.deck').addEventListener('click', function (e) {
    if (document.fullscreenElement && !e.target.closest('a')) next();
  });

  prevButton.addEventListener('click', prev);
  nextButton.addEventListener('click', next);

  document.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey || e.target === pageInput) return;
    var key = e.key;
    if (key === 'ArrowRight' || key === 'ArrowDown' || key === 'PageDown' || key === ' ' || key === 'n') next();
    else if (key === 'ArrowLeft' || key === 'ArrowUp' || key === 'PageUp' || key === 'p') prev();
    else if (key === 'Home') show(0, 1);
    else if (key === 'End') show(frames.length - 1, 'last');
    else if (key === 'f') toggleFull();
    else return;
    e.preventDefault();
  });

  var touchX = null;
  $('.deck').addEventListener('touchstart', function (e) { touchX = e.touches.length === 1 ? e.touches[0].clientX : null; }, { passive: true });
  $('.deck').addEventListener('touchend', function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
    touchX = null;
  });

  show((parseInt(location.hash.slice(1), 10) || 1) - 1, 1);
})();

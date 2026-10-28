// One slide at a time. Elements with data-s="n" appear at step n of
// their slide, like \pause in Beamer. The address keeps the slide (#12).
(function () {
  var frames = Array.prototype.slice.call(document.querySelectorAll('.deck .frame'));
  if (!frames.length) return;
  var prevButton = document.querySelector('[data-go="prev"]');
  var nextButton = document.querySelector('[data-go="next"]');
  var current = 0, step = 1;

  function steps(frame) {
    var n = +frame.getAttribute('data-steps') || 1;
    frame.querySelectorAll('[data-s]').forEach(function (el) { n = Math.max(n, +el.getAttribute('data-s')); });
    return n;
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

  prevButton.addEventListener('click', prev);
  nextButton.addEventListener('click', next);

  document.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var key = e.key;
    if (key === 'ArrowRight' || key === 'ArrowDown' || key === 'PageDown' || key === ' ' || key === 'n') next();
    else if (key === 'ArrowLeft' || key === 'ArrowUp' || key === 'PageUp' || key === 'p') prev();
    else if (key === 'Home') show(0, 1);
    else if (key === 'End') show(frames.length - 1, 'last');
    else return;
    e.preventDefault();
  });

  var touchX = null;
  document.addEventListener('touchstart', function (e) { touchX = e.touches.length === 1 ? e.touches[0].clientX : null; }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
    touchX = null;
  });

  show((parseInt(location.hash.slice(1), 10) || 1) - 1, 1);
})();

// Blueprint ⇄ Polished seam for the homepage hero.
(() => {
  const stage = document.querySelector('[data-stage]');
  if (!stage) return;
  const canvas = stage.querySelector('.stage__canvas');
  const handle = stage.querySelector('.seam__handle');
  const snaps = document.querySelectorAll('[data-snap]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let split = 50;

  function setSplit(value, { animate = false } = {}) {
    split = Math.max(0, Math.min(100, Math.round(value)));
    stage.classList.toggle('is-animating', animate && !reduceMotion);
    stage.style.setProperty('--split', split);
    handle.setAttribute('aria-valuenow', String(split));
    handle.setAttribute('aria-valuetext',
      split >= 100 ? 'All blueprint' : split <= 0 ? 'All finished design' : `${split}% blueprint`);
    snaps.forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.snap) === split)));
  }

  // Scale the fixed 1280×620 composition to the stage width.
  function fit() {
    canvas.style.setProperty('--scale', stage.clientWidth / 1280);
  }
  new ResizeObserver(fit).observe(stage);
  fit();

  // Drag anywhere on the stage.
  function fromPointer(e) {
    const r = stage.getBoundingClientRect();
    setSplit(((e.clientX - r.left) / r.width) * 100);
  }
  let dragging = false;
  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    dragging = true;
    stage.setPointerCapture(e.pointerId);
    fromPointer(e);
  });
  stage.addEventListener('pointermove', (e) => { if (dragging) fromPointer(e); });
  const stop = () => { dragging = false; };
  stage.addEventListener('pointerup', stop);
  stage.addEventListener('pointercancel', stop);

  // Keyboard on the handle (role="slider").
  handle.addEventListener('keydown', (e) => {
    const steps = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5, PageDown: -20, PageUp: 20 };
    if (e.key in steps) { e.preventDefault(); setSplit(split + steps[e.key]); }
    else if (e.key === 'Home') { e.preventDefault(); setSplit(0); }
    else if (e.key === 'End') { e.preventDefault(); setSplit(100); }
  });

  snaps.forEach((b) => b.addEventListener('click', () => setSplit(Number(b.dataset.snap), { animate: true })));

  // A one-time sweep so visitors notice the seam can move.
  setSplit(88);
  const io = new IntersectionObserver((entries) => {
    if (entries.some((en) => en.isIntersecting)) {
      io.disconnect();
      requestAnimationFrame(() => setSplit(50, { animate: true }));
    }
  }, { threshold: 0.4 });
  if (reduceMotion) setSplit(50); else io.observe(stage);
})();

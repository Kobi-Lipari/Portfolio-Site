// Site-wide extras, loaded on every page:
//   - Blueprint mode (B): the page switches to its own build drawing, with
//     sizes, type and spacing labelled, and hover-to-inspect on anything.
//   - Command palette (Ctrl/⌘ K): jump to any project or section, copy the
//     email address, flip the theme or blueprint mode.
//   - Theme toggle: light / dark, remembered per browser.
(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const index = JSON.parse(document.getElementById('site-index')?.textContent || '{"items":[]}');

  const isTyping = (el) =>
    el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

  // Local storage can throw (private windows, blocked site data); the site
  // works the same without it, it just won't remember the choice.
  const store = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* not remembered */ } },
  };

  // ── Theme ─────────────────────────────────────────────────────────
  // The initial theme is set by a one-line script in <head> before the
  // stylesheet loads, so there is no flash of the wrong theme.
  const themeButton = document.querySelector('[data-theme-toggle]');
  function currentTheme() { return root.dataset.theme === 'dark' ? 'dark' : 'light'; }
  function setTheme(theme) {
    root.dataset.theme = theme;
    store.set('theme', theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#111418' : '#F3EEE6');
    if (themeButton) {
      themeButton.setAttribute('aria-pressed', String(theme === 'dark'));
      themeButton.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    }
  }
  const toggleTheme = () => setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  themeButton?.addEventListener('click', toggleTheme);
  if (themeButton) setTheme(currentTheme());

  // ── Blueprint mode ────────────────────────────────────────────────
  const bpButton = document.querySelector('[data-bp-toggle]');
  let overlay = null;
  let inspectBox = null;
  let inspectTip = null;
  let toast = null;
  let relayoutTimer = 0;

  // What gets a permanent label. Hover-inspect covers everything else.
  const LABELLED = [
    '.nav', '.hero h1', '.hero__pitch', '.hero__photo', '.dash-frame', '.proof', '.cards', '.rows',
    '.card', '.about h2', '.about__photo', '.about dl', '.footer__cta', '.rail', '.process__list',
    '.proj h1', '.proj__outcome', '.meta', '.showcase .browser', '.phone-frame', '.demo', '.sqlpad',
    '.pipeline', '.sections .section', '.pager',
  ];

  const px = (v) => Math.round(parseFloat(v));
  const hex = (rgb) => {
    const m = rgb.match(/\d+(\.\d+)?/g);
    if (!m) return rgb;
    const [r, g, b, a] = m.map(Number);
    if (a === 0) return 'transparent';
    return '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase();
  };
  const fontName = (family) => family.split(',')[0].replace(/["']/g, '').trim();

  function describe(el, { full = false } = {}) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const cls = [...el.classList].filter((c) => !c.startsWith('is-'))[0];
    const name = el.tagName.toLowerCase() + (cls ? '.' + cls : '');
    const parts = [name, `${Math.round(r.width)} × ${Math.round(r.height)}`];
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (hasText || /^H[1-6]$|^P$/.test(el.tagName)) {
      parts.push(`${fontName(cs.fontFamily)} ${px(cs.fontSize)}/${px(cs.lineHeight) || 'normal'}`);
    }
    if (full) {
      const pad = [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(px);
      if (pad.some(Boolean)) parts.push(`padding ${[...new Set(pad)].length === 1 ? pad[0] : pad.join(' ')}`);
      if (px(cs.borderRadius)) parts.push(`radius ${px(cs.borderRadius)}`);
      parts.push(`color ${hex(cs.color)}`);
      const bg = hex(cs.backgroundColor);
      if (bg !== 'transparent') parts.push(`bg ${bg}`);
    }
    return parts.join(' · ');
  }

  function docRect(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height };
  }

  function drawOverlay() {
    if (!overlay) return;
    overlay.replaceChildren();
    overlay.style.height = `${document.documentElement.scrollHeight}px`;

    // Page margins: where the gutter ends on each side.
    const gutter = parseFloat(getComputedStyle(document.querySelector('.nav') || document.body).paddingLeft) || 0;
    const width = document.documentElement.clientWidth;
    for (const x of [gutter, width - gutter]) {
      const line = document.createElement('div');
      line.className = 'bp-guide';
      line.style.left = `${x}px`;
      overlay.append(line);
    }
    const g = document.createElement('div');
    g.className = 'bp-label bp-label--guide';
    g.textContent = `gutter ${Math.round(gutter)}px`;
    g.style.left = `${gutter + 6}px`;
    g.style.top = `${window.scrollY + 90}px`;
    overlay.append(g);

    // Labels on the main blocks. First match per selector only for the
    // repeated ones, so the page stays readable.
    const seen = new Set();
    for (const selector of LABELLED) {
      const matches = [...document.querySelectorAll(selector)];
      const pick = selector === '.sections .section' ? matches.slice(0, 2) : matches.slice(0, 1);
      for (const el of pick) {
        if (seen.has(el) || !el.offsetParent) continue;
        seen.add(el);
        const r = docRect(el);
        if (r.w < 40 || r.h < 16) continue;
        const box = document.createElement('div');
        box.className = 'bp-box-outline';
        Object.assign(box.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
        const label = document.createElement('div');
        label.className = 'bp-label';
        label.textContent = describe(el);
        label.style.left = `${r.x}px`;
        label.style.top = `${Math.max(r.y - 22, 0)}px`;
        overlay.append(box, label);
      }
    }

    // Vertical spacing between the page's top-level blocks, drawn in the
    // left margin like dimension lines on a drawing.
    const blocks = [...document.querySelectorAll('body > header, main > *, body > footer')]
      .filter((el) => el.offsetParent && !el.classList.contains('skip'))
      .map((el) => docRect(el))
      .sort((a, b) => a.y - b.y);
    for (let i = 1; i < blocks.length; i++) {
      const top = blocks[i - 1].y + blocks[i - 1].h;
      const gap = Math.round(blocks[i].y - top);
      if (gap < 12) continue;
      const dim = document.createElement('div');
      dim.className = 'bp-dim-line';
      Object.assign(dim.style, { left: `${Math.max(gutter / 2, 8)}px`, top: `${top}px`, height: `${gap}px` });
      const t = document.createElement('span');
      t.textContent = `${gap}`;
      dim.append(t);
      overlay.append(dim);
    }

    inspectBox = document.createElement('div');
    inspectBox.className = 'bp-inspect';
    inspectTip = document.createElement('div');
    inspectTip.className = 'bp-inspect-tip';
    overlay.append(inspectBox, inspectTip);
  }

  let pendingMove = null;
  function onPointerMove(e) {
    if (pendingMove) { pendingMove = e; return; }
    pendingMove = e;
    requestAnimationFrame(() => {
      const ev = pendingMove;
      pendingMove = null;
      if (!inspectBox || !ev) return;
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      if (!el || el === document.body || el === root || overlay.contains(el) || toast?.contains(el)) {
        inspectBox.style.opacity = inspectTip.style.opacity = '0';
        return;
      }
      const r = docRect(el);
      Object.assign(inspectBox.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px`, opacity: '1' });
      inspectTip.textContent = describe(el, { full: true });
      const tipX = Math.min(ev.pageX + 14, window.scrollX + document.documentElement.clientWidth - inspectTip.offsetWidth - 8);
      Object.assign(inspectTip.style, { left: `${tipX}px`, top: `${ev.pageY + 18}px`, opacity: '1' });
    });
  }

  function relayout() {
    clearTimeout(relayoutTimer);
    relayoutTimer = setTimeout(drawOverlay, 120);
  }

  function setBlueprint(on) {
    if (on === root.classList.contains('bp-mode')) return;
    root.classList.toggle('bp-mode', on);
    bpButton?.setAttribute('aria-pressed', String(on));
    document.dispatchEvent(new CustomEvent('blueprint:change', { detail: { on } }));

    if (on) {
      overlay = document.createElement('div');
      overlay.className = 'bp-overlay';
      overlay.setAttribute('aria-hidden', 'true');
      document.body.append(overlay);
      toast = document.createElement('div');
      toast.className = 'bp-toast';
      toast.setAttribute('role', 'status');
      toast.innerHTML = '<span><strong>Blueprint mode.</strong> <span class="bp-toast__hint">Hover anything to inspect it.</span></span><button type="button">Exit <kbd>B</kbd></button>';
      toast.querySelector('button').addEventListener('click', () => setBlueprint(false));
      document.body.append(toast);
      // Wait for the colour and seam transitions before measuring.
      setTimeout(drawOverlay, reduceMotion ? 0 : 450);
      window.addEventListener('resize', relayout);
      document.addEventListener('pointermove', onPointerMove);
    } else {
      overlay?.remove();
      toast?.remove();
      overlay = inspectBox = inspectTip = toast = null;
      window.removeEventListener('resize', relayout);
      document.removeEventListener('pointermove', onPointerMove);
    }
  }
  const toggleBlueprint = () => setBlueprint(!root.classList.contains('bp-mode'));
  bpButton?.addEventListener('click', toggleBlueprint);

  // ── Command palette ───────────────────────────────────────────────
  const paletteButton = document.querySelector('[data-palette-open]');
  let palette = null;

  const ACTIONS = {
    'copy-email': async (item, row) => {
      try {
        await navigator.clipboard.writeText(index.email);
        row.querySelector('.cmdk__hint').textContent = 'Copied';
        setTimeout(closePalette, 700);
        return true;
      } catch {
        location.href = `mailto:${index.email}`;
      }
      return false;
    },
    blueprint: () => { toggleBlueprint(); },
    theme: () => { toggleTheme(); },
  };

  function paletteItems() {
    return index.items.map((item) =>
      item.action === 'theme'
        ? { ...item, title: currentTheme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme' }
        : item.action === 'blueprint'
          ? { ...item, title: root.classList.contains('bp-mode') ? 'Leave blueprint mode' : 'Show the blueprint of this page' }
          : item,
    );
  }

  function openPalette() {
    if (palette) return;
    const lastFocus = document.activeElement;
    palette = document.createElement('div');
    palette.className = 'cmdk';
    palette.innerHTML = `
      <div class="cmdk__panel" role="dialog" aria-modal="true" aria-label="Jump to">
        <input class="cmdk__input" type="text" role="combobox" aria-expanded="true" aria-controls="cmdk-list"
               aria-autocomplete="list" placeholder="Jump to a project, section or action…" autocomplete="off" spellcheck="false">
        <ul class="cmdk__list" id="cmdk-list" role="listbox"></ul>
        <p class="cmdk__foot"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span></p>
      </div>`;
    document.body.append(palette);
    const input = palette.querySelector('input');
    const list = palette.querySelector('ul');
    let results = [];
    let active = 0;

    function render() {
      const q = input.value.trim().toLowerCase();
      results = paletteItems().filter((it) => !q || `${it.title} ${it.group} ${it.keywords || ''}`.toLowerCase().includes(q));
      active = Math.min(active, Math.max(results.length - 1, 0));
      list.replaceChildren();
      let lastGroup = '';
      results.forEach((it, i) => {
        if (it.group !== lastGroup) {
          lastGroup = it.group;
          const h = document.createElement('li');
          h.className = 'cmdk__group';
          h.setAttribute('role', 'presentation');
          h.textContent = it.group;
          list.append(h);
        }
        const li = document.createElement('li');
        li.id = `cmdk-${i}`;
        li.className = 'cmdk__item';
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', String(i === active));
        li.innerHTML = `<span class="cmdk__title"></span><span class="cmdk__hint"></span>`;
        li.querySelector('.cmdk__title').textContent = it.title;
        li.querySelector('.cmdk__hint').textContent = it.hint || '';
        li.addEventListener('pointermove', () => { if (active !== i) { active = i; paint(); } });
        li.addEventListener('click', () => run(i));
        list.append(li);
      });
      if (!results.length) {
        const li = document.createElement('li');
        li.className = 'cmdk__empty';
        // Still an option, so the listbox stays valid and a screen reader reads the message.
        li.id = 'cmdk-none';
        li.setAttribute('role', 'option');
        li.setAttribute('aria-disabled', 'true');
        li.setAttribute('aria-selected', 'false');
        li.textContent = 'Nothing matches. Try “scanner”, “email” or “dark”.';
        list.append(li);
      }
      paint();
    }
    function paint() {
      list.querySelectorAll('.cmdk__item').forEach((li, i) => li.setAttribute('aria-selected', String(i === active)));
      input.setAttribute('aria-activedescendant', results.length ? `cmdk-${active}` : 'cmdk-none');
      list.querySelector(`#cmdk-${active}`)?.scrollIntoView({ block: 'nearest' });
    }
    async function run(i) {
      const it = results[i];
      if (!it) return;
      if (it.action) {
        const keepOpen = await ACTIONS[it.action]?.(it, list.querySelector(`#cmdk-${i}`));
        if (!keepOpen) closePalette();
        return;
      }
      closePalette();
      if (it.external) window.open(it.href, '_blank', 'noopener');
      else location.href = it.href;
    }

    input.addEventListener('input', () => { active = 0; render(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % Math.max(results.length, 1); paint(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + results.length) % Math.max(results.length, 1); paint(); }
      else if (e.key === 'Enter') { e.preventDefault(); run(active); }
      else if (e.key === 'Tab') { e.preventDefault(); } // focus stays in the palette
    });
    palette.addEventListener('pointerdown', (e) => { if (e.target === palette) closePalette(); });
    palette._returnFocus = lastFocus;
    render();
    input.focus();
  }

  function closePalette() {
    if (!palette) return;
    const back = palette._returnFocus;
    palette.remove();
    palette = null;
    if (back instanceof HTMLElement) back.focus();
  }

  paletteButton?.addEventListener('click', openPalette);
  // Show the shortcut the visitor's keyboard actually has.
  if (!/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) {
    document.querySelectorAll('[data-shortcut-mod]').forEach((el) => { el.textContent = 'Ctrl '; });
  }

  // ── Keyboard ──────────────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (palette) closePalette(); else openPalette();
      return;
    }
    if (e.key === 'Escape') {
      if (palette) { closePalette(); return; }
      if (root.classList.contains('bp-mode')) { setBlueprint(false); return; }
    }
    if (palette || isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'b' || e.key === 'B') toggleBlueprint();
    else if (e.key === '/') { e.preventDefault(); openPalette(); }
  });
})();

// ── Project pages: the "At a glance" sheet and the five-step story ───
(() => {
  // Desktop shows the glance details in the side rail; phones get a sheet that starts closed.
  const glance = document.querySelector('[data-glance]');
  if (glance) {
    const phone = window.matchMedia('(max-width: 900px)');
    const fit = () => { glance.open = !phone.matches; };
    fit();
    phone.addEventListener('change', fit);
    // On a phone, following a link inside the sheet closes it.
    glance.addEventListener('click', (e) => { if (phone.matches && e.target.closest('a[href^="#"]')) glance.open = false; });
  }

  // Steps: one panel always open on desktop; on phones a step can also be folded away.
  const list = document.querySelector('[data-process]');
  if (list) {
    const wide = window.matchMedia('(min-width: 701px)');
    const steps = [...list.querySelectorAll('.process__step')];
    const show = (i) => steps.forEach((b, k) => {
      b.setAttribute('aria-expanded', String(k === i));
      document.getElementById(b.getAttribute('aria-controls')).hidden = k !== i;
    });
    show(0);
    steps.forEach((b, k) => b.addEventListener('click', () => {
      const open = b.getAttribute('aria-expanded') === 'true';
      show(open && !wide.matches ? -1 : k);
    }));
    // Arrow keys move along the row on desktop.
    list.addEventListener('keydown', (e) => {
      const k = steps.indexOf(document.activeElement);
      if (k < 0 || !wide.matches || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      e.preventDefault();
      const n = (k + (e.key === 'ArrowRight' ? 1 : -1) + steps.length) % steps.length;
      steps[n].focus(); show(n);
    });
    wide.addEventListener('change', () => { if (wide.matches && steps.every((b) => b.getAttribute('aria-expanded') !== 'true')) show(0); });
  }
})();

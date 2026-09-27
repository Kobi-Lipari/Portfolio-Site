// Switches the main browser screenshot when a thumbnail is chosen.
(() => {
  document.querySelectorAll('[data-gallery]').forEach((gallery) => {
    const img = gallery.querySelector('.browser__img');
    const caption = gallery.querySelector('[data-caption]');
    const thumbs = gallery.querySelectorAll('.thumb');

    thumbs.forEach((thumb) => {
      thumb.addEventListener('click', () => {
        const { src, srcset, w, h, alt } = thumb.dataset;
        img.width = Number(w);
        img.height = Number(h);
        img.srcset = srcset;
        img.src = src;
        img.alt = alt;
        caption.textContent = thumb.dataset.caption;
        thumbs.forEach((t) => t.setAttribute('aria-pressed', String(t === thumb)));
      });
    });
  });
})();

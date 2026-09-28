// Shows the chosen view in a project's browser frame when a thumbnail is clicked.
(() => {
  document.querySelectorAll('[data-gallery]').forEach((gallery) => {
    const panes = gallery.querySelectorAll('.browser__pane');
    const caption = gallery.querySelector('[data-caption]');
    const thumbs = gallery.querySelectorAll('.thumb');

    thumbs.forEach((thumb) => {
      thumb.addEventListener('click', () => {
        panes.forEach((pane) => { pane.hidden = pane.dataset.view !== thumb.dataset.view; });
        caption.textContent = thumb.dataset.caption;
        thumbs.forEach((t) => t.setAttribute('aria-pressed', String(t === thumb)));
      });
    });
  });
})();

// Motion preferences for the demo scripts: the OS reduced-motion setting, read live, and the
// stylesheet's duration tokens in milliseconds, so scripts and CSS keep the same clock.
const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
export const motion = {
  get reduce() { return mq.matches; },
  ms(token) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
    return v.endsWith('ms') ? parseFloat(v) : v.endsWith('s') ? parseFloat(v) * 1000 : 0;
  },
  onChange(fn) { mq.addEventListener('change', fn); },
};

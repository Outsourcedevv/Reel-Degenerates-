'use strict';
/* =========================================================
   Line icons for the interface (24x24, drawn with the text
   color). icon('gun') returns an inline <svg>.
   ========================================================= */
const ICON_PATHS = {
  gun: 'M3 9h12l2-2h3v6h-3l-2-2H9l-1.5 5h-3L6 11H3z',
  vac: 'M12 3a9 9 0 1 0 9 9 M12 7a5 5 0 1 0 5 5 M12 11a1 1 0 1 0 1 1 M21 12h-4',
  drill: 'M3 21l7-7 M8.5 12.5l3 3 M11 10l5-5 4 4-5 5z M16 5l2-2 M19 8l2-2',
  peel: 'M14.5 9.5m-6 0a6 6 0 1 0 12 0a6 6 0 1 0-12 0 M10.3 13.7L3 21',
  bag: 'M5 8h14l1 13H4z M9 8V6a3 3 0 0 1 6 0v2 M9 12h6',
  boots: 'M7 3h5v9l7 3v5H7z M7 16h12',
  bomb: 'M11 14m-7 0a7 7 0 1 0 14 0a7 7 0 1 0-14 0 M15.5 8.5l3-3 M19 2v2 M22 5h-2',
  sock: 'M9 3h6v9l-4.5 6.5a3 3 0 0 1-5-3.3L9 11z M9 7h6',
  shield: 'M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z',
  heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
  clover: 'M12 12m-3-3a3 3 0 1 1 3-3 3 3 0 1 1 3 3 3 3 0 1 1-3 3 3 3 0 1 1-3-3 M12 12l4 9',
  hat: 'M3 18h18 M7 18V10a5 5 0 0 1 10 0v8 M7 14h10',
  crown: 'M3 19h18 M4 16L3 7l5 4 4-7 4 7 5-4-1 9z',
  jar: 'M8 3h8 M9 3v3 M15 3v3 M7 6h10v13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z M7 11h10',
  token: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0 M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0',
  milk: 'M8 8l2-5h4l2 5v13H8z M8 12h8',
  flame: 'M12 21c4 0 6-3 6-6.5 0-4-3-5.5-4.5-9.5-2 2.5-2.5 4.5-2.5 6.5-1-1-2-2.3-2-3.5-2 2-3 4-3 6.5 0 3.5 2 7 6 7z',
  gear: 'M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M12 2v4 M12 18v4 M2 12h4 M18 12h4 M4.9 4.9l2.8 2.8 M16.3 16.3l2.8 2.8 M4.9 19.1l2.8-2.8 M16.3 7.7l2.8-2.8',
  berry: 'M8 14m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M16 14m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M12 8m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M12 4l2-2',
  gem: 'M6 3h12l4 6-10 12L2 9z M2 9h20 M9 3l3 18 3-18',
  slice: 'M12 3L3 21h18z M9 15h.01 M14 13h.01 M12 18h.01',
  paw: 'M12 20c-3 0-5-2-5-4s2-4 5-4 5 2 5 4-2 4-5 4z M6 10m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M18 10m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M9 6m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M15 6m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  box: 'M3 7l9-4 9 4v10l-9 4-9-4z M3 7l9 4 9-4 M12 11v10',
  cash: 'M3 6h18v12H3z M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M6 9v.01 M18 15v.01',
  cart: 'M3 4h2l2.5 11h11L21 7H6.5 M9 20m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0 M17 20m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0',
  lock: 'M6 11h12v10H6z M8 11V7a4 4 0 0 1 8 0v4',
  check: 'M4 12l5 5L20 6',
  planet: 'M12 12m-6 0a6 6 0 1 0 12 0a6 6 0 1 0-12 0 M2 16c4-4 16-9 20-7',
  skull: 'M12 3a8 8 0 0 0-8 8c0 3 2 5 3 5v4h10v-4c1 0 3-2 3-5a8 8 0 0 0-8-8z M9 12h.01 M15 12h.01 M10 20v-3 M14 20v-3',
  alert: 'M12 3l10 18H2z M12 10v5 M12 18h.01',
  person: 'M12 8m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M4 21c0-4 4-7 8-7s8 3 8 7',
};
function icon(name, cls = '') {
  const d = ICON_PATHS[name] || ICON_PATHS.box;
  return `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
}
// initials for portraits (shopkeepers, bosses) so nothing needs pictures
const initials = (name) => name.replace(/[^A-Za-z0-9 ]/g, '').split(' ').filter((w) => w && !/^(the|your|of|mr)$/i.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

// Shared behaviour for every page: phone menu, scroll reveal, swipe gestures.
(function () {
  var doc = document;

  // ---- Phone menu ----
  doc.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.menu-btn');
    if (!btn) return;
    var header = btn.closest('header');
    var open = !header.classList.contains('open');
    header.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  doc.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var h = doc.querySelector('header.open');
    if (h) { h.classList.remove('open'); var b = h.querySelector('.menu-btn'); if (b) { b.setAttribute('aria-expanded', 'false'); b.focus(); } }
  });

  // ---- Scroll reveal ----
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var GRID = '.cols2,.cols3,.stats,.facts,.prices,.steps,.quotes,.honors,.frames,.gallery,.grid';
  function setup() {
    if (reduce || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    var vh = window.innerHeight;
    function mark(el, i) {
      if (el.getBoundingClientRect().top < vh * 0.92) return; // already on screen: leave alone
      el.classList.add('rv');
      if (i) el.style.transitionDelay = Math.min(i, 5) * 70 + 'ms';
      io.observe(el);
    }
    doc.querySelectorAll('section .wrap > *, section > .read > *').forEach(function (el) {
      if (el.matches(GRID) || el.matches('div[style*="grid-template-columns"]')) {
        Array.prototype.forEach.call(el.children, function (c, i) { mark(c, i % 4); });
      } else if (el.matches('div[style*="border-top"]') && el.querySelector(':scope > article')) {
        Array.prototype.forEach.call(el.children, function (c) { mark(c, 0); });
      } else {
        mark(el, 0);
      }
    });
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', setup); else setup();

  // ---- Swipe: photo viewer and carousels ----
  var sx = 0, sy = 0, start = null;
  doc.addEventListener('touchstart', function (e) {
    var t = e.touches[0]; sx = t.clientX; sy = t.clientY; start = e.target;
  }, { passive: true });
  doc.addEventListener('touchend', function (e) {
    if (!start) return;
    var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    var el = start; start = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    var lb = el.closest && el.closest('.lb');
    if (lb) { var b = lb.querySelector(dx < 0 ? '.lbb.next' : '.lbb.prev'); if (b) b.click(); return; }
    var box = el;
    while (box && box !== doc.body && !box.querySelector('.car-btn')) box = box.parentElement;
    if (box && box !== doc.body) {
      var c = box.querySelector(dx < 0 ? '.car-btn[aria-label^="Next"]' : '.car-btn[aria-label^="Previous"]');
      if (c) c.click();
    }
  }, { passive: true });
})();

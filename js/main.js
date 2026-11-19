// frederickuy.com: small enhancements (site works without JS)
(function () {
  // Mobile menu
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // Portfolio filters
  var filters = document.querySelectorAll('.filter');
  var shots = document.querySelectorAll('[data-cat]');
  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var cat = btn.getAttribute('data-filter');
      filters.forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
      shots.forEach(function (s) {
        var cats = s.getAttribute('data-cat').split(' ');
        s.hidden = !(cat === 'all' || cats.indexOf(cat) !== -1);
      });
    });
  });

  // Contact form: hiring vs booking
  var modeBtns = document.querySelectorAll('.mode button');
  var extraLabel = document.getElementById('extra-label');
  var subject = document.getElementById('form-subject');
  modeBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      modeBtns.forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
      var hire = btn.getAttribute('data-mode') === 'hire';
      if (extraLabel) extraLabel.textContent = hire ? 'Company and role' : 'Session type and preferred date';
      if (subject) subject.value = hire ? 'Website: hiring / professional' : 'Website: photo session inquiry';
    });
  });

  // Footer year
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();

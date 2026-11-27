/* Tiny page runtime: renders {{value}}, <sc-for> and <sc-if> templates from a
   page's Component class, and patches the DOM in place when state changes.
   The same render() runs at build time (Node) to pre-render every page. */
(function (root) {
  'use strict';

  function lookup(scope, path) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    var parts = path.split('.'), v = scope;
    for (var i = 0; i < parts.length; i++) { if (v == null) return ''; v = v[parts[i]]; }
    return v == null ? '' : v;
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Find the matching close tag for a block that starts at `start`, allowing nesting.
  function findClose(tpl, tag, start) {
    var open = '<' + tag, close = '</' + tag + '>', depth = 1, i = start;
    while (depth > 0) {
      var o = tpl.indexOf(open, i), c = tpl.indexOf(close, i);
      if (c < 0) throw new Error('Unclosed <' + tag + '>');
      if (o >= 0 && o < c) { depth++; i = o + open.length; } else { depth--; i = c + close.length; if (depth === 0) return c; }
    }
  }

  var KEEP = ['rv', 'in', 'open'];
  // ctx.handlers collects functions bound to on* attributes.
  function render(tpl, scope, ctx) {
    var out = '', i = 0;
    while (i < tpl.length) {
      var f = tpl.indexOf('<sc-for', i), g = tpl.indexOf('<sc-if', i);
      var n = (f < 0) ? g : (g < 0 ? f : Math.min(f, g));
      if (n < 0) { out += interp(tpl.slice(i), scope, ctx); break; }
      out += interp(tpl.slice(i, n), scope, ctx);
      var isFor = n === f, tag = isFor ? 'sc-for' : 'sc-if';
      var headEnd = tpl.indexOf('>', n) + 1, head = tpl.slice(n, headEnd);
      var close = findClose(tpl, tag, headEnd), body = tpl.slice(headEnd, close);
      if (isFor) {
        var list = lookup(scope, (head.match(/list="\{\{([^}]+)\}\}"/) || [])[1] || '');
        var as = (head.match(/as="([^"]+)"/) || [])[1] || 'item';
        (Array.isArray(list) ? list : []).forEach(function (item, k) {
          var s = Object.create(scope); s[as] = item; s.$index = k;
          out += render(body, s, ctx);
        });
      } else {
        var val = lookup(scope, (head.match(/value="\{\{([^}]+)\}\}"/) || [])[1] || '');
        if (val && val !== 'false') out += render(body, scope, ctx);
      }
      i = close + tag.length + 3;
    }
    return out;
  }

  function interp(s, scope, ctx) {
    // Event attributes: onClick="{{fn}}" -> data-on-click="<id>"
    s = s.replace(/\son([A-Z][a-zA-Z]+)="\{\{([^}]+)\}\}"/g, function (_, ev, path) {
      var fn = lookup(scope, path);
      if (typeof fn !== 'function') return '';
      ctx.handlers.push(fn);
      return ' data-on-' + ev.toLowerCase() + '="' + (ctx.handlers.length - 1) + '"';
    });
    return s.replace(/\{\{([^}]+)\}\}/g, function (_, path) { return esc(lookup(scope, path)); });
  }

  /* ---------- Browser only below ---------- */
  function morph(from, to) {
    if (from.nodeType !== to.nodeType || from.nodeName !== to.nodeName) { from.replaceWith(to.cloneNode(true)); return; }
    if (from.nodeType === 3 || from.nodeType === 8) { if (from.nodeValue !== to.nodeValue) from.nodeValue = to.nodeValue; return; }
    if (from.nodeType !== 1) return;
    var a, i;
    // Classes and styles added by the page's own scripts (reveal-on-scroll, open menu,
    // aria-expanded on the menu button) survive re-renders.
    var keep = KEEP.filter(function (c) { return from.classList && from.classList.contains(c); });
    var delay = from.style && from.style.transitionDelay;
    var expanded = from.classList && from.classList.contains('menu-btn') ? from.getAttribute('aria-expanded') : null;
    for (i = from.attributes.length - 1; i >= 0; i--) { a = from.attributes[i]; if (!to.hasAttribute(a.name) && !(a.name === 'open' && from.nodeName === 'DETAILS')) from.removeAttribute(a.name); }
    for (i = 0; i < to.attributes.length; i++) { a = to.attributes[i]; if (from.getAttribute(a.name) !== a.value) from.setAttribute(a.name, a.value); }
    keep.forEach(function (c) { from.classList.add(c); });
    if (delay && keep.indexOf('rv') > -1 && !from.style.transitionDelay) from.style.transitionDelay = delay;
    if (expanded) from.setAttribute('aria-expanded', expanded);
    var fc = from.childNodes, tc = to.childNodes;
    for (i = 0; i < tc.length; i++) { if (i < fc.length) morph(fc[i], tc[i]); else from.appendChild(tc[i].cloneNode(true)); }
    while (fc.length > tc.length) from.removeChild(fc[fc.length - 1]);
  }

  function DCLogic(props) { this.props = props || {}; this.state = {}; }
  DCLogic.prototype.setState = function (patch) {
    var s = this.state, k; for (k in patch) s[k] = patch[k];
    if (this._schedule) this._schedule();
  };

  function mount(Component, rootEl, tpl) {
    var comp = new Component({}), ctx = { handlers: [] }, queued = false;
    function update() {
      queued = false; ctx = { handlers: [] };
      var html = render(tpl, comp.renderVals(), ctx);
      var t = document.createElement('div'); t.innerHTML = html;
      morph(rootEl, (function () { var w = rootEl.cloneNode(false); while (t.firstChild) w.appendChild(t.firstChild); return w; })());
    }
    comp._schedule = function () { if (!queued) { queued = true; Promise.resolve().then(update); } };
    ['click', 'submit', 'input', 'change', 'keydown'].forEach(function (ev) {
      rootEl.addEventListener(ev, function (e) {
        var el = e.target.closest && e.target.closest('[data-on-' + ev + ']');
        if (el && rootEl.contains(el)) { var fn = ctx.handlers[+el.getAttribute('data-on-' + ev)]; if (fn) fn(e); }
      });
    });
    [['mouseenter', 'mouseenter'], ['mouseleave', 'mouseleave'], ['focus', 'focus'], ['blur', 'blur']].forEach(function (p) {
      rootEl.addEventListener(p[0], function (e) {
        var el = e.target; if (!el.getAttribute) return;
        var id = el.getAttribute('data-on-' + p[1]); if (id != null) { var fn = ctx.handlers[+id]; if (fn) fn(e); }
      }, true);
    });
    update();
    if (comp.componentDidMount) comp.componentDidMount();
    return comp;
  }

  var api = { render: render, DCLogic: DCLogic, mount: mount };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DC = api;
})(this);

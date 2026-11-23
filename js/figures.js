/* Matek 1 vizsgafelkészítő – jelölés megjelenítése: [[a/b]] tört, x^2 kitevő, √(…) gyök; ábrák kirajzolása. */
(function (KO) {
  'use strict';

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  KO.esc = esc;

  var NAMES = { 2: 'ketted', 3: 'harmad', 4: 'negyed', 5: 'ötöd', 6: 'hatod', 7: 'heted', 8: 'nyolcad', 9: 'kilenced', 10: 'tized', 11: 'tizenegyed', 12: 'tizenketted', 16: 'tizenhatod', 36: 'harminchatod' };
  KO.fracName = function (n, d) {
    if (n === '?') return 'ismeretlen per ' + d;
    return NAMES[d] && /^\d+$/.test(String(n)) ? n + ' ' + NAMES[d] : n + ' per ' + d;
  };

  /* [[a/b]] → egymás fölé írt tört, x^2 → kitevő, √(…) → gyökjel. Képernyőolvasónak szöveges név. */
  KO.math = function (str) {
    var s = esc(str);
    s = s.replace(/\[\[([^\/\]]+)\/([^\]]+)\]\]/g, function (_, n, d) {
      return '<span class="frac" role="img" aria-label="' + KO.fracName(n, d) + '"><span>' + n + '</span><span>' + d + '</span></span>';
    });
    s = s.replace(/√\(([^)]+)\)/g, '√<span class="rad">$1</span>');
    s = s.replace(/_\(([^()]+)\)/g, '<sub>$1</sub>');
    s = s.replace(/\^\(([^()]+)\)/g, '<sup>$1</sup>');
    s = s.replace(/\^(\d+|[a-z])/g, '<sup>$1</sup>');
    return s;
  };

  /* Felolvasáshoz: a jelölésből kimondható szöveg. */
  KO.speech = function (str) {
    return String(str)
      .replace(/\[\[([^\/\]]+)\/([^\]]+)\]\]/g, function (_, n, d) { return KO.fracName(n, d); })
      .replace(/\^2/g, ' a négyzeten').replace(/\^(\d+)/g, ' a $1. hatványon')
      .replace(/√/g, 'gyök ').replace(/\+/g, ' meg ').replace(/−/g, ' mínusz ').replace(/·/g, ' szor ')
      .replace(/=/g, ' egyenlő ').replace(/\?/g, ' mennyi ');
  };

  KO.fig = {};

  KO.figure = function (fig) { return fig && KO.fig[fig.type] ? KO.fig[fig.type](fig) : ''; };
})(globalThis.KO = globalThis.KO || {});

/* Ábrák, 2. rész: függvénygrafikon, geometriai ábra, számegyenes. Minden ábra adatból készül, és SVG-ként jelenik meg. */
(function (KO) {
  'use strict';
  /* Feliratok: a feladatszövegek jelölését (x^2, log_2, [[1/2]]) SVG-ben is olvasható alakra hozzuk. */
  var SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', 'x': 'ˣ', 'n': 'ⁿ' };
  var SUB = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉' };
  function esc(s) {
    s = String(s).replace(/\[\[([^\/\]]+)\/([^\]]+)\]\]/g, '$1/$2')
      .replace(/\^([0-9]+|x|n)/g, function (_, e) { return e.split('').map(function (c) { return SUP[c] || c; }).join(''); })
      .replace(/_([0-9]+)/g, function (_, e) { return e.split('').map(function (c) { return SUB[c] || c; }).join(''); });
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function f1(v) { return +v.toFixed(1); }
  KO.figEsc = esc;
  var uid = 0;

  /* ---------- Függvények kiértékelése ---------- */
  KO.fnEval = function (fn, x) {
    switch (fn.k) {
      case 'lin': return fn.m * x + fn.b;
      case 'quad': return fn.a * x * x + fn.b * x + fn.c;
      case 'cubic': return fn.a * x * x * x + fn.b * x * x + fn.c * x + (fn.d || 0);
      case 'abs': return (fn.a === undefined ? 1 : fn.a) * Math.abs(x - (fn.u || 0)) + (fn.v || 0);
      case 'exp': return (fn.a === undefined ? 1 : fn.a) * Math.pow(fn.b, x - (fn.u || 0)) + (fn.v || 0);
      case 'log': return x - (fn.u || 0) > 0 ? Math.log(x - (fn.u || 0)) / Math.log(fn.b) + (fn.v || 0) : NaN;
      case 'sqrt': return x - (fn.u || 0) >= 0 ? (fn.a === undefined ? 1 : fn.a) * Math.sqrt(x - (fn.u || 0)) + (fn.v || 0) : NaN;
      case 'recip': return x - (fn.u || 0) !== 0 ? fn.a / (x - (fn.u || 0)) + (fn.v || 0) : NaN;
      case 'sin': return (fn.a === undefined ? 1 : fn.a) * Math.sin((fn.w || 1) * x * Math.PI / 180) + (fn.v || 0);
      case 'cos': return (fn.a === undefined ? 1 : fn.a) * Math.cos((fn.w || 1) * x * Math.PI / 180) + (fn.v || 0);
      case 'norm': return (fn.a || 1) * Math.exp(-(x - fn.mu) * (x - fn.mu) / (2 * fn.s * fn.s));
      case 'mirror': return KO.fnEval(fn.src, -x);
      case 'neg': return -KO.fnEval(fn.src, x);
      case 'pw': { var P = fn.pts, i; if (x < P[0][0] || x > P[P.length - 1][0]) return NaN; for (i = 1; i < P.length; i++) if (x <= P[i][0]) return P[i - 1][1] + (P[i][1] - P[i - 1][1]) * (x - P[i - 1][0]) / (P[i][0] - P[i - 1][0]); return NaN; }
      default: return NaN;
    }
  };

  /* ---------- Függvénygrafikon ---------- */
  KO.fig.plot = function (o) {
    var xr = o.xmax - o.xmin, yr = o.ymax - o.ymin, W = 340, L = 34, R = 16, T = 14, B = 24;
    var sx = (W - L - R) / xr, H = Math.round(T + B + Math.max(150, Math.min(340, yr * sx * (o.deg ? 0 : 1) || 220)));
    if (o.deg) H = 220;
    var sy = (H - T - B) / yr;
    function X(x) { return f1(L + (x - o.xmin) * sx); }
    function Y(y) { return f1(T + (o.ymax - y) * sy); }
    var xs = o.xstep || (o.deg ? 90 : xr > 24 ? 5 : xr > 12 ? 2 : 1), ys = o.ystep || (yr > 24 ? 5 : yr > 12 ? 2 : 1);
    var gx = o.deg ? 30 : xr > 24 ? xs : 1, gy = ys < 1 ? ys : yr > 24 ? ys : 1, grid = '', ticks = '', i;
    for (i = Math.ceil(o.xmin / gx) * gx; i <= o.xmax + 1e-9; i += gx) {
      grid += 'M' + X(i) + ' ' + T + 'V' + (H - B);
      if (Math.abs(i / xs - Math.round(i / xs)) < 1e-9 && i !== 0) ticks += '<text class="f-tick" x="' + X(i) + '" y="' + (H - 7) + '" text-anchor="middle">' + KO.num(i) + (o.deg ? '°' : '') + '</text>';
    }
    for (i = Math.ceil(o.ymin / gy) * gy; i <= o.ymax + 1e-9; i += gy) {
      grid += 'M' + L + ' ' + Y(i) + 'H' + (W - R);
      if (Math.abs(i / ys - Math.round(i / ys)) < 1e-9 && i !== 0) ticks += '<text class="f-tick" x="' + (L - 5) + '" y="' + (Y(i) + 4) + '" text-anchor="end">' + KO.num(Math.round(i * 1e6) / 1e6) + '</text>';
    }
    var axes = '', x0 = o.xmin <= 0 && o.xmax >= 0, y0 = o.ymin <= 0 && o.ymax >= 0;
    if (y0) axes += 'M' + L + ' ' + Y(0) + 'H' + (W - R + 6) + 'M' + (W - R + 6) + ' ' + Y(0) + 'l-6 -4M' + (W - R + 6) + ' ' + Y(0) + 'l-6 4';
    if (x0) axes += 'M' + X(0) + ' ' + (H - B) + 'V' + (T - 6) + 'M' + X(0) + ' ' + (T - 6) + 'l-4 6M' + X(0) + ' ' + (T - 6) + 'l4 6';
    var origin = x0 && y0 ? (o.xmin === 0 ? '<text class="f-tick" x="' + (L - 5) + '" y="' + (Y(0) + 4) + '" text-anchor="end">0</text>' : '<text class="f-tick" x="' + (X(0) - 4) + '" y="' + (Y(0) + 13) + '" text-anchor="end">0</text>') : '';
    var id = 'kp' + (++uid), body = '';
    (o.areas || []).forEach(function (a) {
      var n = 60, d = '', k, x;
      for (k = 0; k <= n; k++) { x = a.x1 + (a.x2 - a.x1) * k / n; d += (k ? 'L' : 'M') + X(x) + ' ' + Y(KO.fnEval(a.fn, x)); }
      for (k = n; k >= 0; k--) { x = a.x1 + (a.x2 - a.x1) * k / n; d += 'L' + X(x) + ' ' + Y(a.fn2 ? KO.fnEval(a.fn2, x) : 0); }
      body += '<path class="f-area" d="' + d + 'Z"></path>';
    });
    (o.rects || []).forEach(function (q) {
      body += '<path class="f-rect' + (q.cls ? ' ' + q.cls : '') + '" d="M' + X(q.x1) + ' ' + Y(0) + 'V' + Y(q.y) + 'H' + X(q.x2) + 'V' + Y(0) + 'Z"></path>';
    });
    (o.fns || []).forEach(function (fn) {
      if (fn.k === 'circle') { body += '<ellipse class="f-curve' + (fn.cls ? ' ' + fn.cls : '') + '" cx="' + X(fn.u) + '" cy="' + Y(fn.v) + '" rx="' + f1(fn.r * sx) + '" ry="' + f1(fn.r * sy) + '"></ellipse>'; return; }
      if (fn.k === 'vline') { body += '<path class="f-curve' + (fn.cls ? ' ' + fn.cls : '') + '" d="M' + X(fn.x) + ' ' + T + 'V' + (H - B) + '"></path>'; return; }
      var n = 240, d = '', pen = false, py = null;
      for (var k = 0; k <= n; k++) {
        var x = o.xmin + xr * k / n, y = KO.fnEval(fn, x);
        var okv = isFinite(y) && y > o.ymin - yr * 3 && y < o.ymax + yr * 3 && !(py !== null && Math.abs(y - py) > yr * 2);
        if (okv) { d += (pen ? 'L' : 'M') + X(x) + ' ' + Y(y); pen = true; } else pen = false;
        py = isFinite(y) ? y : null;
      }
      body += '<path class="f-curve' + (fn.cls ? ' ' + fn.cls : '') + '" d="' + d + '"></path>';
    });
    (o.segs || []).forEach(function (s) {
      var cls = 'f-seg' + (s.cls ? ' ' + s.cls : '');
      body += '<path class="' + cls + '" d="M' + X(s.x1) + ' ' + Y(s.y1) + 'L' + X(s.x2) + ' ' + Y(s.y2) + '"></path>';
      if (s.arrow) {
        var ang = Math.atan2(Y(s.y2) - Y(s.y1), X(s.x2) - X(s.x1)), ax = X(s.x2), ay = Y(s.y2);
        body += '<path class="' + cls + '" d="M' + ax + ' ' + ay + 'L' + f1(ax - 10 * Math.cos(ang - 0.4)) + ' ' + f1(ay - 10 * Math.sin(ang - 0.4)) + 'M' + ax + ' ' + ay + 'L' + f1(ax - 10 * Math.cos(ang + 0.4)) + ' ' + f1(ay - 10 * Math.sin(ang + 0.4)) + '"></path>';
      }
    });
    var OFF = { t: [0, -10, 'middle'], b: [0, 19, 'middle'], r: [10, 4, 'start'], l: [-10, 4, 'end'], tr: [8, -8, 'start'], tl: [-8, -8, 'end'], br: [8, 17, 'start'], bl: [-8, 17, 'end'] };
    var top = '';
    (o.fns || []).forEach(function (fn) {
      if (!fn.label) return;
      var lx = fn.lx !== undefined ? fn.lx : o.xmax - xr * 0.12, ly = fn.k === 'circle' ? fn.v + fn.r : KO.fnEval(fn, lx);
      if (!isFinite(ly)) return;
      ly = Math.max(o.ymin + yr * 0.06, Math.min(o.ymax - yr * 0.06, ly));
      top += '<text class="f-lab f-fl' + (fn.cls ? ' ' + fn.cls : '') + '" x="' + X(lx) + '" y="' + (Y(ly) - 8) + '" text-anchor="middle">' + esc(fn.label) + '</text>';
    });
    (o.pts || []).forEach(function (p) {
      var d = OFF[p.pos || 't'], lw = p.label ? String(p.label).length * 6.6 : 0, px0 = +X(p.x);
      if (d[2] === 'start' && px0 + d[0] + lw > W - 2) d = [-9, d[1], 'end'];
      else if (d[2] === 'end' && px0 + d[0] - lw < 2) d = [9, d[1], 'start'];
      else if (d[2] === 'middle' && px0 + lw / 2 > W - 2) d = [d[0] - 4, d[1], 'end'];
      else if (d[2] === 'middle' && px0 - lw / 2 < 2) d = [d[0] + 4, d[1], 'start'];
      top += '<circle class="f-pt' + (p.open ? ' open' : '') + '" cx="' + X(p.x) + '" cy="' + Y(p.y) + '" r="4.5"></circle>' +
        (p.label ? '<text class="f-lab" x="' + f1(X(p.x) + d[0]) + '" y="' + f1(Y(p.y) + d[1]) + '" text-anchor="' + d[2] + '">' + esc(p.label) + '</text>' : '');
    });
    return '<svg class="fig plot" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.alt || 'Függvénygrafikon') + '">' +
      '<defs><clipPath id="' + id + '"><rect x="' + L + '" y="' + T + '" width="' + (W - L - R) + '" height="' + (H - T - B) + '"></rect></clipPath></defs>' +
      '<path class="f-grid" d="' + grid + '"></path><path class="f-axis" d="' + axes + '"></path>' + ticks + origin +
      (x0 ? '<text class="f-lab f-it" x="' + (X(0) + 8) + '" y="' + (T + 4) + '">y</text>' : '') +
      (y0 ? '<text class="f-lab f-it" x="' + (W - R) + '" y="' + (Y(0) - 8) + '" text-anchor="end">x</text>' : '') +
      '<g clip-path="url(#' + id + ')">' + body + '</g>' + top + '</svg>';
  };

  /* ---------- Geometriai ábra (y felfelé nő, a méretarány automatikus) ---------- */
  KO.fig.geo = function (o) {
    var items = o.items || [], xsA = [], ysA = [];
    function add(p) { xsA.push(p[0]); ysA.push(p[1]); }
    items.forEach(function (it) {
      if (it.p) it.p.forEach(add);
      if (it.a) add(it.a); if (it.b) add(it.b); if (it.at) add(it.at);
      if (it.c && it.r) { add([it.c[0] - it.r, it.c[1] - it.r]); add([it.c[0] + it.r, it.c[1] + it.r]); }
    });
    var minX = Math.min.apply(null, xsA), maxX = Math.max.apply(null, xsA), minY = Math.min.apply(null, ysA), maxY = Math.max.apply(null, ysA);
    var w = Math.max(maxX - minX, 1e-6), h = Math.max(maxY - minY, 1e-6), pad = 34, W = 320;
    var padX = items.some(function (it) { return it.k === 'dot' && it.t && String(it.t).length > 3; }) ? 64 : pad;
    var s = Math.min((W - 2 * padX) / w, (260 - 2 * pad) / h), H = Math.round(h * s + 2 * pad), ox = (W - w * s) / 2;
    function X(x) { return f1(ox + (x - minX) * s); }
    function Y(y) { return f1(pad + (maxY - y) * s); }
    function P(p) { return X(p[0]) + ' ' + Y(p[1]); }
    var vx0 = 0, vx1 = W, vy0 = 0, vy1 = H;
    var cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, out = '', labs = '', pp = [];
    items.forEach(function (it) { if (it.k === 'poly' && it.p) pp = pp.concat(it.p); });
    if (pp.length) { cx = pp.reduce(function (a, q) { return a + q[0]; }, 0) / pp.length; cy = pp.reduce(function (a, q) { return a + q[1]; }, 0) / pp.length; }
    items.forEach(function (it) {
      var cls = it.cls ? ' ' + it.cls : '';
      if (it.k === 'poly') out += '<path class="g-poly' + cls + '" d="M' + it.p.map(P).join('L') + (it.open ? '' : 'Z') + '"></path>';
      else if (it.k === 'seg') out += '<path class="g-seg' + cls + '" d="M' + P(it.a) + 'L' + P(it.b) + '"></path>';
      else if (it.k === 'circle') out += '<circle class="g-poly' + cls + '" cx="' + X(it.c[0]) + '" cy="' + Y(it.c[1]) + '" r="' + f1(it.r * s) + '"></circle>';
      else if (it.k === 'sector') {
        var a1 = it.a1 * Math.PI / 180, a2 = it.a2 * Math.PI / 180, p1 = [it.c[0] + it.r * Math.cos(a1), it.c[1] + it.r * Math.sin(a1)], p2 = [it.c[0] + it.r * Math.cos(a2), it.c[1] + it.r * Math.sin(a2)];
        out += '<path class="g-poly' + cls + '" d="M' + P(it.c) + 'L' + P(p1) + 'A' + f1(it.r * s) + ' ' + f1(it.r * s) + ' 0 ' + (it.a2 - it.a1 > 180 ? 1 : 0) + ' 0 ' + P(p2) + 'Z"></path>';
      } else if (it.k === 'right') {
        var u = norm(sub(it.from, it.at)), v = norm(sub(it.to, it.at)), q = 12 / s;
        out += '<path class="g-mark" d="M' + P([it.at[0] + u[0] * q, it.at[1] + u[1] * q]) + 'L' + P([it.at[0] + (u[0] + v[0]) * q, it.at[1] + (u[1] + v[1]) * q]) + 'L' + P([it.at[0] + v[0] * q, it.at[1] + v[1] * q]) + '"></path>';
      } else if (it.k === 'angle') {
        var r0 = (it.r || 22) / s, b1 = Math.atan2(it.from[1] - it.at[1], it.from[0] - it.at[0]), b2 = Math.atan2(it.to[1] - it.at[1], it.to[0] - it.at[0]);
        var dd = b2 - b1; while (dd <= -Math.PI) dd += 2 * Math.PI; while (dd > Math.PI) dd -= 2 * Math.PI;
        var e1 = [it.at[0] + r0 * Math.cos(b1), it.at[1] + r0 * Math.sin(b1)], e2 = [it.at[0] + r0 * Math.cos(b1 + dd), it.at[1] + r0 * Math.sin(b1 + dd)];
        out += '<path class="g-mark' + cls + '" d="M' + P(e1) + 'A' + f1(r0 * s) + ' ' + f1(r0 * s) + ' 0 0 ' + (dd > 0 ? 0 : 1) + ' ' + P(e2) + '"></path>';
        if (it.t) { var bm = b1 + dd / 2 + (it.out ? Math.PI : 0), rr = r0 + (it.out ? 8 : 16) / s; labs += txt([it.at[0] + rr * Math.cos(bm), it.at[1] + rr * Math.sin(bm)], it.t, 'middle', 4); }
      } else if (it.k === 'lab') {
        var m = [(it.a[0] + it.b[0]) / 2, (it.a[1] + it.b[1]) / 2], d = norm(sub(it.b, it.a)), n = [-d[1], d[0]];
        if ((m[0] - cx) * n[0] + (m[1] - cy) * n[1] < 0 !== !!it.inside) n = [-n[0], -n[1]];
        var off = 14 / s;
        labs += txt([m[0] + n[0] * off, m[1] + n[1] * off], it.t, Math.abs(n[0]) < 0.3 ? 'middle' : n[0] > 0 ? 'start' : 'end', Math.abs(n[0]) < 0.3 ? (n[1] > 0 ? 0 : 9) : 5);
      } else if (it.k === 'dot') {
        out += '<circle class="f-pt" cx="' + X(it.at[0]) + '" cy="' + Y(it.at[1]) + '" r="4"></circle>';
        if (it.t) { var dv = it.dir || [0, 1]; labs += txt([it.at[0] + dv[0] * 14 / s, it.at[1] + dv[1] * 14 / s], it.t, dv[0] > 0.3 ? 'start' : dv[0] < -0.3 ? 'end' : 'middle', dv[1] < -0.3 ? 9 : 4); }
      } else if (it.k === 'text') labs += txt(it.at, it.t, it.anchor || 'middle', 4);
    });
    function txt(p, t, anchor, dy) {
      var px = +X(p[0]), py = +Y(p[1]) + dy, tw = String(t).replace(/\[\[|\]\]|\^|_/g, '').length * 8;
      var a0 = anchor === 'start' ? px : anchor === 'end' ? px - tw : px - tw / 2;
      vx0 = Math.min(vx0, a0 - 6); vx1 = Math.max(vx1, a0 + tw + 6); vy0 = Math.min(vy0, py - 14); vy1 = Math.max(vy1, py + 5);
      return '<text class="f-lab" x="' + f1(px) + '" y="' + f1(py) + '" text-anchor="' + anchor + '">' + esc(t) + '</text>';
    }
    return '<svg class="fig geo" viewBox="' + f1(vx0) + ' ' + f1(vy0) + ' ' + f1(vx1 - vx0) + ' ' + f1(vy1 - vy0) + '" role="img" aria-label="' + esc(o.alt || 'Geometriai ábra') + '">' + out + labs + '</svg>';
  };
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
  function norm(a) { var l = Math.sqrt(a[0] * a[0] + a[1] * a[1]) || 1; return [a[0] / l, a[1] / l]; }

  /* ---------- Számegyenes intervallumokkal ---------- */
  KO.fig.numline = function (o) {
    var W = 340, H = 76, L = 22, R = 22, yy = 40, sx = (W - L - R) / (o.max - o.min);
    function X(x) { return f1(L + (x - o.min) * sx); }
    var st = o.step || 1, ticks = '', out = '';
    for (var i = o.min; i <= o.max + 1e-9; i += st) ticks += '<path class="f-axis" d="M' + X(i) + ' ' + (yy - 5) + 'V' + (yy + 5) + '"></path><text class="f-tick" x="' + X(i) + '" y="' + (yy + 22) + '" text-anchor="middle">' + KO.num(i) + '</text>';
    (o.ranges || []).forEach(function (r) {
      var a = r.from === null ? o.min - 0.4 : r.from, b = r.to === null ? o.max + 0.4 : r.to;
      out += '<path class="n-range" d="M' + X(a) + ' ' + yy + 'H' + X(b) + '"></path>';
      if (r.from !== null) out += '<circle class="n-end' + (r.fromOpen ? ' open' : '') + '" cx="' + X(r.from) + '" cy="' + yy + '" r="6"></circle>';
      if (r.to !== null) out += '<circle class="n-end' + (r.toOpen ? ' open' : '') + '" cx="' + X(r.to) + '" cy="' + yy + '" r="6"></circle>';
    });
    (o.pts || []).forEach(function (p) {
      out += '<circle class="n-end' + (p.open ? ' open' : '') + '" cx="' + X(p.x) + '" cy="' + yy + '" r="6"></circle>' + (p.label ? '<text class="f-lab" x="' + X(p.x) + '" y="' + (yy - 12) + '" text-anchor="middle">' + esc(p.label) + '</text>' : '');
    });
    return '<svg class="fig numline" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.alt || 'Számegyenes') + '">' +
      '<path class="f-axis" d="M' + (L - 14) + ' ' + yy + 'H' + (W - R + 14) + 'M' + (W - R + 14) + ' ' + yy + 'l-7 -4M' + (W - R + 14) + ' ' + yy + 'l-7 4"></path>' + ticks + out + '</svg>';
  };

})(globalThis.KO = globalThis.KO || {});

/* További ábrák: tetszőleges függvény (fx), előjeltáblázat, több kis ábra egymás mellett. */
(function (KO) {
  'use strict';
  var esc = KO.esc;

  /* Tetszőleges függvény a grafikonokhoz: { k: 'fx', f: function (x) { … } }. */
  var base = KO.fnEval;
  KO.fnEval = function (fn, x) {
    if (fn && fn.k === 'fx') { var y = fn.f(x); return typeof y === 'number' ? y : NaN; }
    return base(fn, x);
  };

  /* Előjeltáblázat: { pts: ['−1', '0'], rows: [{ label: 'f′(x)', cells: ['−', '0', '+', 'nincs', '−'] }], res: { label: 'f(x)', cells: [...] } }
     A cellák felváltva intervallumok és pontok: (−∞; p1), p1, (p1; p2), p2, …, (pn; ∞). */
  KO.fig.signchart = function (o) {
    var n = o.pts.length, head = '<th></th>', i, j;
    for (i = 0; i <= n; i++) {
      head += '<th class="sg-iv">' + KO.math(i === 0 ? 'x < ' + o.pts[0] : i === n ? 'x > ' + o.pts[n - 1] : o.pts[i - 1] + ' < x < ' + o.pts[i]) + '</th>';
      if (i < n) head += '<th class="sg-pt">' + KO.math('x = ' + o.pts[i]) + '</th>';
    }
    var row = function (r, cls) {
      var h = '<tr class="' + cls + '"><th>' + KO.math(r.label) + '</th>';
      for (j = 0; j < r.cells.length; j++) {
        var c = r.cells[j], k = c === '+' ? 'sg-p' : c === '−' ? 'sg-m' : c === '↗' ? 'sg-up' : c === '↘' ? 'sg-dn' : c === '∪' ? 'sg-cv' : c === '∩' ? 'sg-cc' : '';
        h += '<td class="' + k + '">' + KO.math(c) + '</td>';
      }
      return h + '</tr>';
    };
    var body = o.rows.map(function (r) { return row(r, 'sg-row'); }).join('') + (o.res ? row(o.res, 'sg-res') : '');
    return '<div class="fig sgn" role="img" aria-label="' + esc(o.alt || 'Előjeltáblázat') + '"><table><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>';
  };

  /* Értéktáblázat: { rows: [['x', '0', '0,5'], ['f(x)', '33', '25']] } – az első oszlop fejléc. */
  KO.fig.table = function (o) {
    return '<div class="fig tbl" role="img" aria-label="' + esc(o.alt || 'Értéktáblázat') + '"><table>' + o.rows.map(function (r, i) {
      return '<tr>' + r.map(function (c, j) { var tg = j === 0 || (o.head && i === 0) ? 'th' : 'td'; return '<' + tg + '>' + KO.math(String(c)) + '</' + tg + '>'; }).join('') + '</tr>';
    }).join('') + '</table></div>';
  };

  /* Több kis ábra egymás mellett, betűjellel: { items: [{ fig: {...}, label: 'A' }, …] } */
  KO.fig.multi = function (o) {
    return '<div class="fig multi">' + o.items.map(function (it) {
      return '<div class="multi-it">' + (it.label ? '<div class="multi-lab">' + esc(it.label) + '</div>' : '') + KO.figure(it.fig) + (it.cap ? '<div class="multi-cap">' + KO.math(it.cap) + '</div>' : '') + '</div>';
    }).join('') + '</div>';
  };
})(globalThis.KO = globalThis.KO || {});


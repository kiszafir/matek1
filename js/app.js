/* Matek 1 vizsgafelkészítő – felület: az állapotból HTML-t készít (view), a gombok műveleteket hívnak (act).
   A nézetek tiszta függvények, ezért Node-ban is tesztelhetők böngésző nélkül.
   Két nyelv: magyar (sze1 ösvény, sze-* témák) és angol (sze1en, szeen-* témák). A haladás közös:
   a két nyelv azonos témái ugyanabba a bejegyzésbe kerülnek (a magyar azonosító alatt). */
(function (KO) {
  'use strict';
  var esc = KO.esc, M = KO.math;
  var ROUND = 5;
  var PTS = [12, 14, 12, 14, 12, 10, 12, 14];
  var A = KO.app = { S: null, ui: null, prefersDark: false, now: function () { return Date.now(); }, speak: function () {} };
  var TABS = ['haladas', 'leckek', 'vizsgak', 'terkep', 'beall'];

  A.init = function (state) {
    A.S = state || KO.store.load();
    A.S.settings = A.S.settings || {};
    A.ui = { screen: A.S.settings.lang ? 'haladas' : 'kezdes', back: 'leckek', topic: null, sess: null, sum: null, ex: null, grp: -1, q: '', confirmReset: false, fields: {} };
  };
  function save() { KO.store.save(A.S); }

  /* ---------- Nyelv ---------- */
  function isEn() { return !!(A.S && A.S.settings.lang === 'en'); }
  function U(hu, en) { return isEn() ? en : hu; }
  function trackKey() { return isEn() ? 'sze1en' : 'sze1'; }
  function track() { return KO.tracks[trackKey()]; }
  var HEAD_EN = { 'Miért kell ez?': 'Why do you need this?', 'Hogyan gondolkodj?': 'How to think about it' };
  function head(h) { return isEn() && HEAD_EN[h] ? HEAD_EN[h] : h; }
  function lbl(m) { var l = KO.label(m); return isEn() ? { 'új': 'new', 'erős': 'strong', 'épül': 'improving', 'gyenge': 'weak' }[l] : l; }
  function errL(code) { var e = KO.errs[code] || KO.errs.egyeb; return isEn() ? { l: KO.errsEn[code] || e.l, c: KO.errCatEn[e.c] || e.c } : e; }
  function examTitle(kind) { return kind === 'gen' ? U('Gyakorló vizsga', 'Practice exam') : U('Mintavizsga – ' + kind + ' feladatsor', 'Sample exam – set ' + kind); }

  /* ---------- Haladás: közös a két nyelvben ---------- */
  function canon(id) { return String(id).replace(/^szeen-/, 'sze-'); }
  function tstate(id) { var k = canon(id); return A.S.topics[k] || (A.S.topics[k] = { hist: [], interval: 0, due: 0, seen: false }); }
  function mast(id) { return KO.mastery((A.S.topics[canon(id)] || {}).hist); }
  /* Az ajánlónak az aktuális nyelv azonosítóival adjuk át az állapotot. */
  function vstate() {
    var tp = {};
    Object.keys(KO.topics).forEach(function (id) { var s = A.S.topics[canon(id)]; if (s) tp[id] = s; });
    return { topics: tp };
  }
  function loc(id) { return id && (isEn() ? String(id).replace(/^sze-/, 'szeen-') : canon(id)); }
  function rec() { var r = KO.recommend(track().ids, KO.topics, vstate(), A.now()); r.id = loc(r.id); if (r.from) r.from = loc(r.from); return r; }
  function gname(g) { return g.name.replace(/^\d\. feladat: /, '').replace(/^Task \d: /, '').replace(/^./, function (c) { return c.toUpperCase(); }); }
  function gstat(g) {
    var started = 0, strong = 0, sum = 0;
    g.ids.forEach(function (id) { var m = mast(id); if (m !== null) { started++; sum += m; if (m >= 75) strong++; } });
    return { n: g.ids.length, started: started, strong: strong, avg: Math.round(sum / g.ids.length) };
  }
  function levelCls(m) { return m === null ? 'new' : m >= 75 ? 'ok' : m >= 50 ? 'info' : 'err'; }
  /* Rövid, beszédes összefoglaló egy témakörről: amíg semmi nincs elkezdve, nem írunk „0 erős”-et. */
  function gsub(st) {
    if (!st.started) return U(st.n + ' lecke · még nem kezdted el', st.n + ' lessons · not started yet');
    var parts = [U(st.started + '/' + st.n + ' lecke elkezdve', st.started + '/' + st.n + ' lessons started')];
    if (st.strong) parts.push(st.strong === st.n ? U('mind erős', 'all strong') : U(st.strong + ' erős', st.strong + ' strong'));
    parts.push(U('szint: ' + st.avg + '/100', 'level: ' + st.avg + '/100'));
    return parts.join(' · ');
  }
  function examStats() {
    var res = A.S.szeRes || [], per = PTS.map(function () { return { got: 0, max: 0 }; });
    res.forEach(function (q) { (q.tasks || []).forEach(function (t) { if (per[t.no - 1]) { per[t.no - 1].got += t.got; per[t.no - 1].max += t.max; } }); });
    return { res: res, per: per };
  }

  /* ---------- Apró építőkockák ---------- */
  var IC = {
    home: 'M4 19V9M10 19V5M16 19v-7M22 19H2',
    path: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11',
    grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    set: 'M4 7h10M18 7h2M4 17h2M10 17h10M16 4v6M8 14v6',
    back: 'M19 12H5M11 6l-6 6 6 6',
    go: 'M5 12h14M13 6l6 6-6 6',
    say: 'M4 9.5v5h4l5 4v-13l-5 4zM16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11',
    ok: 'M4 12.5l5 5L20 6.5',
    warn: 'M12 8v5M12 17h.01M12 3l9.5 17h-19z',
    bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z',
    lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
    down: 'M6 9l6 6 6-6',
    up: 'M6 15l6-6 6 6',
    moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',
    exam: 'M7 3h7l5 5v13H7zM14 3v5h5M10 14l2 2 4-4',
    sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5'
  };
  function icon(name, size) {
    return '<svg class="ic" aria-hidden="true" width="' + (size || 22) + '" height="' + (size || 22) + '" viewBox="0 0 24 24"><path d="' + IC[name] + '"></path></svg>';
  }
  function btn(label, act, arg, cls, extra) {
    return '<button type="button" class="btn ' + (cls || '') + '" data-act="' + act + '"' + (arg !== undefined && arg !== null ? ' data-arg="' + esc(arg) + '"' : '') + (extra || '') + '>' + label + '</button>';
  }
  function seg(label, act, arg, on, extra) { return '<button type="button" class="seg-btn' + (on ? ' on' : '') + '" data-act="' + act + '" data-arg="' + arg + '" aria-pressed="' + (on ? 'true' : 'false') + '"' + (extra || '') + '>' + label + '</button>'; }
  function ring(pct) {
    var c = 2 * Math.PI * 30, d = Math.max(0, Math.min(100, pct));
    return '<svg class="ring" role="img" aria-label="' + U('Összesített szint: ' + pct + ' a 100-ból', 'Overall level: ' + pct + ' out of 100') + '" width="76" height="76" viewBox="0 0 76 76">' +
      '<circle class="ring-bg" cx="38" cy="38" r="30"></circle>' +
      (d > 0 ? '<circle class="ring-fg" cx="38" cy="38" r="30" transform="rotate(-90 38 38)" stroke-dasharray="' + (c * d / 100).toFixed(1) + ' ' + c.toFixed(1) + '"></circle>' : '') +
      '<text x="38" y="44" text-anchor="middle">' + pct + '%</text></svg>';
  }
  function bar(pct, cls, label) { return '<div class="bar" role="img" aria-label="' + esc(label) + '"><span class="bar-fill ' + cls + '" style="width: ' + Math.max(0, Math.min(100, pct)) + '%"></span></div>'; }
  function levelRow(id) {
    var m = mast(id), cls = levelCls(m), l = lbl(m);
    return '<div class="lvl"><div class="lvl-head"><span class="lvl-name">' + esc(KO.topics[id].name) + '</span>' +
      '<span class="lvl-tag ' + cls + '">' + (m === null ? U('még nem tanultad', 'not started yet') : l + ' · ' + m) + '</span></div>' +
      bar(m || 0, cls, KO.topics[id].name + ': ' + (m === null ? U('még nincs adat', 'no data yet') : m + U(' a 100-ból, ', ' out of 100, ') + l)) + '</div>';
  }
  function recText(r) {
    var n = esc(KO.topics[r.id].name);
    if (r.why === 'gyokerok') return U('Elakadtál itt: ', 'You got stuck here: ') + esc(KO.topics[r.from].name) + U('. Lehet, hogy a gond korábban kezdődött, ezért előbb ezt nézzük át: <strong>', '. The problem may have started earlier, so let us review this first: <strong>') + n + '</strong>.';
    if (r.why === 'gyenge') return U('Gyenge pont: <strong>', 'Weak spot: <strong>') + n + U('</strong>. Egy rövid kör sokat segít.', '</strong>. A short round helps a lot.');
    if (r.why === 'uj') return U('Következő lecke: <strong>', 'Next lesson: <strong>') + n + '</strong>.';
    if (r.why === 'ismetles') return U('Ismétlés, hogy megmaradjon: <strong>', 'Review so that it sticks: <strong>') + n + '</strong>.';
    return U('Minden témád rendben van. Szinten tartó kör: <strong>', 'All your topics are in good shape. A round to keep it up: <strong>') + n + '</strong>.';
  }

  /* ---------- Képernyők ---------- */
  var V = {};

  V.kezdes = function () {
    return '<div class="stack"><div><h1>Matek 1 vizsgafelkészítő</h1><p class="muted" lang="en">Mathematics 1 exam prep</p></div>' +
      '<p class="muted">Széchenyi István Egyetem, Győr – MSTM001. Válaszd ki, milyen nyelven tanulsz. <span lang="en">Choose the language of your studies.</span></p>' +
      '<button type="button" class="pick" data-act="nyelv" data-arg="hu" lang="hu"><strong>Magyar</strong><span>Magyar nyelvű képzés: leckék, mintavizsgák és gyakorló vizsga magyarul.</span></button>' +
      '<button type="button" class="pick" data-act="nyelv" data-arg="en" lang="en"><strong>English</strong><span>English-language programme: lessons, sample exams and practice exams in English.</span></button>' +
      '<p class="note">Nem kérünk nevet, e-mail-címet vagy fiókot; a haladásod csak ezen az eszközön tárolódik. A nyelv a beállításokban bármikor átváltható. <span lang="en">No account needed; your progress stays on this device. You can switch the language in the settings at any time.</span></p></div>';
  };

  V.haladas = function () {
    var t = track(), r = rec(), gs = t.groups, all = t.ids, started = 0, strong = 0, sum = 0, h = '<div class="stack"><h1>' + U('Haladásod', 'Your progress') + '</h1>';
    all.forEach(function (id) { var m = mast(id); if (m !== null) { started++; sum += m; if (m >= 75) strong++; } });
    var pct = Math.round(sum / all.length);
    h += '<div class="card row">' + ring(pct) + '<div><div class="eyebrow">' + U('A teljes vizsgaanyag', 'The whole exam material') + '</div><div class="strong">' +
      (started ? U(started + ' / ' + all.length + ' leckét kezdtél el', started + ' / ' + all.length + ' lessons started') : U('Még egyik leckét sem kezdted el', 'You have not started any lesson yet')) + '</div><div class="muted small">' +
      (started ? (strong ? U(strong + ' téma már erős (legalább 75/100).', strong + (strong === 1 ? ' topic is' : ' topics are') + ' already strong (at least 75/100).') : U('Erős téma még nincs: ehhez 75/100 kell.', 'No strong topic yet: that needs 75/100.')) : U('Kezdd az elsővel: a lecke után jön a gyakorlás.', 'Start with the first one: practice follows the lesson.')) + '</div></div></div>' +
      btn(U('Folytatom', 'Continue') + icon('go', 20), 'folytat', null, 'primary big') + '<p class="muted">' + recText(r) + '</p>';
    h += '<div class="card"><div class="eyebrow">' + U('A vizsga 8 feladata szerint', 'By the 8 tasks of the exam') + '</div>';
    gs.forEach(function (g, i) {
      var st = gstat(g), cls = st.started ? levelCls(st.avg) : 'new';
      h += '<button type="button" class="prow" data-act="nyit" data-arg="' + i + '"><span class="lvl-head"><span class="lvl-name">' + (i + 1) + '. ' + esc(gname(g)) + '</span><span class="muted small nowrap">' + PTS[i] + U(' pont', ' pts') + '</span></span>' +
        '<span class="muted small">' + gsub(st) + '</span>' + bar(st.avg, cls, gname(g) + ': ' + gsub(st)) + '</button>';
    });
    h += '</div>';
    var es = examStats(), res = es.res;
    h += '<div class="card"><div class="eyebrow">' + U('Próbavizsgák', 'Mock exams') + '</div>';
    if (res.length) {
      var last = res[res.length - 1], best = res.reduce(function (a, q) { return q.score / q.max > a.score / a.max ? q : a; }, res[0]);
      h += '<div class="strong">' + U('Legutóbb: ', 'Last: ') + last.score + ' / ' + last.max + U(' pont', ' points') + ' (' + Math.round(100 * last.score / last.max) + '%)</div>' +
        '<div class="muted small">' + esc(examTitle(last.kind)) + ', ' + esc(last.day) + '. ' + U('Legjobb: ', 'Best: ') + best.score + ' / ' + best.max + '. ' + U('Összesen ' + res.length + ' vizsga.', res.length + (res.length === 1 ? ' exam' : ' exams') + ' in total.') + '</div>' +
        '<div class="vz-tasks">' + (last.tasks || []).map(function (q) { return '<span class="chip' + (q.got === q.max ? ' ok' : q.got === 0 ? ' err' : '') + '">' + q.no + '. ' + q.got + '/' + q.max + '</span>'; }).join('') + '</div>';
    } else h += '<p class="muted small">' + U('Még nem írtál próbavizsgát. Ha már több témát átnéztél, próbáld ki: 8 feladat, 100 pont, ugyanúgy, mint a mintavizsgákon.', 'You have not taken a mock exam yet. Once you have gone through a few topics, try one: 8 tasks, 100 points, just like the sample exams.') + '</p>';
    h += btn(res.length ? U('Új próbavizsga', 'New mock exam') : U('Próbavizsga indítása', 'Start a mock exam'), 'nav', 'vizsgak', 'ghost') + '</div>';
    var weak = all.filter(function (id) { var m = mast(id); return m !== null && m < 50; }).sort(function (a, b) { return mast(a) - mast(b); }).slice(0, 3);
    if (weak.length) h += '<div class="card"><div class="eyebrow">' + U('Gyenge pontok', 'Weak spots') + '</div>' + weak.map(function (id) { return levelRow(id) + '<div class="btn-row">' + btn(U('Lecke', 'Lesson'), 'lecke', id, 'ghost') + btn(U('Gyakorlás', 'Practice'), 'gyak', id, 'ghost') + '</div>'; }).join('') + '</div>';
    return h + '</div>';
  };

  function nodeHtml(id, r) {
    var tp = KO.topics[id], m = mast(id), weak = tp.pre.filter(function (p) { var pm = mast(p); return pm === null || pm < 50; });
    var st = m !== null && m >= 75 ? 'done' : id === r.id ? 'cur' : (m === null && weak.length ? 'lock' : 'open');
    var sub = st === 'lock' ? U('Előbb ajánlott: ', 'Recommended first: ') + weak.map(function (p) { return esc(KO.topics[p].name); }).join(', ')
      : m === null ? U('Új téma', 'New topic') : U('Szint: ', 'Level: ') + lbl(m) + ' · ' + m;
    return '<li class="node ' + st + '"><div class="node-rail"><span class="node-dot">' + (st === 'done' ? icon('ok', 18) : st === 'lock' ? icon('lock', 16) : '<i></i>') + '</span><span class="node-line"></span></div>' +
      '<div class="node-card"><div class="node-name">' + esc(tp.name) + '</div><div class="muted small">' + (st === 'cur' ? U('Itt tartasz. ', 'You are here. ') : '') + sub + '</div>' +
      '<div class="btn-row">' + btn(st === 'lock' ? U('Mégis megnézem', 'Open anyway') : U('Lecke', 'Lesson'), 'lecke', id, st === 'cur' ? 'primary' : 'ghost') + (st === 'lock' ? '' : btn(U('Gyakorlás', 'Practice'), 'gyak', id, 'ghost')) + '</div></div></li>';
  }
  function norm(x) { return String(x).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

  V.leckek = function () {
    var t = track(), r = rec(), gs = t.groups;
    if (A.ui.grp === undefined || A.ui.grp === null) A.ui.grp = -1;
    var h = '<div class="stack"><div><h1>' + U('Leckék', 'Lessons') + '</h1><p class="muted">' + U(t.ids.length + ' lecke a vizsga 8 feladata szerint. Koppints egy feladatra, és megnyílnak a leckéi.', t.ids.length + ' lessons, grouped by the 8 tasks of the exam. Tap a task to open its lessons.') + '</p></div>';
    var q = A.ui.q || '';
    h += '<form class="search" data-form="keres"><label class="eyebrow" for="f-q">' + U('Lecke keresése', 'Search lessons') + '</label><div class="btn-row"><input id="f-q" class="num-in grow" data-field="q" type="search" autocomplete="off" placeholder="' + U('például derivált, integrál', 'e.g. derivative, integral') + '" value="' + esc(q) + '">' + btn(U('Keresés', 'Search'), 'keres', '', 'ghost') + (q ? btn(U('Törlés', 'Clear'), 'keres-torol', '', 'ghost') : '') + '</div></form>';
    if (q) {
      var nq = norm(q), hits = t.ids.filter(function (id) { return norm(KO.topics[id].name).indexOf(nq) >= 0; });
      h += '<div class="card"><div class="eyebrow">' + U('Találatok: ', 'Results: ') + hits.length + '</div>';
      if (!hits.length) h += '<p class="muted">' + U('Nincs ilyen nevű lecke. Próbáld rövidebb szóval, például „határérték” vagy „érintő”.', 'No lesson with this name. Try a shorter word, e.g. "limit" or "tangent".') + '</p>';
      hits.forEach(function (id) {
        var gi = 0; gs.forEach(function (g, i) { if (g.ids.indexOf(id) >= 0) gi = i; });
        h += '<div class="hit"><div><div class="node-name">' + esc(KO.topics[id].name) + '</div><div class="muted small">' + U((gi + 1) + '. feladat: ', 'Task ' + (gi + 1) + ': ') + esc(gname(gs[gi])) + '</div></div><div class="btn-row">' + btn(U('Lecke', 'Lesson'), 'lecke', id, 'ghost') + btn(U('Gyakorlás', 'Practice'), 'gyak', id, 'ghost') + '</div></div>';
      });
      h += '</div>';
    }
    gs.forEach(function (g, i) {
      var open = A.ui.grp === i, st = gstat(g), here = g.ids.indexOf(r.id) >= 0, cls = st.started ? levelCls(st.avg) : 'new';
      h += '<div class="grp' + (open ? ' open' : '') + (here ? ' here' : '') + '"><button type="button" class="grp-head" data-act="csoport" data-arg="' + i + '" aria-expanded="' + (open ? 'true' : 'false') + '">' +
        '<span class="grp-num">' + (i + 1) + '</span><span class="grp-text"><span class="grp-name">' + esc(gname(g)) + '</span>' +
        '<span class="grp-sub">' + U((i + 1) + '. feladat (' + PTS[i] + ' pont) · ', 'Task ' + (i + 1) + ' (' + PTS[i] + ' points) · ') + gsub(st) + (here ? U(' · itt tartasz', ' · you are here') : '') + '</span>' +
        '<span class="bar grp-bar" role="img" aria-label="' + esc(gsub(st)) + '"><span class="bar-fill ' + cls + '" style="width: ' + st.avg + '%"></span></span></span>' +
        '<span class="grp-chev" aria-hidden="true">' + icon(open ? 'up' : 'down', 20) + '</span></button>';
      if (open) h += '<div class="grp-tools">' + btn(U('Vegyes gyakorlás ebből a feladatból', 'Mixed practice from this task'), 'vegyes', i, 'ghost') + '</div><ol class="path">' + g.ids.map(function (id) { return nodeHtml(id, r); }).join('') + '</ol>';
      h += '</div>';
    });
    return h + '</div>';
  };

  V.lecke = function () {
    var id = A.ui.topic, tp = KO.topics[id], h = '<div class="stack"><h1>' + esc(tp.name) + '</h1>';
    tp.lesson.forEach(function (b) {
      if (b.t === 'p') h += '<div class="card"><div class="eyebrow">' + esc(head(b.h)) + '</div><p>' + M(b.x) + '</p></div>';
      else if (b.t === 'fig') h += '<div class="card">' + KO.figure(b.fig) + '<div class="eyebrow">' + U('Mit látunk?', 'What do we see?') + '</div><p>' + M(b.cap) + '</p></div>';
      else if (b.t === 'rule') h += '<div class="rule"><div class="eyebrow">' + U('Szabály', 'Rule') + '</div><p>' + M(b.x) + '</p></div>';
      else if (b.t === 'steps') h += '<div class="card"><div class="eyebrow">' + esc(head(b.h)) + '</div><div class="math">' + M(b.math) + '</div><ol class="steps">' + b.s.map(function (s) { return '<li>' + M(s) + '</li>'; }).join('') + '</ol></div>';
      else if (b.t === 'warn') h += '<div class="card warnbox"><div class="eyebrow">' + U('Figyelj!', 'Watch out!') + '</div><ul class="steps">' + b.s.map(function (s) { return '<li>' + M(s) + '</li>'; }).join('') + '</ul></div>';
    });
    if (!A.ui.demo || A.ui.demo.topic !== id) newDemo(id, true);
    var d = A.ui.demo, t = d.task;
    h += '<div class="card demo"><div class="eyebrow">' + U('Példa lépésről lépésre', 'Example step by step') + '</div><p>' + M(t.prompt) + '</p>' + (t.math ? '<div class="math">' + M(t.math) + '</div>' : '') + KO.figure(t.fig);
    if (d.step === 0) h += '<p class="muted small">' + U('Próbáld meg előbb fejben, aztán nézd meg a lépéseket egyenként.', 'Try it in your head first, then reveal the steps one by one.') + '</p>';
    else h += '<ol class="steps">' + t.tips.slice(0, d.step).map(function (x) { return '<li>' + M(x) + '</li>'; }).join('') + '</ol>';
    if (d.step >= 3) {
      var w = t.wrongs[0];
      h += '<p><strong>' + U('Válasz:', 'Answer:') + '</strong> ' + M(KO.show(t.answer, t.vtype)) + '</p>' +
        '<div class="fb err"><div class="fb-head">' + icon('warn', 22) + '<span>' + U('Gyakori hiba', 'Common mistake') + '</span></div><p>' + U('Sokan ezt válaszolják: ', 'Many people answer: ') + '<strong>' + M(KO.show(w.v, t.vtype)) + '</strong>. ' + M(w.fb) + '</p></div>';
    }
    h += '<div class="btn-row">' + (d.step < 3 ? btn(d.step === 0 ? U('Mutasd az első lépést', 'Show the first step') : U('Következő lépés', 'Next step'), 'demo-lep', null, 'primary') : '') + btn(U('Másik példa', 'Another example'), 'demo-uj', null, 'ghost') + '</div></div>';
    if (tp.pre.length) {
      h += '<div class="card"><div class="eyebrow">' + U('Erre épül', 'Builds on') + '</div><p class="muted small">' + U('Ha valami nem világos, előbb ezeket nézd át.', 'If something is unclear, review these first.') + '</p><div class="btn-row">' +
        tp.pre.map(function (p) { return btn(esc(KO.topics[p].name), 'lecke', p, 'ghost'); }).join('') + '</div></div>';
    }
    return h + btn(U('Jöhet a gyakorlás', 'Start practising'), 'gyak', id, 'primary big') + '</div>';
  };

  function newDemo(id, reset) {
    var gens = KO.gensOf(id).sort(function (a, b) { return a.level - b.level; });
    var n = !reset && A.ui.demo && A.ui.demo.topic === id ? A.ui.demo.n + 1 : 0;
    A.ui.demo = { topic: id, n: n, step: 0, task: KO.make(gens[n % gens.length].id, A.S.seed++) };
  }

  V.gyak = function () {
    var s = A.ui.sess, t = s.task, kind = t.kind, h = '<div class="stack">';
    var segs = '';
    for (var i = 0; i < s.ids.length; i++) segs += '<span class="seg' + (i < s.i ? ' done' : i === s.i ? ' cur' : '') + '"></span>';
    h += '<div class="prog"><span class="strong">' + U((s.i + 1) + '. feladat', 'Task ' + (s.i + 1)) + '</span><span class="segs" role="img" aria-label="' + U((s.i + 1) + '. feladat, összesen ' + s.ids.length, 'Task ' + (s.i + 1) + ' of ' + s.ids.length) + '">' + segs + '</span></div>';
    h += '<div class="muted small">' + (s.logT ? U('Vegyes gyakorlás · ', 'Mixed practice · ') : '') + esc(KO.topics[t.topic].name) + '</div>';
    h += '<div class="chips"><span class="chip">' + U('nehézség: ', 'difficulty: ') + t.level + ' / 5</span><span class="chip">' + U('kb. ' + t.minutes + ' perc', 'about ' + t.minutes + ' min') + '</span></div>';
    h += '<div class="g-cols"><div class="g-left"><div class="card task"><p class="prompt">' + M(t.prompt) + '</p>' + (t.math ? '<div class="math big">' + M(t.math) + '</div>' : '') + KO.figure(t.fig) +
      (A.S.settings.voice ? '<button type="button" class="icon-btn say" data-act="felolvas" aria-label="' + U('Felolvasom a feladatot', 'Read the task aloud') + '">' + icon('say', 24) + '</button>' : '') + '</div></div><div class="g-right">';

    if (kind === 'choice') {
      h += '<div class="opts' + (t.vtype === 'text' ? ' col' : '') + '" role="group" aria-label="' + U('Válaszlehetőségek', 'Answer options') + '">';
      s.opts.forEach(function (v, idx) {
        var on = s.sel === idx, cls = on ? (s.state === 'right' ? ' ok' : s.state === 'almost' ? ' info' : s.state === 'wrong' ? ' err' : ' on') : '';
        h += '<button type="button" class="opt' + cls + '" data-act="valaszt" data-arg="' + idx + '" aria-pressed="' + (on ? 'true' : 'false') + '"' + (s.state !== 'open' ? ' disabled' : '') + '>' + M(KO.show(v, t.vtype)) + '</button>';
      });
      h += '</div>';
    } else {
      var f = A.ui.fields, dis = s.state !== 'open' ? ' disabled' : '';
      h += '<form class="answer" data-form="valasz"><label class="eyebrow" for="f-n">' + U('A válaszod', 'Your answer') + '</label>';
      if (t.vtype === 'frac') {
        h += '<div class="frac-in"><input id="f-n" data-field="n" inputmode="numeric" autocomplete="off" aria-label="' + U('Számláló', 'Numerator') + '" value="' + esc(f.n || '') + '"' + dis + '><span class="frac-line"></span>' +
          '<input data-field="d" inputmode="numeric" autocomplete="off" aria-label="' + U('Nevező', 'Denominator') + '" value="' + esc(f.d || '') + '"' + dis + '></div><span class="muted small">' + U('Felül a számláló, alul a nevező. Egész számnál az alsó üresen maradhat.', 'Numerator on top, denominator below. For a whole number the bottom can stay empty.') + '</span>';
      } else {
        h += '<input id="f-n" class="num-in" data-field="n" inputmode="text" autocomplete="off" value="' + esc(f.n || '') + '"' + dis + '>';
      }
      if (s.inputErr) h += '<p class="in-err" role="alert">' + esc(s.inputErr) + '</p>';
      h += '</form>';
    }

    if (s.tips > 0 && s.state !== 'shown') {
      var names = U(['Irány', 'Részlet', 'Teljes megoldás'], ['Direction', 'Detail', 'Full solution']);
      h += '<div class="fb info"><div class="fb-head">' + icon('bulb', 22) + '<span>' + U('Tipp', 'Hint') + '</span></div>';
      for (var k = 0; k < s.tips; k++) h += '<p><strong>' + (k + 1) + '. ' + names[k] + ':</strong> ' + M(t.tips[k]) + '</p>';
      h += '</div>';
    }
    if (s.state === 'open') {
      h += '<div class="btn-row">' + btn(s.tips < 3 ? U('Tipp', 'Hint') + ' (' + s.tips + '/3)' : U('Nincs több tipp', 'No more hints'), 'tipp', null, 'ghost grow', s.tips >= 3 ? ' disabled' : '') +
        btn(U('Ellenőrzés', 'Check'), 'ellenoriz', null, 'primary grow', kind === 'choice' && s.sel === null ? ' disabled' : '') + '</div>';
    }

    var e = s.res && s.res.err ? errL(s.res.err) : null, last = s.i === s.ids.length - 1;
    if (s.state === 'right') {
      h += '<div class="fb ok" role="status"><div class="fb-head">' + icon('ok', 24) + '<span>' + U('Helyes!', 'Correct!') + '</span></div><p>' + M(t.solution) + '</p>' + (t.solfig ? '<div class="solfig">' + KO.figure(t.solfig) + '</div>' : '') +
        btn(last ? U('Befejezem a kört', 'Finish the round') : U('Következő feladat', 'Next task'), 'kov', null, 'primary') + '</div>';
    } else if (s.state === 'almost') {
      h += '<div class="fb info" role="status"><div class="fb-head">' + icon('bulb', 24) + '<span>' + U('Majdnem kész!', 'Almost there!') + '</span></div><p>' + M(s.res.fb) + '</p>' + btn(U('Javítom', 'Fix it'), 'ujra', null, 'ghost') + '</div>';
    } else if (s.state === 'wrong') {
      h += '<div class="fb err" role="status"><div class="fb-head">' + icon('warn', 24) + '<span>' + U('Nem egészen!', 'Not quite!') + '</span></div><p>' + M(s.res.fb) + '</p>' +
        (e ? '<p class="muted small">' + U('Hibatípus: ', 'Error type: ') + esc(e.l) + ' (' + esc(e.c) + ').</p>' : '') +
        '<div class="btn-row">' + btn(U('Újra megpróbálom', 'Try again'), 'ujra', null, 'ghost') + btn(U('Megoldás', 'Solution'), 'megoldas', null, 'ghost') + '</div></div>';
    } else if (s.state === 'shown') {
      h += '<div class="fb info" role="status"><div class="fb-head">' + icon('bulb', 24) + '<span>' + U('Megoldás lépésenként', 'Step-by-step solution') + '</span></div>' +
        '<ol class="steps">' + t.tips.map(function (x) { return '<li>' + M(x) + '</li>'; }).join('') + '</ol><p><strong>' + U('Válasz:', 'Answer:') + '</strong> ' + M(KO.show(t.answer, t.vtype)) + '</p>' + (t.solfig ? '<div class="solfig">' + KO.figure(t.solfig) + '</div>' : '') +
        btn(last ? U('Befejezem a kört', 'Finish the round') : U('Következő feladat', 'Next task'), 'kov', null, 'primary') + '</div>';
    }
    h += '<div class="foot"><span class="muted small">' + U('Programmal generált és ellenőrzött feladat.', 'Task generated and checked by the program.') + '</span>' +
      (s.reported ? '<span class="muted small">' + U('Köszi, feljegyeztük.', 'Thanks, noted.') + '</span>' : '<button type="button" class="link" data-act="jelent">' + U('Hibát találtam', 'Report a mistake') + '</button>') + '</div>';
    return h + '</div></div></div>';
  };

  V.osszegzes = function () {
    var u = A.ui.sum, tp = KO.topics[u.topic], h = '<div class="stack"><h1>' + U('Kész a kör!', 'Round complete!') + '</h1>';
    if (u.topics) h += '<div class="card"><div class="eyebrow">' + U('Vegyes gyakorlás: ', 'Mixed practice: ') + esc(u.group) + '</div><div class="strong">' + U(u.total + ' feladatból ' + u.right + ' elsőre jó', u.right + ' of ' + u.total + ' right at the first try') + '</div>' + u.topics.map(levelRow).join('') + '</div>';
    else h += '<div class="card"><div class="eyebrow">' + esc(tp.name) + '</div><div class="strong">' + U(u.total + ' feladatból ' + u.right + ' elsőre jó', u.right + ' of ' + u.total + ' right at the first try') + '</div>' + levelRow(u.topic) + '</div>';
    if (u.errs.length) {
      h += '<div class="card"><div class="eyebrow">' + U('Ezeken csúszott el', 'Where it went wrong') + '</div><ul class="steps">' + u.errs.map(function (e) {
        var el = errL(e.err);
        return '<li>' + esc(el.l) + (e.n > 1 ? ' (' + e.n + '×)' : '') + ' <span class="muted small">– ' + esc(el.c) + U(' hiba', ' error') + '</span></li>';
      }).join('') + '</ul></div>';
    }
    if (u.root) {
      h += '<div class="rule"><div class="eyebrow">' + U('Javaslat', 'Suggestion') + '</div><p>' + U('Lehet, hogy a gond korábban kezdődött. Nézzük át ezt: ', 'The problem may have started earlier. Let us review this: ') + '<strong>' + esc(KO.topics[u.root].name) + '</strong>.</p>' + btn(U('Átnézem', 'Review it'), 'lecke', u.root, 'primary') + '</div>';
    } else {
      h += '<p class="muted">' + (u.avg >= 0.8 ? U('Ez jól megy. Legközelebb ritkábban kerül elő, hogy másra is jusson idő.', 'This is going well. It will come up less often, so there is time for other topics.') : u.avg >= 0.5 ? U('Alakul. Holnap még egyszer előjön, hogy megmaradjon.', 'Getting there. It will come up again tomorrow so that it sticks.') : U('Ez még nem megy biztosan. Nézd át a leckét, aztán jöhet egy újabb kör.', 'Not solid yet. Review the lesson, then try another round.')) + '</p>';
    }
    var done = A.ui.back === 'vizsga' ? 'vizsgak' : A.ui.back;
    if (u.topics) return h + '<div class="btn-row">' + btn(U('Még egy vegyes kör', 'Another mixed round'), 'vegyes', u.mixed, 'ghost grow') + btn(U('Kész', 'Done'), 'nav', done, 'primary grow') + '</div></div>';
    return h + '<div class="btn-row">' + btn(U('Még egy kör', 'Another round'), 'gyak', u.topic, 'ghost grow') + btn(U('Kész', 'Done'), 'nav', done, 'primary grow') + '</div></div>';
  };

  V.terkep = function () {
    var t = track(), counts = {}, cats = {}, any = false, es = examStats(), h = '<div class="stack"><div><h1>' + U('Tudástérkép', 'Knowledge map') + '</h1><p class="muted">' + U('A vizsga 8 feladata és a hozzájuk tartozó leckék: mit tudsz már, és hol van még megszerezhető pont.', 'The 8 tasks of the exam and their lessons: what you already know, and where there are still points to gain.') + '</p></div>';
    t.ids.forEach(function (id) {
      ((A.S.topics[canon(id)] || {}).hist || []).forEach(function (x) {
        any = true;
        if (x.s < 0.5 && x.err) { counts[x.err] = (counts[x.err] || 0) + 1; var c = (KO.errs[x.err] || KO.errs.egyeb).c; cats[c] = (cats[c] || 0) + 1; }
      });
    });
    if (!any) h += '<p class="muted">' + U('Még nincs adat. Oldj meg egy gyakorló kört vagy egy próbavizsgát, és itt megjelenik, mi megy már, és mit érdemes gyakorolni.', 'No data yet. Do a practice round or a mock exam, and this page will show what you already know and what to practise.') + '</p>';
    else {
      h += '<div class="rule"><div class="eyebrow">' + U('Most ezt gyakorold', 'Practise this now') + '</div><p>' + recText(rec()) + '</p>' + btn(U('Gyakorlom', 'Practise'), 'folytat', null, 'primary') + '</div>';
      var gain = t.groups.map(function (g, i) { var st = gstat(g), ex = es.per[i], known = ex.max ? (st.started ? (st.avg / 100 + ex.got / ex.max) / 2 : ex.got / ex.max) : st.avg / 100; return { i: i, left: Math.round(PTS[i] * (1 - known)) }; })
        .filter(function (q) { return q.left > 0; }).sort(function (a, b) { return b.left - a.left; }).slice(0, 3);
      if (gain.length) h += '<div class="card"><div class="eyebrow">' + U('Itt szerezheted a legtöbb pontot', 'Where you can gain the most points') + '</div><ul class="steps">' + gain.map(function (q) {
        return '<li><strong>' + U((q.i + 1) + '. feladat', 'Task ' + (q.i + 1)) + '</strong> – ' + esc(gname(t.groups[q.i])) + ': ' + U('kb. ' + q.left + ' pont még hiányzik a ' + PTS[q.i] + '-ből.', 'about ' + q.left + ' of ' + PTS[q.i] + ' points still missing.') + '</li>';
      }).join('') + '</ul><p class="muted small">' + U('Becslés a leckék szintjéből és a próbavizsgák eredményéből.', 'An estimate from your lesson levels and mock exam results.') + '</p></div>';
    }
    t.groups.forEach(function (g, i) {
      var ex = es.per[i], st = gstat(g);
      h += '<div class="card"><div class="eyebrow">' + U((i + 1) + '. feladat · ' + PTS[i] + ' pont', 'Task ' + (i + 1) + ' · ' + PTS[i] + ' points') + '</div><h2>' + esc(gname(g)) + '</h2>' +
        '<p class="muted small">' + gsub(st) + (ex.max ? ' · ' + U('próbavizsgákon: ', 'in mock exams: ') + Math.round(100 * ex.got / ex.max) + '%' : '') + '</p>' + g.ids.map(levelRow).join('') +
        '<div class="btn-row">' + btn(U('Leckék', 'Lessons'), 'nyit', i, 'ghost') + btn(U('Vegyes gyakorlás', 'Mixed practice'), 'vegyes', i, 'ghost') + '</div></div>';
    });
    var top = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 3);
    if (top.length) {
      var topCat = Object.keys(cats).sort(function (a, b) { return cats[b] - cats[a]; })[0];
      var advice = isEn() ? { 'számolási': 'You understand the material but slip in the calculations. Slow down and check your result.', 'módszerbeli': 'The order of the steps causes problems. Go through the worked examples in the lessons.', 'értelmezési': 'You often compute something other than what the task asks. Read the question again before answering.', 'elméleti': 'Some rules are not solid yet. Reread the rules in the lessons.' } : { 'számolási': 'Érted az anyagot, a számolásnál csúszik el. Lassíts, és ellenőrizd vissza az eredményt.', 'módszerbeli': 'A lépések sorrendjével van gond. Nézd át a kidolgozott példákat a leckékben.', 'értelmezési': 'Gyakran mást számolsz ki, mint amit a feladat kér. Olvasd el még egyszer a kérdést, mielőtt válaszolsz.', 'elméleti': 'Egy-egy szabály még nem ül. Érdemes újra elolvasni a leckék szabályait.' };
      h += '<div class="card"><div class="eyebrow">' + U('Hol hibázol a legtöbbször?', 'Where do you make the most mistakes?') + '</div><ul class="steps">' + top.map(function (k) { return '<li>' + esc(errL(k).l) + ' (' + counts[k] + '×)</li>'; }).join('') +
        '</ul><p class="muted small">' + U('Leggyakoribb hibatípus: ', 'Most common error type: ') + esc(isEn() ? KO.errCatEn[topCat] || topCat : topCat) + '. ' + advice[topCat] + '</p></div>';
    }
    return h + '</div>';
  };

  var SZE_PARTS = ['Függvények: értelmezési tartomány, inverz, transzformációk', 'Határérték: sorozat, függvény, ábrázolás', 'Deriválás: három függvény', 'Függvényvizsgálat: monotonitás vagy konvexitás', 'Érintő, Taylor-polinom, numerikus deriválás', 'Határozatlan és határozott integrál', 'Parciális integrálás, helyettesítés', 'Terület vagy forgástest, numerikus integrálás'];
  var SZE_PARTS_EN = ['Functions: domain, inverse, transformations', 'Limits: sequence, function, sketching', 'Differentiation: three functions', 'Analysing a function: monotonicity or convexity', 'Tangent line, Taylor polynomial, numerical differentiation', 'Indefinite and definite integral', 'Integration by parts, substitution', 'Area or solid of revolution, numerical integration'];

  V.vizsgak = function () {
    var res = A.S.szeRes || [], ex = A.ui.ex;
    var h = '<div class="stack"><div><h1>' + U('Próbavizsga', 'Mock exam') + '</h1><p class="muted">' + U('Széchenyi István Egyetem, Győr – MSTM001. A feladatok a három mintavizsga (A, B, C) anyagára épülnek.', 'Széchenyi István University, Győr – MSTM001. The tasks are built on the material of the three sample exams (A, B, C).') + '</p></div>';
    if (ex) h += '<div class="rule"><div class="eyebrow">' + (ex.done ? U('Legutóbbi vizsgád', 'Your last exam') : U('Folyamatban lévő vizsga', 'Exam in progress')) + '</div><p>' + esc(examTitle(ex.kind)) + (ex.done ? ': ' + ex.score + ' / ' + ex.max + U(' pont', ' points') : '') + '</p>' + btn(ex.done ? U('Megnézem a megoldásokat', 'See the solutions') : U('Folytatom', 'Continue'), 'nav', 'vizsga', 'primary') + '</div>';
    h += '<div class="card"><div class="eyebrow">' + U('Új vizsga', 'New exam') + '</div><p>' + U('Ugyanaz a felépítés, mint a mintavizsgákon: 8 feladat, összesen 100 pont. Minden részfeladatnál 4 válasz közül választasz; a beadás után pontszámot, részletes megoldást és a hozzá tartozó leckét kapod.', 'The same structure as the sample exams: 8 tasks, 100 points in total. For each part you choose from 4 answers; after submitting you get your score, a detailed solution and the matching lesson.') + '</p>' +
      '<div class="btn-row">' + btn(U('Gyakorló vizsga (vegyes)', 'Practice exam (mixed)'), 'vz-start', 'gen', 'primary') + btn(U('A feladatsor', 'Set A'), 'vz-start', 'A', 'ghost') + btn(U('B feladatsor', 'Set B'), 'vz-start', 'B', 'ghost') + btn(U('C feladatsor', 'Set C'), 'vz-start', 'C', 'ghost') + '</div>' +
      '<p class="muted small">' + U('A gyakorló vizsga minden alkalommal új: a feladatok egy része a három mintavizsgából, a többi a program által generált, hasonló feladat. Tipp: előbb papíron oldd meg, utána jelöld be. A valódi vizsgán le kell vezetni a megoldást, és részpontok is járnak.', 'The practice exam is new every time: some tasks come from the three sample exams, the rest are similar tasks generated by the program. Tip: solve it on paper first, then mark your answer. In the real exam you have to write out the solution, and partial credit is given.') + '</p></div>';
    if (res.length) h += '<div class="card"><div class="eyebrow">' + U('Eredményeid', 'Your results') + '</div><ul class="steps">' + res.slice(-8).reverse().map(function (q) { return '<li>' + esc(examTitle(q.kind)) + ': <strong>' + q.score + '</strong> / ' + q.max + U(' pont', ' points') + ' <span class="muted small">(' + esc(q.day) + ')</span></li>'; }).join('') + '</ul></div>';
    h += '<div class="card"><div class="eyebrow">' + U('A vizsga felépítése (A és B minta)', 'Structure of the exam (samples A and B)') + '</div><ol class="steps">' + (isEn() ? SZE_PARTS_EN : SZE_PARTS).map(function (x, k) { return '<li>' + esc(x) + ' <span class="muted small">(' + PTS[k] + U(' pont', ' points') + ')</span></li>'; }).join('') + '</ol><p class="muted small">' + U('A C mintában a pontok kicsit másképp oszlanak meg (13, 13, 12, 13, 13, 10, 12, 14), az összeg itt is 100.', 'In sample C the points are distributed slightly differently (13, 13, 12, 13, 13, 10, 12, 14); the total is 100 here too.') + '</p></div>';
    return h + '<p class="note">' + U('Nem hivatalos anyag: a Széchenyi István Egyetem nem hagyta jóvá. A feladatok a nyilvános mintavizsgák mintájára készültek; a pontozás a mintavizsga feladatonkénti pontszámait követi, a részfeladatokon belüli felosztás becslés.', 'Unofficial material: not endorsed by Széchenyi István University. The tasks follow the public sample exams; the scoring follows the points per task of the sample exams, and the split between the parts of a task is an estimate.') + '</p></div>';
  };

  V.vizsga = function () {
    var ex = A.ui.ex, h = '<div class="stack"><div><h1>' + esc(examTitle(ex.kind)) + '</h1><p class="muted small">' + U('8 feladat, ', '8 tasks, ') + ex.items.reduce(function (a, it) { return a + it.pts; }, 0) + U(' pont. ', ' points. ') + (ex.done ? U('Beadva.', 'Submitted.') : U('Jelöld be a válaszaidat, aztán add be.', 'Mark your answers, then submit.')) + '</p></div>';
    if (ex.done) {
      var pc = Math.round(100 * ex.score / ex.max), cls = pc >= 75 ? 'ok' : pc >= 50 ? 'info' : 'err';
      h += '<div class="card"><div class="eyebrow">' + U('Eredmény', 'Result') + '</div><div class="strong vz-score">' + ex.score + ' / ' + ex.max + U(' pont', ' points') + ' (' + pc + '%)</div>' + bar(pc, cls, pc + U(' százalék', ' percent')) +
        '<div class="vz-tasks">' + ex.tasks.map(function (T) { var got = 0, mx = 0; ex.items.forEach(function (it) { if (it.no === T.no) { mx += it.pts; if (it.ok) got += it.pts; } }); return '<span class="chip' + (got === mx ? ' ok' : got === 0 ? ' err' : '') + '">' + T.no + '. ' + got + '/' + mx + '</span>'; }).join('') + '</div>' +
        '<p class="muted small">' + U('Itt csak a teljesen jó válasz ér pontot. A hibás részeknél nézd meg a lépésenkénti megoldást és a leckét.', 'Here only a fully correct answer earns points. For the wrong parts, look at the step-by-step solution and the lesson.') + '</p></div>';
    }
    var answered = Object.keys(ex.sel).length;
    ex.tasks.forEach(function (T) {
      var its = ex.items.map(function (it, i) { return [it, i]; }).filter(function (q) { return q[0].no === T.no; });
      h += '<div class="card vz-task"><div class="vz-head"><h2>' + U(T.no + '. feladat', 'Task ' + T.no) + '</h2><span class="chip">' + T.pts + U(' pont', ' points') + '</span>' + (ex.kind === 'gen' ? '<span class="chip">' + (T.src === 'gen' ? U('generált', 'generated') : U(T.src + ' minta', 'sample ' + T.src)) + '</span>' : '') + '</div>';
      its.forEach(function (q) {
        var it = q[0], i = q[1], t = it.task, sel = ex.sel[i];
        h += '<div class="vz-part"><div class="eyebrow">' + it.sub + ') ' + it.pts + U(' pont', it.pts === 1 ? ' point' : ' points') + '</div><p>' + M(t.prompt) + '</p>' + (t.math ? '<div class="math">' + M(t.math) + '</div>' : '') + KO.figure(t.fig);
        h += '<div class="opts' + (t.vtype === 'text' ? ' col' : '') + '" role="group" aria-label="' + U('Válaszlehetőségek', 'Answer options') + '">';
        it.opts.forEach(function (v, j) {
          var right = KO.eqValue(v, t.answer, t.vtype), c = '';
          if (ex.done) c = right ? ' ok' : sel === j ? ' err' : ''; else if (sel === j) c = ' on';
          h += '<button type="button" class="opt' + c + '" data-act="vz-valaszt" data-arg="' + i + ':' + j + '" aria-pressed="' + (sel === j ? 'true' : 'false') + '"' + (ex.done ? ' disabled' : '') + '>' + M(KO.show(v, t.vtype)) + '</button>';
        });
        h += '</div>';
        if (ex.done) {
          var wrongW = sel !== undefined && !it.ok ? t.wrongs.filter(function (x) { return KO.eqValue(x.v, it.opts[sel], t.vtype); })[0] : null;
          h += '<div class="fb ' + (it.ok ? 'ok' : 'err') + '"><div class="fb-head">' + icon(it.ok ? 'ok' : 'warn', 22) + '<span>' + (it.ok ? U('Jó, ' + it.pts + ' pont', 'Correct, ' + it.pts + ' points') : sel === undefined ? U('Nincs válasz, 0 pont', 'No answer, 0 points') : U('Nem jó, 0 pont', 'Wrong, 0 points')) + '</span></div>' +
            (it.ok ? '' : '<p><strong>' + U('Helyes válasz:', 'Correct answer:') + '</strong> ' + M(KO.show(t.answer, t.vtype)) + '</p>') + (wrongW ? '<p>' + M(wrongW.fb) + '</p>' : '') +
            '<div class="btn-row">' + btn(ex.open[i] ? U('Megoldás elrejtése', 'Hide solution') : U('Megoldás lépésenként', 'Step-by-step solution'), 'vz-mutat', i, 'ghost') + btn(U('Lecke: ', 'Lesson: ') + esc(KO.topics[t.topic].name), 'lecke', t.topic, 'ghost') + '</div>';
          if (ex.open[i]) h += '<ol class="steps">' + t.tips.map(function (x) { return '<li>' + M(x) + '</li>'; }).join('') + '</ol>' + (t.solfig ? '<div class="solfig">' + KO.figure(t.solfig) + '</div>' : '');
          h += '</div>';
        }
        h += '</div>';
      });
      h += '</div>';
    });
    if (!ex.done) h += '<div class="card vz-submit"><p class="muted small">' + U(answered + ' / ' + ex.items.length + ' részfeladat megválaszolva.', answered + ' / ' + ex.items.length + ' parts answered.') + '</p>' + btn(U('Beadom', 'Submit'), 'vz-beadom', null, 'primary big') + '</div>';
    else h += '<div class="btn-row">' + btn(U('Új gyakorló vizsga', 'New practice exam'), 'vz-start', 'gen', 'primary grow') + btn(U('Vissza', 'Back'), 'nav', 'vizsgak', 'ghost grow') + '</div>';
    return h + '</div>';
  };

  V.beall = function () {
    var st = A.S.settings, en = isEn();
    var h = '<div class="stack"><h1>' + U('Beállítások', 'Settings') + '</h1>' +
      '<div class="card"><div class="eyebrow">' + U('Nyelv', 'Language') + '</div><div class="seg-row">' + seg('Magyar', 'nyelv', 'hu', !en, ' lang="hu"') + seg('English', 'nyelv', 'en', en, ' lang="en"') + '</div>' +
      '<p class="muted small">' + U('A haladásod nyelvváltáskor megmarad: a két nyelv ugyanazokat a témákat tanítja.', 'Your progress is kept when you switch: both languages teach the same topics.') + '</p></div>' +
      '<div class="card"><div class="eyebrow">' + U('Megjelenés', 'Appearance') + '</div><div class="seg-row">' + seg(U('Automatikus', 'Automatic'), 'tema', 'auto', st.theme === 'auto') + seg(U('Világos', 'Light'), 'tema', 'light', st.theme === 'light') + seg(U('Sötét', 'Dark'), 'tema', 'dark', st.theme === 'dark') + '</div>' +
      '<div class="seg-row">' + seg(U('Nagyobb betű: ', 'Larger text: ') + (st.calm ? U('be', 'on') : U('ki', 'off')), 'calm', '', st.calm) + seg(U('Felolvasás gomb: ', 'Read-aloud button: ') + (st.voice ? U('be', 'on') : U('ki', 'off')), 'hang', '', st.voice) + '</div></div>';
    h += '<div class="card"><div class="eyebrow">' + U('Jelentett hibák: ', 'Reported mistakes: ') + A.S.reports.length + '</div>' +
      (A.S.reports.length ? '<textarea class="reports" readonly aria-label="' + U('Jelentett hibák listája', 'List of reported mistakes') + '" rows="3">' + esc(JSON.stringify(A.S.reports)) + '</textarea><p class="muted small">' + U('Ezt a szöveget másold ki és küldd el a fejlesztőnek: a feladat pontosan újra előállítható belőle.', 'Copy this text and send it to the developer: the task can be reproduced exactly from it.') + '</p>' : '<p class="muted small">' + U('Ha egy feladatban hibát látsz, a „Hibát találtam” gombbal jelezd.', 'If you see a mistake in a task, report it with the "Report a mistake" button.') + '</p>') + '</div>' +
      '<div class="card"><div class="eyebrow">' + U('Adataid', 'Your data') + '</div><p class="muted small">' + U('Minden adat csak ezen az eszközön van. Fiók, hirdetés és követés nincs.', 'All data stays on this device. No account, no ads, no tracking.') + '</p>' +
      (A.ui.confirmReset ? '<div class="btn-row">' + btn(U('Igen, törlök mindent', 'Yes, delete everything'), 'torol', null, 'danger') + btn(U('Mégsem', 'Cancel'), 'megsem', null, 'ghost') + '</div>' : btn(U('Minden adat törlése', 'Delete all data'), 'torol-kerdez', null, 'ghost')) + '</div>' +
      '<p class="note">' + U('Nem hivatalos alkalmazás: a Széchenyi István Egyetem nem hagyta jóvá, és nem helyettesíti az előadást vagy a gyakorlatot. A feladatokat program állítja elő és ellenőrzi; oktatói lektorálás még nem történt.', 'Unofficial app: not endorsed by Széchenyi István University, and it does not replace lectures or seminars. The tasks are generated and checked by a program; they have not been reviewed by a lecturer yet.') + '</p></div>';
    return h;
  };

  /* ---------- Keret ---------- */
  A.view = function () {
    var S = A.S, ui = A.ui, st = S.settings, dark = st.theme === 'dark' || (st.theme === 'auto' && A.prefersDark);
    var sub = ui.screen === 'lecke' || ui.screen === 'gyak' || ui.screen === 'osszegzes' || ui.screen === 'vizsga', back = ui.screen === 'vizsga' ? 'vizsgak' : ui.back;
    var started = ui.screen !== 'kezdes';
    var cls = 'app mood-fokusz' + (dark ? ' dark' : '') + (st.calm ? ' calm' : '') + (started ? '' : ' no-nav');
    var h = '<div class="' + cls + '" lang="' + (isEn() ? 'en' : 'hu') + '"><header class="top">';
    var backLabel = { haladas: U('Vissza a haladáshoz', 'Back to progress'), leckek: U('Vissza a leckékhez', 'Back to lessons'), vizsgak: U('Vissza a próbavizsgához', 'Back to mock exams'), vizsga: U('Vissza a vizsgához', 'Back to the exam'), terkep: U('Vissza a tudástérképhez', 'Back to the knowledge map') }[back] || U('Vissza', 'Back');
    h += sub ? '<button type="button" class="icon-btn" data-act="nav" data-arg="' + back + '" aria-label="' + backLabel + '">' + icon('back', 22) + '</button>' : '';
    h += '<div class="brand"><span class="logo int" aria-hidden="true">∫</span><span class="brand-name">' + U('Matek 1', 'Maths 1') + '</span><span class="chip">SZE · MSTM001</span></div>' +
      '<button type="button" class="icon-btn theme-btn" data-act="tema-valt" aria-label="' + (dark ? U('Váltás világos módra', 'Switch to light mode') : U('Váltás sötét módra', 'Switch to dark mode')) + '">' + icon(dark ? 'sun' : 'moon', 22) + '</button></header>';
    h += '<main class="main scr-' + ui.screen + '" id="main">' + V[ui.screen]() + '</main>';
    if (started) {
      var tabs = [['haladas', U('Haladás', 'Progress'), 'home'], ['leckek', U('Leckék', 'Lessons'), 'path'], ['vizsgak', U('Próbavizsga', 'Mock exam'), 'exam'], ['terkep', U('Tudástérkép', 'Knowledge map'), 'grid'], ['beall', U('Beállítások', 'Settings'), 'set']];
      var curTab = TABS.indexOf(ui.screen) >= 0 ? ui.screen : ui.screen === 'vizsga' ? 'vizsgak' : (ui.back === 'vizsga' ? 'vizsgak' : ui.back);
      h += '<nav class="nav n5" aria-label="' + U('Fő menü', 'Main menu') + '">' + tabs.map(function (t) {
        var cur = curTab === t[0];
        return '<button type="button" class="tab' + (cur ? ' cur' : '') + '" data-act="nav" data-arg="' + t[0] + '"' + (cur ? ' aria-current="page"' : '') + '>' + icon(t[2], 22) + '<span>' + t[1] + '</span></button>';
      }).join('') + '</nav>';
    }
    return h + '</div>';
  };

  /* ---------- Műveletek ---------- */
  function enter(screen) {
    /* Aloldalra lépéskor megjegyezzük, honnan jöttünk (fül vagy a vizsga), oda visz a vissza gomb. */
    if (TABS.indexOf(A.ui.screen) >= 0 || A.ui.screen === 'vizsga') A.ui.back = A.ui.screen;
    A.ui.screen = screen;
  }
  function newTask(s) {
    var t = KO.make(s.ids[s.i], A.S.seed++);
    s.task = t; s.sel = null; s.tips = 0; s.state = 'open'; s.res = null; s.recorded = false; s.inputErr = ''; s.reported = false;
    s.opts = KO.rng(t.seed + 1).shuffle([t.answer].concat(t.wrongs.slice(0, 3).map(function (w) { return w.v; })));
    A.ui.fields = {};
    save();
  }
  function startRound(id) {
    var gens = KO.gensOf(id), s = { topic: id, ids: KO.pickGens(gens, mast(id), ROUND), i: 0, log: [] };
    A.ui.topic = id; A.ui.sess = s; enter('gyak');
    newTask(s);
  }
  /* Vegyes gyakorlás: egy feladat több témájából egy-egy feladat, a gyengébbekkel kezdve. */
  function startMixed(gi) {
    var g = track().groups[gi], seen = [], fresh = [];
    g.ids.forEach(function (id) { (mast(id) === null ? fresh : seen).push(id); });
    seen.sort(function (a, b) { return mast(a) - mast(b); });
    var pool = seen.concat(fresh).slice(0, ROUND), i = 0;
    while (pool.length < ROUND) pool.push(pool[i++ % g.ids.length]);
    pool = KO.rng(A.S.seed++).shuffle(pool);
    var s = { topic: pool[0], mixed: gi, group: gname(g), logT: [], i: 0, log: [] };
    s.ids = pool.map(function (id) { tstate(id).seen = true; return KO.pickGens(KO.gensOf(id), mast(id), 1)[0]; });
    A.ui.topic = pool[0]; A.ui.sess = s; enter('gyak');
    newTask(s);
  }
  function parseInput(t) {
    var f = A.ui.fields, n = String(f.n || '').trim().replace(/−/g, '-'), d = String(f.d || '').trim();
    if (!/^-?\d+$/.test(n)) return { err: U('Írj be egy egész számot.', 'Enter a whole number.') };
    if (t.vtype !== 'frac') return { v: parseInt(n, 10) };
    if (d === '') d = '1';
    if (!/^\d+$/.test(d)) return { err: U('A nevezőbe egész számot írj.', 'Enter a whole number as the denominator.') };
    if (parseInt(d, 10) === 0) return { err: U('A nevező nem lehet nulla.', 'The denominator cannot be zero.') };
    if (parseInt(n, 10) < 0) return { err: U('Itt nincs szükség negatív számra.', 'No negative number is needed here.') };
    return { v: { n: parseInt(n, 10), d: parseInt(d, 10) } };
  }
  function check() {
    var s = A.ui.sess, t = s.task, input;
    if (t.kind === 'choice') {
      if (s.sel === null) return;
      input = s.opts[s.sel];
    } else {
      var p = parseInput(t);
      if (p.err) { s.inputErr = p.err; return; }
      s.inputErr = ''; input = p.v;
    }
    var res = KO.grade(t, input);
    s.res = res; s.state = res.result;
    if (!s.recorded) {
      s.recorded = true;
      var cat = res.err && KO.errs[res.err] ? KO.errs[res.err].c : null;
      var hrec = { s: KO.score(res.result, s.tips, cat), lv: t.level, err: res.err || null, root: res.root ? canon(res.root) : null, t: A.now() };
      var ts = tstate(t.topic);
      ts.hist.push(hrec);
      if (ts.hist.length > 30) ts.hist = ts.hist.slice(-30);
      var key = KO.dayKey(A.now());
      A.S.days[key] = (A.S.days[key] || 0) + 1;
      s.log.push(hrec);
      if (s.logT) s.logT.push(t.topic);
      save();
    }
  }
  function finish() {
    var s = A.ui.sess, sum = 0, right = 0, map = {}, errs = [];
    s.log.forEach(function (x) {
      sum += x.s;
      if (x.s >= 0.8) right++;
      if (x.s < 0.8 && x.err) map[x.err] = (map[x.err] || 0) + 1;
    });
    Object.keys(map).forEach(function (k) { errs.push({ err: k, n: map[k] }); });
    var avg = s.log.length ? sum / s.log.length : 0;
    A.S.sessions++;
    if (s.logT) {
      var per = {}, touched = [];
      s.logT.forEach(function (id, k) { if (!per[id]) { per[id] = []; touched.push(id); } per[id].push(s.log[k].s); });
      touched.forEach(function (id) { KO.schedule(tstate(id), per[id].reduce(function (a, b) { return a + b; }, 0) / per[id].length, A.now()); });
      A.ui.sum = { topic: s.topic, mixed: s.mixed, group: s.group, topics: touched, total: s.log.length, right: right, avg: avg, errs: errs, root: null };
    } else {
      KO.schedule(tstate(s.topic), avg, A.now());
      A.ui.sum = { topic: s.topic, total: s.log.length, right: right, avg: avg, errs: errs, root: loc(KO.rootCause(s.topic, KO.topics, vstate())) };
    }
    A.ui.sess = null; A.ui.screen = 'osszegzes';
    save();
  }

  var ACT = {
    nyelv: function (arg) {
      var l = arg === 'en' ? 'en' : 'hu', changed = A.S.settings.lang !== l;
      A.S.settings.lang = l;
      if (A.ui.screen === 'kezdes') A.ui.screen = 'haladas';
      if (changed) { A.ui.sess = null; A.ui.ex = null; A.ui.demo = null; A.ui.grp = -1; A.ui.q = ''; }
      save();
    },
    nav: function (arg) {
      if (!V[arg]) return;
      if (arg === 'vizsga' && !A.ui.ex) arg = 'vizsgak';
      if (arg === 'leckek' && A.ui.screen !== 'leckek' && TABS.indexOf(A.ui.screen) >= 0) A.ui.q = '';
      if (TABS.indexOf(arg) >= 0) A.ui.back = arg;
      A.ui.screen = arg; A.ui.confirmReset = false;
    },
    nyit: function (arg) { A.ui.grp = Number(arg); A.ui.q = ''; A.ui.back = 'leckek'; A.ui.screen = 'leckek'; },
    csoport: function (arg) { var i = Number(arg); A.ui.grp = A.ui.grp === i ? -1 : i; },
    folytat: function () {
      var r = rec();
      if (!tstate(r.id).seen) ACT.lecke(r.id); else startRound(r.id);
    },
    lecke: function (id) { if (!KO.topics[id]) return; A.ui.topic = id; enter('lecke'); tstate(id).seen = true; newDemo(id, true); save(); },
    'demo-lep': function () { if (A.ui.demo && A.ui.demo.step < 3) A.ui.demo.step++; },
    'demo-uj': function () { newDemo(A.ui.topic, false); save(); },
    gyak: function (id) { tstate(id).seen = true; startRound(id); },
    vegyes: function (arg) { startMixed(Number(arg)); },
    keres: function () { A.ui.q = String(A.ui.fields.q || '').trim(); },
    'keres-torol': function () { A.ui.q = ''; },
    valaszt: function (arg) { var s = A.ui.sess; if (s.state !== 'open') return; s.sel = parseInt(arg, 10); },
    tipp: function () { var s = A.ui.sess; if (s.tips < 3) s.tips++; },
    ellenoriz: function () { if (A.ui.sess && A.ui.sess.state === 'open') check(); },
    ujra: function () { var s = A.ui.sess; s.state = 'open'; s.sel = null; s.res = null; },
    megoldas: function () { A.ui.sess.state = 'shown'; },
    kov: function () {
      var s = A.ui.sess;
      if (s.i < s.ids.length - 1) { s.i++; newTask(s); } else finish();
    },
    jelent: function () {
      var s = A.ui.sess;
      A.S.reports.push({ gen: s.task.gen, seed: s.task.seed, t: KO.dayKey(A.now()) });
      s.reported = true; save();
    },
    felolvas: function () {
      var t = A.ui.sess.task;
      if (isEn()) A.speak(String(t.prompt + (t.math ? '. ' + t.math : '')).replace(/\[\[([^\/\]]+)\/([^\]]+)\]\]/g, '($1) over ($2)').replace(/\^/g, ' to the power ').replace(/−/g, ' minus ').replace(/√/g, ' square root of '), 'en-GB');
      else A.speak(t.say || KO.speech(t.prompt + (t.math ? ' ' + t.math : '')));
    },
    tema: function (arg) { A.S.settings.theme = arg; save(); },
    'tema-valt': function () { var st = A.S.settings, dark = st.theme === 'dark' || (st.theme === 'auto' && A.prefersDark); st.theme = dark ? 'light' : 'dark'; save(); },
    calm: function () { A.S.settings.calm = !A.S.settings.calm; save(); },
    hang: function () { A.S.settings.voice = !A.S.settings.voice; save(); },
    'vz-start': function (arg) { A.ui.ex = KO.szeExam(arg, A.S.seed++, isEn() ? 'en' : 'hu'); A.ui.screen = 'vizsga'; A.ui.back = 'vizsgak'; save(); },
    'vz-valaszt': function (arg) { var ex = A.ui.ex, a = String(arg).split(':'); if (!ex || ex.done) return; var i = Number(a[0]), j = Number(a[1]); if (ex.sel[i] === j) delete ex.sel[i]; else ex.sel[i] = j; },
    'vz-beadom': function () {
      var ex = A.ui.ex; if (!ex || ex.done) return;
      KO.szeGrade(ex);
      var now = A.now();
      ex.items.forEach(function (it) { var ts = tstate(it.task.topic); ts.seen = true; ts.hist.push({ s: it.ok ? 1 : 0, lv: 3, err: null, root: null, t: now }); if (ts.hist.length > 30) ts.hist = ts.hist.slice(-30); });
      var tasks = ex.tasks.map(function (T) { var got = 0, mx = 0; ex.items.forEach(function (it) { if (it.no === T.no) { mx += it.pts; if (it.ok) got += it.pts; } }); return { no: T.no, got: got, max: mx }; });
      (A.S.szeRes || (A.S.szeRes = [])).push({ kind: ex.kind, score: ex.score, max: ex.max, day: KO.dayKey(now), lang: ex.lang, tasks: tasks });
      if (A.S.szeRes.length > 30) A.S.szeRes = A.S.szeRes.slice(-30);
      save();
    },
    'vz-mutat': function (arg) { var ex = A.ui.ex; if (ex) ex.open[arg] = !ex.open[arg]; },
    'torol-kerdez': function () { A.ui.confirmReset = true; },
    megsem: function () { A.ui.confirmReset = false; },
    torol: function () { var l = A.S.settings.lang; KO.store.clear(); A.init(KO.fresh()); A.S.settings.lang = l; A.ui.screen = 'haladas'; save(); }
  };
  A.act = function (name, arg) { if (ACT[name]) ACT[name](arg); };

  /* ---------- Böngésző: kirajzolás és események ---------- */
  if (typeof document !== 'undefined') {
    var root = document.getElementById('app'), lastKey = '';
    try { A.prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { A.prefersDark = false; }
    A.speak = function (text, lang) {
      try {
        var u = new SpeechSynthesisUtterance(text);
        u.lang = lang || 'hu-HU'; u.rate = 0.9;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      } catch (e) { /* nincs beszédhang ezen az eszközön */ }
    };
    var collect = function () {
      var els = root.querySelectorAll('[data-field]');
      for (var i = 0; i < els.length; i++) A.ui.fields[els[i].getAttribute('data-field')] = els[i].value;
    };
    var render = function () {
      /* Újrarajzoláskor ugyanazon a képernyőn megtartjuk a görgetést; új képernyőnél, leckénél vagy feladatnál a tetejére ugrunk. */
      var old = document.getElementById('main'), oldTop = old ? old.scrollTop : 0, oldWin = window.pageYOffset || 0;
      root.innerHTML = A.view();
      document.documentElement.lang = isEn() ? 'en' : 'hu';
      document.title = U('Matek 1 vizsgafelkészítő – SZE MSTM001', 'Mathematics 1 exam prep – SZE MSTM001');
      var key = A.ui.screen + ':' + (A.ui.screen === 'lecke' || A.ui.screen === 'gyak' ? A.ui.topic : '') + ':' + (A.ui.sess ? A.ui.sess.i : '') + ':' + (A.ui.screen === 'vizsga' && A.ui.ex ? A.ui.ex.seed + (A.ui.ex.done ? 'd' : '') : '');
      var main = document.getElementById('main');
      if (main) main.scrollTop = key === lastKey ? oldTop : 0;
      if (key === lastKey) { if (window.pageYOffset !== oldWin) window.scrollTo(0, oldWin); } else window.scrollTo(0, 0);
      lastKey = key;
      if (KO.meres) KO.meres.screen(A.ui.screen + (A.ui.screen === 'lecke' || A.ui.screen === 'gyak' ? '/' + A.ui.topic : '') + (A.ui.screen === 'vizsga' && A.ui.ex ? '/' + A.ui.ex.kind : ''), document.title);
      var fb = root.querySelector('.fb[role="status"], .in-err');
      if (fb && fb.scrollIntoView) fb.scrollIntoView({ block: 'nearest' });
    };
    root.addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('[data-act]') : null;
      if (!b || b.disabled) return;
      collect();
      A.act(b.getAttribute('data-act'), b.getAttribute('data-arg'));
      render();
    });
    root.addEventListener('submit', function (ev) {
      ev.preventDefault();
      collect();
      A.act(ev.target && ev.target.getAttribute && ev.target.getAttribute('data-form') === 'keres' ? 'keres' : 'ellenoriz');
      render();
    });
    A.init();
    render();
    try { if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () {}); } catch (e) { /* nem telepíthető itt */ }
  }
})(globalThis.KO = globalThis.KO || {});

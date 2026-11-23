/* Matek 1 vizsgafelkészítő – automatikus tesztek. Futtatás: node tests/run.js
   1) Minden generátor sok véletlen példányát a generátortól FÜGGETLEN, numerikus módszerrel újraszámoljuk.
   2) A leckék, a mintavizsgák és a gyakorló vizsgák tartalmát mindkét nyelven ellenőrizzük.
   3) Böngésző nélkül végigjárjuk a képernyőket magyarul és angolul. */
'use strict';
var path = require('path');
['core', 'base', 'figures', 'sze1', 'sze2', 'sze3', 'sze4', 'szeen1', 'szeen2', 'szeen3', 'szeen4', 'meres', 'app'].forEach(function (f) { require(path.join(__dirname, '..', 'js', f + '.js')); });
var KO = globalThis.KO, fails = 0, checks = 0;
function ok(cond, msg) { checks++; if (!cond) { fails++; if (fails <= 25) console.log('HIBA: ' + msg); } }

/* ---------- 1) Generátorok ---------- */
var SZ = require('./sze.js')(KO, ok), verify = SZ.verify;
var SEEDS = 400, perGen = {};
ok(Object.keys(KO.tracks).join(',') === 'sze1,sze1en', 'csak a két SZE ösvény van benne');
Object.keys(KO.gens).forEach(function (id) {
  ok(typeof verify[id] === 'function', id + ': nincs független ellenőrző');
  ok(!!KO.topics[KO.gens[id].topic], id + ': ismeretlen téma');
  var variants = {}, en = KO.gens[id].topic.indexOf('szeen-') === 0;
  var bad = en ? /undefined|NaN|(^|[^a-z])null([^a-z]|$)|\[object|--|\+ −|− −|\d,\d/ : /undefined|NaN|(^|[^a-záéíóöőúüű])null([^a-záéíóöőúüű]|$)|\[object|--|\+ −|− −|\d\.\d/;
  for (var s = 1; s <= SEEDS; s++) {
    var t = KO.make(id, s * 2654435761 % 4294967296), tag = id + ' #' + s + ': ';
    variants[JSON.stringify(t.data)] = 1;
    ok(verify[id] && verify[id](t), tag + 'a megoldókulcs nem egyezik a független számítással ' + JSON.stringify(t.data) + ' → ' + JSON.stringify(t.answer));
    ok(t.wrongs.length >= 2, tag + 'kevesebb mint 2 hibás válasz');
    ok(t.tips.length === 3 && t.tips.every(function (x) { return typeof x === 'string' && x.length > 3; }), tag + 'a három tipp hiányos');
    ok(t.prompt && t.solution, tag + 'hiányzó szöveg');
    ok(KO.grade(t, t.answer).result === 'right', tag + 'a jó választ nem fogadja el');
    t.wrongs.forEach(function (w) {
      var r = KO.grade(t, w.v);
      ok(r.result === 'wrong' && r.fb === w.fb, tag + 'a hibás válasz értékelése rossz');
      ok(!!KO.errs[w.err], tag + 'ismeretlen hibakód: ' + w.err);
      ok(!en || !!KO.errsEn[w.err], tag + 'hiányzó angol hibatípus: ' + w.err);
      ok(typeof w.fb === 'string' && w.fb.length > 10, tag + 'hiányzó visszajelzés');
    });
    if (t.vtype === 'frac') {
      ok(KO.grade(t, { n: t.answer.n * 2, d: t.answer.d * 2 }).result === 'almost', tag + 'a nem egyszerűsített alak nem „majdnem”');
      t.wrongs.forEach(function (w) { ok(w.v.d > 0 && w.v.n >= 0, tag + 'érvénytelen tört a hibás válaszok között'); });
    }
    var all = [t.prompt, t.math || '', t.solution].concat(t.tips, t.wrongs.map(function (w) { return w.fb; }), t.wrongs.map(function (w) { return KO.show(w.v, t.vtype); })).join(' | ');
    ok(!bad.test(all), tag + 'hibás szöveg: ' + all.slice(0, 160));
    var html = KO.math(all) + KO.figure(t.fig) + KO.figure(t.solfig);
    ok(html.indexOf('[[') < 0 && !/undefined|NaN|Infinity/.test(html), tag + 'a megjelenítés hibás');
    if (t.fig) ok(KO.figure(t.fig).length > 80, tag + 'üres ábra');
    if (t.solfig) ok(KO.figure(t.solfig).length > 80, tag + 'üres megoldásábra');
  }
  perGen[id] = Object.keys(variants).length;
});

/* ---------- 2) Leckék és témák ---------- */
['sze1', 'sze1en'].forEach(function (k) {
  var tr = KO.tracks[k];
  ok(tr.ids.length === 24 && tr.groups.length === 8, k + ': 24 lecke, 8 feladat');
  ok(tr.groups.every(function (g) { return g.ids.length >= 2; }), k + ': minden feladathoz legalább két lecke');
  tr.ids.forEach(function (id) {
    var tp = KO.topics[id];
    ok(!!tp && tp.lesson.length >= 5, id + ': hiányzó vagy rövid lecke');
    ok(KO.gensOf(id).length >= 1, id + ': nincs feladatgenerátor');
    tp.pre.forEach(function (p) { ok(!!KO.topics[p] && tr.ids.indexOf(p) >= 0, id + ': ismeretlen vagy más nyelvű előfeltétel ' + p); });
    var how = tp.lesson.filter(function (b) { return b.h === 'Hogyan gondolkodj?'; });
    ok(how.length === 1 && how[0].x.length >= 80 && tp.lesson.indexOf(how[0]) <= 1, id + ': a „Hogyan gondolkodj?” blokk hiányzik vagy rossz helyen van');
    tp.lesson.forEach(function (b) {
      var txt = [b.x || '', b.cap || '', b.math || ''].concat(b.s || []).join(' ');
      ok(KO.math(txt).indexOf('[[') < 0, id + ': lecke-jelölés hibás');
      if (b.fig) ok(KO.figure(b.fig).length > 50 && !/NaN|undefined/.test(KO.figure(b.fig)), id + ': lecke-ábra hibás');
    });
  });
  ok(KO.tracks.sze1.ids.every(function (id, i) { return KO.tracks.sze1en.ids[i] === id.replace('sze-', 'szeen-'); }), 'a két nyelv leckéi párban vannak');
});
SZ.examTests();

/* ---------- 3) Képernyők végigjárása böngésző nélkül ---------- */
var A = KO.app, clock = Date.UTC(2026, 10, 23, 9);
A.now = function () { return clock; };
function view(tag) {
  var h = A.view();
  ok(!/undefined|NaN|\[object|Infinity/.test(h.replace(/<[^>]*aria-label="[^"]*"/g, '')), tag + ': hibás szöveg a képernyőn');
  ok(h.indexOf('[[') < 0, tag + ': feldolgozatlan jelölés');
  return h;
}
function mainText(html) { var m = html.match(/<main[^>]*>([\s\S]*)<\/main>/); return (m ? m[1] : html).replace(/<[^>]+>/g, ' ').replace(/Széchenyi István|Győr|Magyar/g, ''); }
var huLeft = /[áéíóöőúüű]|\b(feladat|pont|lecke|Gyakorlás|Vissza|Beadom|Megoldás)\b/i;
var removed = /Kisötös|Paca|Napi cél|Daily goal|Ösvény|érettségi|osztály|matrica/i;
function answerRight(it) { return it.opts.findIndex(function (v) { return KO.eqValue(v, it.task.answer, it.task.vtype); }); }

A.init(KO.fresh());
var h0 = view('kezdés');
ok(A.ui.screen === 'kezdes' && h0.indexOf('data-act="nyelv" data-arg="hu"') >= 0 && h0.indexOf('data-act="nyelv" data-arg="en"') >= 0 && h0.indexOf('class="nav') < 0, 'az első képernyőn nyelvet választunk, menü nélkül');

['hu', 'en'].forEach(function (lang) {
  var en = lang === 'en', trk = en ? 'sze1en' : 'sze1', L = en ? 'EN ' : 'HU ';
  A.init(KO.fresh()); A.act('nyelv', lang);
  ok(A.ui.screen === 'haladas', L + 'nyelvválasztás után a haladás jön');
  var tabs = ['haladas', 'leckek', 'vizsgak', 'terkep', 'beall'];
  tabs.forEach(function (sc) {
    A.act('nav', sc); var hv = view(L + sc);
    ok(!removed.test(mainText(hv)) && !/Kisötös/.test(hv), L + sc + ': nincs benne az SZE-hez nem tartozó rész: ' + (mainText(hv).match(removed) || [''])[0]);
    ok(tabs.every(function (t) { return hv.indexOf('data-act="nav" data-arg="' + t + '"') >= 0; }), L + sc + ': az öt fül látszik');
    if (en) ok(!huLeft.test(mainText(hv)), L + sc + ': angol: ' + (mainText(hv).match(huLeft) || [''])[0]);
  });
  A.act('nav', 'haladas'); var hh = view(L + 'haladás üresen');
  ok(hh.indexOf(en ? 'Your progress' : 'Haladásod') >= 0 && hh.indexOf('class="ring"') >= 0 && !/Napi cél|Daily goal/.test(hh), L + 'a főoldalon a haladás látszik, nem napi cél');
  ok((hh.match(/class="prow"/g) || []).length === 8, L + 'a főoldalon a 8 vizsgafeladat haladása');
  ok(hh.indexOf(en ? 'not started yet' : 'még nem kezdted el') >= 0 && !/\b0 erős|\b0 strong/.test(hh), L + 'üresen nem ír „0 erős”-et');
  A.act('nav', 'leckek'); var hl = view(L + 'leckék');
  ok(hl.indexOf(en ? '>Lessons<' : '>Leckék<') >= 0 && !/\b0 erős|\b0 strong/.test(hl), L + 'a leckék fül neve és összefoglalója');
  KO.tracks[trk].groups.forEach(function (g, gi) {
    A.act('csoport', String(gi)); var hv = view(L + 'leckék ' + gi);
    ok(g.ids.every(function (id) { return hv.indexOf('data-act="lecke" data-arg="' + id + '"') >= 0; }), L + 'a megnyitott feladat minden leckéje látszik (' + gi + ')');
  });
  A.ui.fields.q = en ? 'tangent' : 'érintő'; A.act('keres'); ok(view(L + 'keresés').indexOf('class="hit"') >= 0, L + 'a keresés talál');
  A.ui.fields.q = 'zzzz'; A.act('keres'); ok(/Nincs ilyen nevű lecke|No lesson with this name/.test(view(L + 'üres keresés')), L + 'üres találat jelezve');
  A.act('keres-torol');

  /* Minden lecke és egy teljes kör minden leckéből. */
  KO.tracks[trk].ids.forEach(function (id, n) {
    A.act('nav', 'leckek'); A.act('lecke', id);
    var hv = view(L + 'lecke ' + id);
    ok(A.ui.screen === 'lecke' && hv.indexOf('data-act="nav" data-arg="leckek"') >= 0, L + id + ': a leckéből vissza lehet lépni a leckékhez');
    if (en) ok(!huLeft.test(mainText(hv)), L + id + ': a lecke angol: ' + (mainText(hv).match(huLeft) || [''])[0]);
    A.act('demo-lep'); A.act('demo-lep'); A.act('demo-lep'); ok(/Gyakori hiba|Common mistake/.test(view(L + 'példa ' + id)), L + id + ': a példa végén a gyakori hiba');
    A.act('gyak', id);
    for (var q = 0; q < 5; q++) {
      var s = A.ui.sess, wrongIdx = s.opts.findIndex(function (v) { return !KO.eqValue(v, s.task.answer, s.task.vtype); }), rightIdx = s.opts.findIndex(function (v) { return KO.eqValue(v, s.task.answer, s.task.vtype); });
      var pick = (q + n) % 3 === 0 ? wrongIdx : rightIdx;
      if (s.task.kind === 'choice') A.act('valaszt', String(pick));
      else A.ui.fields = { n: String(s.task.answer.n !== undefined ? s.task.answer.n : s.task.answer), d: String(s.task.answer.d || '') };
      if ((q + n) % 4 === 1) A.act('tipp');
      A.act('ellenoriz'); var hs = view(L + 'gyakorlás ' + id + ' ' + q);
      if (en) ok(!huLeft.test(mainText(hs)), L + id + ': a gyakorlás angol: ' + (mainText(hs).match(huLeft) || [''])[0]);
      if (A.ui.sess.state === 'wrong') { A.act('megoldas'); view(L + 'megoldás ' + id); }
      A.act('kov');
    }
    ok(A.ui.screen === 'osszegzes', L + id + ': a kör végén összegzés');
    var ho = view(L + 'összegzés ' + id); if (en) ok(!huLeft.test(mainText(ho)), L + id + ': az összegzés angol');
    ok(ho.indexOf('data-act="nav" data-arg="leckek"') >= 0, L + id + ': a Kész gomb a leckékhez visz vissza');
  });
  A.act('nav', 'haladas'); var hp = view(L + 'haladás adatokkal');
  ok(hp.indexOf('24 / 24') >= 0, L + 'a haladás mutatja, hogy minden lecke el van kezdve');
  ok(!/\b0 erős|\b0 strong/.test(hp), L + 'adatokkal sem ír „0 erős”-et');
  A.act('nyit', '3'); ok(A.ui.screen === 'leckek' && A.ui.grp === 3, L + 'a főoldali sorra koppintva megnyílik a feladat leckéi');
  A.act('vegyes', '4'); ok(A.ui.screen === 'gyak' && A.ui.sess.ids.length === 5 && KO.tracks[trk].groups[4].ids.indexOf(A.ui.sess.task.topic) >= 0, L + 'vegyes gyakorlás');
  for (var mq = 0; mq < 5; mq++) { var ms = A.ui.sess; if (ms.task.kind === 'choice') A.act('valaszt', '0'); else A.ui.fields = { n: '1', d: '1' }; A.act('ellenoriz'); if (A.ui.sess.state === 'wrong' || A.ui.sess.state === 'almost') A.act('megoldas'); A.act('kov'); }
  ok(A.ui.screen === 'osszegzes' && A.ui.sum.topics, L + 'a vegyes kör összegzése');

  /* Próbavizsgák: kitöltés, beadás, megoldások, leckére ugrás és vissza a vizsgához. */
  ['A', 'B', 'C', 'gen', 'gen'].forEach(function (k, n) {
    A.act('nav', 'vizsgak'); A.act('vz-start', k); var ex = A.ui.ex;
    ok(A.ui.screen === 'vizsga' && ex.kind === k && ex.lang === lang && ex.items.every(function (it) { return it.task.topic.indexOf(en ? 'szeen-' : 'sze-') === 0; }), L + k + ': a vizsga a választott nyelven indul');
    var v0 = view(L + k + ' vizsga'); if (en) ok(!huLeft.test(mainText(v0)), L + k + ': a vizsga angol: ' + (mainText(v0).match(huLeft) || [''])[0]);
    var mode = n % 3;
    ex.items.forEach(function (it, i) { var r = answerRight(it), w = r === 0 ? 1 : 0; A.act('vz-valaszt', i + ':' + (mode === 0 ? r : mode === 1 ? w : (i % 2 ? r : w))); });
    A.act('vz-beadom');
    var exp = ex.items.reduce(function (a, it, i) { return a + (KO.eqValue(it.opts[ex.sel[i]], it.task.answer, it.task.vtype) ? it.pts : 0); }, 0);
    ok(ex.done && ex.score === exp && (mode !== 0 || ex.score === 100) && (mode !== 1 || ex.score === 0), L + k + ': a pontszám helyes (' + ex.score + ')');
    ex.items.forEach(function (it, i) { A.act('vz-mutat', String(i)); });
    var vd = view(L + k + ' megoldásokkal'); ok(vd.indexOf(ex.score + ' / ' + ex.max + (en ? ' points' : ' pont')) >= 0, L + k + ': az eredmény látszik');
    if (en) ok(!huLeft.test(mainText(vd)), L + k + ': a megoldások angolul');
    A.act('lecke', ex.items[0].task.topic); var vl = view(L + k + ' lecke a vizsgából');
    ok(vl.indexOf('data-act="nav" data-arg="vizsga"') >= 0, L + k + ': a leckéből vissza lehet lépni a vizsgához');
    A.act('nav', 'vizsga'); ok(A.ui.screen === 'vizsga' && A.ui.ex === ex, L + k + ': a vizsga megmarad');
  });
  ok((A.S.szeRes || []).length === 5 && A.S.szeRes.every(function (q) { return q.tasks.length === 8; }), L + 'öt vizsgaeredmény feladatonkénti pontokkal mentve');
  A.act('nav', 'vizsgak'); ok(view(L + 'vizsgák eredménnyel').indexOf(en ? 'Your results' : 'Eredményeid') >= 0, L + 'az eredmények a próbavizsga fülön');
  A.act('nav', 'haladas'); ok(/Legutóbb|Last:/.test(view(L + 'haladás vizsgával')), L + 'a főoldal mutatja a legutóbbi próbavizsgát');
  A.act('nav', 'terkep'); var ht = view(L + 'tudástérkép');
  ok((ht.match(en ? /Task \d · \d+ points/g : /\d\. feladat · \d+ pont/g) || []).length === 8, L + 'a tudástérkép a vizsga 8 feladata szerint épül fel');
  ok(/próbavizsgákon|in mock exams/.test(ht), L + 'a tudástérkép összeköti a leckéket a próbavizsgák eredményével');
  ok(/Itt szerezheted a legtöbb pontot|Where you can gain the most points/.test(ht), L + 'a tudástérkép megmutatja, hol van a legtöbb megszerezhető pont');
  KO.tracks[trk].ids.forEach(function (id) { ok(ht.indexOf(KO.topics[id].name.replace(/&/g, '&amp;')) >= 0, L + 'a tudástérképen ott van: ' + id); });
});

/* A haladás közös a két nyelvben. */
A.init(KO.fresh()); A.act('nyelv', 'hu'); A.act('gyak', 'sze-lanc');
for (var c = 0; c < 5; c++) { A.act('valaszt', String(A.ui.sess.opts.findIndex(function (v) { return KO.eqValue(v, A.ui.sess.task.answer, A.ui.sess.task.vtype); }))); A.act('ellenoriz'); A.act('kov'); }
var mHu = KO.mastery(A.S.topics['sze-lanc'].hist);
A.act('nyelv', 'en'); A.act('nav', 'terkep');
ok(mHu > 0 && view('EN térkép közös haladással').indexOf('strong · ' + mHu) >= 0 || view('EN térkép').indexOf(' · ' + mHu + '<') >= 0, 'a magyarul gyakorolt téma angolul is látszik');
ok(!A.S.topics['szeen-lanc'], 'az angol téma nem külön bejegyzés');
var rr = A.view(); ok(rr.indexOf('lang="en"') >= 0, 'angol nyelvjelölés a képernyőn');
A.act('nav', 'beall'); A.act('nyelv', 'hu'); ok(A.ui.screen === 'beall' && view('beállítás vissza magyarra').indexOf('Beállítások') >= 0, 'a beállításokban vissza lehet váltani magyarra');
A.act('torol-kerdez'); A.act('torol'); ok(Object.keys(A.S.topics).length === 0 && A.S.settings.lang === 'hu' && A.ui.screen === 'haladas', 'adattörlés után a nyelv megmarad');

/* ---------- Összegzés ---------- */
var total = 0;
Object.keys(perGen).forEach(function (id) { total += perGen[id]; });
console.log(Object.keys(KO.gens).length + ' generátor, ' + Object.keys(KO.gens).length * SEEDS + ' legenerált feladat, ' + total + ' különböző változat.');
console.log(checks + ' ellenőrzés, ' + fails + ' hiba.');
process.exit(fails ? 1 : 0);

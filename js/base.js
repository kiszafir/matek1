/* Matek 1 vizsgafelkészítő – keretrendszer: hibakatalógus, témák és ösvények tárolója, feladatgenerátorok.
   A tananyag (leckék, generátorok, mintavizsgák) a sze*.js (magyar) és szeen*.js (angol) fájlokban van. */
(function (KO) {
  'use strict';

  /* ---------- Hibakatalógus: kód → megnevezés és hibatípus ---------- */
  KO.errs = {
    'kerdes-felreertes': { l: 'a kérdés félreértése', c: 'értelmezési' },
    'tartomany-hiba': { l: 'egy feltétel kimaradt az értelmezési tartománynál', c: 'módszerbeli' },
    'vegpont-hiba': { l: 'nyitott és zárt végpont összekeverése', c: 'számolási' },
    'nem-osztott': { l: 'az osztás elmaradt', c: 'módszerbeli' },
    'elojel': { l: 'előjelhiba', c: 'számolási' },
    'ellenkezo-irany': { l: 'az egyenlőtlenség iránya megfordult', c: 'számolási' },
    'felcserelte': { l: 'számláló és nevező felcserélése', c: 'értelmezési' },
    'elmeleti-tevhit': { l: 'téves szabály', c: 'elméleti' },
    'muvelet-csere': { l: 'másik műveletet végeztél', c: 'értelmezési' },
    'negyzet-elmaradt': { l: 'a négyzetre emelés elmaradt', c: 'számolási' },
    'domin-tag': { l: 'nem a domináns tagok döntenek a határértékről', c: 'módszerbeli' },
    'gyokvonas-elmaradt': { l: 'a gyökvonás elmaradt', c: 'számolási' },
    'eggyel-el': { l: 'eggyel elszámoltad', c: 'számolási' },
    'konstans-elmaradt': { l: 'a konstans tag lemaradt', c: 'számolási' },
    'integral-derivalt': { l: 'integrálás helyett deriváltál (vagy fordítva)', c: 'elméleti' },
    'szorzat-hiba': { l: 'a szorzatot vagy hányadost tényezőnként deriváltad', c: 'elméleti' },
    'lanc-elmaradt': { l: 'a belső függvény deriváltja lemaradt (láncszabály)', c: 'módszerbeli' },
    'nem-egyszerusitett': { l: 'az eredmény nincs egyszerűsítve', c: 'módszerbeli' },
    'reszleges-szamolas': { l: 'félbehagyott számolás', c: 'módszerbeli' },
    'felezes-elmaradt': { l: 'a felezés elmaradt', c: 'számolási' },
    'keplet-hiba': { l: 'rossz képlet vagy rossz súlyok', c: 'elméleti' },
    'egyeb': { l: 'egyéb hiba', c: 'értelmezési' }
  };

  /* ---------- Témakörök és témák (előfeltétel-gráf); a tartalomfájlok töltik fel ---------- */
  KO.tracks = {};
  KO.topics = {};

  /* ---------- Feladatgenerátorok ---------- */
  var G = {};
  function reg(topic, id, level, make) { if (G[id]) throw new Error('Kétszer regisztrált feladattípus: ' + id); G[id] = { id: id, topic: topic, level: level, make: make }; }
  KO.gens = G;
  KO.reg = reg;
  KO.gensOf = function (topicId) {
    return Object.keys(G).filter(function (k) { return G[k].topic === topicId; }).map(function (k) { return G[k]; });
  };
  KO.make = function (genId, seed) {
    var g = G[genId], r = KO.rng(seed), t = null;
    for (var i = 0; i < 40; i++) {
      t = KO.task(g.make(r));
      if (t.wrongs.length >= 2) break;
    }
    t.gen = genId; t.seed = seed; t.topic = g.topic; t.level = g.level;
    if (!t.points) t.points = [1, 2, 2, 3, 4][g.level - 1];
    if (!t.minutes) t.minutes = g.level + 1;
    return t;
  };

  /* Témakörön belül az előfeltételek kerülnek előre; a track teljes listája a témakörök sorrendjét követi. */
  KO.regroup = function () {
    Object.keys(KO.tracks).forEach(function (k) {
      var tr = KO.tracks[k], ids = [];
      tr.groups.forEach(function (g) {
        var rest = g.ids.slice(), sorted = [];
        while (rest.length) {
          var pick = 0;
          for (var j = 0; j < rest.length; j++) {
            if (KO.topics[rest[j]].pre.every(function (p) { return rest.indexOf(p) < 0; })) { pick = j; break; }
          }
          sorted.push(rest.splice(pick, 1)[0]);
        }
        g.ids = sorted; ids = ids.concat(sorted);
      });
      tr.ids = ids;
    });
  };
})(globalThis.KO = globalThis.KO || {});

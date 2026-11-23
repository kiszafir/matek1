# Matek 1 vizsgafelkészítő – SZE MSTM001

Felkészítő alkalmazás a Széchenyi István Egyetem (Győr) **Matematika 1 (MSTM001)** vizsgájára, magyarul és angolul (angol nyelvű képzésekhez).
Minden lecke és feladat a három nyilvános mintavizsga (A, B, C) anyagára épül, a megértéshez szükséges előzményekkel együtt.

*Exam prep for Mathematics 1 (MSTM001) at Széchenyi István University, in Hungarian and in English.*

## Mit tud?

| Rész | Leírás |
|---|---|
| Haladás | A főoldal: összesített szint, a vizsga 8 feladatának haladása, a legutóbbi próbavizsga eredménye feladatonként, gyenge pontok és a következő ajánlott lépés |
| Leckék | 24 részletes lecke a vizsga 8 feladata szerint csoportosítva, ábrákkal, kidolgozott mintavizsga-feladatokkal, lépésenként felfedhető példával; leckénként gyakorlás és feladatonként vegyes gyakorlás |
| Próbavizsga | A három mintavizsga teljes megoldással, és mindig új gyakorló vizsga (8 feladat, 100 pont, pontozással, lépésenkénti megoldással és a hozzá tartozó leckével) |
| Tudástérkép | A vizsga 8 feladata a pontértékükkel és a leckéikkel; a leckék szintje és a próbavizsgák eredménye együtt, becslés arról, hol szerezhető a legtöbb pont, és a leggyakoribb hibatípusok |
| Két nyelv | Magyar és angol (angol jelöléssel: tizedespont, [a, b] intervallum, (x, y) pont); a haladás közös, nyelvváltáskor megmarad |

A feladatokat program állítja elő (66 feladattípus, nyelvenként 33), és minden példányt egy tőle független, numerikus ellenőrző számol újra.
A haladás csak az eszközön tárolódik (localStorage), fiók és követés nincs. Telepíthető webalkalmazás (PWA), net nélkül is működik.

## Futtatás

Nincs build lépés: az `index.html` bármilyen statikus tárhelyről (például GitHub Pages) vagy helyben megnyitva fut.

```
node tests/run.js
```

A tesztek böngésző nélkül futnak: minden generátorból 400 példányt ellenőriznek független számítással, átnézik a leckéket, a mintavizsgákat és a gyakorló vizsgákat mindkét nyelven, és végigjárják az összes képernyőt.

## Fájlok

```
index.html        az oldal; a szkriptek sorrendje számít
css/app.css       a megjelenés (világos és sötét mód)
js/core.js        tudásszint, ismétlés, ajánló, mentés
js/base.js        hibakatalógus, feladatgenerátor-keret
js/figures.js     jelölés ([[a/b]] tört, x^2, √(…)) és ábrák: grafikon, számegyenes, előjeltáblázat, értéktáblázat
js/sze1.js        1. (függvények) és 2. (határérték) feladat anyaga, közös segédek
js/sze2.js        3. (deriválás), 4. (függvényvizsgálat), 5. (érintő, Taylor, numerikus deriválás) feladat
js/sze3.js        6. (integrálás), 7. (integrálási módszerek), 8. (terület, forgástest, numerikus integrálás) feladat
js/sze4.js        az A, B, C mintavizsga teljes megoldással, a gyakorló vizsga összeállítása és pontozása
js/szeen1-4.js    ugyanez angolul
js/app.js         a felület: képernyők és műveletek
tests/            független ellenőrzők és a képernyők tesztje
sw.js             offline működés
```

## Megjegyzés

Nem hivatalos alkalmazás: a Széchenyi István Egyetem nem hagyta jóvá, és nem helyettesíti az előadást vagy a gyakorlatot.
A pontozás a mintavizsgák feladatonkénti pontszámait követi; a részfeladatokon belüli felosztás becslés.

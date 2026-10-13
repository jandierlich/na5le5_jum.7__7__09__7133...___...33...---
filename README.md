# WahrZentrale

Alle Wahr-Apps in **einer** Web-App (PWA) fürs Smartphone – ein Design, ein
Standort, eine Sicherung, ein Impressum. Komplett lokal, ohne Konto, ohne
Werbung, ohne Tracking.

## Bereiche und Apps

| Bereich | Apps |
|---|---|
| Himmel | HimmelsWahr (`hw-`), Sternenhimmel (ZeitHimmel; `sternewahr-`, Symbol `zh-`), AstroWahr (`as-`), KompassWahr (`kw-`), HorizontWahr (`hz-`), StaunWahr (`sn-`) |
| Unterwegs | NaviWahr (`wk-`), Keysglade (`kg-`), WowarWahr (`wow-`), BelegParkWahr (`bp-`) |
| Alltag | AlltagWahr (`aw-`), ProduktWahr (`pw-`), VorratsWahr (`vw-`), LosDenkWahr (`ld-`), QRWahr (`qr-`), LautstärkeWahr (`lw-`), MessWahr (`mw-`), LabWahr (`lb-`) |
| Spiel & Klang | AufwindWahr (`af-`), ZahlenturmWahr (`zw-`), Korvanthiel (`kv-`), HerzKaroDrei (`hk-`), PartikelWahr (`pk-`), StrömungsWahr (`st-`), BeatWahr (`bw-`), KlangWahr (`kl-`) |

`index.html` ist die Startseite mit „Heute“, Suche über alle Apps und
Einträge sowie den vier Bereichen.

## Gemeinsamer Kern

| Datei | Zweck |
|---|---|
| `wz-theme.js` | ein Hell-/Dunkel-Schalter für alles (Start immer hell), kein Zwei-Finger-Zoom; Farbwelt: „Nachthimmel“ (Standard) oder eine eigene, in den Einstellungen mit zwei Reglern (Farbton, Farbstärke) gemischte Farbwelt für alle Apps (`wz_palette`, `wz_palette_custom`). Umgefärbt werden nur die violetten Töne der Oberfläche bei gleicher Helligkeit; die Werte werden beim Laden berechnet, es gibt keine eigene Farbdatei mehr |
| `wz-core.js` | ein Standort, eine Karten-Einwilligung, Heimknopf, Hinweis auf neue Version |
| `wz-unify.css` | ein Erscheinungsbild („Nachthimmel“-Palette) für alle Apps |
| `wz-common.css`, `wz-ui.js`, `wz-onboarding.js`, `wz-shared.js` | gemeinsame Bausteine |
| `wz-apps.js`, `wz-hub.js` | Verzeichnis der Apps, Startseite, Suche |
| `wz-sichern.html`, `wz-backup.js` | eine Sicherung aller Daten (ZIP) und Wiederherstellen |
| `wz-einstellungen.html` | Darstellung, Standort, Karten, Speicher, alles löschen |
| `wz-scan.html` | **ein** Scanner für alles (Knopf im Suchfeld): Barcode → ProduktWahr, QR-Code → QRWahr, Kassenbon/Parkschein → BelegParkWahr, Etikett → VorratsWahr, Zutaten → ProduktWahr. Erkennung lokal (ZXing, Tesseract); Übergabe über `sessionStorage` (`wz_scan_handoff`, wird von `wzScanHandoff()` in `wz-core.js` abgeholt und sofort gelöscht) |
| Schnelleingabe, „Hier merken“ | in `wz-hub.js`: Der Text im Suchfeld kann als Gedanke (LosDenkWahr), Beleg/Parkschein (BelegParkWahr), Vorrat (VorratsWahr) oder wiederkehrende Ausgabe (AlltagWahr) angelegt werden; „Hier merken“ legt den Standort als Wegpunkt in KompassWahr (`kw-waypoints`) oder als Ort in WowarWahr ab. Übergabe wie beim Scanner über `wz_scan_handoff` |
| Sonnenbahn | in `hw-kompass.html`: Kamera-Ansicht mit der heutigen Sonnenbahn als Messlinie (Gradnetz, Azimut-Skala, Stundenmarken, Aufgang, Höchststand, Untergang) samt Uhrzeit im Fadenkreuz |
| Poster | in `sternewahr-app.js`: Poster des Sternenhimmels zum Teilen (2160 px breit) oder für den Druck (3240 px breit), mit Titel und Widmung |
| Unterbrochene Aufzeichnung | in `wk-app.js`: NaviWahr legt den Stand einer laufenden Aufzeichnung alle 20 Sekunden, beim Pausieren, nach jeder Notiz und beim Wechsel in den Hintergrund in der Datenbank `naviwahr` (Speicher `laufend`) ab. Schließt das System die App, bietet NaviWahr beim nächsten Öffnen „Fortsetzen“, „Beenden und ansehen“ oder „Verwerfen“ an |
| Fotos in NaviWahr | Notiz-Fotos liegen in der Datenbank `naviwahr` (Speicher `fotos`), die Tour trägt nur die Kennung `photoId`. Ältere Touren mit eingebettetem Foto werden beim Öffnen von NaviWahr einmalig umgezogen; Fotos ohne Tour werden beim nächsten Start entfernt |
| Infos unter den Apps | in `wz-hub.js`: Die Zeilen unter den App-Namen (Rekord, Partien, Orte, Fahrten …) lassen sich unter „Startseite anpassen“ mit einem Schalter ausblenden (`wz_home_stats` = `off`); die Daten in den Apps bleiben dabei unverändert |
| Voller Speicher | `wz-core.js` zeigt in jeder App einen Hinweis, wenn der Browser das Speichern ablehnt; `wz-einstellungen.html` zeigt den Füllstand des kleinen gemeinsamen Speichers (`localStorage`) und die größten Verbraucher |
| Zeitgrenze | `wz-core.js` bricht Abfragen bei fremden Diensten nach 12 Sekunden ab (nicht bei eigenen Dateien und nicht bei Abfragen mit eigenem Abbruch); die App zeigt dann ihre gewohnte Meldung |
| `wz-design.css`, `wz-design.js` | Gestaltung 2 (Stand 13. Oktober 2026): ein Schema für alle Apps. Gleicher Kopf („WahrZentrale · Bereich“, App-Symbol, Titel, Kurzbeschreibung, Sternenstaub und gestrichelter Horizontbogen), auf Unterseiten kompakt („Zurück · Titel“); gleiche schwebende Tableiste unten für alle Apps mit Bereichen (eigene Reiter-Symbole), die sich ausblendet, solange ein Eingabefeld aktiv ist; gleiche Karten, Knöpfe, Felder und Fußzeilen; Startbildschirme der Spiele mit gleicher Schrift und Symbolform. `wz-design.js` ordnet nur vorhandene Elemente neu an bzw. blendet die alten Kopf-Elemente aus – Kennungen, Klassen und Ereignisse bleiben erhalten, die Programmlogik der Apps ist unverändert. BelegParkWahr und WowarWahr zeichnen ihren Kopf selbst und bekommen die Form nur über `wz-design.css`. Bewusst unverändert: Kopf der Startseite, Sternenhimmel (Vollbild), Scanner, Spielflächen, LosDenkWahr |
| `wz-xlsx.js` | eigener Tabellen-Export (XLSX) (ersetzt SheetJS vom CDN) |
| `sw.js` | **ein** Service Worker für alles (offline); angemeldet nur in `wz-core.js` |
| `wz-onboarding.js` | eine einheitliche Einführung für alle Apps |
| `404.html` | Hinweisseite für unbekannte Adressen (GitHub Pages) |
| Sperre für fremde Server | Jede Seite trägt im Kopf dieselbe `Content-Security-Policy`: Der Browser lässt nur die eigene Adresse und die in `datenschutz.html` genannten Dienste zu. Kommt ein neuer Dienst hinzu, muss er in dieser Zeile **aller** HTML-Seiten ergänzt werden – sonst blockt der Browser ihn. AufwindWahr und LabWahr nutzen keine fremden Dienste und tragen deshalb eine strengere Fassung, die nur die eigene Adresse zulässt. |
| HorizontWahr, MessWahr, KlangWahr | Kamera-, Kompass- und Klang-Werkzeuge (Stand 9. Oktober 2026), aufgebaut wie LautstärkeWahr: eine Seite je App (`hz-index.html`, `mw-index.html`, `kl-index.html`) mit eigenen Symbolen (`FINE` in `wz-apps.js`, App-Bilder `*-icon-192/512.png` im Stil ihres Bereichs). Lage und Kamera nach derselben Rechnung wie der Himmels-Kompass (Quaternion, Kompass nur als geglätteter Versatz). HorizontWahr lädt die Umgebung auf Tipp über Overpass (OpenStreetMap, ODbL) und Geländehöhen über Open-Meteo (beides schon zuvor erlaubt, keine neuen Dienste) und merkt sie in `horizontwahr_daten`; MessWahr (`messwahr_`) und KlangWahr (`klangwahr_`) arbeiten ohne Netz |
| StaunWahr | Röntgenblick, DurchblickWahr, LichtechoWahr, PlanetenWahr und RaumTacho (Stand 13. Oktober 2026): `sn-index.html` mit `sn-app.js`; nutzt `sternewahr-astro.js`, `sternewahr-stars.js` sowie `wow-world.json`/`wow-places.json` (Natural Earth) und für die Karte in PlanetenWahr `lib-leaflet.*` (nur nach Einwilligung). Speicher-Präfix `staunwahr_`. |
| Gewitter-Peiler (in MessWahr) | Reiter „Gewitter“ in `mw-index.html` (Stand 13. Oktober 2026): Blitz antippen, Donnereinsatz per Mikrofon (Web Audio API, nur live), Richtung per Kompass mit zweitem Tipp, Reaktionszeit-Zuschlag; daraus Entfernung, Zug, Gewitterfront, Ankunft und Lagebericht. Beobachtung in `messwahr_gewitter`, Einstellungen in `messwahr_cfg` |
| LabWahr | 18 Physik-Versuche (Stand 11. Oktober 2026): `lb-index.html` mit `lb-core.js` (reine Auswertung, mit Node testbar), `lb-exp.js` (Versuchstexte, Hypothesen, Formeln, Wissenstests, Auswertung mit Messunsicherheit), `lb-sense.js` (Sensoren, Mikrofon, Tonausgabe, Diagramme), `lb-run.js` (Messabläufe) und `lb-app.js` (Oberfläche, Freies Messen, Tongenerator, Protokolle als PDF/CSV, Fortschritt). Speichert unter `labwahr_`, arbeitet ohne Netz |
| `impressum.html`, `datenschutz.html`, `lizenzen.html` | Rechtliches für alle Apps |

Alle Bibliotheken liegen lokal bei (`lib-*`): Leaflet, jsPDF, die Texterkennung
(Tesseract-Kern mit deutschen und englischen Sprachdaten) und die Barcode-Erkennung
(ZXing). Die großen Scan-Dateien werden erst beim ersten Scannen geladen – von
derselben Adresse, nicht von fremden Servern.

## Installation auf dem Smartphone

1. Die Adresse der WahrZentrale im **Browser** öffnen.
2. Teilen-Symbol → **„Zum Home-Bildschirm“**.
3. Nur dieses eine Symbol verwenden – alle Apps teilen sich dann Speicher,
   Standort, Design und Sicherung.

## Gestaltung

- Statusleiste einheitlich: Alle Seiten nutzen `black-translucent`; der Inhalt läuft beim Scrollen
  sichtbar durch die Statusleiste, ohne eigenen Farbstreifen. Die Kopfzeilen von AstroWahr und NaviWahr laufen
  beim Scrollen komplett mit. In den Vollbild-Ansichten von NaviWahr bleibt die Kopfzeile stehen (`data-wz-sbclip`)
  und gibt beim Scrollen nur den Streifen hinter der Statusleiste frei (`wz-core.js`, `wz-unify.css`).
- Korvanthiel: Startseite einfarbig über die volle Höhe, scrollt als Ganzes; im Spiel ruhender
  Sternenhimmel ohne laufende Striche, Bodengitter und Körnung. AlltagWahr: flache Eingabefelder,
  offene Fenster sperren das Scrollen der Seite dahinter.
- Kopf der Startseite zeigt den Himmel der Tageszeit (Tag, Abendrot, Dämmerung,
  Nacht mit Sternen), Sonne bzw. Mond in der echten Phase und die nächste Sonnenzeit –
  alles lokal berechnet, ohne Netz. Das Wetter erscheint dort nur nach Freigabe.
- „Weitermachen“ (zuletzt geöffnete App, `wz_recent`) und eine Favoriten-Leiste mit
  bis zu vier Apps (`wz_home_favs`, Stern unter „Anordnen“); der fünfte Platz ist der Knopf „Hier merken“.
- Kopf der Startseite: unter „WahrZentrale“ die kleine Namenszeile „von Jan Dierlich“ (nur auf der Startseite).
- Kleiner Sonnenbogen im Kopf (tagsüber, `skyMini` in `wz-hub.js`): Weg der Sonne von Aufgang bis
  Untergang über dem Horizont, gestrichelt darunter weiterlaufend, mit der Sonne an ihrer jetzigen
  Stelle; nachts der Mond in seiner Phase. Lokal berechnet.
- „Heute“, die Bereiche und „Werkzeuge“ teilen sich dieselbe Karte mit Emblem, Titel und Trennlinie;
  die Werkzeuge stehen als Symbolreihe wie die Favoriten.
- Bereiche lassen sich einklappen (Tipp auf den Kopf, `wz_home_closed`); eingeklappt bleibt eine Reihe
  der App-Symbole, die direkt zur App führen.
- Themenbereiche als elegante Karten: Emblem, Titel, Kurzbeschreibung und ein zartes
  Ornament je Bereich (nur Systemschrift, keine Serifen).
- App-Kacheln mit feinen, detaillierten Symbolen (`FINE` in `wz-apps.js`, eigene
  Zeichnungen), Name und Beschreibung; jeder Bereich hat eine eigene Abstufung derselben
  Palette (Himmel nachtblau, Unterwegs violett, Alltag lavendel, Spiel & Klang tiefe Nacht).
- Die App-Bilder (`*-icon-192/512.png`) zeigen dieselben feinen Symbole in der Abstufung
  ihres Bereichs; sie erscheinen in den App-Köpfen, auf den Startbildschirmen der Spiele und
  in der Begrüßung der Einführung („Willkommen bei …“, `wz-onboarding.js`).
- Die Startseite öffnet immer oben (auch beim Zurückkehren aus einer App mit Sprungmarke).
- Hauptknöpfe in allen Apps kräftig violett mit weißer Schrift (`--wz-primary-bg`
  in `wz-unify.css`), Nebenknöpfe bleiben blass.
- Aufbau der Startseite frei wählbar („Startseite anpassen“ bei den Werkzeugen und in den Einstellungen): Weitermachen, Favoriten, Heute, Apps und Werkzeuge lassen sich verschieben, die ersten drei auch ausblenden (`wz_home_blocks`). Im selben Blatt stehen die Reihenfolge der Apps (Eigene, A–Z, Zuletzt genutzt), „Apps anordnen“ sowie „Farben und Schrift“. Beim Anordnen erscheint über den Apps eine Zeile mit „Fertig“.
- Startseite anpassbar: Schriftgröße, Schriftfarbe, Farbstärke und Symbolfarbe
  („Farben und Schrift“ unter „Startseite anpassen“, `wz_home_style`); unter „Anordnen“ eigene Gruppen, Gruppe und
  Symbolfarbe je App (`wz_home_layout`). Alles lokal und in der Sicherung enthalten.

- Alle App-Symbole (`*-icon-192.png`, `*-icon-512.png`) sind aus denselben Liniengrafiken
  wie die Startseite erzeugt: weiße Linie auf dem Nachthimmel-Verlauf.
- Nur serifenlose Systemschriften, keine Web-Schriften. Überschriften der Gruppen wahlweise „Standard“, „Rund“ oder „Technisch“; Formeln in LabWahr kursiv in der Systemschrift.
- Volle Bildschirmhöhe über `--wz-vh` (gemessen in `wz-theme.js`) statt `100vh`,
  damit auf dem Smartphone unten keine Balken bleiben.

## Lizenz

Alle Rechte vorbehalten, siehe `LICENSE.txt` und `lizenzen.html`.

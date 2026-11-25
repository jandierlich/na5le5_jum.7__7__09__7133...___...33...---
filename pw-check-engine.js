// sw-check-engine.js — ProduktWahr
// Verbindet die E-Nummern-Engine (additive-engine.js) und die INCI-Datenbank
// (inci-database.js) zu einer gemeinsamen Prüfung. Jeder Treffer wird mit
// seiner Quelle/Themengebiet markiert ("zusatzstoff" oder "kosmetik"), damit
// im Ergebnis sichtbar ist, woher die Einstufung stammt.

var SW_CAT_LABELS_INCI = {
  hormone: "Hormonell wirksam", mikroplastik: "Mikroplastik", allergen: "Duftstoff-Allergen",
  konservierung: "Konservierungsstoff", tierisch: "Tierisch/nicht vegan", silikon: "Silikon/Mineralöl"
};

// Allgemeine Einordnung je INCI-Kategorie (kein stoffspezifisches Urteil,
// sondern erklärender Kontext zur jeweiligen Gruppe samt Rechtsgrundlage),
// wird im Detailtext hinter den stoffspezifischen Satz ergänzt.
var SW_CAT_KONTEXT_INCI = {
  hormone: "Stoffe dieser Gruppe stehen im wissenschaftlichen Verdacht, in das Hormonsystem einzugreifen (sogenannte endokrine Disruption). Einzelne Vertreter werden im Rahmen der EU-Kosmetikverordnung (EG) Nr. 1223/2009 sowie ergänzender ECHA-Bewertungen eingeschränkt oder beobachtet – Ausmaß und Nachweislage unterscheiden sich von Stoff zu Stoff.",
  mikroplastik: "Feste, wasserunlösliche Kunststoffpartikel fallen unter die REACH-Beschränkung (EG) Nr. 1907/2006, Anhang XVII Nr. 78, und werden seit Oktober 2023 in bestimmten Kosmetikprodukten schrittweise eingeschränkt bzw. verboten, weil sie sich in der Umwelt kaum abbauen.",
  allergen: "Diese Duftstoffe zählen zu den 26 EU-weit deklarationspflichtigen Duftstoff-Allergenen und müssen ab bestimmten Konzentrationen gesondert in der Zutatenliste genannt werden, da sie bekanntermaßen Kontaktallergien auslösen können.",
  konservierung: "Konservierungsstoffe verhindern mikrobielles Wachstum im Produkt. Einzelne Vertreter sind je nach Konzentration und Anwendungsbereich (Leave-on/Rinse-off) eingeschränkt oder vollständig verboten, siehe EU-Kosmetikverordnung (EG) Nr. 1223/2009, Anhang V.",
  tierisch: "Hinweis auf tierischen Ursprung bzw. nicht eindeutig pflanzliche Herkunft des Stoffs – relevant für vegane oder vegetarische Lebensweise, unabhängig von einer gesundheitlichen Bewertung.",
  silikon: "Silikone und Mineralöle legen sich als Film auf Haut oder Haar. Sie gelten gesundheitlich überwiegend als unbedenklich, stehen wegen schwerer biologischer Abbaubarkeit aber unter Umweltbeobachtung."
};

var SW_ADDITIV_DB = (typeof ENW_baueDatenbank === "function") ? ENW_baueDatenbank() : [];

function SW_normalize(s) {
  return (s || "").toLowerCase()
    .replace(/[äàáâ]/g, "a").replace(/ö/g, "o").replace(/[üùúû]/g, "u")
    .replace(/ß/g, "ss").replace(/[^a-z0-9]/g, "");
}

function SW_buildInciLookup() {
  var map = {};
  (typeof INCI_DB !== "undefined" ? INCI_DB : []).forEach(function(entry) {
    var names = [entry.n].concat(entry.a || []);
    names.forEach(function(nm) { map[SW_normalize(nm)] = entry; });
  });
  return map;
}
var SW_INCI_LOOKUP = SW_buildInciLookup();

function SW_findeInciTreffer(text) {
  var found = {}, order = [];
  var parts = (text || "").split(/[,;\n]+/).map(function(p) { return SW_normalize(p); }).filter(Boolean);
  parts.forEach(function(p) {
    if (SW_INCI_LOOKUP[p] && !found[SW_INCI_LOOKUP[p].n]) {
      found[SW_INCI_LOOKUP[p].n] = SW_INCI_LOOKUP[p];
      order.push(SW_INCI_LOOKUP[p].n);
    }
  });
  var norm = SW_normalize(text);
  (typeof INCI_DB !== "undefined" ? INCI_DB : []).forEach(function(entry) {
    if (found[entry.n]) return;
    var names = [entry.n].concat(entry.a || []);
    for (var i = 0; i < names.length; i++) {
      var needle = SW_normalize(names[i]);
      if (!needle) continue;
      var re = new RegExp("(^|[^a-z0-9])" + needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "($|[^a-z0-9])");
      if (re.test(" " + norm + " ")) { found[entry.n] = entry; order.push(entry.n); break; }
    }
  });
  return order.map(function(n) { return found[n]; });
}

// Führt Text gegen die Datenbank(en) sowie die Allergenliste.
// modus: "auto" (Standard, beide DBs) | "lebensmittel" (nur E-Nummern) | "kosmetik" (nur INCI)
// Der explizite Modus verhindert Fehltreffer durch Namensüberschneidungen
// zwischen beiden Welten (z.B. Zitronensäure = E330 UND INCI-Stoff).
function SW_pruefeText(text, modus) {
  var m = modus || "auto";
  var ergebnisse = [];
  var allergene = [];

  if (m === "auto" || m === "lebensmittel") {
    var enw = ENW_scanneText(text, SW_ADDITIV_DB);
    allergene = enw.allergene;
    enw.treffer.forEach(function(e) {
      ergebnisse.push({
        id: "e_" + e.code, name: e.name + " (" + e.code + ")", g: e.ampel,
        quelle: "zusatzstoff", quelleLabel: "Zusatzstoff", kategorie: e.klasse,
        kurztext: e.kurztext, detailtext: e.details, hinweis: e.hinweisGruppen,
        efsanote: e.efsanote, quellennote: e.quellennote
      });
    });
  }
  if (m === "auto" || m === "kosmetik") {
    var inci = SW_findeInciTreffer(text);
    if (m === "kosmetik") {
      // Im reinen Kosmetik-Modus zusätzlich lokal auf Allergene prüfen
      // (die Allergenliste selbst ist lebensmittelneutral formuliert).
      var zl = SW_normalize ? text.toLowerCase() : text.toLowerCase();
      allergene = ENW_ALLERGENE.filter(function(a) {
        return a.terms.some(function(t) { return ENW_wortAbgleich(zl, t); });
      }).map(function(a) { return a.name; });
    }
    inci.forEach(function(e) {
      var kontext = SW_CAT_KONTEXT_INCI[e.k];
      ergebnisse.push({
        id: "i_" + e.n, name: e.n, g: e.g,
        quelle: "kosmetik", quelleLabel: "Kosmetik-Inhaltsstoff",
        kategorie: SW_CAT_LABELS_INCI[e.k] || e.k, kurztext: e.t,
        detailtext: kontext ? (e.t + " " + kontext) : e.t,
        hinweis: null, quellennote: "Quelle: eigene INCI-Einstufung auf Basis öffentlich zugänglicher Datenbanken (z. B. CosIng)."
      });
    });
  }

  return { treffer: ergebnisse, allergene: allergene, modus: m };
}

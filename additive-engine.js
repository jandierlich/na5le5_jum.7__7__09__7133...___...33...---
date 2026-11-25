// additive-engine.js — ProduktWahr
// E-Nummern/Zusatzstoff-Engine, 1:1 portiert aus E-NummernWahr (WahrZentrale),
// damit Namen, Kategorien, Ampel-Einstufungen und Rechtstexte identisch bleiben.
// Rechtsgrundlage: Verordnung (EG) Nr. 1333/2008 (Lebensmittelzusatzstoffe),
// Allergene: Anhang II der Verordnung (EU) Nr. 1169/2011 (LMIV).

var ENW_NAMEN = {E100:"Kurkumin",E101:"Riboflavin (Vitamin B2)",E102:"Tartrazin",E104:"Chinolingelb",E110:"Gelborange S",E120:"Echtes Karmin",E122:"Azorubin (Carmoisin)",E123:"Amaranth",E124:"Cochenillerot A (Ponceau 4R)",E127:"Erythrosin",E129:"Allurarot AC",E131:"Patentblau V",E132:"Indigotin",E133:"Brillantblau FCF",E140:"Chlorophylle",E141:"Kupferkomplexe der Chlorophylle",E142:"Grün S",E150a:"Einfaches Zuckerkulör",E150b:"Sulfitlaugen-Zuckerkulör",E150c:"Ammoniak-Zuckerkulör",E150d:"Ammoniak-Sulfit-Zuckerkulör",E151:"Brillantschwarz BN",E153:"Pflanzenkohle",E155:"Braun HT",E160a:"Beta-Carotin",E160b:"Annatto, Bixin, Norbixin",E160c:"Paprikaextrakt, Capsanthin",E160d:"Lycopin",E160e:"Beta-Apocarotinal",E161a:"Flavoxanthin",E161b:"Lutein",E161g:"Canthaxanthin",E162:"Betanin, Rote-Bete-Rot",E163:"Anthocyane",E170:"Calciumcarbonat",E171:"Titandioxid",E172:"Eisenoxide und Eisenhydroxide",E173:"Aluminium",E174:"Silber",E175:"Gold",E180:"Litholrubin BK",E200:"Sorbinsäure",E202:"Kaliumsorbat",E210:"Benzoesäure",E211:"Natriumbenzoat",E212:"Kaliumbenzoat",E213:"Calciumbenzoat",E214:"Ethyl-p-hydroxybenzoat",E215:"Natriumethyl-p-hydroxybenzoat",E218:"Methyl-p-hydroxybenzoat",E220:"Schwefeldioxid",E221:"Natriumsulfit",E222:"Natriumhydrogensulfit",E223:"Natriummetabisulfit",E224:"Kaliummetabisulfit",E226:"Calciumsulfit",E227:"Calciumhydrogensulfit",E228:"Kaliumhydrogensulfit",E230:"Biphenyl, Diphenyl",E231:"Orthophenylphenol",E232:"Natriumorthophenylphenol",E233:"Thiabendazol",E234:"Nisin",E235:"Natamycin",E236:"Ameisensäure",E239:"Hexamethylentetramin",E242:"Dimethyldicarbonat",E249:"Kaliumnitrit",E250:"Natriumnitrit",E251:"Natriumnitrat",E252:"Kaliumnitrat",E260:"Essigsäure",E261:"Kaliumacetat",E262:"Natriumacetate",E263:"Calciumacetat",E270:"Milchsäure",E280:"Propionsäure",E281:"Natriumpropionat",E282:"Calciumpropionat",E283:"Kaliumpropionat",E284:"Borsäure",E285:"Natriumtetraborat",E290:"Kohlendioxid",E296:"Äpfelsäure",E297:"Fumarsäure",E300:"Ascorbinsäure",E301:"Natriumascorbat",E302:"Calciumascorbat",E304:"Fettsäureester der Ascorbinsäure",E306:"Tocopherolhaltige Extrakte",E307:"Alpha-Tocopherol",E308:"Gamma-Tocopherol",E309:"Delta-Tocopherol",E310:"Propylgallat",E311:"Octylgallat",E312:"Dodecylgallat",E315:"Erythorbsäure",E316:"Natriumerythorbat",E319:"Tertiär-Butylhydrochinon (TBHQ)",E320:"Butylhydroxyanisol (BHA)",E321:"Butylhydroxytoluol (BHT)",E322:"Lecithine",E325:"Natriumlactat",E326:"Kaliumlactat",E327:"Calciumlactat",E330:"Citronensäure",E331:"Natriumcitrate",E332:"Kaliumcitrate",E333:"Calciumcitrate",E334:"Weinsäure",E335:"Natriumtartrate",E336:"Kaliumtartrate",E337:"Kaliumnatriumtartrat",E338:"Phosphorsäure",E339:"Natriumphosphate",E340:"Kaliumphosphate",E341:"Calciumphosphate",E342:"Ammoniumphosphate",E343:"Magnesiumphosphate",E350:"Natriummalate",E351:"Kaliummalat",E352:"Calciummalate",E353:"Meta-Weinsäure",E354:"Calciumtartrat",E355:"Adipinsäure",E356:"Natriumadipat",E357:"Kaliumadipat",E363:"Bernsteinsäure",E380:"Triammoniumcitrat",E385:"Calciumdinatrium-EDTA",E400:"Alginsäure",E401:"Natriumalginat",E402:"Kaliumalginat",E403:"Ammoniumalginat",E404:"Calciumalginat",E405:"Propylenglycolalginat",E406:"Agar-Agar",E407:"Carrageen",E407a:"Verarbeitete Eucheuma-Algen",E410:"Johannisbrotkernmehl",E412:"Guarkernmehl",E413:"Traganth",E414:"Gummi arabicum",E415:"Xanthan",E416:"Karaya",E417:"Tara-Gummi",E418:"Gellan",E422:"Glycerin",E425:"Konjak",E440:"Pektine",E442:"Ammoniumphosphatide",E444:"Saccharoseacetatisobutyrat",E445:"Glycerinester aus Wurzelharz",E460:"Mikrokristalline Cellulose",E461:"Methylcellulose",E463:"Hydroxypropylcellulose",E464:"Hydroxypropylmethylcellulose",E465:"Ethylmethylcellulose",E466:"Carboxymethylcellulose",E470a:"Natrium-, Kalium- und Calciumsalze der Speisefettsäuren",E470b:"Magnesiumsalze der Speisefettsäuren",E471:"Mono- und Diglyceride von Speisefettsäuren",E472a:"Essigsäureester der Mono- und Diglyceride",E472b:"Milchsäureester",E472c:"Citronensäureester",E472d:"Weinsäureester",E472e:"Diacetylweinsäureester",E472f:"Gemischte Wein- und Essigsäureester",E473:"Zuckerester von Speisefettsäuren",E474:"Zuckerglyceride",E475:"Polyglycerinester von Speisefettsäuren",E476:"Polyglycerin-Polyricinoleat",E477:"Propylenglycolester",E479b:"Thermisch oxidiertes Sojaöl",E481:"Natriumstearoyl-2-lactylat",E482:"Calciumstearoyl-2-lactylat",E483:"Stearyltartrat",E491:"Sorbitanmonostearat",E492:"Sorbitantristearat",E494:"Sorbitanmonooleat",E495:"Sorbitanmonopalmitat",E500:"Natriumcarbonate",E501:"Kaliumcarbonate",E503:"Ammoniumcarbonate",E504:"Magnesiumcarbonate",E507:"Salzsäure",E508:"Kaliumchlorid",E509:"Calciumchlorid",E510:"Ammoniumchlorid",E511:"Magnesiumchlorid",E512:"Stannochlorid",E513:"Schwefelsäure",E514:"Natriumsulfate",E515:"Kaliumsulfate",E516:"Calciumsulfat",E517:"Ammoniumsulfat",E520:"Aluminiumsulfat",E521:"Aluminiumnatriumsulfat",E522:"Aluminiumkaliumsulfat",E523:"Aluminiumammoniumsulfat",E524:"Natriumhydroxid",E525:"Kaliumhydroxid",E526:"Calciumhydroxid",E527:"Ammoniumhydroxid",E528:"Magnesiumhydroxid",E530:"Magnesiumoxid",E535:"Natriumferrocyanid",E536:"Kaliumferrocyanid",E538:"Calciumferrocyanid",E541:"Natriumaluminiumphosphat",E551:"Siliciumdioxid",E552:"Calciumsilicat",E553a:"Magnesiumsilicate",E553b:"Talkum",E554:"Natriumaluminiumsilicat",E555:"Kaliumaluminiumsilicat",E556:"Calciumaluminiumsilicat",E558:"Bentonit",E559:"Kaolin",E570:"Fettsäuren",E575:"Glucono-delta-Lacton",E576:"Natriumgluconat",E577:"Kaliumgluconat",E578:"Calciumgluconat",E579:"Eisen-II-Gluconat",E585:"Eisen-II-Lactat",E620:"Glutaminsäure",E621:"Mononatriumglutamat",E622:"Monokaliumglutamat",E623:"Calciumdiglutamat",E624:"Monoammoniumglutamat",E625:"Magnesiumdiglutamat",E626:"Guanylsäure",E627:"Dinatriumguanylat",E628:"Dikaliumguanylat",E629:"Calciumguanylat",E630:"Inosinsäure",E631:"Dinatriuminosinat",E632:"Dikaliuminosinat",E633:"Calciuminosinat",E634:"Calcium-5'-ribonucleotide",E635:"Dinatrium-5'-ribonucleotide",E636:"Maltol",E637:"Ethylmaltol",E640:"Glycin",E641:"L-Leucin",E900:"Dimethylpolysiloxan",E901:"Bienenwachs",E902:"Candelillawachs",E903:"Carnaubawachs",E904:"Schellack",E905:"Mikrokristallines Wachs",E912:"Montansäureester",E914:"Oxidiertes Polyethylenwachs",E920:"L-Cystein",E921:"L-Cystin",E927b:"Carbamid",E938:"Argon",E939:"Helium",E941:"Stickstoff",E942:"Distickstoffmonoxid",E943a:"Butan",E943b:"Isobutan",E944:"Propan",E949:"Wasserstoff",E950:"Acesulfam K",E951:"Aspartam",E952:"Cyclamat",E953:"Isomalt",E954:"Saccharin",E955:"Sucralose",E957:"Thaumatine",E959:"Neohesperidin DC",E960:"Steviolglycoside",E961:"Neotam",E962:"Aspartam-Acesulfam-Salz",E965:"Maltit",E966:"Lactit",E967:"Xylit",E968:"Erythrit",E999:"Quillaja-Extrakt",E1103:"Invertase",E1105:"Lysozym",E1200:"Polydextrose",E1201:"Polyvinylpyrrolidon",E1202:"Polyvinylpolypyrrolidon",E1404:"Oxidierte Stärke",E1410:"Monostärkephosphat",E1412:"Distärkephosphat",E1413:"Phosphatiertes Distärkephosphat",E1414:"Acetyliertes Distärkephosphat",E1420:"Acetylierte Stärke",E1422:"Acetyliertes Distärkeadipat",E1440:"Hydroxypropylstärke",E1442:"Hydroxypropyldistärkephosphat",E1450:"Stärkenatriumoctenylsuccinat",E1451:"Acetylierte oxidierte Stärke",E1505:"Triethylcitrat",E1518:"Glyceryltriacetat",E1520:"Propylenglycol",E1521:"Polyethylenglycol"};

var ENW_ALLE_CODES = ["E100","E101","E102","E104","E110","E120","E122","E123","E124","E127","E129","E131","E132","E133","E140","E141","E142","E150a","E150b","E150c","E150d","E151","E153","E155","E160a","E160b","E160c","E160d","E160e","E161a","E161b","E161g","E162","E163","E170","E171","E172","E173","E174","E175","E180","E200","E202","E210","E211","E212","E213","E214","E215","E218","E220","E221","E222","E223","E224","E226","E227","E228","E230","E231","E232","E233","E234","E235","E236","E239","E242","E249","E250","E251","E252","E260","E261","E262","E263","E270","E280","E281","E282","E283","E284","E285","E290","E296","E297","E300","E301","E302","E304","E306","E307","E308","E309","E310","E311","E312","E315","E316","E319","E320","E321","E322","E325","E326","E327","E330","E331","E332","E333","E334","E335","E336","E337","E338","E339","E340","E341","E342","E343","E350","E351","E352","E353","E354","E355","E356","E357","E363","E380","E385","E400","E401","E402","E403","E404","E405","E406","E407","E407a","E410","E412","E413","E414","E415","E416","E417","E418","E422","E425","E440","E442","E444","E445","E460","E461","E463","E464","E465","E466","E470a","E470b","E471","E472a","E472b","E472c","E472d","E472e","E472f","E473","E474","E475","E476","E477","E479b","E481","E482","E483","E491","E492","E494","E495","E500","E501","E503","E504","E507","E508","E509","E510","E511","E512","E513","E514","E515","E516","E517","E520","E521","E522","E523","E524","E525","E526","E527","E528","E530","E535","E536","E538","E541","E551","E552","E553a","E553b","E554","E555","E556","E558","E559","E570","E575","E576","E577","E578","E579","E585","E620","E621","E622","E623","E624","E625","E626","E627","E628","E629","E630","E631","E632","E633","E634","E635","E636","E637","E640","E641","E900","E901","E902","E903","E904","E905","E912","E914","E920","E921","E927b","E938","E939","E941","E942","E943a","E943b","E944","E949","E950","E951","E952","E953","E954","E955","E957","E959","E960","E961","E962","E965","E966","E967","E968","E999","E1103","E1105","E1200","E1201","E1202","E1404","E1410","E1412","E1413","E1414","E1420","E1422","E1440","E1442","E1450","E1451","E1505","E1518","E1520","E1521"];

function ENW_kategorie(code) {
  var n = parseInt(code.replace(/[^0-9]/g, ""), 10);
  if (n >= 100 && n < 200) return "Farbstoff";
  if (n >= 200 && n < 300) return "Konservierungsstoff";
  if (n >= 300 && n < 324) return "Antioxidationsmittel";
  if (n >= 324 && n < 400) return "Säuerungsmittel, Säureregulator";
  if (n >= 400 && n < 500) return "Verdickungsmittel, Stabilisator";
  if (n >= 500 && n < 600) return "Säureregulator, Trennmittel";
  if (n >= 600 && n < 700) return "Geschmacksverstärker";
  if (n >= 900 && n < 1000) return "Süßungsmittel, Überzugsmittel, Gas";
  if (n >= 1000) return "Sonstige Zusatzstoffe, Modifizierte Stärke";
  return "Zusatzstoff";
}

function ENW_imBereich(code, von, bis) {
  var n = parseInt(code.replace(/[^0-9]/g, ""), 10);
  return n >= von && n <= bis;
}

function ENW_ampel(code) {
  var n = code.toUpperCase();
  var gruenListe = ["E100","E101","E140","E141","E160A","E160B","E160C","E160D","E162","E163","E170",
    "E300","E301","E302","E306","E307","E308","E309","E322","E406","E407","E410","E412","E413","E414",
    "E415","E440","E460","E901","E903","E960","E968"];
  if (gruenListe.indexOf(n) !== -1) return "gruen";
  if (n.indexOf("E160") === 0 || n.indexOf("E161") === 0 || n === "E406" || n === "E410") return "gruen";

  var rotListe = ["E123","E127","E128","E154","E180","E239","E284","E285","E512","E520","E521","E522",
    "E523","E535","E536","E538","E554","E555","E556"];
  if (rotListe.indexOf(n) !== -1) return "rot";
  if (n === "E171") return "rot";
  if (n.indexOf("E230") === 0 || n.indexOf("E231") === 0 || n.indexOf("E232") === 0) return "rot";

  var gelbListe = ["E102","E104","E110","E122","E124","E129","E151","E155","E210","E211","E212","E220",
    "E221","E222","E223","E224","E249","E250","E251","E252","E320","E321","E621","E622","E950","E951",
    "E952","E954","E955"];
  if (gelbListe.indexOf(n) !== -1) return "gelb";
  if (n.indexOf("E21") === 0 || (n.indexOf("E22") === 0 && ENW_imBereich(n, 220, 228))) return "gelb";

  var f = parseInt(n.replace(/[^0-9]/g, ""), 10);
  if (f >= 100 && f < 200) return /E10[2-4]|E11|E12|E13|E15/.test(n) ? "gelb" : "gruen";
  if (f >= 200 && f < 300) return "gelb";
  if (f >= 600 && f < 700) return "gelb";
  if (f >= 900 && f < 970) return "gelb";
  return "gruen";
}

// Baut die vollständige E-Nummern-Datenbank inkl. Beschreibungstexten auf
// (Original-Textbausteine aus E-NummernWahr, unverändert übernommen).
function ENW_baueDatenbank() {
  return ENW_ALLE_CODES.map(function(code) {
    var n = code.toUpperCase();
    var name = ENW_NAMEN[code] || ENW_NAMEN[n] || ("Lebensmittelzusatzstoff " + n);
    var klasse = ENW_kategorie(n);
    var ampel = ENW_ampel(n);
    var istFarbstoff = klasse.indexOf("Farbstoff") !== -1;
    var istKonservierung = klasse.indexOf("Konservierung") !== -1;
    var istSuess = klasse.indexOf("Süßung") !== -1 || n.indexOf("E95") === 0 || n.indexOf("E96") === 0;
    var istVerdickung = klasse.indexOf("Verdickung") !== -1 || klasse.indexOf("Stabilisator") !== -1;

    var kurztext;
    if (istFarbstoff) kurztext = "Farbstoff zur Farbgebung. Sorgt für einheitliches Aussehen in Süßwaren, Getränken oder Überzügen.";
    else if (istKonservierung) kurztext = "Konservierungsstoff, der das Wachstum von Mikroorganismen verlangsamt und die Haltbarkeit unterstützt.";
    else if (istSuess) kurztext = "Süßungsmittel mit hoher Süßkraft, ermöglicht zuckerreduzierte Rezepturen.";
    else if (istVerdickung) kurztext = "Verdickungs- bzw. Geliermittel natürlichen Ursprungs oder modifiziert. Gibt Struktur und Bindung.";
    else if (klasse.indexOf("Antioxidations") !== -1) kurztext = "Antioxidationsmittel, schützt Fette und Farben vor oxidativem Verderb.";
    else if (klasse.indexOf("Säuerungsmittel") !== -1 || klasse.indexOf("Säureregulator") !== -1) kurztext = "Säureregulator, steuert pH-Wert, Geschmack und Stabilität im Produkt.";
    else if (klasse.indexOf("Geschmacksverstärker") !== -1) kurztext = "Geschmacksverstärker, rundet würzige Noten ab und verstärkt Umami.";
    else kurztext = "Zugelassener Zusatzstoff nach VO (EG) 1333/2008 für spezifische technologische Funktionen.";

    var typischeLebensmittel;
    if (istFarbstoff) typischeLebensmittel = "Limonaden, Süßwaren, Feinkostsalate, Käseüberzüge, Backwaren";
    else if (istKonservierung) typischeLebensmittel = "Wurst, Käse, Brot, eingelegtes Gemüse, Saucen";
    else if (istSuess) typischeLebensmittel = "Light-Getränke, Kaugummi, Desserts, Tafelsüße";
    else if (istVerdickung) typischeLebensmittel = "Marmeladen, Joghurt, pflanzliche Drinks, Saucen, Eis";
    else if (klasse.indexOf("Antioxidations") !== -1) typischeLebensmittel = "Öle, Nüsse, Knabberartikel, Trockensuppen";
    else if (klasse.indexOf("Geschmacksverstärker") !== -1) typischeLebensmittel = "Würzmischungen, Instant-Suppen, Snacks";
    else typischeLebensmittel = "Verschiedene verarbeitete Lebensmittel je nach Zulassung";

    var hinweisGruppen;
    if (ampel === "rot") {
      hinweisGruppen = "In der EU für Lebensmittel eingeschränkt oder nicht mehr zugelassen. In älteren Produkten oder außerhalb EU noch anzutreffen. Bei Unsicherheit Zutatenliste prüfen.";
    } else if (ampel === "gelb") {
      if (n.indexOf("E10") === 0) hinweisGruppen = "Azofarbstoffe: können bei empfindlichen Personen die Aufmerksamkeit bei Kindern beeinflussen. Hinweis ist nach EU-Recht auf der Verpackung vorgeschrieben.";
      else if (n.indexOf("E2") === 0) hinweisGruppen = "Bei Personen mit Unverträglichkeiten oder Sulfit-Sensibilität beachten. Bei Kindern und bei hoher Aufnahmemenge zurückhaltend verwenden.";
      else if (istSuess) hinweisGruppen = "Süßstoffe: bei übermäßigem Verzehr kann abführend wirken. Für Kinder Produkte mit Süßstoffen nur gelegentlich.";
      else hinweisGruppen = "Mit Einschränkung: bei Allergien, Asthma, Unverträglichkeiten oder bei Kindern sensibel bewerten. Höchstmengen nach Anhang II beachten.";
    } else {
      hinweisGruppen = "Gilt bei üblicher Verwendung und üblichen Mengen als gut untersucht. Trotzdem individuelle Unverträglichkeiten möglich.";
    }

    var details = name + " (" + n + ") ist ein " + klasse.toLowerCase() + " mit technologischer Funktion nach Verordnung (EG) Nr. 1333/2008. " +
      kurztext + " Typische Anwendungen: " + typischeLebensmittel + ". Die Verwendung ist nur für definierte Kategorien mit Höchstmenge oder quantum satis erlaubt. " +
      "Diese Kurzbewertung fasst öffentlich verfügbare EFSA-Stellungnahmen in eigener Wortwahl zusammen und ersetzt keine Fachberatung.";

    return {
      code: n, name: name, klasse: klasse, ampel: ampel, kurztext: kurztext, details: details,
      typischeLebensmittel: typischeLebensmittel, hinweisGruppen: hinweisGruppen,
      efsanote: "EFSA hat den Stoff im Rahmen der Re-Evaluierung bewertet. Details siehe EFSA Journal, Scientific Opinions zu Lebensmittelzusatzstoffen, Stand 05/2026.",
      quellennote: "Rechtsquelle: Verordnung (EG) Nr. 1333/2008 Anhang II und Spezifikations-VO (EU) Nr. 231/2012. Zulassungen im Wandel, nationale Auslegungen möglich."
    };
  });
}

// Wortgrenzen-sicherer Textabgleich (identisch zu E-NummernWahr/KosmetikWahr)
function ENW_wortAbgleich(text, begriff) {
  var tl = begriff.toLowerCase();
  var istBuchstabe = function(c) { return c !== undefined && /[a-zäöüßA-ZÄÖÜ]/.test(c); };
  var idx = 0;
  while ((idx = text.indexOf(tl, idx)) !== -1) {
    var before = idx > 0 ? text[idx - 1] : undefined;
    var after = idx + tl.length < text.length ? text[idx + tl.length] : undefined;
    if (!istBuchstabe(before) && !istBuchstabe(after)) return true;
    idx += 1;
  }
  return false;
}

// 14 EU-Pflichtallergene (Anhang II VO (EU) 1169/2011), Original aus E-NummernWahr
var ENW_ALLERGENE = [
  {name:"Glutenhaltiges Getreide", terms:["Gluten","Weizen","Weizenmehl","Roggen","Gerste","Hafer","Dinkel","Kamut"]},
  {name:"Krebstiere", terms:["Krebstiere","Garnelen","Krabben","Hummer"]},
  {name:"Eier", terms:["Eier","Eiklar","Eigelb","Vollei","Eipulver","Eiweiß"]},
  {name:"Fisch", terms:["Fisch","Fischöl","Fischgelatine"]},
  {name:"Erdnüsse", terms:["Erdnuss","Erdnüsse","Erdnussöl"]},
  {name:"Soja", terms:["Soja","Sojabohnen","Sojalecithin","Sojaprotein"]},
  {name:"Milch (Laktose)", terms:["Milch","Laktose","Milchpulver","Molke","Milcheiweiß","Kasein"]},
  {name:"Schalenfrüchte (Nüsse)", terms:["Mandel","Mandeln","Haselnuss","Walnuss","Cashew","Kaschu","Pekannuss","Paranuss","Pistazie","Macadamia"]},
  {name:"Sellerie", terms:["Sellerie"]},
  {name:"Senf", terms:["Senf","Senfmehl"]},
  {name:"Sesam", terms:["Sesam","Sesamsamen","Sesamöl"]},
  {name:"Schwefeldioxid/Sulfite", terms:["Sulfit","Sulfite","Schwefeldioxid"]},
  {name:"Lupinen", terms:["Lupine","Lupinen","Lupinenmehl"]},
  {name:"Weichtiere", terms:["Weichtiere","Muscheln","Tintenfisch"]}
];

// Findet E-Nummern (per Code UND per Stoffname) sowie Allergene in einem Text.
// Gibt { treffer: [...ENW_DB-Einträge], allergene: [...Namen] } zurück.
function ENW_scanneText(text, datenbank) {
  var z = text || "";
  var codeRegex = /E\s*(\d{3,4}[a-z]?)/gi;
  var codes = [];
  var m;
  while ((m = codeRegex.exec(z)) !== null) {
    if (m[1]) codes.push("E" + m[1].toUpperCase());
  }
  if (codes.length === 0 && /E/i.test(z)) {
    var lenientRegex = /(?:E|€|8)[\s\-:]*(\d{3,4}[a-z]?)/gi;
    var lm;
    while ((lm = lenientRegex.exec(z)) !== null) {
      var kt = lm[1];
      var num = parseInt(kt, 10);
      if (num >= 100 && num <= 1521) codes.push("E" + kt.toUpperCase());
    }
  }
  var zl = z.toLowerCase();
  Object.keys(ENW_NAMEN).forEach(function(code) {
    var name = ENW_NAMEN[code].split("(")[0].trim();
    if (name.length >= 4 && ENW_wortAbgleich(zl, name)) codes.push(code);
  });

  var allergene = ENW_ALLERGENE.filter(function(a) {
    return a.terms.some(function(t) { return ENW_wortAbgleich(zl, t); });
  }).map(function(a) { return a.name; });

  var eindeutig = Array.from(new Set(codes));
  var treffer = eindeutig.map(function(c) {
    return datenbank.find(function(e) { return e.code.toUpperCase() === c.toUpperCase(); });
  }).filter(Boolean);

  return { treffer: treffer, allergene: allergene };
}

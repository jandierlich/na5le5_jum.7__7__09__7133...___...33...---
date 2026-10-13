/*
 * SterneWahr – Sterndaten
 * Eigene Zusammenstellung heller Sterne (Epoche J2000, ohne Eigenbewegung).
 * Positionen und Helligkeiten sind astronomische Fakten; die Auswahl, die
 * Schreibweisen und die Sternbildfiguren sind eine eigene Zusammenstellung.
 * Genauigkeit für die Darstellung: etwa 0,1 Grad.
 * Format je Stern: "Name|Sternbild|RA (h min.min)|Dek (°  ')|Helligkeit V|Farbindex B-V"
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Stars = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const RAW = [
    // Großer Bär
    'Dubhe|UMa|11 03.7|+61 45|1.79|1.06', 'Merak|UMa|11 01.8|+56 23|2.37|-0.02', 'Phecda|UMa|11 53.8|+53 41|2.44|0.00',
    'Megrez|UMa|12 15.4|+57 02|3.31|0.08', 'Alioth|UMa|12 54.0|+55 57|1.77|-0.02', 'Mizar|UMa|13 24.0|+54 56|2.04|0.02',
    'Alkaid|UMa|13 47.5|+49 19|1.86|-0.19', 'Muscida|UMa|08 30.3|+60 43|3.35|0.85', 'Talitha|UMa|08 59.2|+48 02|3.14|0.19',
    'Tania Borealis|UMa|10 17.1|+42 55|3.45|0.03', 'Tania Australis|UMa|10 22.3|+41 30|3.05|1.59', 'Alula Borealis|UMa|11 18.5|+33 06|3.48|1.41',
    'Alula Australis|UMa|11 18.2|+31 32|3.79|0.6', 'Cor Caroli|CVn|12 56.0|+38 19|2.90|-0.12',
    // Kleiner Bär
    'Polarstern|UMi|02 31.8|+89 16|1.98|0.60', 'Yildun|UMi|17 32.2|+86 35|4.36|0.04', 'ε UMi|UMi|16 46.0|+82 02|4.21|0.89',
    'ζ UMi|UMi|15 44.1|+77 48|4.29|0.04', 'η UMi|UMi|16 17.5|+75 45|4.95|0.38', 'Pherkad|UMi|15 20.7|+71 50|3.05|0.05', 'Kochab|UMi|14 50.7|+74 09|2.08|1.47',
    // Kassiopeia
    'Caph|Cas|00 09.2|+59 09|2.27|0.38', 'Schedar|Cas|00 40.5|+56 32|2.23|1.17', 'γ Cas|Cas|00 56.7|+60 43|2.47|-0.15',
    'Ruchbah|Cas|01 25.8|+60 14|2.68|0.13', 'Segin|Cas|01 54.4|+63 40|3.37|-0.15',
    // Kepheus
    'Alderamin|Cep|21 18.6|+62 35|2.45|0.22', 'Alfirk|Cep|21 28.7|+70 34|3.23|-0.22', 'Errai|Cep|23 39.3|+77 38|3.21|1.03',
    'ι Cep|Cep|22 49.7|+66 12|3.52|1.5', 'ζ Cep|Cep|22 10.9|+58 12|3.35|1.57',
    // Schwan
    'Deneb|Cyg|20 41.4|+45 17|1.25|0.09', 'Sadr|Cyg|20 22.2|+40 16|2.20|0.67', 'Gienah Cyg|Cyg|20 46.2|+33 58|2.46|1.03',
    'Fawaris|Cyg|19 45.0|+45 08|2.87|-0.03', 'Albireo|Cyg|19 30.7|+27 58|3.18|1.13',
    // Leier
    'Wega|Lyr|18 36.9|+38 47|0.03|0.00', 'Sheliak|Lyr|18 50.1|+33 22|3.52|0.00', 'Sulafat|Lyr|18 59.0|+32 41|3.25|-0.05',
    'δ2 Lyr|Lyr|18 54.5|+36 54|4.30|1.7', 'ζ1 Lyr|Lyr|18 44.8|+37 36|4.36|0.2',
    // Adler
    'Atair|Aql|19 50.8|+08 52|0.76|0.22', 'Tarazed|Aql|19 46.3|+10 37|2.72|1.52', 'Alshain|Aql|19 55.3|+06 24|3.71|0.86',
    'δ Aql|Aql|19 25.5|+03 07|3.36|0.32', 'Okab|Aql|19 05.4|+13 52|2.99|0.01', 'λ Aql|Aql|19 06.2|-04 53|3.44|-0.10', 'Tyl|Aql|20 11.2|-00 49|3.23|-0.07',
    // Delphin
    'Sualocin|Del|20 39.6|+15 55|3.77|-0.06', 'Rotanev|Del|20 37.5|+14 36|3.63|0.44', 'γ2 Del|Del|20 46.7|+16 07|4.27|1.0', 'δ Del|Del|20 43.5|+15 04|4.43|0.3', 'ε Del|Del|20 33.2|+11 18|4.03|-0.1',
    // Pegasus / Andromeda
    'Markab|Peg|23 04.8|+15 12|2.49|-0.04', 'Scheat|Peg|23 03.8|+28 05|2.42|1.67', 'Algenib|Peg|00 13.2|+15 11|2.83|-0.19',
    'Alpheratz|And|00 08.4|+29 05|2.06|-0.11', 'Enif|Peg|21 44.2|+09 53|2.39|1.52', 'Homam|Peg|22 41.5|+10 50|3.40|-0.09',
    'Matar|Peg|22 43.0|+30 13|2.94|0.86', 'Biham|Peg|22 10.2|+06 12|3.53|0.08',
    'Mirach|And|01 09.7|+35 37|2.06|1.58', 'Almach|And|02 03.9|+42 20|2.10|1.37', 'δ And|And|00 39.3|+30 52|3.27|1.28',
    'μ And|And|00 56.7|+38 30|3.86|0.13', 'ν And|And|00 49.1|+41 04|4.53|-0.1',
    // Perseus
    'Mirfak|Per|03 24.3|+49 52|1.79|0.48', 'Algol|Per|03 08.2|+40 57|2.12|-0.05', 'ζ Per|Per|03 54.1|+31 53|2.85|0.12',
    'ε Per|Per|03 57.9|+40 01|2.89|-0.19', 'δ Per|Per|03 42.9|+47 48|3.01|-0.13', 'γ Per|Per|03 04.8|+53 30|2.93|0.7', 'η Per|Per|02 50.7|+55 54|3.76|1.68',
    // Fuhrmann
    'Kapella|Aur|05 16.7|+46 00|0.08|0.80', 'Menkalinan|Aur|05 59.5|+44 57|1.90|0.03', 'Mahasim|Aur|05 59.7|+37 13|2.62|-0.08',
    'Hassaleh|Aur|04 57.0|+33 10|2.69|1.53', 'ε Aur|Aur|05 02.0|+43 49|2.99|0.54', 'η Aur|Aur|05 06.5|+41 14|3.17|-0.18', 'δ Aur|Aur|05 08.9|+47 44|3.72|1.0',
    // Stier
    'Aldebaran|Tau|04 35.9|+16 31|0.87|1.54', 'Elnath|Tau|05 26.3|+28 36|1.65|-0.13', 'ζ Tau|Tau|05 37.6|+21 09|3.00|-0.19',
    'Ain|Tau|04 28.6|+19 11|3.53|1.01', 'θ2 Tau|Tau|04 28.7|+15 52|3.40|0.18', 'γ Tau|Tau|04 19.8|+15 38|3.65|0.98',
    'δ1 Tau|Tau|04 22.9|+17 32|3.76|1.0', 'λ Tau|Tau|04 00.7|+12 29|3.47|-0.11',
    'Alkyone|Tau|03 47.5|+24 07|2.87|-0.09', 'Atlas|Tau|03 49.1|+24 03|3.62|-0.08', 'Elektra|Tau|03 44.9|+24 07|3.70|-0.11',
    'Maia|Tau|03 45.8|+24 22|3.87|-0.07', 'Merope|Tau|03 46.3|+23 57|4.18|-0.06', 'Taygeta|Tau|03 45.2|+24 28|4.30|-0.11',
    // Orion
    'Beteigeuze|Ori|05 55.2|+07 24|0.50|1.85', 'Rigel|Ori|05 14.5|-08 12|0.13|-0.03', 'Bellatrix|Ori|05 25.1|+06 21|1.64|-0.22',
    'Saiph|Ori|05 47.8|-09 40|2.06|-0.18', 'Alnitak|Ori|05 40.8|-01 57|1.77|-0.21', 'Alnilam|Ori|05 36.2|-01 12|1.69|-0.18',
    'Mintaka|Ori|05 32.0|-00 18|2.23|-0.22', 'Meissa|Ori|05 35.1|+09 56|3.39|-0.16', 'π3 Ori|Ori|04 49.8|+06 58|3.19|0.45',
    'η Ori|Ori|05 24.5|-02 24|3.35|-0.17', 'π4 Ori|Ori|04 51.2|+05 36|3.70|-0.17', 'π5 Ori|Ori|04 54.2|+02 26|3.72|-0.19',
    // Zwillinge
    'Kastor|Gem|07 34.6|+31 53|1.58|0.03', 'Pollux|Gem|07 45.3|+28 02|1.16|1.00', 'Alhena|Gem|06 37.7|+16 24|1.93|0.00',
    'Tejat|Gem|06 23.0|+22 30|2.88|1.64', 'Propus|Gem|06 14.9|+22 30|3.31|1.6', 'Mebsuta|Gem|06 43.9|+25 08|2.98|1.4',
    'Wasat|Gem|07 20.1|+21 59|3.53|0.34', 'Mekbuda|Gem|07 04.1|+20 34|3.79|0.8', 'λ Gem|Gem|07 18.1|+16 32|3.58|0.11',
    'ξ Gem|Gem|06 45.3|+12 54|3.35|0.43', 'κ Gem|Gem|07 44.4|+24 24|3.57|0.93',
    // Krebs
    'Acubens|Cnc|08 58.5|+11 51|4.25|0.12', 'Al Tarf|Cnc|08 16.5|+09 11|3.52|1.48', 'Asellus Australis|Cnc|08 44.7|+18 09|3.94|1.08',
    'Asellus Borealis|Cnc|08 43.3|+21 28|4.66|0.03', 'ι Cnc|Cnc|08 46.7|+28 46|4.02|1.0',
    // Löwe
    'Regulus|Leo|10 08.4|+11 58|1.36|-0.09', 'Denebola|Leo|11 49.1|+14 34|2.14|0.09', 'Algieba|Leo|10 20.0|+19 50|2.08|1.15',
    'Zosma|Leo|11 14.1|+20 31|2.56|0.13', 'Chertan|Leo|11 14.2|+15 26|3.34|-0.01', 'Adhafera|Leo|10 16.7|+23 25|3.44|0.31',
    'Rasalas|Leo|09 52.8|+26 00|3.88|1.1', 'ε Leo|Leo|09 45.9|+23 46|2.98|0.8', 'η Leo|Leo|10 07.3|+16 46|3.52|-0.03',
    // Jungfrau
    'Spica|Vir|13 25.2|-11 10|0.97|-0.23', 'Porrima|Vir|12 41.7|-01 27|2.74|0.36', 'Vindemiatrix|Vir|13 02.2|+10 57|2.83|0.94',
    'Zavijava|Vir|11 50.7|+01 46|3.61|0.55', 'Heze|Vir|13 34.7|-00 36|3.37|0.1', 'Minelauva|Vir|12 55.6|+03 24|3.38|1.58',
    'Zaniah|Vir|12 19.9|-00 40|3.89|0.0', 'Syrma|Vir|14 16.0|-06 00|4.08|0.5',
    // Bärenhüter
    'Arktur|Boo|14 15.7|+19 11|-0.05|1.23', 'Izar|Boo|14 45.0|+27 04|2.37|0.97', 'Muphrid|Boo|13 54.7|+18 24|2.68|0.58',
    'Seginus|Boo|14 32.1|+38 18|3.03|0.19', 'Nekkar|Boo|15 01.9|+40 23|3.49|0.95', 'δ Boo|Boo|15 15.5|+33 19|3.47|0.96', 'ρ Boo|Boo|14 31.8|+30 22|3.58|1.3',
    // Nördliche Krone
    'Alphecca|CrB|15 34.7|+26 43|2.23|-0.02', 'Nusakan|CrB|15 27.8|+29 06|3.68|0.3', 'γ CrB|CrB|15 42.7|+26 18|3.84|-0.1',
    'δ CrB|CrB|15 49.0|+26 04|4.63|0.9', 'ε CrB|CrB|15 57.6|+26 53|4.15|1.2', 'θ CrB|CrB|15 32.9|+31 21|4.14|-0.1', 'ι CrB|CrB|16 01.0|+29 51|4.99|0.0',
    // Herkules
    'Kornephoros|Her|16 30.9|+21 29|2.77|0.94', 'Rasalgethi|Her|17 14.6|+14 23|3.10|1.44', 'ζ Her|Her|16 41.3|+31 36|2.81|0.65',
    'η Her|Her|16 42.9|+38 55|3.53|0.92', 'π Her|Her|17 15.0|+36 49|3.16|1.44', 'Sarin|Her|17 15.0|+24 50|3.14|0.08', 'ε Her|Her|17 00.3|+30 56|3.92|0.0',
    // Drache (Kopf)
    'Eltanin|Dra|17 56.6|+51 29|2.23|1.52', 'Rastaban|Dra|17 30.4|+52 18|2.79|0.99', 'Grumium|Dra|17 53.5|+56 52|3.75|1.18', 'ν Dra|Dra|17 32.2|+55 11|4.88|0.1',
    'Thuban|Dra|14 04.4|+64 22|3.65|-0.05', 'Altais|Dra|19 12.4|+67 40|3.07|0.99', 'Aldhibah|Dra|17 08.8|+65 43|3.17|-0.1', 'Edasich|Dra|15 24.9|+58 58|3.29|1.16',
    // Skorpion
    'Antares|Sco|16 29.4|-26 26|1.06|1.83', 'Shaula|Sco|17 33.6|-37 06|1.62|-0.22', 'Sargas|Sco|17 37.3|-42 59|1.86|0.40',
    'Dschubba|Sco|16 00.3|-22 37|2.32|-0.12', 'Graffias|Sco|16 05.4|-19 48|2.62|-0.07', 'π Sco|Sco|15 58.9|-26 07|2.89|-0.21',
    'σ Sco|Sco|16 21.2|-25 36|2.89|0.13', 'τ Sco|Sco|16 35.9|-28 13|2.82|-0.25', 'Larawag|Sco|16 50.2|-34 18|2.29|1.14',
    'μ1 Sco|Sco|16 51.9|-38 03|3.08|-0.2', 'ζ2 Sco|Sco|16 54.6|-42 22|3.62|1.38', 'η Sco|Sco|17 12.2|-43 14|3.33|0.4',
    'Lesath|Sco|17 30.8|-37 18|2.70|-0.22', 'ι1 Sco|Sco|17 47.6|-40 08|3.03|0.5', 'κ Sco|Sco|17 42.5|-39 02|2.41|-0.22',
    // Schütze
    'Kaus Australis|Sgr|18 24.2|-34 23|1.85|-0.03', 'Nunki|Sgr|18 55.3|-26 18|2.05|-0.13', 'Ascella|Sgr|19 02.6|-29 53|2.60|0.08',
    'Kaus Media|Sgr|18 21.0|-29 50|2.70|1.38', 'Kaus Borealis|Sgr|18 28.0|-25 25|2.81|1.0', 'Alnasl|Sgr|18 05.8|-30 26|2.99|1.4',
    'φ Sgr|Sgr|18 45.7|-26 59|3.17|-0.1', 'τ Sgr|Sgr|19 06.9|-27 40|3.32|1.0', 'Albaldah|Sgr|19 09.8|-21 01|2.89|0.4',
    // Steinbock / Wassermann / Widder / Waage / Rabe
    'Deneb Algedi|Cap|21 47.0|-16 08|2.87|0.29', 'Dabih|Cap|20 21.0|-14 47|3.08|0.8', 'Algedi|Cap|20 18.1|-12 33|3.57|0.9',
    'Nashira|Cap|21 40.1|-16 40|3.68|0.3', 'ψ Cap|Cap|20 46.0|-25 16|4.13|0.6', 'ω Cap|Cap|20 51.0|-26 55|4.11|1.6',
    'θ Cap|Cap|21 06.9|-17 14|4.07|0.0', 'ζ Cap|Cap|21 26.7|-22 25|3.74|1.0',
    'Sadalsuud|Aqr|21 31.6|-05 34|2.91|0.83', 'Sadalmelik|Aqr|22 05.8|-00 19|2.96|0.98', 'Skat|Aqr|22 54.7|-15 49|3.27|0.05',
    'Sadachbia|Aqr|22 21.7|-01 23|3.84|-0.05', 'ζ Aqr|Aqr|22 28.8|-00 01|3.65|0.3', 'η Aqr|Aqr|22 35.8|-00 07|4.02|-0.1',
    'Albali|Aqr|20 47.7|-09 30|3.77|0.0', 'Ancha|Aqr|22 16.8|-07 47|4.16|0.9', 'λ Aqr|Aqr|22 52.6|-07 35|3.74|1.6',
    'Hamal|Ari|02 07.2|+23 27|2.00|1.15', 'Sheratan|Ari|01 54.6|+20 48|2.64|0.16', 'Mesarthim|Ari|01 53.5|+19 17|3.88|-0.0', '41 Ari|Ari|02 49.9|+27 16|3.63|-0.1',
    // Fische
    'Alrescha|Psc|02 02.0|+02 46|3.82|0.07', 'η Psc|Psc|01 31.5|+15 21|3.62|0.96', 'γ Psc|Psc|23 17.2|+03 17|3.70|0.95',
    'ω Psc|Psc|23 59.3|+06 52|4.03|0.51', 'ι Psc|Psc|23 40.0|+05 38|4.13|0.48', 'θ Psc|Psc|23 28.0|+06 23|4.28|1.05',
    'λ Psc|Psc|23 42.0|+01 47|4.50|0.14', 'ε Psc|Psc|01 02.9|+07 53|4.28|1.11', 'δ Psc|Psc|00 48.7|+07 35|4.43|1.51',
    'ζ Psc|Psc|01 13.7|+07 35|5.21|0.16', 'μ Psc|Psc|01 16.7|+06 09|4.84|0.94', 'ν Psc|Psc|01 41.4|+05 29|4.44|1.03',
    'ο Psc|Psc|01 45.4|+09 09|4.26|0.47', 'β Psc|Psc|23 03.9|+03 49|4.40|-0.10',
    'Zubeneschamali|Lib|15 17.0|-09 23|2.61|-0.11', 'Zubenelgenubi|Lib|14 50.9|-16 02|2.75|0.15', 'γ Lib|Lib|15 35.5|-14 47|3.91|1.0', 'σ Lib|Lib|15 04.1|-25 17|3.29|1.7',
    'Gienah Crv|Crv|12 15.8|-17 33|2.59|-0.11', 'Kraz|Crv|12 34.4|-23 24|2.65|0.89', 'Algorab|Crv|12 29.9|-16 31|2.94|-0.05',
    'Minkar|Crv|12 10.1|-22 37|3.02|1.33', 'Alchiba|Crv|12 08.4|-24 44|4.02|0.3',
    // Wal, Dreieck, Schlangenträger, Wasserschlange, Schlange
    'Diphda|Cet|00 43.6|-17 59|2.04|1.02', 'Menkar|Cet|03 02.3|+04 05|2.53|1.63', 'Kaffaljidhma|Cet|02 43.3|+03 14|3.47|0.09',
    'Mothallah|Tri|01 53.1|+29 35|3.41|0.5', 'β Tri|Tri|02 09.5|+34 59|3.00|0.14', 'γ Tri|Tri|02 17.3|+33 51|4.01|0.0',
    'Rasalhague|Oph|17 34.9|+12 34|2.08|0.16', 'Cebalrai|Oph|17 43.5|+04 34|2.77|1.16', 'Sabik|Oph|17 10.4|-15 43|2.43|0.06',
    'Yed Prior|Oph|16 14.3|-03 41|2.74|1.58', 'ζ Oph|Oph|16 37.2|-10 34|2.56|0.02', 'κ Oph|Oph|16 57.7|+09 22|3.20|1.16',
    'Alphard|Hya|09 27.6|-08 40|1.98|1.44', 'Unukalhai|Ser|15 44.3|+06 26|2.63|1.17',
    // Großer und Kleiner Hund, Hase, Taube
    'Sirius|CMa|06 45.1|-16 43|-1.46|0.00', 'Adhara|CMa|06 58.6|-28 58|1.50|-0.21', 'Wezen|CMa|07 08.4|-26 24|1.84|0.67',
    'Mirzam|CMa|06 22.7|-17 57|1.98|-0.24', 'Aludra|CMa|07 24.1|-29 18|2.45|-0.08', 'Furud|CMa|06 20.3|-30 04|3.02|-0.19',
    'ο2 CMa|CMa|07 03.0|-23 50|3.02|-0.08', 'Muliphein|CMa|07 03.8|-15 38|4.11|-0.1',
    'Prokyon|CMi|07 39.3|+05 14|0.34|0.42', 'Gomeisa|CMi|07 27.2|+08 17|2.89|-0.09',
    'Arneb|Lep|05 32.7|-17 49|2.58|0.21', 'Nihal|Lep|05 28.2|-20 46|2.84|0.82', 'ε Lep|Lep|05 05.5|-22 22|3.19|1.46',
    'μ Lep|Lep|05 12.9|-16 12|3.31|-0.1', 'ζ Lep|Lep|05 46.8|-14 49|3.55|0.1', 'η Lep|Lep|05 56.4|-14 10|3.71|0.3',
    'Phakt|Col|05 39.6|-34 04|2.65|-0.12', 'Wazn|Col|05 51.0|-35 46|3.12|1.14',
    'Achernar|Eri|01 37.7|-57 14|0.46|-0.16', 'Cursa|Eri|05 07.9|-05 05|2.79|0.13', 'Zaurak|Eri|03 58.0|-13 31|2.95|1.59', 'Acamar|Eri|02 58.3|-40 18|2.91|0.14',
    // Südhimmel
    'Canopus|Car|06 24.0|-52 42|-0.74|0.15', 'Miaplacidus|Car|09 13.2|-69 43|1.68|0.00', 'Avior|Car|08 22.5|-59 31|1.86|1.2', 'Aspidiske|Car|09 17.1|-59 16|2.25|0.18',
    'Regor|Vel|08 09.5|-47 20|1.75|-0.22', 'Suhail|Vel|09 08.0|-43 26|2.21|1.66', 'Markeb|Vel|09 22.1|-55 01|2.47|-0.14', 'δ Vel|Vel|08 44.7|-54 43|1.96|0.04',
    'Naos|Pup|08 03.6|-40 00|2.25|-0.27', 'Tureis|Pup|08 07.5|-24 18|2.81|0.43',
    'Acrux|Cru|12 26.6|-63 06|0.76|-0.24', 'Mimosa|Cru|12 47.7|-59 41|1.25|-0.23', 'Gacrux|Cru|12 31.2|-57 07|1.64|1.59',
    'Imai|Cru|12 15.1|-58 45|2.80|-0.2', 'ε Cru|Cru|12 21.4|-60 24|3.59|1.4',
    'Rigil Kentaurus|Cen|14 39.6|-60 50|-0.27|0.71', 'Hadar|Cen|14 03.8|-60 22|0.61|-0.23', 'Menkent|Cen|14 06.7|-36 22|2.06|1.01',
    'Muhlifain|Cen|12 41.5|-48 58|2.17|-0.02', 'ε Cen|Cen|13 39.9|-53 28|2.30|-0.22', 'ζ Cen|Cen|13 55.5|-47 17|2.55|-0.19',
    'η Cen|Cen|14 35.5|-42 09|2.31|-0.15', 'δ Cen|Cen|12 08.4|-50 43|2.60|-0.13',
    'Atria|TrA|16 48.7|-69 02|1.92|1.44', 'β TrA|TrA|15 55.1|-63 26|2.85|0.29', 'γ TrA|TrA|15 18.9|-68 41|2.87|0.0',
    'Peacock|Pav|20 25.6|-56 44|1.94|-0.2', 'Alnair|Gru|22 08.2|-46 58|1.74|-0.13', 'Tiaki|Gru|22 42.7|-46 53|2.10|1.6', 'γ Gru|Gru|21 54.5|-37 22|3.01|-0.1',
    'Fomalhaut|PsA|22 57.6|-29 37|1.16|0.09', 'Ankaa|Phe|00 26.3|-42 18|2.40|1.09'
  ];

  // Tief-Himmel-Objekte (ausgewählt): Name, RA, Dek, Helligkeit, Art, Ausdehnung (Bogenminuten)
  const DSO_RAW = [
    'Andromeda-Galaxie (M31)|00 42.7|+41 16|3.4|gal|190', 'Orionnebel (M42)|05 35.3|-05 23|4.0|neb|65', 'Plejaden (M45)|03 47.0|+24 07|1.6|oc|110',
    'Krippe (M44)|08 40.4|+19 40|3.1|oc|95', 'Herkuleshaufen (M13)|16 41.7|+36 28|5.8|gc|20', 'Doppelhaufen h & χ Persei|02 20.0|+57 08|4.3|oc|60',
    'Große Magellansche Wolke|05 23.6|-69 45|0.9|gal|400', 'Kleine Magellansche Wolke|00 52.7|-72 48|2.7|gal|200', 'ω Centauri|13 26.8|-47 29|3.9|gc|36',
    '47 Tucanae|00 24.1|-72 05|4.1|gc|31', 'Carinanebel|10 45.1|-59 41|1.0|neb|120', 'Lagunennebel (M8)|18 03.8|-24 23|6.0|neb|60'
  ];

  const CONS = {
    UMa: { de: 'Großer Bär', lines: [['Dubhe', 'Merak'], ['Merak', 'Phecda'], ['Phecda', 'Megrez'], ['Megrez', 'Dubhe'], ['Megrez', 'Alioth'], ['Alioth', 'Mizar'], ['Mizar', 'Alkaid']] },
    UMi: { de: 'Kleiner Bär', lines: [['Polarstern', 'Yildun'], ['Yildun', 'ε UMi'], ['ε UMi', 'ζ UMi'], ['ζ UMi', 'η UMi'], ['η UMi', 'Pherkad'], ['Pherkad', 'Kochab'], ['Kochab', 'ζ UMi']] },
    Cas: { de: 'Kassiopeia', lines: [['Caph', 'Schedar'], ['Schedar', 'γ Cas'], ['γ Cas', 'Ruchbah'], ['Ruchbah', 'Segin']] },
    Cep: { de: 'Kepheus', lines: [['Alderamin', 'Alfirk'], ['Alfirk', 'Errai'], ['Errai', 'ι Cep'], ['ι Cep', 'ζ Cep'], ['ζ Cep', 'Alderamin']] },
    Cyg: { de: 'Schwan', lines: [['Deneb', 'Sadr'], ['Sadr', 'Albireo'], ['Fawaris', 'Sadr'], ['Sadr', 'Gienah Cyg']] },
    Lyr: { de: 'Leier', lines: [['Wega', 'ζ1 Lyr'], ['ζ1 Lyr', 'δ2 Lyr'], ['δ2 Lyr', 'Sulafat'], ['Sulafat', 'Sheliak'], ['Sheliak', 'ζ1 Lyr']] },
    Aql: { de: 'Adler', lines: [['Tarazed', 'Atair'], ['Atair', 'Alshain'], ['Atair', 'δ Aql'], ['δ Aql', 'λ Aql'], ['Tarazed', 'Okab']] },
    Del: { de: 'Delphin', lines: [['Rotanev', 'Sualocin'], ['Sualocin', 'γ2 Del'], ['γ2 Del', 'δ Del'], ['δ Del', 'Rotanev'], ['Rotanev', 'ε Del']] },
    Peg: { de: 'Pegasus', lines: [['Alpheratz', 'Scheat'], ['Scheat', 'Markab'], ['Markab', 'Algenib'], ['Algenib', 'Alpheratz'], ['Markab', 'Homam'], ['Homam', 'Biham'], ['Biham', 'Enif'], ['Scheat', 'Matar']] },
    And: { de: 'Andromeda', lines: [['Alpheratz', 'δ And'], ['Alpheratz', 'Mirach'], ['Mirach', 'Almach'], ['Mirach', 'μ And'], ['μ And', 'ν And']] },
    Per: { de: 'Perseus', lines: [['η Per', 'γ Per'], ['γ Per', 'Mirfak'], ['Mirfak', 'δ Per'], ['δ Per', 'ε Per'], ['ε Per', 'ζ Per'], ['Mirfak', 'Algol']] },
    Aur: { de: 'Fuhrmann', lines: [['Kapella', 'Menkalinan'], ['Menkalinan', 'Mahasim'], ['Mahasim', 'Elnath'], ['Elnath', 'Hassaleh'], ['Hassaleh', 'Kapella']] },
    Tau: { de: 'Stier', lines: [['Elnath', 'Ain'], ['Ain', 'δ1 Tau'], ['δ1 Tau', 'γ Tau'], ['γ Tau', 'θ2 Tau'], ['θ2 Tau', 'Aldebaran'], ['Aldebaran', 'ζ Tau'], ['γ Tau', 'λ Tau']] },
    Ori: { de: 'Orion', lines: [['Meissa', 'Beteigeuze'], ['Meissa', 'Bellatrix'], ['Beteigeuze', 'Alnitak'], ['Bellatrix', 'Mintaka'], ['Alnitak', 'Alnilam'], ['Alnilam', 'Mintaka'], ['Alnitak', 'Saiph'], ['Mintaka', 'Rigel'], ['Bellatrix', 'π3 Ori']] },
    Gem: { de: 'Zwillinge', lines: [['Kastor', 'Mebsuta'], ['Mebsuta', 'Tejat'], ['Tejat', 'Propus'], ['Pollux', 'Wasat'], ['Wasat', 'Mekbuda'], ['Mekbuda', 'Alhena'], ['Mebsuta', 'Mekbuda'], ['Wasat', 'λ Gem']] },
    Cnc: { de: 'Krebs', lines: [['Al Tarf', 'Asellus Australis'], ['Asellus Australis', 'Acubens'], ['Asellus Australis', 'Asellus Borealis'], ['Asellus Borealis', 'ι Cnc']] },
    Leo: { de: 'Löwe', lines: [['Regulus', 'η Leo'], ['η Leo', 'Algieba'], ['Algieba', 'Adhafera'], ['Adhafera', 'Rasalas'], ['Rasalas', 'ε Leo'], ['Algieba', 'Zosma'], ['Zosma', 'Denebola'], ['Denebola', 'Chertan'], ['Chertan', 'Zosma'], ['Chertan', 'Regulus']] },
    Vir: { de: 'Jungfrau', lines: [['Zavijava', 'Zaniah'], ['Zaniah', 'Porrima'], ['Porrima', 'Minelauva'], ['Minelauva', 'Vindemiatrix'], ['Porrima', 'Heze'], ['Heze', 'Spica'], ['Heze', 'Syrma']] },
    Boo: { de: 'Bärenhüter', lines: [['Arktur', 'Izar'], ['Izar', 'δ Boo'], ['δ Boo', 'Nekkar'], ['Nekkar', 'Seginus'], ['Seginus', 'ρ Boo'], ['ρ Boo', 'Arktur'], ['Arktur', 'Muphrid']] },
    CrB: { de: 'Nördliche Krone', lines: [['θ CrB', 'Nusakan'], ['Nusakan', 'Alphecca'], ['Alphecca', 'γ CrB'], ['γ CrB', 'δ CrB'], ['δ CrB', 'ε CrB'], ['ε CrB', 'ι CrB']] },
    Her: { de: 'Herkules', lines: [['ζ Her', 'η Her'], ['η Her', 'π Her'], ['π Her', 'ε Her'], ['ε Her', 'ζ Her'], ['ζ Her', 'Kornephoros'], ['ε Her', 'Sarin'], ['Sarin', 'Rasalgethi']] },
    Dra: { de: 'Drache', lines: [['Eltanin', 'Rastaban'], ['Rastaban', 'ν Dra'], ['ν Dra', 'Grumium'], ['Grumium', 'Eltanin']] },
    Sco: { de: 'Skorpion', lines: [['Graffias', 'Dschubba'], ['Dschubba', 'π Sco'], ['Dschubba', 'σ Sco'], ['σ Sco', 'Antares'], ['Antares', 'τ Sco'], ['τ Sco', 'Larawag'], ['Larawag', 'μ1 Sco'], ['μ1 Sco', 'ζ2 Sco'], ['ζ2 Sco', 'η Sco'], ['η Sco', 'Sargas'], ['Sargas', 'ι1 Sco'], ['ι1 Sco', 'κ Sco'], ['κ Sco', 'Shaula'], ['Shaula', 'Lesath']] },
    Sgr: { de: 'Schütze', lines: [['Kaus Media', 'Kaus Borealis'], ['Kaus Borealis', 'φ Sgr'], ['φ Sgr', 'Ascella'], ['Ascella', 'Kaus Australis'], ['Kaus Australis', 'Kaus Media'], ['Alnasl', 'Kaus Media'], ['Alnasl', 'Kaus Australis'], ['φ Sgr', 'Nunki'], ['Nunki', 'τ Sgr'], ['τ Sgr', 'Ascella']] },
    Cap: { de: 'Steinbock', lines: [['Algedi', 'Dabih'], ['Dabih', 'ψ Cap'], ['ψ Cap', 'ω Cap'], ['ω Cap', 'ζ Cap'], ['ζ Cap', 'Deneb Algedi'], ['Deneb Algedi', 'Nashira'], ['Nashira', 'θ Cap'], ['θ Cap', 'Algedi']] },
    Aqr: { de: 'Wassermann', lines: [['Albali', 'Sadalsuud'], ['Sadalsuud', 'Sadalmelik'], ['Sadalmelik', 'Sadachbia'], ['Sadachbia', 'ζ Aqr'], ['ζ Aqr', 'η Aqr'], ['Sadachbia', 'Ancha'], ['Ancha', 'λ Aqr'], ['λ Aqr', 'Skat']] },
    Ari: { de: 'Widder', lines: [['Mesarthim', 'Sheratan'], ['Sheratan', 'Hamal'], ['Hamal', '41 Ari']] },
    Psc: { de: 'Fische', lines: [['β Psc', 'γ Psc'], ['γ Psc', 'θ Psc'], ['θ Psc', 'ι Psc'], ['ι Psc', 'λ Psc'], ['λ Psc', 'β Psc'], ['λ Psc', 'ω Psc'], ['ω Psc', 'δ Psc'], ['δ Psc', 'ε Psc'], ['ε Psc', 'ζ Psc'], ['ζ Psc', 'μ Psc'], ['μ Psc', 'ν Psc'], ['ν Psc', 'Alrescha'], ['ν Psc', 'ο Psc'], ['ο Psc', 'η Psc']] },
    Lib: { de: 'Waage', lines: [['Zubenelgenubi', 'Zubeneschamali'], ['Zubeneschamali', 'γ Lib'], ['γ Lib', 'σ Lib'], ['σ Lib', 'Zubenelgenubi']] },
    Crv: { de: 'Rabe', lines: [['Gienah Crv', 'Algorab'], ['Algorab', 'Kraz'], ['Kraz', 'Minkar'], ['Minkar', 'Gienah Crv']] },
    Tri: { de: 'Dreieck', lines: [['Mothallah', 'β Tri'], ['β Tri', 'γ Tri'], ['γ Tri', 'Mothallah']] },
    CMa: { de: 'Großer Hund', lines: [['Mirzam', 'Sirius'], ['Sirius', 'Muliphein'], ['Sirius', 'Wezen'], ['Wezen', 'Adhara'], ['Adhara', 'Furud'], ['Wezen', 'Aludra'], ['Wezen', 'ο2 CMa']] },
    CMi: { de: 'Kleiner Hund', lines: [['Prokyon', 'Gomeisa']] },
    Lep: { de: 'Hase', lines: [['μ Lep', 'Arneb'], ['Arneb', 'Nihal'], ['Nihal', 'ε Lep'], ['Arneb', 'ζ Lep'], ['ζ Lep', 'η Lep']] },
    Col: { de: 'Taube', lines: [['Phakt', 'Wazn']] },
    Car: { de: 'Schiffskiel', lines: [['Avior', 'Aspidiske'], ['Aspidiske', 'Markeb'], ['Markeb', 'δ Vel'], ['δ Vel', 'Avior']] },
    Cru: { de: 'Kreuz des Südens', lines: [['Acrux', 'Gacrux'], ['Mimosa', 'Imai']] },
    Cen: { de: 'Zentaur', lines: [['Hadar', 'ε Cen'], ['ε Cen', 'ζ Cen'], ['ζ Cen', 'η Cen'], ['η Cen', 'Menkent'], ['ε Cen', 'Muhlifain'], ['Muhlifain', 'δ Cen'], ['Hadar', 'Rigil Kentaurus']] },
    TrA: { de: 'Südliches Dreieck', lines: [['Atria', 'β TrA'], ['β TrA', 'γ TrA'], ['γ TrA', 'Atria']] },
    Gru: { de: 'Kranich', lines: [['γ Gru', 'Alnair'], ['Alnair', 'Tiaki']] }
  };
  // Sternbilder ohne Linien, aber mit Namen für Beschriftung
  const CON_NAMES = { CVn: 'Jagdhunde', Cet: 'Walfisch', Oph: 'Schlangenträger', Hya: 'Wasserschlange', Ser: 'Schlange', Vel: 'Segel des Schiffs', Pup: 'Achterdeck', Eri: 'Eridanus', Pav: 'Pfau', PsA: 'Südlicher Fisch', Phe: 'Phönix' };

  function parseRA(s) { const p = s.trim().split(/\s+/); return (parseFloat(p[0]) + parseFloat(p[1]) / 60) * 15; }
  function parseDec(s) { const sign = s.trim()[0] === '-' ? -1 : 1; const p = s.trim().replace(/^[+-]/, '').split(/\s+/); return sign * (parseFloat(p[0]) + parseFloat(p[1]) / 60); }


  const LY = {
    'Sirius': 8.6, 'Rigil Kentaurus': 4.37, 'Prokyon': 11.5, 'Atair': 17, 'Fomalhaut': 25, 'Wega': 25,
    'Caph': 55, 'Zosma': 58, 'Alderamin': 49, 'Rasalhague': 47, 'Kastor': 51, 'Hamal': 66, 'Aldebaran': 65,
    'Seginus': 85, 'Alphecca': 75, 'Diphda': 96, 'Alpheratz': 97, 'Ruchbah': 99, 'Alkaid': 101, 'Kornephoros': 148,
    'Arktur': 37, 'Kapella': 43, 'Eltanin': 154, 'Sadachbia': 158, 'Nashira': 158, 'Zubeneschamali': 185,
    'Peacock': 183, 'Regulus': 79, 'Dubhe': 123, 'Markab': 133, 'Achernar': 139, 'Kaus Australis': 143,
    'Mirach': 197, 'Spica': 250, 'Thuban': 270, 'Phakt': 261, 'Canopus': 310, 'Acrux': 320, 'Atria': 415,
    'Polarstern': 433, 'Alkyone': 440, 'Mirzam': 500, 'Sadalsuud': 540, 'Beteigeuze': 548, 'Antares': 550,
    'Saiph': 650, 'Mintaka': 900, 'Naos': 1080, 'Mirfak': 590, 'Deneb': 2600,
    'Krippe (M44)': 577, '47 Tucanae': 13000, 'Große Magellansche Wolke': 160000, 'Andromeda-Galaxie (M31)': 2500000
  };
  const stars = RAW.map(r => {
    const f = r.split('|');
    return { name: f[0], con: f[1], ra: parseRA(f[2]), dec: parseDec(f[3]), mag: parseFloat(f[4]), bv: parseFloat(f[5]), ly: LY[f[0]] || null };
  });
  const byName = {};
  stars.forEach(s => { byName[s.name] = s; });
  const dso = DSO_RAW.map(r => {
    const f = r.split('|');
    return { name: f[0], ra: parseRA(f[1]), dec: parseDec(f[2]), mag: parseFloat(f[3]), type: f[4], size: parseFloat(f[5]), ly: LY[f[0]] || null };
  });

  const constellations = Object.keys(CONS).map(k => ({
    id: k, de: CONS[k].de,
    lines: CONS[k].lines.map(l => [byName[l[0]], byName[l[1]]])
  }));

  // Sterne, die mit Namen beschriftet werden (sofern hell genug)
  const labelled = new Set(['Polarstern', 'Wega', 'Atair', 'Deneb', 'Arktur', 'Kapella', 'Rigel', 'Beteigeuze', 'Aldebaran', 'Antares', 'Spica', 'Regulus', 'Prokyon', 'Kastor', 'Pollux', 'Fomalhaut', 'Sirius', 'Canopus', 'Achernar', 'Hadar', 'Rigil Kentaurus', 'Acrux', 'Bellatrix', 'Denebola', 'Mizar', 'Dubhe', 'Alkaid', 'Schedar', 'Algol', 'Mirfak', 'Alpheratz', 'Markab', 'Scheat', 'Enif', 'Shaula', 'Sargas', 'Nunki', 'Rasalhague', 'Alphard', 'Hamal', 'Diphda', 'Mimosa', 'Gacrux', 'Elnath', 'Alnilam', 'Alnitak', 'Mintaka', 'Saiph', 'Adhara', 'Wezen', 'Alhena', 'Menkent', 'Peacock', 'Alnair', 'Miaplacidus', 'Avior', 'Regor', 'Naos', 'Suhail', 'Kochab', 'Alioth', 'Merak', 'Phecda', 'Megrez', 'Albireo', 'Sadr', 'Alderamin', 'Izar', 'Alphecca', 'Kaus Australis', 'Menkar', 'Zubeneschamali', 'Sabik', 'Eltanin', 'Thuban', 'Vindemiatrix', 'Porrima', 'Algieba', 'Zosma', 'Atria', 'Ankaa', 'Mirach', 'Almach']);

  return { stars, byName, dso, constellations, CON_NAMES, labelled };
});

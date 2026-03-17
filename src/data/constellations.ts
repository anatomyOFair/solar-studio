/**
 * Major constellation stick-figure data.
 * Each line segment connects two stars by RA/Dec (degrees).
 * RA: 0–360°, Dec: -90° to +90°.
 * Source: IAU standard stick figures, Hipparcos star positions.
 */

interface Star {
  ra: number
  dec: number
}

export interface ConstellationDef {
  id: string
  name: string
  lines: [Star, Star][]
}

export const CONSTELLATIONS: ConstellationDef[] = [
  {
    id: 'uma',
    name: 'Ursa Major',
    lines: [
      [{ ra: 165.93, dec: 61.75 }, { ra: 166.45, dec: 56.38 }], // Dubhe–Merak
      [{ ra: 165.93, dec: 61.75 }, { ra: 178.46, dec: 53.69 }], // Dubhe–Phecda (via Merak)
      [{ ra: 166.45, dec: 56.38 }, { ra: 178.46, dec: 53.69 }], // Merak–Phecda
      [{ ra: 178.46, dec: 53.69 }, { ra: 183.86, dec: 57.03 }], // Phecda–Megrez
      [{ ra: 183.86, dec: 57.03 }, { ra: 193.51, dec: 55.96 }], // Megrez–Alioth
      [{ ra: 193.51, dec: 55.96 }, { ra: 200.98, dec: 54.93 }], // Alioth–Mizar
      [{ ra: 200.98, dec: 54.93 }, { ra: 206.89, dec: 49.31 }], // Mizar–Alkaid
      [{ ra: 183.86, dec: 57.03 }, { ra: 165.93, dec: 61.75 }], // Megrez–Dubhe
    ],
  },
  {
    id: 'umi',
    name: 'Ursa Minor',
    lines: [
      [{ ra: 37.95, dec: 89.26 }, { ra: 263.05, dec: 86.59 }], // Polaris–δ UMi
      [{ ra: 263.05, dec: 86.59 }, { ra: 238.18, dec: 77.79 }], // δ UMi–ε UMi
      [{ ra: 238.18, dec: 77.79 }, { ra: 236.01, dec: 75.76 }], // ε UMi–ζ UMi
      [{ ra: 236.01, dec: 75.76 }, { ra: 222.68, dec: 74.16 }], // ζ UMi–η UMi (Kochab direction)
      [{ ra: 222.68, dec: 74.16 }, { ra: 230.18, dec: 71.83 }], // η UMi–β UMi (Kochab)
      [{ ra: 230.18, dec: 71.83 }, { ra: 247.55, dec: 72.15 }], // Kochab–γ UMi (Pherkad)
      [{ ra: 247.55, dec: 72.15 }, { ra: 238.18, dec: 77.79 }], // Pherkad–ε UMi
    ],
  },
  {
    id: 'ori',
    name: 'Orion',
    lines: [
      [{ ra: 88.79, dec: 7.41 }, { ra: 81.28, dec: 6.35 }],   // Betelgeuse–Bellatrix
      [{ ra: 81.28, dec: 6.35 }, { ra: 83.00, dec: -0.30 }],   // Bellatrix–Mintaka
      [{ ra: 83.00, dec: -0.30 }, { ra: 83.86, dec: -1.20 }],  // Mintaka–Alnilam
      [{ ra: 83.86, dec: -1.20 }, { ra: 84.05, dec: -1.94 }],  // Alnilam–Alnitak
      [{ ra: 84.05, dec: -1.94 }, { ra: 78.63, dec: -8.20 }],  // Alnitak–Saiph
      [{ ra: 78.63, dec: -8.20 }, { ra: 88.79, dec: 7.41 }],   // Saiph–Betelgeuse
      [{ ra: 83.00, dec: -0.30 }, { ra: 88.79, dec: 7.41 }],   // Mintaka–Betelgeuse
      [{ ra: 84.05, dec: -1.94 }, { ra: 85.19, dec: -8.20 }],  // Alnitak–Rigel
      [{ ra: 85.19, dec: -8.20 }, { ra: 81.28, dec: 6.35 }],   // Rigel–Bellatrix
    ],
  },
  {
    id: 'cas',
    name: 'Cassiopeia',
    lines: [
      [{ ra: 10.13, dec: 56.54 }, { ra: 17.10, dec: 60.24 }],  // Schedar–Caph
      [{ ra: 10.13, dec: 56.54 }, { ra: 14.18, dec: 60.72 }],  // Schedar–γ Cas
      [{ ra: 14.18, dec: 60.72 }, { ra: 21.45, dec: 60.24 }],  // γ Cas–δ Cas
      [{ ra: 21.45, dec: 60.24 }, { ra: 28.60, dec: 63.67 }],  // δ Cas–ε Cas
    ],
  },
  {
    id: 'cyg',
    name: 'Cygnus',
    lines: [
      [{ ra: 310.36, dec: 45.28 }, { ra: 305.56, dec: 40.26 }], // Deneb–γ Cyg (Sadr)
      [{ ra: 305.56, dec: 40.26 }, { ra: 297.70, dec: 27.96 }], // Sadr–Albireo
      [{ ra: 305.56, dec: 40.26 }, { ra: 311.55, dec: 33.97 }], // Sadr–ε Cyg (Gienah)
      [{ ra: 305.56, dec: 40.26 }, { ra: 296.24, dec: 45.13 }], // Sadr–δ Cyg
      [{ ra: 311.55, dec: 33.97 }, { ra: 318.23, dec: 30.23 }], // Gienah–ζ Cyg
      [{ ra: 296.24, dec: 45.13 }, { ra: 292.68, dec: 51.73 }], // δ Cyg–ι Cyg
    ],
  },
  {
    id: 'leo',
    name: 'Leo',
    lines: [
      [{ ra: 152.09, dec: 11.97 }, { ra: 148.19, dec: 26.01 }], // Regulus–η Leo
      [{ ra: 148.19, dec: 26.01 }, { ra: 154.17, dec: 23.77 }], // η Leo–γ Leo (Algieba)
      [{ ra: 154.17, dec: 23.77 }, { ra: 168.53, dec: 20.52 }], // Algieba–δ Leo (Zosma)
      [{ ra: 168.53, dec: 20.52 }, { ra: 177.27, dec: 14.57 }], // Zosma–β Leo (Denebola)
      [{ ra: 168.53, dec: 20.52 }, { ra: 170.98, dec: 15.43 }], // Zosma–θ Leo
      [{ ra: 152.09, dec: 11.97 }, { ra: 154.17, dec: 23.77 }], // Regulus–Algieba
      [{ ra: 148.19, dec: 26.01 }, { ra: 146.46, dec: 23.77 }], // η Leo–μ Leo
    ],
  },
  {
    id: 'sco',
    name: 'Scorpius',
    lines: [
      [{ ra: 247.35, dec: -26.43 }, { ra: 240.08, dec: -22.62 }], // Antares–δ Sco
      [{ ra: 240.08, dec: -22.62 }, { ra: 241.36, dec: -19.81 }], // δ Sco–β Sco (Graffias)
      [{ ra: 241.36, dec: -19.81 }, { ra: 245.30, dec: -25.59 }], // Graffias–π Sco
      [{ ra: 247.35, dec: -26.43 }, { ra: 252.55, dec: -28.22 }], // Antares–τ Sco
      [{ ra: 252.55, dec: -28.22 }, { ra: 253.65, dec: -34.29 }], // τ Sco–ε Sco
      [{ ra: 253.65, dec: -34.29 }, { ra: 258.04, dec: -37.10 }], // ε Sco–ζ Sco
      [{ ra: 258.04, dec: -37.10 }, { ra: 262.69, dec: -37.30 }], // ζ Sco–η Sco
      [{ ra: 262.69, dec: -37.30 }, { ra: 264.33, dec: -43.00 }], // η Sco–θ Sco (Sargas)
      [{ ra: 264.33, dec: -43.00 }, { ra: 265.62, dec: -42.00 }], // Sargas–ι Sco
      [{ ra: 265.62, dec: -42.00 }, { ra: 266.90, dec: -40.13 }], // ι Sco–κ Sco (Shaula)
    ],
  },
  {
    id: 'gem',
    name: 'Gemini',
    lines: [
      [{ ra: 113.65, dec: 31.88 }, { ra: 116.33, dec: 28.03 }], // Castor–Pollux
      [{ ra: 113.65, dec: 31.88 }, { ra: 106.03, dec: 20.57 }], // Castor–Alhena (γ Gem)
      [{ ra: 116.33, dec: 28.03 }, { ra: 109.29, dec: 16.54 }], // Pollux–μ Gem
      [{ ra: 106.03, dec: 20.57 }, { ra: 100.98, dec: 25.13 }], // Alhena–ξ Gem
      [{ ra: 100.98, dec: 25.13 }, { ra: 97.74, dec: 24.40 }],  // ξ Gem–ε Gem (Mebsuta)
      [{ ra: 97.74, dec: 24.40 }, { ra: 93.72, dec: 22.51 }],   // Mebsuta–μ Gem
      [{ ra: 109.29, dec: 16.54 }, { ra: 99.43, dec: 16.40 }],  // μ Gem–ν Gem
    ],
  },
  {
    id: 'tau',
    name: 'Taurus',
    lines: [
      [{ ra: 68.98, dec: 16.51 }, { ra: 67.17, dec: 15.96 }],  // Aldebaran–θ² Tau
      [{ ra: 68.98, dec: 16.51 }, { ra: 60.17, dec: 12.49 }],  // Aldebaran–γ Tau
      [{ ra: 60.17, dec: 12.49 }, { ra: 54.22, dec: 9.03 }],   // γ Tau–λ Tau
      [{ ra: 68.98, dec: 16.51 }, { ra: 67.17, dec: 19.18 }],  // Aldebaran–ε Tau
      [{ ra: 67.17, dec: 19.18 }, { ra: 84.41, dec: 21.14 }],  // ε Tau–ζ Tau (Elnath direction)
      [{ ra: 84.41, dec: 21.14 }, { ra: 81.57, dec: 28.61 }],  // ζ Tau–β Tau (Elnath)
    ],
  },
  {
    id: 'lyr',
    name: 'Lyra',
    lines: [
      [{ ra: 279.23, dec: 38.78 }, { ra: 281.19, dec: 36.90 }], // Vega–ε¹ Lyr
      [{ ra: 279.23, dec: 38.78 }, { ra: 282.52, dec: 33.36 }], // Vega–ζ Lyr
      [{ ra: 282.52, dec: 33.36 }, { ra: 284.74, dec: 32.69 }], // ζ Lyr–δ² Lyr (Sheliak)
      [{ ra: 284.74, dec: 32.69 }, { ra: 283.63, dec: 36.06 }], // Sheliak–γ Lyr (Sulafat)
      [{ ra: 283.63, dec: 36.06 }, { ra: 282.52, dec: 33.36 }], // Sulafat–ζ Lyr
    ],
  },
  {
    id: 'aql',
    name: 'Aquila',
    lines: [
      [{ ra: 297.70, dec: 8.87 }, { ra: 296.57, dec: 10.61 }],  // Altair–β Aql
      [{ ra: 297.70, dec: 8.87 }, { ra: 299.69, dec: 6.41 }],   // Altair–γ Aql (Tarazed)
      [{ ra: 297.70, dec: 8.87 }, { ra: 286.35, dec: 13.86 }],  // Altair–δ Aql
      [{ ra: 286.35, dec: 13.86 }, { ra: 284.91, dec: 15.07 }], // δ Aql–ζ Aql
      [{ ra: 299.69, dec: 6.41 }, { ra: 304.51, dec: -0.82 }],  // Tarazed–θ Aql
    ],
  },
  {
    id: 'crx',
    name: 'Crux',
    lines: [
      [{ ra: 186.65, dec: -63.10 }, { ra: 191.93, dec: -59.69 }], // Acrux–γ Cru (Gacrux)
      [{ ra: 187.79, dec: -57.11 }, { ra: 189.30, dec: -62.95 }], // β Cru (Mimosa)–δ Cru
    ],
  },
  {
    id: 'car',
    name: 'Carina',
    lines: [
      [{ ra: 95.99, dec: -52.70 }, { ra: 138.30, dec: -59.28 }],  // Canopus–ε Car (Avior)
      [{ ra: 138.30, dec: -59.28 }, { ra: 125.63, dec: -59.51 }], // Avior–ι Car
      [{ ra: 125.63, dec: -59.51 }, { ra: 139.27, dec: -69.72 }], // ι Car–β Car (Miaplacidus)
    ],
  },
  {
    id: 'vir',
    name: 'Virgo',
    lines: [
      [{ ra: 201.30, dec: -11.16 }, { ra: 198.56, dec: -3.40 }],  // Spica–ζ Vir
      [{ ra: 198.56, dec: -3.40 }, { ra: 190.42, dec: 1.76 }],    // ζ Vir–γ Vir (Porrima)
      [{ ra: 190.42, dec: 1.76 }, { ra: 184.98, dec: -0.67 }],    // Porrima–δ Vir
      [{ ra: 190.42, dec: 1.76 }, { ra: 195.54, dec: 10.96 }],    // Porrima–ε Vir (Vindemiatrix)
    ],
  },
  {
    id: 'peg',
    name: 'Pegasus',
    lines: [
      [{ ra: 346.19, dec: 15.21 }, { ra: 3.31, dec: 15.18 }],    // Markab–Algenib (γ Peg)
      [{ ra: 346.19, dec: 15.21 }, { ra: 340.37, dec: 10.83 }],   // Markab–β Peg (Scheat)
      [{ ra: 340.37, dec: 10.83 }, { ra: 326.05, dec: 9.88 }],    // Scheat–ε Peg (Enif)
      [{ ra: 3.31, dec: 15.18 }, { ra: 2.10, dec: 29.09 }],      // Algenib–α And (Alpheratz)
      [{ ra: 2.10, dec: 29.09 }, { ra: 340.37, dec: 10.83 }],    // Alpheratz–Scheat (close square)
      [{ ra: 346.19, dec: 15.21 }, { ra: 2.10, dec: 29.09 }],    // Markab–Alpheratz
    ],
  },
  {
    id: 'ari',
    name: 'Aries',
    lines: [
      [{ ra: 31.79, dec: 23.46 }, { ra: 28.66, dec: 20.81 }],  // Hamal–Sheratan
      [{ ra: 28.66, dec: 20.81 }, { ra: 29.38, dec: 19.29 }],  // Sheratan–γ Ari (Mesarthim)
    ],
  },
  {
    id: 'and',
    name: 'Andromeda',
    lines: [
      [{ ra: 2.10, dec: 29.09 }, { ra: 17.43, dec: 35.62 }],   // Alpheratz–δ And
      [{ ra: 17.43, dec: 35.62 }, { ra: 30.97, dec: 42.33 }],  // δ And–β And (Mirach)
      [{ ra: 30.97, dec: 42.33 }, { ra: 37.04, dec: 48.63 }],  // Mirach–γ And (Almach)
    ],
  },
  {
    id: 'per',
    name: 'Perseus',
    lines: [
      [{ ra: 51.08, dec: 49.86 }, { ra: 46.20, dec: 40.96 }],  // Mirfak–δ Per
      [{ ra: 46.20, dec: 40.96 }, { ra: 47.04, dec: 40.01 }],  // δ Per–Algol
      [{ ra: 51.08, dec: 49.86 }, { ra: 55.73, dec: 47.79 }],  // Mirfak–γ Per
      [{ ra: 51.08, dec: 49.86 }, { ra: 42.67, dec: 55.90 }],  // Mirfak–ε Per
      [{ ra: 42.67, dec: 55.90 }, { ra: 38.84, dec: 59.94 }],  // ε Per–ξ Per
    ],
  },
  {
    id: 'aur',
    name: 'Auriga',
    lines: [
      [{ ra: 79.17, dec: 45.99 }, { ra: 89.88, dec: 44.95 }],  // Capella–β Aur (Menkalinan)
      [{ ra: 79.17, dec: 45.99 }, { ra: 74.25, dec: 33.17 }],  // Capella–ι Aur
      [{ ra: 74.25, dec: 33.17 }, { ra: 81.57, dec: 28.61 }],  // ι Aur–β Tau (Elnath, shared)
      [{ ra: 89.88, dec: 44.95 }, { ra: 90.98, dec: 37.21 }],  // Menkalinan–θ Aur
      [{ ra: 90.98, dec: 37.21 }, { ra: 74.25, dec: 33.17 }],  // θ Aur–ι Aur
    ],
  },
  {
    id: 'cma',
    name: 'Canis Major',
    lines: [
      [{ ra: 101.29, dec: -16.72 }, { ra: 95.67, dec: -17.96 }], // Sirius–β CMa (Mirzam)
      [{ ra: 101.29, dec: -16.72 }, { ra: 107.10, dec: -26.39 }], // Sirius–ε CMa (Adhara)
      [{ ra: 107.10, dec: -26.39 }, { ra: 104.66, dec: -28.97 }], // Adhara–δ CMa (Wezen)
      [{ ra: 104.66, dec: -28.97 }, { ra: 111.02, dec: -29.30 }], // Wezen–η CMa
      [{ ra: 101.29, dec: -16.72 }, { ra: 104.66, dec: -28.97 }], // Sirius–Wezen
    ],
  },
  {
    id: 'cmi',
    name: 'Canis Minor',
    lines: [
      [{ ra: 114.83, dec: 5.22 }, { ra: 111.79, dec: 8.29 }],  // Procyon–β CMi (Gomeisa)
    ],
  },
  {
    id: 'sgr',
    name: 'Sagittarius',
    lines: [
      [{ ra: 283.82, dec: -26.30 }, { ra: 285.65, dec: -29.88 }], // Kaus Media–Kaus Australis
      [{ ra: 283.82, dec: -26.30 }, { ra: 281.41, dec: -21.06 }], // Kaus Media–Kaus Borealis
      [{ ra: 285.65, dec: -29.88 }, { ra: 290.97, dec: -29.83 }], // Kaus Australis–ζ Sgr (Ascella)
      [{ ra: 290.97, dec: -29.83 }, { ra: 285.00, dec: -34.38 }], // Ascella–ε Sgr
      [{ ra: 281.41, dec: -21.06 }, { ra: 275.25, dec: -25.42 }], // Kaus Borealis–σ Sgr (Nunki)
      [{ ra: 275.25, dec: -25.42 }, { ra: 290.97, dec: -29.83 }], // Nunki–Ascella
      [{ ra: 275.25, dec: -25.42 }, { ra: 283.82, dec: -26.30 }], // Nunki–Kaus Media
    ],
  },
  {
    id: 'aqr',
    name: 'Aquarius',
    lines: [
      [{ ra: 331.45, dec: -0.32 }, { ra: 322.89, dec: -5.57 }],  // α Aqr–β Aqr (Sadalsuud)
      [{ ra: 322.89, dec: -5.57 }, { ra: 335.41, dec: -1.39 }],   // Sadalsuud–δ Aqr (Skat)
      [{ ra: 335.41, dec: -1.39 }, { ra: 339.66, dec: -7.58 }],   // Skat–λ Aqr
    ],
  },
  {
    id: 'psc',
    name: 'Pisces',
    lines: [
      [{ ra: 2.03, dec: 2.76 }, { ra: 15.74, dec: 7.59 }],      // α Psc (Alrescha)–ε Psc
      [{ ra: 15.74, dec: 7.59 }, { ra: 27.86, dec: 9.16 }],      // ε Psc–δ Psc
      [{ ra: 2.03, dec: 2.76 }, { ra: 349.29, dec: 6.86 }],      // Alrescha–β Psc
      [{ ra: 349.29, dec: 6.86 }, { ra: 351.73, dec: 15.35 }],   // β Psc–γ Psc
    ],
  },
  {
    id: 'cnc',
    name: 'Cancer',
    lines: [
      [{ ra: 130.11, dec: 11.86 }, { ra: 131.17, dec: 18.15 }], // δ Cnc–γ Cnc (Asellus Borealis)
      [{ ra: 131.17, dec: 18.15 }, { ra: 132.15, dec: 28.76 }], // γ Cnc–ι Cnc
      [{ ra: 130.11, dec: 11.86 }, { ra: 123.05, dec: 9.19 }],  // δ Cnc–α Cnc (Acubens)
      [{ ra: 131.17, dec: 18.15 }, { ra: 130.11, dec: 11.86 }], // Asellus Borealis–δ Cnc
    ],
  },
  {
    id: 'lib',
    name: 'Libra',
    lines: [
      [{ ra: 222.72, dec: -16.04 }, { ra: 229.25, dec: -9.38 }],  // α Lib (Zubenelgenubi)–β Lib
      [{ ra: 229.25, dec: -9.38 }, { ra: 233.88, dec: -14.79 }],  // β Lib–γ Lib
      [{ ra: 222.72, dec: -16.04 }, { ra: 233.88, dec: -14.79 }], // α Lib–γ Lib
    ],
  },
  {
    id: 'cap',
    name: 'Capricornus',
    lines: [
      [{ ra: 304.51, dec: -12.51 }, { ra: 305.25, dec: -14.78 }], // α² Cap–β Cap
      [{ ra: 305.25, dec: -14.78 }, { ra: 325.02, dec: -16.66 }], // β Cap–δ Cap (Deneb Algedi)
      [{ ra: 325.02, dec: -16.66 }, { ra: 321.67, dec: -16.13 }], // Deneb Algedi–γ Cap
      [{ ra: 321.67, dec: -16.13 }, { ra: 316.49, dec: -25.27 }], // γ Cap–ζ Cap
      [{ ra: 316.49, dec: -25.27 }, { ra: 311.52, dec: -22.41 }], // ζ Cap–ω Cap
      [{ ra: 311.52, dec: -22.41 }, { ra: 304.51, dec: -12.51 }], // ω Cap–α Cap
    ],
  },
  {
    id: 'boo',
    name: 'Boötes',
    lines: [
      [{ ra: 213.92, dec: 19.18 }, { ra: 218.02, dec: 38.31 }], // Arcturus–η Boo (Muphrid direction)
      [{ ra: 218.02, dec: 38.31 }, { ra: 221.25, dec: 27.07 }], // η Boo–γ Boo (Seginus)
      [{ ra: 221.25, dec: 27.07 }, { ra: 213.92, dec: 19.18 }], // Seginus–Arcturus
      [{ ra: 221.25, dec: 27.07 }, { ra: 225.49, dec: 40.39 }], // Seginus–β Boo (Nekkar)
      [{ ra: 213.92, dec: 19.18 }, { ra: 209.57, dec: 18.40 }], // Arcturus–ε Boo (Izar)
    ],
  },
]

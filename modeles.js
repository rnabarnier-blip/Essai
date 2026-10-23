/* Essais — modèles d'essais prêts à l'emploi */
(function (G) {
'use strict';
const v = (nom, type, o) => Object.assign({ nom, type, unite: '', min: '', max: '', sens: 'plus', seuil: '', echelle: 5, categories: [], notes: '', cible: '' }, o || {});
const f = (nom, mods, o) => Object.assign({ nom, quantitatif: false, unite: '', modalites: mods.map((m, i) => (typeof m === 'string' ? { nom: m, temoin: i === 0, dose: '' } : Object.assign({ temoin: i === 0, dose: '' }, m))) }, o || {});

G.MODELES = [
  {
    id: 'm-acclimatation', nom: 'Acclimatation après décaissage', theme: 'Acclimatation',
    resume: 'Acclimatation dehors (témoin) contre frigo 13 à 15 jours puis 1 jour dedans ou dehors, par porte-greffe.',
    objectif: 'Savoir si un passage au frigo après le décaissage, suivi d’un jour d’acclimatation dedans ou dehors, donne d’aussi bons plants que l’acclimatation dehors habituelle, selon le porte-greffe.',
    question: 'Le frigo après décaissage change-t-il la reprise, le débourrement, la vigueur et les racines ?',
    hypothese: '',
    dispositif: 'factoriel', uniteNom: 'lot', repetitions: 1,
    facteurs: [
      f('Après décaissage', ['Acclimatation dehors (témoin)', 'Frigo puis 1 jour dedans', 'Frigo puis 1 jour dehors']),
      f('Porte-greffe', ['Porte-greffe A', 'Porte-greffe B'])
    ],
    variables: [
      v('Reprise (plant vivant)', 'binaire', { seuil: 5, notes: 'Pour chaque plant : Oui s’il est vivant (bois vert, bourgeon ou pousse vivants), Non s’il est mort.' }),
      v('Débourrement', 'binaire', { seuil: 5, notes: 'Pour chaque plant : Oui si au moins un bourgeon a débourré, Non sinon.' }),
      v('Vigueur de la pousse', 'ordinale', { echelle: 5, notes: 'Une note par plant : 0 = pas de pousse, 1 = pousse à peine sortie, 3 = pousse normale, 5 = pousse très vigoureuse.' }),
      v('État des racines', 'ordinale', { echelle: 5, notes: 'Une note par plant : 0 = aucune racine, 1 = quelques racines, 3 = racines bien réparties, 5 = chevelu abondant et blanc.' })
    ],
    plan: { lignes: 0, colonnes: 0 }
  }
];
})(typeof window !== 'undefined' ? window : globalThis);

/* Ton essai d'acclimatation : 3 chauffes, créées une seule fois au premier lancement */
(function (G) {
  G.ESSAIS_ACCLIMATATION = [
    { chauffe: 1, nom: 'Acclimatation · Chauffe 1 (atelier normal)', atelier: 'acclimatation normale en atelier avant le décaissage' },
    { chauffe: 2, nom: 'Acclimatation · Chauffe 2 (atelier réduit)', atelier: 'temps d’acclimatation en atelier réduit avant le décaissage (durée à préciser)' },
    { chauffe: 3, nom: 'Acclimatation · Chauffe 3 (décaissage direct)', atelier: 'décaissage direct, sans acclimatation en atelier' }
  ];
})(typeof window !== 'undefined' ? window : globalThis);

/* Essais — modèles d'essais prêts à l'emploi */
(function (G) {
'use strict';
const v = (nom, type, o) => Object.assign({ nom, type, unite: '', min: '', max: '', sens: 'plus', seuil: '', echelle: 5, categories: [], notes: '', cible: '' }, o || {});
const f = (nom, mods, o) => Object.assign({ nom, quantitatif: false, unite: '', modalites: mods.map((m, i) => (typeof m === 'string' ? { nom: m, temoin: i === 0, dose: '' } : Object.assign({ temoin: i === 0, dose: '' }, m))) }, o || {});

G.MODELES = [
  {
    id: 'm-couvertures', nom: 'Couvertures de chauffe', theme: 'Chauffe',
    resume: 'Épaisse, fine, fine + plastique. Soudure 360°, moisissure, bourgeons, racines.',
    objectif: 'Savoir quelle couverture donne la meilleure soudure en sortie de chauffe sans augmenter la moisissure.',
    question: 'Le type de couverture change-t-il le taux de soudure 360° ?',
    hypothese: 'La couverture fine + plastique garde mieux l’humidité et améliore la soudure.',
    dispositif: 'blocs', uniteNom: 'palox', repetitions: 3,
    facteurs: [f('Couverture', ['Épaisse', 'Fine', 'Fine + plastique'])],
    variables: [
      v('Soudure 360°', 'binaire', { seuil: 5, cible: 50, notes: 'Observer 50 plants par palox à la sortie de chauffe.' }),
      v('Moisissure', 'binaire', { sens: 'moins', seuil: 3, cible: 50 }),
      v('État des bourgeons', 'ordinale', { echelle: 5, cible: 10, notes: '0 = sec ou mort, 5 = débourré sain. 10 plants par palox.' }),
      v('Développement racinaire', 'ordinale', { echelle: 5, cible: 10, notes: '0 = aucune racine, 5 = chevelu abondant. 10 plants par palox.' })
    ],
    plan: { lignes: 3, colonnes: 3 }
  },
  {
    id: 'm-membrane', nom: 'Membrane entre plant et couverture', theme: 'Chauffe',
    resume: 'Pose juste après greffage, après soudure, ou sans membrane.',
    objectif: 'Trouver le meilleur moment pour poser la membrane.',
    question: 'Le moment de pose de la membrane change-t-il la soudure et la moisissure ?',
    hypothese: '', dispositif: 'blocs', uniteNom: 'palox', repetitions: 3,
    facteurs: [f('Membrane', ['Sans membrane (témoin)', 'Pose après greffage', 'Pose après soudure'])],
    variables: [v('Soudure 360°', 'binaire', { seuil: 5 }), v('Moisissure', 'binaire', { sens: 'moins', seuil: 3 }), v('État des bourgeons', 'ordinale', { echelle: 5 })],
    plan: { lignes: 3, colonnes: 3 }
  },
  {
    id: 'm-portegreffes', nom: 'Porte-greffes ou cépages', theme: 'Greffage',
    resume: 'Comparer la reprise et la vigueur de plusieurs porte-greffes.',
    objectif: 'Comparer la reprise et la vigueur des combinaisons.', question: '', hypothese: '',
    dispositif: 'crd', uniteNom: 'lot', repetitions: 4,
    facteurs: [f('Porte-greffe', ['110R', 'SO4', '1103P'])],
    variables: [v('Reprise', 'proportion', { seuil: 5 }), v('Longueur de pousse', 'continue', { unite: 'cm', min: 0, max: 200, seuil: 3 })],
    plan: { lignes: 3, colonnes: 4 }
  },
  {
    id: 'm-greffe', nom: 'Type de greffe ou opérateur', theme: 'Greffage',
    resume: 'Machine, type de greffe ou opérateur, avec taux de casse et soudure.',
    objectif: 'Comparer les opérateurs ou les machines de greffage.', question: '', hypothese: '',
    dispositif: 'crd', uniteNom: 'lot', repetitions: 4,
    facteurs: [f('Opérateur', ['Opérateur A', 'Opérateur B', 'Opérateur C'])],
    variables: [v('Casse au greffage', 'proportion', { sens: 'moins', seuil: 2 }), v('Soudure 360°', 'binaire', { seuil: 5 })],
    plan: { lignes: 3, colonnes: 4 }
  },
  {
    id: 'm-dose', nom: 'Traitement ou biostimulant (doses)', theme: 'Traitements',
    resume: 'Plusieurs doses d’un produit contre un témoin non traité.',
    objectif: 'Trouver la dose utile du produit.', question: 'Quelle dose donne un effet sans gaspiller de produit ?', hypothese: '',
    dispositif: 'blocs', uniteNom: 'lot', repetitions: 4,
    facteurs: [f('Dose', [{ nom: '0 (témoin)', dose: 0 }, { nom: 'Demi-dose', dose: 0.5 }, { nom: 'Dose pleine', dose: 1 }, { nom: 'Double dose', dose: 2 }], { quantitatif: true, unite: 'L/ha' })],
    variables: [v('Reprise', 'proportion', { seuil: 5 }), v('Longueur de pousse', 'continue', { unite: 'cm', seuil: 3 }), v('Phytotoxicité', 'ordinale', { echelle: 5, sens: 'moins' })],
    plan: { lignes: 4, colonnes: 4 }
  },
  {
    id: 'm-vinif', nom: 'Essai de vinification', theme: 'Cave',
    resume: 'Levures, sulfitage ou macération comparés en cuves.',
    objectif: 'Comparer deux levures sur le même moût.', question: '', hypothese: '',
    dispositif: 'crd', uniteNom: 'cuve', repetitions: 3,
    facteurs: [f('Levure', ['Levure habituelle', 'Levure B'])],
    variables: [v('Degré alcoolique', 'continue', { unite: '% vol' }), v('Acidité volatile', 'continue', { unite: 'g/L H2SO4', sens: 'moins' }), v('Note de dégustation', 'ordinale', { echelle: 5 })],
    plan: { lignes: 1, colonnes: 6 }
  }
];
})(typeof window !== 'undefined' ? window : globalThis);

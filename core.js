/* Essais — état, utilitaires, stockage, construction du plan */
'use strict';
const VERSION = '0.1.0';
const ETAT = { essais: {}, modeles: {}, reglages: { theme: 'auto', derniereSauvegarde: null, derniereModif: null, rappelJours: 7 }, pret: false };
let view = { ecran: 'accueil', id: null, onglet: 'saisie', filtre: 'actifs', q: '', confirm: null };

/* ---------- Utilitaires ---------- */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fr = (x, d = 1) => (x == null || !isFinite(x)) ? '—' : x.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
const sg = (x, d = 1) => (x == null || !isFinite(x)) ? '—' : (x > 0 ? '+' : x < 0 ? '−' : '') + fr(Math.abs(x), d);
const fp = p => p == null || !isFinite(p) ? '—' : p < 0.001 ? '< 0,001' : fr(p, 3);
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const fdate = s => { if (!s) return ''; const d = new Date(s.length === 10 ? s + 'T12:00:00' : s); return isNaN(d) ? s : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }); };
const fdatetime = s => { const d = new Date(s); return isNaN(d) ? '' : d.toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); };
const clone = o => JSON.parse(JSON.stringify(o));
const num = s => { if (s === '' || s == null) return NaN; return +String(s).replace(',', '.').trim(); };
function toast(t, ms) { const el = document.getElementById('toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => el.hidden = true, ms || 2600); }

const TYPES = {
  continue: { nom: 'Mesure continue', ex: 'longueur, poids, diamètre, °Brix, pH' },
  comptage: { nom: 'Comptage', ex: 'nombre de bourgeons, de racines' },
  binaire: { nom: 'Oui / non par plant', ex: 'soudure 360°, moisi ou pas' },
  proportion: { nom: 'Proportion', ex: '412 soudés sur 500, ou % direct' },
  ordinale: { nom: 'Note sur une échelle', ex: 'note visuelle de 0 à 5' },
  categorie: { nom: 'Catégorie', ex: 'type de défaut, couleur' },
  delai: { nom: 'Délai en jours', ex: 'jours jusqu’au débourrement' },
  texte: { nom: 'Texte libre', ex: 'remarques' }
};
const DISPOSITIFS = {
  deux: { nom: 'Comparaison de 2 modalités', aide: 'Un témoin contre un traitement, unités indépendantes.' },
  crd: { nom: 'Plusieurs modalités (complètement au hasard)', aide: 'Toutes les unités sont réparties au hasard dans la chambre ou la parcelle.' },
  blocs: { nom: 'Blocs complets au hasard', aide: 'Chaque bloc (rangée, zone de la chambre) contient une fois chaque modalité. Retire l’effet de l’emplacement.' },
  factoriel: { nom: 'Factoriel (2 facteurs ou plus)', aide: 'Toutes les combinaisons des facteurs, ex. couverture × durée de chauffe.' },
  apparie: { nom: 'Avant / après ou apparié', aide: 'La même unité reçoit les deux modalités ou est mesurée deux fois.' },
  bandes: { nom: 'En bandes, non répété', aide: 'Une seule unité par modalité. Indicatif seulement : l’effet de l’endroit ne peut pas être séparé.' },
  observation: { nom: 'Observationnel', aide: 'Pas de traitement appliqué : on relève des variables pour voir si elles sont liées.' }
};
const STATUTS = { preparation: 'En préparation', 'en-cours': 'En cours', termine: 'Terminé' };

/* ---------- Persistance ---------- */
const timers = {};
function sauver(e, hist) {
  e.maj = new Date().toISOString();
  if (hist) { (e.historique = e.historique || []).push({ t: e.maj, txt: hist }); if (e.historique.length > 400) e.historique.splice(0, e.historique.length - 400); }
  ETAT.essais[e.id] = e;
  clearTimeout(timers[e.id]);
  timers[e.id] = setTimeout(() => { DB.put('essais', e).catch(() => toast('Enregistrement impossible : stockage plein ou bloqué.', 5000)); }, 400);
  ETAT.reglages.derniereModif = e.maj; majReglages();
}
function sauverNow(e) { clearTimeout(timers[e.id]); return DB.put('essais', e); }
let tReg; function majReglages() { clearTimeout(tReg); tReg = setTimeout(() => DB.setReglage('app', ETAT.reglages).catch(() => {}), 500); }
async function chargerTout() {
  try {
    const [es, ms, reg] = await Promise.all([DB.tous('essais'), DB.tous('modeles'), DB.reglage('app', null)]);
    es.forEach(e => ETAT.essais[e.id] = e); ms.forEach(m => ETAT.modeles[m.id] = m);
    if (reg) Object.assign(ETAT.reglages, reg);
  } catch (err) { DB.ok = false; }
  ETAT.pret = true;
}

/* ---------- Photos ---------- */
const photoURL = {};
async function reduirePhoto(file) {
  const max = 1600;
  let bmp;
  try { bmp = await createImageBitmap(file); } catch (e) {
    bmp = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
  }
  const w = bmp.width, h = bmp.height, k = Math.min(1, max / Math.max(w, h));
  const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return await new Promise(res => c.toBlob(b => res(b || file), 'image/jpeg', 0.82));
}
async function ajouterPhoto(e, file) {
  const blob = await reduirePhoto(file);
  const id = 'ph-' + uid();
  await DB.put('photos', { id, essaiId: e.id, blob, date: new Date().toISOString() });
  return id;
}
async function hydraterPhotos(root) {
  const imgs = (root || document).querySelectorAll('img[data-pid]:not([src])');
  for (const img of imgs) {
    const id = img.dataset.pid;
    if (!photoURL[id]) { try { const p = await DB.get('photos', id); if (p) photoURL[id] = URL.createObjectURL(p.blob); } catch (e) {} }
    if (photoURL[id]) img.src = photoURL[id];
  }
}
const thumbs = ids => (ids && ids.length) ? `<div class="thumbs">${ids.map(id => `<button data-act="photo-voir" data-pid="${id}" aria-label="Voir la photo"><img class="thumb" data-pid="${id}" alt=""></button>`).join('')}</div>` : '';

/* ---------- Partage / téléchargement ---------- */
async function partager(blob, nom) {
  const file = new File([blob], nom, { type: blob.type });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: nom }); return true; }
    catch (err) { if (err && err.name === 'AbortError') return false; }
  }
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = nom;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000); return true;
}

/* ---------- Structure : traitements, unités, plan ---------- */
function traitements(e) {
  let combos = [{}];
  e.facteurs.forEach(f => { const n = []; combos.forEach(c => f.modalites.forEach(m => n.push(Object.assign({}, c, { [f.id]: m.id })))); combos = n; });
  return combos.map((trt, i) => ({ i, trt, cle: e.facteurs.map(f => trt[f.id]).join('+'),
    nom: e.facteurs.map(f => (f.modalites.find(m => m.id === trt[f.id]) || {}).nom).join(' × ') }));
}
function trtIndex(e, u) { const cle = e.facteurs.map(f => u.trt[f.id]).join('+'); return traitements(e).findIndex(t => t.cle === cle); }
function trtNom(e, u) { return e.facteurs.map(f => (f.modalites.find(m => m.id === u.trt[f.id]) || {}).nom || '?').join(' × '); }
const couleur = i => `var(--c${((i % 8) + 8) % 8})`;
function prefixe(e) { const s = (e.uniteNom || 'U').trim(); return (s[0] || 'U').toUpperCase(); }
function construireUnites(e) {
  const T = e.dispositif === 'observation' ? [{ trt: {} }] : traitements(e);
  const R = e.dispositif === 'bandes' ? 1 : Math.max(1, +e.repetitions || 1);
  const us = [];
  for (let r = 1; r <= R; r++) T.forEach(t => us.push({ id: 'u-' + uid() + us.length, trt: clone(t.trt), rep: r, bloc: e.dispositif === 'blocs' ? r : null, pos: null }));
  const p = prefixe(e), w = String(us.length).length < 2 ? 2 : String(us.length).length;
  us.forEach((u, i) => u.code = p + String(i + 1).padStart(w, '0'));
  e.unites = us;
  e.plan = Object.assign({ lignes: 0, colonnes: 0 }, e.plan || {}, { tire: null, graine: null });
  ajusterGrille(e);
}
function ajusterGrille(e) {
  const n = e.unites.length, p = e.plan;
  if (e.dispositif === 'blocs') { p.lignes = Math.max(...e.unites.map(u => u.bloc || 1)); p.colonnes = Math.ceil(n / p.lignes); return; }
  const L0 = +p.lignes || 0;
  p.lignes = L0 > 0 ? L0 : Math.max(1, Math.round(Math.sqrt(n)));
  p.colonnes = Math.max(1, +p.colonnes || 0);
  if (p.lignes * p.colonnes < n) p.colonnes = Math.ceil(n / p.lignes);
}
function tirerPlan(e, graine) {
  graine = graine || (Math.floor(Math.random() * 1e9) + 1);
  const r = Stats.rng(graine); ajusterGrille(e);
  const C = e.plan.colonnes; let ordre;
  if (e.dispositif === 'blocs') {
    const blocs = [...new Set(e.unites.map(u => u.bloc))].sort((a, b) => a - b); ordre = [];
    blocs.forEach((b, bi) => { Stats.shuffle(e.unites.filter(u => u.bloc === b), r).forEach((u, j) => { u.pos = { l: bi, c: j }; ordre.push(u); }); });
  } else {
    ordre = Stats.shuffle(e.unites, r); ordre.forEach((u, i) => u.pos = { l: Math.floor(i / C), c: i % C });
  }
  const p = prefixe(e), w = Math.max(2, String(ordre.length).length);
  ordre.forEach((u, i) => u.code = p + String(i + 1).padStart(w, '0'));
  e.unites = ordre.slice();
  e.plan.tire = new Date().toISOString(); e.plan.graine = graine;
}
function aDesDonnees(e, vid) { return Object.values(e.mesures || {}).some(m => (!vid || m.v === vid) && mesureRemplie(m)); }
function mesureRemplie(m) { return !!m && ((m.vals && m.vals.length) || (m.n !== '' && m.n != null && +m.n > 0) || (m.pct !== '' && m.pct != null) || (m.cats && Object.values(m.cats).some(x => x > 0)) || (m.txt && m.txt.trim()) || (m.photos && m.photos.length)); }

/* ---------- Mesures ---------- */
const cleM = (u, v, d) => u + '|' + v + '|' + d;
function getM(e, u, v, d) { return (e.mesures || {})[cleM(u, v, d)]; }
function ensureM(e, u, v, d) { e.mesures = e.mesures || {}; const k = cleM(u, v, d); if (!e.mesures[k]) e.mesures[k] = { u, v, d, vals: [], ok: '', n: '', pct: '', cats: {}, txt: '', tap: [], exclu: false, raison: '', photos: [] }; return e.mesures[k]; }

/* ---------- Nouvel essai à partir d'un modèle ---------- */
function depuisModele(mod) {
  const d = clone(mod);
  const e = {
    id: 'e-' + uid(), nom: mod.id && mod.id.startsWith('m-') ? mod.nom : (mod.nom || ''), objectif: d.objectif || '', question: d.question || '', hypothese: d.hypothese || '',
    debut: today(), fin: '', lieu: d.lieu || '', responsable: d.responsable || '', notes: '', dossier: String(new Date().getFullYear()), theme: d.theme || '',
    statut: 'preparation', dispositif: d.dispositif || 'crd', uniteNom: d.uniteNom || 'palox', repetitions: d.repetitions || 3,
    facteurs: (d.facteurs || []).map(f => Object.assign({}, f, { id: 'f-' + uid(), modalites: f.modalites.map(m => Object.assign({}, m, { id: 'mo-' + uid() + Math.random().toString(36).slice(2, 4) })) })),
    variables: (d.variables || []).map(v => Object.assign({ unite: '', min: '', max: '', sens: 'plus', seuil: '', echelle: 5, categories: [], notes: '' }, v, { id: 'v-' + uid() + Math.random().toString(36).slice(2, 4) })),
    unites: [], plan: Object.assign({ lignes: 0, colonnes: 0 }, d.plan || {}), mesures: {}, journees: {}, observations: [], historique: [], cree: new Date().toISOString()
  };
  if (!e.facteurs.length) e.facteurs = [{ id: 'f-' + uid(), nom: 'Traitement', quantitatif: false, unite: '', modalites: [{ id: 'mo-' + uid() + 'a', nom: 'Témoin', temoin: true, dose: '' }, { id: 'mo-' + uid() + 'b', nom: 'Traitement A', temoin: false, dose: '' }] }];
  return e;
}
function versModele(e) {
  return { id: 'p-' + uid(), nom: e.nom, theme: e.theme, resume: `${e.facteurs.map(f => f.nom).join(' × ')} · ${e.variables.length} variable(s)`, perso: true,
    objectif: e.objectif, question: e.question, hypothese: e.hypothese, dispositif: e.dispositif, uniteNom: e.uniteNom, repetitions: e.repetitions,
    facteurs: e.facteurs.map(f => ({ nom: f.nom, quantitatif: f.quantitatif, unite: f.unite, modalites: f.modalites.map(m => ({ nom: m.nom, temoin: m.temoin, dose: m.dose })) })),
    variables: e.variables.map(v => { const c = clone(v); delete c.id; return c; }), plan: { lignes: e.plan.lignes, colonnes: e.plan.colonnes } };
}

/* ---------- Import depuis le Carnet d'essais ---------- */
function importerCarnet(arr) {
  const out = [];
  (Array.isArray(arr) ? arr : [arr]).forEach(c => {
    if (!c || !Array.isArray(c.modalites)) return;
    const isP = c.type === 'proportion';
    const vid = 'v-' + uid();
    const fac = { id: 'f-' + uid(), nom: 'Modalité', quantitatif: false, unite: '', modalites: c.modalites.map((m, i) => ({ id: 'mo-' + uid() + i, nom: m.nom || ('Modalité ' + (i + 1)), temoin: !!m.temoin, dose: '' })) };
    if (!fac.modalites.some(m => m.temoin) && fac.modalites[0]) fac.modalites[0].temoin = true;
    const e = { id: 'e-' + uid(), nom: c.nom || 'Essai importé', objectif: c.objectif || '', question: '', hypothese: '', debut: c.debut || today(), fin: '', lieu: '', responsable: '',
      notes: c.protocole ? 'Protocole : ' + c.protocole : '', dossier: (c.debut || today()).slice(0, 4), theme: c.categorie || '', statut: c.statut === 'termine' ? 'termine' : 'en-cours',
      dispositif: 'crd', uniteNom: isP ? 'répétition' : 'plant', repetitions: 1, facteurs: [fac],
      variables: [{ id: vid, nom: isP ? 'Réussite' : 'Mesure', type: isP ? 'proportion' : 'continue', unite: c.unite || '', min: '', max: '', sens: c.sens === 'moins' ? 'moins' : 'plus', seuil: '', echelle: 5, categories: [], notes: '' }],
      unites: [], plan: { lignes: 0, colonnes: 0, tire: null }, mesures: {}, journees: {},
      observations: (c.observations || []).map(o => ({ id: 'o-' + uid(), date: o.date || today(), texte: o.texte || '', photos: [] })), historique: [{ t: new Date().toISOString(), txt: 'Importé depuis le Carnet d’essais' }], cree: c.cree || new Date().toISOString() };
    const d = c.debut || today(); let n = 0;
    c.modalites.forEach((m, i) => {
      const items = isP ? (m.reps || []).filter(r => r.total !== '' && +r.total > 0) : (m.valeurs || []);
      items.forEach(it => {
        const u = { id: 'u-' + uid() + (n++), trt: { [fac.id]: fac.modalites[i].id }, rep: 1, bloc: null, pos: null };
        e.unites.push(u); const ms = ensureM(e, u.id, vid, d);
        if (isP) { ms.ok = +it.ok || 0; ms.n = +it.total; } else ms.vals = [+it];
      });
    });
    const w = Math.max(2, String(e.unites.length).length), p = prefixe(e);
    e.unites.forEach((u, i) => u.code = p + String(i + 1).padStart(w, '0'));
    ajusterGrille(e);
    out.push(e);
  });
  return out;
}

/* ---------- Export CSV ---------- */
function csvEssai(e) {
  const q = s => { s = String(s ?? ''); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const nf = x => x === '' || x == null || !isFinite(+x) ? '' : String(x).replace('.', ',');
  const head = ['Essai', 'Unité', 'Bloc', 'Répétition', ...e.facteurs.map(f => f.nom), 'Variable', 'Type', 'Unité de mesure', 'Date', 'Valeur (moyenne ou %)', 'Réussis', 'Total', 'Mesures individuelles', 'Exclu', 'Raison', 'Photos'];
  const L = [head.map(q).join(';')];
  const vById = Object.fromEntries(e.variables.map(v => [v.id, v])); const uById = Object.fromEntries(e.unites.map(u => [u.id, u]));
  Object.values(e.mesures || {}).filter(mesureRemplie).sort((a, b) => (a.d + (uById[a.u] || {}).code).localeCompare(b.d + (uById[b.u] || {}).code)).forEach(m => {
    const u = uById[m.u], v = vById[m.v]; if (!u || !v) return;
    const x = Analyse.valeurUnite(v, Object.assign({}, m, { exclu: false }));
    let valeur = x ? x.val : '';
    if (v.type === 'categorie') valeur = Object.entries(m.cats || {}).filter(([, n]) => n > 0).map(([k, n]) => k + ' : ' + n).join(' / ');
    if (v.type === 'texte') valeur = m.txt;
    L.push([e.nom, u.code, u.bloc ?? '', u.rep, ...e.facteurs.map(f => (f.modalites.find(mo => mo.id === u.trt[f.id]) || {}).nom || ''), v.nom, TYPES[v.type].nom, v.unite || '', m.d,
      typeof valeur === 'number' ? nf(valeur) : valeur, nf(m.ok), nf(m.n), (m.vals || []).map(nf).join(' '), m.exclu ? 'oui' : 'non', m.raison || '', (m.photos || []).length].map(q).join(';'));
  });
  return '﻿' + L.join('\n');
}

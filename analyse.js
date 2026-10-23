/* Essais — choix automatique du test, vérifications et verdict en langage simple */
(function (G) {
'use strict';
const S = G.Stats;
const A = {};

const TYPES_NUM = ['continue', 'comptage', 'ordinale', 'delai'];
const TYPES_PROP = ['proportion', 'binaire'];
A.analysable = t => TYPES_NUM.includes(t) || TYPES_PROP.includes(t);

/* Valeur d'une unité pour une variable à une date */
A.valeurUnite = function (var_, m) {
  if (!m || m.exclu) return null;
  if (TYPES_PROP.includes(var_.type)) {
    const ok = +m.ok, n = +m.n;
    if (m.n !== '' && m.n != null && n > 0 && isFinite(ok)) return { val: ok / n * 100, ok, n, sub: n };
    if (m.pct !== '' && m.pct != null && isFinite(+m.pct)) return { val: +m.pct, sub: 1 };
    return null;
  }
  const vals = (m.vals || []).filter(x => typeof x === 'number' && isFinite(x));
  if (!vals.length) return null;
  return { val: S.mean(vals), sub: vals.length, vals };
};

A.datesVariable = function (e, vid) {
  const ds = new Set();
  Object.values(e.mesures || {}).forEach(m => { if (m.v === vid) ds.add(m.d); });
  return [...ds].sort();
};

function verdict(p, gain, tost, pm) {
  if (p == null || !isFinite(p)) return { cls: 'v-neutre', txt: 'Pas assez de données', code: 'na' };
  const tendance = pm != null && (pm >= 0.9 || pm <= 0.1);
  if (tost && tost.p < 0.05 && p >= 0.05) return { cls: 'v-equiv', txt: 'Pas de différence utile', code: 'equiv' };
  const pos = gain > 0;
  if (p < 0.01) return pos ? { cls: 'v-bon', txt: 'Effet très probable', code: 'tres' } : { cls: 'v-mauvais', txt: 'Effet négatif très probable', code: 'tres-neg' };
  if (p < 0.05) return pos ? { cls: 'v-bon', txt: 'Effet probable', code: 'prob' } : { cls: 'v-mauvais', txt: 'Effet négatif probable', code: 'prob-neg' };
  if (p < 0.20 || tendance) return { cls: 'v-incertain', txt: 'Résultat incertain', code: 'incertain' };
  return { cls: 'v-neutre', txt: 'Pas d’effet détecté', code: 'aucun' };
}
A.verdict = verdict;

const fr = (x, d) => (x == null || !isFinite(x)) ? '—' : x.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
A.fr = fr;
const pc = p => p > 0.995 ? 'plus de 99' : p < 0.005 ? 'moins de 1' : fr(p * 100, 0);
A.pc = pc;

function phrase(c, var_, refNom, isP) {
  const uw = isP ? 'points de %' : (var_.unite || '');
  const d = Math.abs(c.diff), dec = isP ? 1 : (d < 1 ? 2 : 1);
  if (c.p == null) return '';
  let s;
  if (c.diff === 0) s = `${c.nom} donne en moyenne le même résultat que ${refNom}.`;
  else s = `${c.nom} donne en moyenne ${fr(d, dec)} ${uw} ${c.diff > 0 ? 'de plus' : 'de moins'} que ${refNom}${var_.nom ? ' pour « ' + var_.nom.toLowerCase() + ' »' : ''}.`;
  const g = c.gain;
  if (g > 0) {
    s += ` Il y a ${pc(c.pMieux)} % de chances que cet avantage soit réel`;
    if (c.pSeuil != null) s += ` et ${pc(c.pSeuil)} % qu’il dépasse ton seuil de ${fr(+var_.seuil, 1)} ${uw}`;
    s += '.';
  } else if (g < 0) {
    s += ` Il y a ${pc(1 - c.pMieux)} % de chances que ce soit réellement moins bon.`;
  }
  if (c.verdict.code === 'equiv') s += ` L’écart reste à coup sûr sous ton seuil de ${fr(+var_.seuil, 1)} ${uw} : la différence n’a pas d’intérêt pratique.`;
  return s;
}

/* ----- Analyse principale ----- */
A.analyser = function (e, vid, opts) {
  opts = opts || {};
  const var_ = e.variables.find(x => x.id === vid);
  const res = { alertes: [], comps: [], groupes: [], methode: null, global: null, var_: var_, verifs: null, tableau: null };
  const alerte = (niv, txt) => res.alertes.push({ niv, txt });
  if (!var_) { res.raison = 'Variable introuvable.'; return res; }
  if (!A.analysable(var_.type)) { res.raison = var_.type === 'texte' ? 'Les notes en texte ne se calculent pas.' : 'Les catégories sont présentées dans le tableau de répartition.'; return res; }
  const isP = TYPES_PROP.includes(var_.type);
  const fac = e.facteurs.find(x => x.id === opts.facteurId) || e.facteurs[0];
  if (!fac) { res.raison = 'Aucun facteur défini.'; return res; }
  const dates = A.datesVariable(e, vid);
  const date = opts.date && dates.includes(opts.date) ? opts.date : dates[dates.length - 1];
  res.date = date; res.dates = dates; res.facteur = fac;
  if (!date) { res.raison = 'Aucune donnée saisie pour cette variable.'; return res; }
  const UN = e.uniteNom || 'unité';
  const masc = /^(palox|lot|rang|pot|plant|bloc|bac|carré|pied|cep|plateau|caisson)s?$/i.test(UN.trim());
  const UN1 = (masc ? 'un seul ' : 'une seule ') + UN, CE = (masc ? 'ce ' : 'cette ') + UN, MEME = (masc ? 'un même ' : 'une même ') + UN;
  const blocDe = u => e.dispositif === 'apparie' ? u.rep : u.bloc;

  // ---- valeurs par unité
  let nExclu = 0, nHors = 0; const toutes = [];
  const parMod = new Map(fac.modalites.map(m => [m.id, []]));
  e.unites.forEach(u => {
    const m = e.mesures[u.id + '|' + vid + '|' + date];
    if (m && m.exclu) { nExclu++; return; }
    const x = A.valeurUnite(var_, m); if (!x) return;
    if (!isP && x.vals) { const mn = var_.min === '' || var_.min == null ? -Infinity : +var_.min, mx = var_.max === '' || var_.max == null ? Infinity : +var_.max; nHors += x.vals.filter(v => v < mn || v > mx).length; }
    const o = Object.assign({ code: u.code, bloc: blocDe(u), trt: u.trt }, x); toutes.push(o);
    const mod = u.trt[fac.id]; if (parMod.has(mod)) parMod.get(mod).push(o);
  });
  res.groupes = fac.modalites.map(m => {
    const us = parMod.get(m.id); const vals = us.map(x => x.val);
    const g = { id: m.id, nom: m.nom, temoin: !!m.temoin, unites: us, d: S.desc(vals), dose: m.dose };
    if (isP) { const w = us.filter(x => x.n > 0); g.ok = w.reduce((s, x) => s + x.ok, 0); g.n = w.reduce((s, x) => s + x.n, 0); g.toutComptes = w.length === us.length && us.length > 0; }
    g.sub = us.reduce((s, x) => s + (x.sub || 0), 0);
    return g;
  });
  const G_ = res.groupes;
  let ref = G_.findIndex(g => g.temoin);
  if (ref < 0) { ref = 0; alerte('info', `Aucun témoin désigné : chaque modalité est comparée à « ${G_[0].nom} ».`); }
  res.ref = ref;
  const avec = G_.filter(g => g.unites.length > 0);
  if (avec.length < 2) { res.raison = 'Il faut des données pour au moins deux modalités.'; return res; }
  if (!G_[ref].unites.length) { res.raison = `Le témoin « ${G_[ref].nom} » n’a pas encore de données.`; return res; }

  if (nExclu) alerte('info', `${nExclu} donnée(s) exclue(s) ne sont pas prises en compte.`);
  if (nHors) alerte('warn', `${nHors} valeur(s) hors des bornes prévues : vérifie qu’il n’y a pas d’erreur de saisie.`);
  const nUnits = avec.map(g => g.unites.length), minU = Math.min(...nUnits), maxU = Math.max(...nUnits);
  if (maxU >= 2 && maxU / Math.max(1, minU) > 1.5) alerte('warn', 'Groupes déséquilibrés : certaines modalités ont beaucoup moins d’unités que d’autres.');
  if (e.dispositif === 'bandes') alerte('warn', 'Essai non répété (en bandes) : l’effet de la modalité ne peut pas être séparé de l’effet de l’endroit. Le résultat reste indicatif.');
  if (['crd', 'deux', 'blocs', 'factoriel'].includes(e.dispositif) && !(e.plan && e.plan.tire)) alerte('warn', 'Le plan n’a pas été tiré au sort : un effet de position (près du chauffage, de la porte…) peut se mélanger à l’effet étudié.');

  const sens = var_.sens || 'plus', seuil = var_.seuil === '' || var_.seuil == null ? 0 : +var_.seuil;
  let mode, pourquoi = '';

  // ---- factoriel équilibré ?
  let fact = null;
  if (e.facteurs.length === 2) {
    const [F1, F2] = e.facteurs; const avecBl = e.dispositif === 'blocs';
    const obs = toutes.map(o => ({ a: F1.modalites.findIndex(m => m.id === o.trt[F1.id]), b: F2.modalites.findIndex(m => m.id === o.trt[F2.id]), y: o.val, bloc: o.bloc }));
    const an = obs.length && obs.every(o => o.a >= 0 && o.b >= 0) ? S.anova2(obs, F1.modalites.length, F2.modalites.length, avecBl) : null;
    if (an) fact = { an, F1, F2, obs };
    else alerte('warn', 'Essai factoriel incomplet ou déséquilibré : chaque facteur est analysé seul, sans les interactions.');
  } else if (e.facteurs.length > 2) alerte('info', `Essai à ${e.facteurs.length} facteurs : ici on compare « ${fac.nom} » toutes modalités des autres facteurs confondues.`);

  // ---- blocs complets ?
  let tabBlocs = null;
  if (!fact && (e.dispositif === 'blocs' || e.dispositif === 'apparie') && e.facteurs.length === 1) {
    const blocs = [...new Set(toutes.map(o => o.bloc))].sort((a, b) => a - b);
    const y = []; let incomplet = false;
    blocs.forEach(b => { const row = G_.map(g => { const x = g.unites.filter(u => u.bloc === b); return x.length === 1 ? x[0].val : null; });
      if (row.some(v => v == null)) incomplet = true; else y.push(row); });
    if (y.length >= 2) { tabBlocs = y; if (incomplet) alerte('warn', `Certains ${e.dispositif === 'apparie' ? 'couples' : 'blocs'} sont incomplets : ils sont laissés de côté.`); }
    else alerte('warn', `Pas assez de ${e.dispositif === 'apparie' ? 'couples' : 'blocs'} complets : les unités sont comparées comme si elles étaient indépendantes.`);
  }

  if (fact) { mode = 'factoriel'; pourquoi = `Essai factoriel équilibré : une ANOVA à 2 facteurs sépare l’effet de « ${fact.F1.nom} », de « ${fact.F2.nom} » et de leur interaction${e.dispositif === 'blocs' ? ', après avoir retiré l’effet des blocs' : ''}.`; }
  else if (tabBlocs) { mode = 'blocs'; pourquoi = e.dispositif === 'apparie' ? 'Dispositif apparié : chaque couple sert de référence à lui-même, ce qui retire la variabilité entre couples.' : 'Dispositif en blocs : on retire l’effet du bloc (emplacement) avant de comparer les modalités.'; }
  else if (isP && avec.every(g => g.toutComptes)) {
    const sd = S.surdispersion(avec.map(g => g.unites)); res.surdispersion = sd;
    if (!sd) { mode = 'pool'; pourquoi = `${UN1[0].toUpperCase() + UN1.slice(1)} par modalité : on compte tous les plants ensemble (test sur les comptages).`; }
    else if (sd.p < 0.05 && minU >= 2) { mode = 'unite'; pourquoi = `Les ${UN} d’une même modalité varient plus que le hasard ne l’explique (dispersion ${fr(sd.phi, 1)}, p = ${fr(sd.p, 3)}). On compare donc les ${UN} entre eux, pas les plants.`; }
    else { mode = 'pool'; pourquoi = `Les ${UN} d’une même modalité sont homogènes (pas de surdispersion, p = ${fr(sd.p, 2)}) : on peut additionner les plants.`; }
  } else if (minU >= 2) { mode = 'unite'; pourquoi = `Une valeur par ${UN} (moyenne de ses mesures si plusieurs plants mesurés).`; }
  else {
    const subOk = !isP && avec.every(g => g.unites.reduce((s, x) => s + (x.vals ? x.vals.length : 0), 0) >= 2);
    if (subOk) { mode = 'sousech'; pourquoi = 'Une seule unité par modalité : les mesures individuelles sont utilisées comme répétitions.';
      alerte('grave', `Pseudo-réplication : les plants d’${MEME} ne sont pas de vraies répétitions. L’écart peut venir de ${CE} et non de la modalité.`); }
    else { res.raison = `Il faut au moins 2 ${UN} par modalité (ou plusieurs mesures dans chacune).`; return res; }
  }
  if (mode === 'pool' && maxU <= 1) alerte('grave', `Pseudo-réplication : ${UN1} par modalité. Les plants d’${MEME} ne sont pas indépendants : l’écart peut venir de ${CE} et non de la modalité. Remplis les autres ${UN} pour un vrai résultat.`);
  if (minU < 3 && mode !== 'sousech' && maxU > 1) alerte('warn', 'Moins de 3 répétitions dans certaines modalités : le résultat est fragile.');
  res.mode = mode;

  const valsOf = g => mode === 'sousech' ? g.unites.flatMap(u => u.vals || []) : g.unites.map(u => u.val);
  const R = G_[ref], m = G_.length - 1;
  const actifs = G_.map((g, i) => i).filter(i => G_[i].unites.length > 0);

  // ---- erreur commune, résidus, vérifications
  let mse = null, dfE = null, residus = [], moyennes = G_.map(g => g.unites.length ? S.mean(valsOf(g)) : null), nEff = G_.map(g => valsOf(g).length), homog = true;
  let blocsRes = null;
  if (mode === 'blocs') {
    blocsRes = S.anovaBlocs(tabBlocs); mse = blocsRes.mse; dfE = blocsRes.df2; moyennes = blocsRes.tm.slice(); nEff = G_.map(() => blocsRes.b);
    const gm = S.mean(tabBlocs.flat()); tabBlocs.forEach((row, bi) => row.forEach((y, j) => residus.push({ r: y - blocsRes.tm[j] - blocsRes.bm[bi] + gm })));
  } else if (mode === 'factoriel') {
    const an = fact.an; mse = an.mse; dfE = an.dfE;
    const fi = fac.id === fact.F2.id ? 'b' : 'a'; const means = fi === 'a' ? an.mA : an.mB;
    moyennes = G_.map((g, i) => means[i]); nEff = G_.map(g => g.unites.length);
    const blm = {}; if (e.dispositif === 'blocs') { const gm = S.mean(fact.obs.map(o => o.y)); [...new Set(fact.obs.map(o => o.bloc))].forEach(b => blm[b] = S.mean(fact.obs.filter(o => o.bloc === b).map(o => o.y)) - gm); }
    fact.obs.forEach((o, k) => residus.push({ r: o.y - an.mC[o.a + ',' + o.b] - (blm[o.bloc] || 0), code: toutes[k].code }));
  } else if (mode !== 'pool') {
    const gs = actifs.map(i => valsOf(G_[i]));
    const an = S.anova1(gs); mse = an.mse; dfE = an.df2;
    actifs.forEach(i => { const mu = moyennes[i]; if (mode === 'sousech') valsOf(G_[i]).forEach(y => residus.push({ r: y - mu })); else G_[i].unites.forEach(u => residus.push({ r: u.val - mu, code: u.code })); });
    const lev = S.levene(gs); res.levene = lev; homog = !lev || lev.p >= 0.05;
  }
  if (mode !== 'pool' && residus.length >= 3) {
    const sw = S.shapiro(residus.map(x => x.r)); res.shapiro = sw;
    const sd = Math.sqrt(mse || 0); const extremes = sd > 0 ? residus.filter(x => x.code && Math.abs(x.r) / sd > 3).map(x => x.code) : [];
    res.verifs = { shapiro: sw, levene: res.levene || null, extremes, cv: mse != null ? Math.sqrt(mse) / Math.abs(S.mean(toutes.map(o => o.val))) * 100 : null };
    if (sw && sw.p < 0.05) alerte('warn', `Les écarts ne suivent pas bien une loi normale (Shapiro-Wilk, p = ${fr(sw.p, 3)}). Les probabilités sont à prendre avec prudence ; les tests non paramétriques arrivent dans la prochaine version.`);
    if (res.levene && res.levene.p < 0.05) alerte('info', `Les modalités n’ont pas la même variabilité (Levene, p = ${fr(res.levene.p, 3)}) : l’app utilise des tests qui n’ont pas besoin de cette hypothèse (Welch avec correction de Holm).`);
    if (extremes.length) alerte('warn', `Valeur(s) très éloignée(s) des autres : ${extremes.join(', ')}. Vérifie la saisie ou exclus-la avec une raison.`);
  }

  // ---- comparaisons au témoin
  const lam = G_.map((g, i) => Math.sqrt(nEff[i] / (nEff[i] + nEff[ref])));
  const autres = G_.map((g, i) => i).filter(i => i !== ref && G_[i].unites.length > 0);
  const lamA = autres.map(i => lam[i]);
  let testNom = '';
  if (mode === 'pool') testNom = autres.length > 1 ? 'χ² / Fisher avec correction de Holm' : '';
  else if (!homog) testNom = autres.length > 1 ? 'Welch avec correction de Holm' : 'Test t de Welch';
  else testNom = autres.length > 1 ? 'Test de Dunnett (comparaison au témoin)' : (mode === 'blocs' && e.dispositif === 'apparie' ? 'Test t apparié' : mode === 'blocs' ? 'Test t en blocs' : mode === 'factoriel' ? 'Test t (erreur de l’ANOVA à 2 facteurs)' : 'Test t de Student');
  const brut = [];
  G_.forEach((g, i) => {
    if (i === ref) return;
    const c = { nom: g.nom, id: g.id, g, i };
    if (!g.unites.length) { c.p = null; c.verdict = verdict(null); res.comps.push(c); return; }
    if (mode === 'pool') {
      const pt = g.ok / g.n, pcc = R.ok / R.n; c.diff = (pt - pcc) * 100;
      const se = Math.sqrt(pt * (1 - pt) / g.n + pcc * (1 - pcc) / R.n) * 100;
      c.lo = c.diff - 1.96 * se; c.hi = c.diff + 1.96 * se;
      const ch = S.chi2Prop([g.ok, R.ok], [g.n, R.n]);
      c.pBrut = ch.minExp < 5 ? S.fisher2x2(g.ok, g.n - g.ok, R.ok, R.n - R.ok) : ch.p; c.test = ch.minExp < 5 ? 'Test exact de Fisher' : 'Test du χ²';
      const pb = S.probBeta(g.ok, g.n, R.ok, R.n, sens, seuil); c.pMieux = pb.pMieux; c.pSeuil = pb.pSeuil;
      c.tost = se > 0 ? S.tost(c.diff, se, Infinity, seuil) : null; c.detail = `${g.ok}/${g.n} plants contre ${R.ok}/${R.n}`;
    } else if (homog) {
      const diff = moyennes[i] - moyennes[ref], se = Math.sqrt(mse * (1 / nEff[i] + 1 / nEff[ref]));
      c.diff = diff; c.se = se; c.df = dfE;
      const t = se > 0 ? diff / se : (diff === 0 ? 0 : Infinity);
      c.pBrut = se > 0 ? 2 * (1 - S.tcdf(Math.abs(t), dfE)) : (diff === 0 ? 1 : 0); c.t = t;
      if (autres.length > 1 && se > 0) c.p = 1 - S.pdunnett(Math.abs(t), lamA, dfE);
      const q = S.tinv(0.975, dfE); c.lo = diff - q * se; c.hi = diff + q * se;
      const pb = S.probNormale(diff, se, dfE, sens, seuil); c.pMieux = pb.pMieux; c.pSeuil = pb.pSeuil; c.tost = S.tost(diff, se, dfE, seuil);
      c.test = testNom; c.detail = `${nEff[i]} contre ${nEff[ref]} ${mode === 'sousech' ? 'mesures' : UN}${mode === 'blocs' ? (e.dispositif === 'apparie' ? ' (couples)' : ' (blocs)') : ''}`;
    } else {
      const a = valsOf(g), b = valsOf(R);
      if (a.length < 2 || b.length < 2) { c.p = null; c.verdict = verdict(null); res.comps.push(c); return; }
      const w = S.welch(a, b); c.diff = w.diff; c.lo = w.lo; c.hi = w.hi; c.pBrut = w.p; c.se = w.se; c.df = w.df;
      const pb = S.probNormale(w.diff, w.se, w.df, sens, seuil); c.pMieux = pb.pMieux; c.pSeuil = pb.pSeuil; c.tost = S.tost(w.diff, w.se, w.df, seuil);
      c.test = testNom; c.detail = `${a.length} contre ${b.length} ${mode === 'sousech' ? 'mesures' : UN}`;
    }
    brut.push(c); res.comps.push(c);
  });
  if (brut.length > 1 && (mode === 'pool' || !homog)) { const adj = S.holm(brut.map(c => c.pBrut)); brut.forEach((c, k) => c.p = adj[k]); }
  brut.forEach(c => { if (c.p == null) c.p = c.pBrut; });
  const refVal = mode === 'pool' ? R.ok / R.n * 100 : moyennes[ref];
  brut.forEach(c => {
    c.pct = refVal !== 0 ? c.diff / Math.abs(refVal) * 100 : null;
    c.gain = sens === 'moins' ? -c.diff : c.diff;
    c.verdict = verdict(c.p, c.gain, c.tost, c.pMieux);
    c.phrase = phrase(c, var_, R.nom, isP);
  });

  // ---- test global
  if (mode === 'factoriel') {
    const an = fact.an; res.global = { test: 'ANOVA à 2 facteurs', p: (fac.id === fact.F2.id ? an.B : an.A).p, factoriel: an, F1: fact.F1, F2: fact.F2 };
    if (an.AB.p < 0.05) alerte('grave', `Interaction significative entre « ${fact.F1.nom} » et « ${fact.F2.nom} » (p = ${fr(an.AB.p, 3)}) : l’effet de l’un dépend de l’autre. Regarde le graphique d’interaction plutôt que les moyennes globales.`);
    res.interaction = { F1: fact.F1, F2: fact.F2, mC: an.mC };
  } else if (mode === 'blocs') res.global = { test: e.dispositif === 'apparie' ? 'ANOVA appariée' : 'ANOVA en blocs', p: blocsRes.p, pBloc: blocsRes.pBloc, taille: blocsRes.eta2p, tailleNom: 'η² partiel' };
  else if (actifs.length >= 3 && mode === 'pool') { const ch = S.chi2Prop(avec.map(g => g.ok), avec.map(g => g.n)); res.global = { test: 'χ² global', p: ch.p }; }
  else if (actifs.length >= 3) { const an = S.anova1(actifs.map(i => valsOf(G_[i]))); res.global = { test: 'ANOVA à un facteur', p: an.p, taille: an.eta2, tailleNom: 'η²' }; }

  // ---- lettres de groupes (k >= 3)
  if (actifs.length >= 3) {
    const k = actifs.length, idx = new Map(actifs.map((i, j) => [i, j])); const P = Array.from({ length: k }, () => new Array(k).fill(1));
    const paires = []; for (let x = 0; x < k; x++) for (let y = x + 1; y < k; y++) paires.push([x, y]);
    let nomLettres;
    if (mode === 'pool') {
      const raw = paires.map(([x, y]) => { const a = G_[actifs[x]], b = G_[actifs[y]]; const ch = S.chi2Prop([a.ok, b.ok], [a.n, b.n]); return ch.minExp < 5 ? S.fisher2x2(a.ok, a.n - a.ok, b.ok, b.n - b.ok) : ch.p; });
      const adj = S.holm(raw); paires.forEach(([x, y], q) => { P[x][y] = P[y][x] = adj[q]; }); nomLettres = 'comparaisons deux à deux (χ² / Fisher, correction de Holm)';
    } else if (homog) {
      paires.forEach(([x, y]) => { const i = actifs[x], j = actifs[y]; const q = Math.abs(moyennes[i] - moyennes[j]) / Math.sqrt(mse / 2 * (1 / nEff[i] + 1 / nEff[j])); P[x][y] = P[y][x] = mse > 0 ? 1 - S.ptukey(q, k, dfE) : (q === 0 ? 1 : 0); });
      nomLettres = 'test de Tukey (HSD)';
    } else {
      const raw = paires.map(([x, y]) => S.welch(valsOf(G_[actifs[x]]), valsOf(G_[actifs[y]])).p); const adj = S.holm(raw); paires.forEach(([x, y], q) => { P[x][y] = P[y][x] = adj[q]; });
      nomLettres = 'comparaisons de Welch deux à deux (correction de Holm)';
    }
    const moy = actifs.map(i => mode === 'pool' ? G_[i].ok / G_[i].n * 100 : moyennes[i]);
    const L = S.lettres(moy, (x, y) => P[x][y], 0.05, sens);
    G_.forEach((g, i) => { g.lettre = idx.has(i) ? L[idx.get(i)] : ''; });
    res.lettres = nomLettres;
  }

  // ---- tableau des moyennes (façon ARM)
  res.tableau = G_.map((g, i) => {
    if (!g.unites.length) return { nom: g.nom, temoin: g.temoin, vide: true };
    const val = mode === 'pool' ? g.ok / g.n * 100 : moyennes[i];
    return { nom: g.nom, temoin: g.temoin, val, lettre: g.lettre || '', n: nEff[i], pctT: i === ref || !refVal ? null : (val - refVal) / Math.abs(refVal) * 100 };
  });

  // variance nulle
  if (mode !== 'pool' && actifs.every(i => { const v = valsOf(G_[i]); return v.length > 1 && S.variance(v) === 0; })) alerte('warn', 'Toutes les valeurs sont identiques dans chaque groupe : vérifie la saisie.');
  if (!res.alertes.some(a => a.niv === 'grave')) alerte('info', 'Un seul essai : confirme sur une autre chauffe ou une autre année avant de changer de pratique.');

  res.methode = { nom: [testNom || [...new Set(brut.map(c => c.test))].join(', '), res.global && res.global.test, res.lettres ? 'lettres : ' + res.lettres : ''].filter(Boolean).join(' · '), pourquoi };

  // ---- graphique
  res.barres = G_.map((g, i) => {
    if (!g.unites.length) return { nom: g.nom, temoin: g.temoin, vide: true };
    if (mode === 'pool') { const p = g.ok / g.n, se = Math.sqrt(p * (1 - p) / g.n); return { nom: g.nom, temoin: g.temoin, val: p * 100, lo: Math.max(0, (p - 1.96 * se) * 100), hi: Math.min(100, (p + 1.96 * se) * 100), pts: g.unites.map(u => u.val), lettre: g.lettre }; }
    const v = valsOf(g); const val = moyennes[i];
    let lo = null, hi = null;
    if (mse != null && homog && nEff[i] > 0) { const h = S.tinv(0.975, dfE) * Math.sqrt(mse / nEff[i]); lo = val - h; hi = val + h; }
    else if (v.length > 1) { const d = S.desc(v); lo = d.lo; hi = d.hi; }
    return { nom: g.nom, temoin: g.temoin, val, lo, hi, pts: g.unites.map(u => u.val), lettre: g.lettre };
  });
  return res;
};

/* Synthèse de toutes les variables (dernière date) */
A.synthese = function (e, facteurId) {
  const fac = e.facteurs.find(f => f.id === facteurId) || e.facteurs[0];
  const lignes = e.variables.filter(v => A.analysable(v.type)).map(v => ({ v, r: A.analyser(e, v.id, { facteurId: fac && fac.id }) }));
  return { fac, lignes };
};

/* Résumé pour la liste */
A.resumeEssai = function (e) {
  const v = e.variables.find(x => A.analysable(x.type)); if (!v) return null;
  const r = A.analyser(e, v.id); const cs = r.comps.filter(c => c.p != null);
  if (!cs.length) return null;
  const best = cs.slice().sort((a, b) => a.p - b.p)[0]; return { var_: v.nom, verdict: best.verdict };
};

G.Analyse = A;
})(typeof window !== 'undefined' ? window : globalThis);

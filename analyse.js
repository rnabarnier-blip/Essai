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

function verdict(p, gain, tost) {
  if (p == null || !isFinite(p)) return { cls: 'v-neutre', txt: 'Pas assez de données', code: 'na' };
  if (tost && tost.p < 0.05 && p >= 0.05) return { cls: 'v-equiv', txt: 'Pas de différence utile', code: 'equiv' };
  const pos = gain > 0;
  if (p < 0.01) return pos ? { cls: 'v-bon', txt: 'Effet très probable', code: 'tres' } : { cls: 'v-mauvais', txt: 'Effet négatif très probable', code: 'tres-neg' };
  if (p < 0.05) return pos ? { cls: 'v-bon', txt: 'Effet probable', code: 'prob' } : { cls: 'v-mauvais', txt: 'Effet négatif probable', code: 'prob-neg' };
  if (p < 0.20) return { cls: 'v-incertain', txt: 'Résultat incertain', code: 'incertain' };
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
  const res = { alertes: [], comps: [], groupes: [], methode: null, global: null, var_: var_ };
  const alerte = (niv, txt) => res.alertes.push({ niv, txt });
  if (!var_) { res.raison = 'Variable introuvable.'; return res; }
  if (!A.analysable(var_.type)) { res.raison = var_.type === 'texte' ? 'Les notes en texte ne se calculent pas.' : 'Les catégories seront analysées dans une prochaine version (tableau de comptage ci-dessous).'; return res; }
  const isP = TYPES_PROP.includes(var_.type);
  const fac = e.facteurs.find(x => x.id === opts.facteurId) || e.facteurs[0];
  if (!fac) { res.raison = 'Aucun facteur défini.'; return res; }
  const dates = A.datesVariable(e, vid);
  const date = opts.date && dates.includes(opts.date) ? opts.date : dates[dates.length - 1];
  res.date = date; res.dates = dates; res.facteur = fac;
  if (!date) { res.raison = 'Aucune donnée saisie pour cette variable.'; return res; }

  // valeurs par unité
  let nExclu = 0, nHors = 0;
  const parMod = new Map(fac.modalites.map(m => [m.id, []]));
  e.unites.forEach(u => {
    const m = e.mesures[u.id + '|' + vid + '|' + date];
    if (m && m.exclu) { nExclu++; return; }
    const x = A.valeurUnite(var_, m); if (!x) return;
    if (!isP && x.vals) { const mn = var_.min === '' ? -Infinity : +var_.min, mx = var_.max === '' ? Infinity : +var_.max; nHors += x.vals.filter(v => v < mn || v > mx).length; }
    const mod = u.trt[fac.id]; if (parMod.has(mod)) parMod.get(mod).push(Object.assign({ code: u.code, bloc: u.bloc }, x));
  });
  res.groupes = fac.modalites.map(m => {
    const us = parMod.get(m.id); const vals = us.map(x => x.val);
    const g = { id: m.id, nom: m.nom, temoin: !!m.temoin, unites: us, d: S.desc(vals) };
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

  // alertes générales
  if (nExclu) alerte('info', `${nExclu} donnée(s) exclue(s) ne sont pas prises en compte.`);
  if (nHors) alerte('warn', `${nHors} valeur(s) hors des bornes prévues : vérifie qu’il n’y a pas d’erreur de saisie.`);
  const nUnits = avec.map(g => g.unites.length), minU = Math.min(...nUnits), maxU = Math.max(...nUnits);
  if (maxU >= 2 && maxU / Math.max(1, minU) > 1.5) alerte('warn', 'Groupes déséquilibrés : certaines modalités ont beaucoup moins d’unités que d’autres.');
  if (e.dispositif === 'bandes') alerte('warn', 'Essai non répété (en bandes) : l’effet de la modalité ne peut pas être séparé de l’effet de l’endroit. Le résultat reste indicatif.');
  if (['crd', 'deux', 'blocs', 'factoriel'].includes(e.dispositif) && !(e.plan && e.plan.tire)) alerte('warn', 'Le plan n’a pas été tiré au sort : un effet de position (près du chauffage, de la porte…) peut se mélanger à l’effet étudié.');
  if (e.facteurs.length > 1) alerte('info', `Essai à ${e.facteurs.length} facteurs : ici on compare « ${fac.nom} » toutes modalités des autres facteurs confondues. L’analyse des interactions arrive dans la prochaine version.`);
  if (e.dispositif === 'apparie') alerte('info', 'Dispositif apparié : le test apparié arrive dans la prochaine version. Ici les groupes sont comparés comme s’ils étaient indépendants (moins puissant).');

  const sens = var_.sens || 'plus', seuil = var_.seuil === '' || var_.seuil == null ? 0 : +var_.seuil;
  const unitMode = minU >= 2;
  let mode; // 'pool' | 'unite' | 'blocs' | 'sousech'
  let pourquoi = '';

  // blocs complets ?
  let tabBlocs = null;
  if (e.dispositif === 'blocs' && e.facteurs.length === 1) {
    const blocs = [...new Set(e.unites.map(u => u.bloc))].sort((a, b) => a - b);
    const y = []; let complet = true;
    blocs.forEach(b => { const row = G_.map(g => { const x = g.unites.filter(u => u.bloc === b); return x.length === 1 ? x[0].val : null; });
      if (row.some(v => v == null)) { if (row.some(v => v != null)) complet = false; } else y.push(row); });
    if (y.length >= 2 && complet) tabBlocs = y;
    else if (y.length >= 2) { tabBlocs = y; alerte('warn', 'Certains blocs sont incomplets : ils sont laissés de côté dans l’analyse en blocs.'); }
    else alerte('warn', 'Pas assez de blocs complets pour l’analyse en blocs : les unités sont comparées sans tenir compte des blocs.');
  }

  if (tabBlocs) { mode = 'blocs'; pourquoi = 'Dispositif en blocs : on retire l’effet du bloc (emplacement) avant de comparer les modalités. Une valeur par unité expérimentale.'; }
  else if (isP && avec.every(g => g.toutComptes)) {
    const sd = S.surdispersion(avec.map(g => g.unites));
    res.surdispersion = sd;
    if (!sd) { mode = 'pool'; pourquoi = 'Une seule unité par modalité : on compte tous les plants ensemble (test sur les comptages).'; }
    else if (sd.p < 0.05) { mode = unitMode ? 'unite' : 'pool'; pourquoi = `Les ${e.uniteNom || 'unités'} d’une même modalité varient plus que le hasard ne l’explique (dispersion ${fr(sd.phi, 1)}). On compare donc les ${e.uniteNom || 'unités'} entre eux, pas les plants.`;
      alerte('info', `Variabilité entre ${e.uniteNom || 'unités'} importante (p = ${fr(sd.p, 3)}) : c’est le nombre de ${e.uniteNom || 'unités'}, pas de plants, qui compte.`); }
    else { mode = 'pool'; pourquoi = `Les ${e.uniteNom || 'unités'} d’une même modalité sont homogènes (pas de surdispersion, p = ${fr(sd.p, 2)}) : on peut additionner les plants.`; }
  } else if (unitMode) { mode = 'unite'; pourquoi = `Une valeur par ${e.uniteNom || 'unité'} (moyenne des sous-échantillons si plusieurs plants mesurés).`; }
  else {
    // une seule unité dans au moins un groupe
    const subOk = !isP && avec.every(g => g.unites.length >= 1 && g.unites.reduce((s, x) => s + (x.vals ? x.vals.length : 0), 0) >= 2);
    if (subOk) { mode = 'sousech'; pourquoi = 'Une seule unité par modalité : les mesures individuelles sont utilisées comme répétitions.';
      alerte('grave', `Pseudo-réplication : les plants d’un même ${e.uniteNom || 'unité'} ne sont pas de vraies répétitions. L’écart peut venir de l’${e.uniteNom || 'unité'} lui-même et non de la modalité.`); }
    else { res.raison = `Il faut au moins 2 ${e.uniteNom || 'unités'} par modalité (ou plusieurs mesures dans chacune).`; return res; }
  }
  if (mode === 'pool' && maxU <= 1) alerte('grave', `Pseudo-réplication : un seul ${e.uniteNom || 'unité'} par modalité. Les plants d’un même ${e.uniteNom || 'unité'} ne sont pas indépendants, l’écart peut venir de l’${e.uniteNom || 'unité'} lui-même.`);
  if (minU < 3 && mode !== 'sousech' && maxU > 1) alerte('warn', `Moins de 3 répétitions dans certaines modalités : le résultat est fragile.`);
  alerte('info', 'Un seul essai : confirme sur une autre chauffe ou une autre année avant de changer de pratique.');

  const valsOf = g => mode === 'sousech' ? g.unites.flatMap(u => u.vals || []) : g.unites.map(u => u.val);
  const R = G_[ref];
  res.mode = mode;

  // --- comparaisons au témoin ---
  let blocsRes = null;
  if (mode === 'blocs') { blocsRes = S.anovaBlocs(tabBlocs); }
  G_.forEach((g, i) => {
    if (i === ref) return;
    const c = { nom: g.nom, id: g.id, g };
    if (!g.unites.length) { c.p = null; c.verdict = verdict(null); res.comps.push(c); return; }
    if (mode === 'pool') {
      const pt = g.ok / g.n, pc = R.ok / R.n; c.diff = (pt - pc) * 100;
      const se = Math.sqrt(pt * (1 - pt) / g.n + pc * (1 - pc) / R.n) * 100;
      c.lo = c.diff - 1.96 * se; c.hi = c.diff + 1.96 * se;
      const ch = S.chi2Prop([g.ok, R.ok], [g.n, R.n]);
      if (ch.minExp < 5) { c.p = S.fisher2x2(g.ok, g.n - g.ok, R.ok, R.n - R.ok); c.test = 'Test exact de Fisher'; }
      else { c.p = ch.p; c.test = 'Test du χ²'; }
      const pb = S.probBeta(g.ok, g.n, R.ok, R.n, sens, seuil); c.pMieux = pb.pMieux; c.pSeuil = pb.pSeuil;
      c.tost = se > 0 ? S.tost(c.diff, se, Infinity, seuil) : null;
      c.detail = `${g.ok}/${g.n} contre ${R.ok}/${R.n}`;
    } else if (mode === 'blocs') {
      const j = i; const diff = blocsRes.tm[j] - blocsRes.tm[ref]; const se = Math.sqrt(2 * blocsRes.mse / blocsRes.b); const df = blocsRes.df2;
      c.diff = diff; const q = S.tinv(0.975, df); c.lo = diff - q * se; c.hi = diff + q * se;
      c.p = se > 0 ? 2 * (1 - S.tcdf(Math.abs(diff / se), df)) : (diff === 0 ? 1 : 0); c.test = 'Comparaison au témoin (ANOVA en blocs)';
      const pb = S.probNormale(diff, se, df, sens, seuil); c.pMieux = pb.pMieux; c.pSeuil = pb.pSeuil; c.tost = S.tost(diff, se, df, seuil);
      c.detail = `${blocsRes.b} blocs complets`;
    } else {
      const a = valsOf(g), b = valsOf(R);
      if (a.length < 2 || b.length < 2) { c.p = null; c.verdict = verdict(null); res.comps.push(c); return; }
      const w = S.welch(a, b); c.diff = w.diff; c.lo = w.lo; c.hi = w.hi; c.p = w.p; c.test = 'Test t de Welch';
      const pb = S.probNormale(w.diff, w.se, w.df, sens, seuil); c.pMieux = pb.pMieux; c.pSeuil = pb.pSeuil; c.tost = S.tost(w.diff, w.se, w.df, seuil);
      c.detail = `n = ${a.length} contre ${b.length}${mode === 'sousech' ? ' mesures' : ' ' + (e.uniteNom || 'unités')}`;
    }
    const refVal = mode === 'pool' ? R.ok / R.n * 100 : (mode === 'blocs' ? blocsRes.tm[ref] : S.mean(valsOf(R)));
    c.pct = refVal !== 0 ? c.diff / Math.abs(refVal) * 100 : null;
    c.gain = sens === 'moins' ? -c.diff : c.diff;
    c.verdict = verdict(c.p, c.gain, c.tost);
    c.phrase = phrase(c, var_, R.nom, isP);
    res.comps.push(c);
  });
  if (res.comps.length > 1) alerte('info', 'Plusieurs comparaisons au témoin : chaque probabilité est donnée seule (la correction de Dunnett arrive dans la prochaine version).');

  // --- test global ---
  const ok3 = avec.length >= 3;
  if (mode === 'blocs') res.global = { test: 'ANOVA en blocs', p: blocsRes.p, F: blocsRes.F, df1: blocsRes.df1, df2: blocsRes.df2, pBloc: blocsRes.pBloc, taille: blocsRes.eta2p, tailleNom: 'η² partiel' };
  else if (ok3 && mode === 'pool') { const ch = S.chi2Prop(avec.map(g => g.ok), avec.map(g => g.n)); res.global = { test: 'χ² global', p: ch.p, chi2: ch.chi2, df: ch.df }; }
  else if (ok3) { const gs = avec.map(valsOf).filter(x => x.length); const an = S.anova1(gs); res.global = { test: 'ANOVA à un facteur', p: an.p, F: an.F, df1: an.df1, df2: an.df2, taille: an.eta2, tailleNom: 'η²' }; }

  // variance nulle
  if (mode !== 'pool' && avec.every(g => { const v = valsOf(g); return v.length > 1 && S.variance(v) === 0; })) alerte('warn', 'Toutes les valeurs sont identiques dans chaque groupe : vérifie la saisie.');

  res.methode = { nom: [...new Set(res.comps.map(c => c.test).filter(Boolean))].join(', ') + (res.global ? ' · ' + res.global.test : ''), pourquoi };
  // valeurs pour le graphique
  res.barres = G_.map((g, i) => {
    if (!g.unites.length) return { nom: g.nom, temoin: g.temoin, vide: true };
    if (mode === 'pool') { const p = g.ok / g.n, se = Math.sqrt(p * (1 - p) / g.n); return { nom: g.nom, temoin: g.temoin, val: p * 100, lo: Math.max(0, (p - 1.96 * se) * 100), hi: Math.min(100, (p + 1.96 * se) * 100), pts: g.unites.map(u => u.val) }; }
    const v = valsOf(g), d = S.desc(v);
    const val = mode === 'blocs' ? blocsRes.tm[i] : d.mean;
    return { nom: g.nom, temoin: g.temoin, val, lo: v.length > 1 ? d.lo : null, hi: v.length > 1 ? d.hi : null, pts: g.unites.map(u => u.val) };
  });
  return res;
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

/* Essais — écrans principaux, navigation et événements */
'use strict';
const app = document.getElementById('app');
function go(v) { view = Object.assign({ confirm: null }, v); render(); window.scrollTo(0, 0); }
function render() {
  if (!ETAT.pret) { app.innerHTML = `<p class="muted" style="padding:40px 0;text-align:center">Chargement…</p>`; return; }
  const ec = view.ecran;
  if (ec === 'wizard' && wiz) renderWizard();
  else if (ec === 'essai') renderEssai();
  else if (ec === 'modeles') renderModeles();
  else if (ec === 'reglages') renderReglages();
  else if (ec === 'autotest') renderAutotest();
  else renderAccueil();
}

/* ================= ACCUEIL ================= */
function besoinSauvegarde() {
  const r = ETAT.reglages; if (!Object.keys(ETAT.essais).length || !r.derniereModif) return false;
  if (!r.derniereSauvegarde) return Object.values(ETAT.essais).some(e => aDesDonnees(e));
  if (r.derniereModif <= r.derniereSauvegarde) return false;
  return (Date.now() - new Date(r.derniereSauvegarde)) / 864e5 >= (+r.rappelJours || 7);
}
function renderAccueil() {
  const all = Object.values(ETAT.essais);
  const q = (view.q || '').toLowerCase(), f = view.filtre || 'actifs';
  const filt = all.filter(e => (f === 'tous' || (f === 'actifs' ? e.statut !== 'termine' : e.statut === f)) && (!q || [e.nom, e.theme, e.dossier, e.lieu].join(' ').toLowerCase().includes(q)));
  const parDossier = {}; filt.forEach(e => (parDossier[e.dossier || 'Sans dossier'] = parDossier[e.dossier || 'Sans dossier'] || []).push(e));
  const dossiers = Object.keys(parDossier).sort((a, b) => b.localeCompare(a, 'fr', { numeric: true }));
  const r = ETAT.reglages;
  app.innerHTML = `
  <header class="top"><div class="titre"><div class="eyebrow">Carnet d’essais</div><h1>Essais</h1></div>
    <span class="version">v${VERSION}</span><button class="icon-btn" data-act="reglages" aria-label="Réglages" style="font-size:22px">⚙︎</button></header>
  ${!DB.ok ? `<section class="banner warn"><span class="grow">Le stockage est bloqué sur cet appareil : les essais ne seront pas gardés. Ouvre l’app depuis l’écran d’accueil, hors navigation privée.</span></section>` : ''}
  ${besoinSauvegarde() ? `<section class="banner warn"><span class="grow"><b>Pense à sauvegarder.</b> ${r.derniereSauvegarde ? 'Dernière sauvegarde le ' + fdate(r.derniereSauvegarde) + '.' : 'Aucune sauvegarde pour l’instant.'}</span><button class="btn sm pri" data-act="sauvegarder">Sauvegarder</button></section>` : ''}
  ${majDispo ? `<section class="banner info"><span class="grow">Une nouvelle version de l’app est prête.</span><button class="btn sm pri" data-act="maj">Mettre à jour</button></section>` : ''}
  <section class="row"><button class="btn pri grow" data-act="nouveau">+ Nouvel essai</button><button class="btn ghost" data-act="modeles">Modèles</button></section>
  ${(() => { const af = aFaire(); return af.length ? `<section class="card stack s"><div class="row nowrap"><h2 class="grow">À faire</h2><span class="muted mono">${af.length}</span></div>
    ${af.slice(0, 6).map(x => `<div class="obs-row"><div class="grow" style="min-width:0"><b>${esc(x.e.nom)}</b><div class="muted" style="font-size:14px">${fdate(x.c.date)} · ${jPlus(x.e, x.c.date)} · ${esc(x.c.vars && x.c.vars.length ? x.e.variables.filter(v => x.c.vars.includes(v.id)).map(v => v.nom).join(', ') : 'toutes les variables')}</div></div>
      <span class="pill ${x.s.cls}">${esc(x.s.txt)}</span><button class="btn sm pri" data-act="afaire" data-id="${x.e.id}" data-v="${x.c.date}">Saisir</button></div>`).join('')}</section>` : ''; })()}
  ${all.length ? `<section class="stack">
    <input type="search" id="q" placeholder="Rechercher un essai, un thème, une année" value="${esc(view.q || '')}" aria-label="Rechercher">
    <div class="chips">${[['actifs', 'En cours'], ['preparation', 'En préparation'], ['termine', 'Terminés'], ['tous', 'Tous']].map(([k, l]) => `<button class="chip" data-act="filtre" data-v="${k}" aria-pressed="${f === k}">${l}</button>`).join('')}</div></section>
  ${dossiers.map(d => `<details class="dossier" open><summary><h2 class="grow">${esc(d)}</h2><span class="muted mono">${parDossier[d].length}</span></summary>
    <div class="list">${parDossier[d].sort((a, b) => (b.maj || '').localeCompare(a.maj || '')).map(carteEssai).join('')}</div></details>`).join('') || `<p class="aide" style="margin-top:16px">Aucun essai dans ce filtre.</p>`}` :
  `<section class="card empty"><h2>Aucun essai pour l’instant</h2><p class="aide">Crée ton premier essai à partir d’un modèle (couvertures de chauffe, membrane, porte-greffes…) ou d’une page vierge. L’app calcule ensuite si les écarts sont réels ou dus au hasard.</p>
    <button class="btn pri" data-act="nouveau">Créer un essai</button><button class="btn ghost sm" data-act="reglages">Importer depuis le Carnet d’essais</button></section>`}`;
  const qi = document.getElementById('q');
  if (qi) qi.addEventListener('input', () => { view.q = qi.value; const p = qi.selectionStart; renderAccueil(); const n = document.getElementById('q'); n.focus(); n.setSelectionRange(p, p); });
}
function carteEssai(e) {
  let pill = '';
  try { const s = Analyse.resumeEssai(e); if (s) pill = `<span class="pill ${s.verdict.cls}">${esc(s.verdict.txt)}</span>`; } catch (err) {}
  const nM = Object.values(e.mesures || {}).filter(mesureRemplie).length;
  return `<button class="card item" data-act="ouvrir" data-id="${e.id}">
    <div class="row nowrap"><span class="t grow">${esc(e.nom || 'Sans nom')}</span>${pill}</div>
    <span class="meta">${e.theme ? `<span class="tag">${esc(e.theme)}</span>` : ''}<span>${STATUTS[e.statut] || ''}</span><span>· ${e.unites.length} ${esc(e.uniteNom)}</span><span>· ${e.variables.length} variable(s)</span><span>· ${nM} saisie(s)</span></span>
    ${(() => { const cal = e.calendrier || []; if (!cal.length) return ''; const f = cal.filter(c => statutObs(e, c).code === 'fait').length, p = prochaineObs(e);
      return `<div class="row nowrap" style="gap:8px"><div class="progress grow"><i style="width:${f / cal.length * 100}%"></i></div><span class="mono muted" style="font-size:13px">${f}/${cal.length} obs.</span></div>${p ? `<span class="meta">Prochaine observation : ${fdate(p.date)} (${jPlus(e, p.date)})</span>` : ''}`; })()}</button>`;
}

/* ================= MODÈLES ================= */
function renderModeles() {
  const perso = Object.values(ETAT.modeles);
  app.innerHTML = `<header class="top"><button class="icon-btn" data-act="accueil" aria-label="Retour">‹</button><div class="titre"><div class="eyebrow">Bibliothèque</div><h1>Modèles d’essais</h1></div></header>
  <section class="stack"><div class="lbl">Mes modèles</div>
    ${perso.length ? perso.map(m => `<div class="card stack s"><div class="row nowrap"><b class="grow">${esc(m.nom)}</b>${m.theme ? `<span class="tag">${esc(m.theme)}</span>` : ''}</div><p class="aide">${esc(m.resume || '')}</p>
      <div class="row"><button class="btn sm pri" data-act="modele-utiliser" data-id="${m.id}">Utiliser</button>${view.confirm === m.id ? `<button class="btn sm danger" data-act="modele-del-ok" data-id="${m.id}">Supprimer</button><button class="btn sm ghost" data-act="confirm-non">Non</button>` : `<button class="btn sm ghost" data-act="modele-del" data-id="${m.id}">Supprimer</button>`}</div></div>`).join('')
      : `<p class="aide">Depuis un essai, onglet Infos, « Enregistrer comme modèle » garde sa structure (facteurs, variables, dispositif) pour la réutiliser.</p>`}
  </section>
  <section class="stack"><div class="lbl">Prêts à l’emploi</div>
    ${MODELES.map(m => `<div class="card stack s"><div class="row nowrap"><b class="grow">${esc(m.nom)}</b><span class="tag">${esc(m.theme)}</span></div><p class="aide">${esc(m.resume)}</p>
      <p class="aide">${esc(DISPOSITIFS[m.dispositif].nom)} · ${m.repetitions} ${esc(m.uniteNom)} par modalité · ${m.variables.map(v => esc(v.nom)).join(', ')}</p>
      <div><button class="btn sm pri" data-act="modele-utiliser" data-id="${m.id}">Utiliser</button></div></div>`).join('')}
  </section>`;
}

/* ================= RÉGLAGES ================= */
async function infosStockage() {
  const out = {};
  try { if (navigator.storage && navigator.storage.estimate) { const s = await navigator.storage.estimate(); out.usage = s.usage; out.quota = s.quota; } } catch (e) {}
  try { if (navigator.storage && navigator.storage.persisted) out.persist = await navigator.storage.persisted(); } catch (e) {}
  return out;
}
function renderReglages() {
  const r = ETAT.reglages;
  app.innerHTML = `<header class="top"><button class="icon-btn" data-act="accueil" aria-label="Retour">‹</button><div class="titre"><div class="eyebrow">Essais v${VERSION}</div><h1>Réglages</h1></div></header>
  <section class="card stack"><div class="lbl">Apparence</div>
    <div class="chips">${[['auto', 'Automatique'], ['light', 'Clair (soleil)'], ['dark', 'Sombre']].map(([k, l]) => `<button class="chip" data-act="theme" data-v="${k}" aria-pressed="${(r.theme || 'auto') === k}">${l}</button>`).join('')}</div></section>
  <section class="card stack"><div class="lbl">Sauvegarde</div>
    <p class="aide">${r.derniereSauvegarde ? 'Dernière sauvegarde : ' + fdatetime(r.derniereSauvegarde) + '.' : 'Aucune sauvegarde pour l’instant.'} Les données restent sur cet appareil : enregistre le fichier dans Fichiers ou iCloud Drive.</p>
    <label class="row nowrap" style="font-size:15px"><input type="checkbox" id="avec-photos" checked> Inclure les photos</label>
    <div class="row"><button class="btn pri" data-act="sauvegarder">Sauvegarder maintenant</button><span class="btn ghost file-btn">Restaurer un fichier<input type="file" accept=".json,application/json" id="restaurer" aria-label="Choisir une sauvegarde"></span></div>
    ${view.restau ? `<div class="card stack" style="background:var(--sunk)"><p>Sauvegarde du ${fdatetime(view.restau.date)} : <b>${view.restau.essais.length} essai(s)</b>, ${view.restau.modeles.length} modèle(s), ${view.restau.photos.length} photo(s).</p>
      <div class="row"><button class="btn pri" data-act="restau-fusion">Ajouter à mes essais</button>${view.confirm === 'remplacer' ? `<button class="btn danger" data-act="restau-remplacer-ok">Tout remplacer</button>` : `<button class="btn ghost" data-act="restau-remplacer">Tout remplacer…</button>`}<button class="btn ghost" data-act="restau-annuler">Annuler</button></div>
      ${view.confirm === 'remplacer' ? `<p class="aide">Tous les essais actuels seront effacés et remplacés par ceux du fichier.</p>` : ''}</div>` : ''}
    <label class="f">Rappel de sauvegarde<select id="rappel">${[3, 7, 14, 30].map(n => `<option value="${n}" ${+r.rappelJours === n ? 'selected' : ''}>Tous les ${n} jours</option>`).join('')}</select></label></section>
  <section class="card stack"><div class="lbl">Stockage</div><p class="aide" id="stock">Calcul…</p>
    <div><button class="btn sm ghost" data-act="persist">Protéger mes données</button></div>
    <p class="aide">Installe l’app sur l’écran d’accueil (Partager › Sur l’écran d’accueil) : Safari peut sinon effacer les données d’un site peu ouvert.</p></section>
  <section class="card stack"><div class="lbl">Ma bibliothèque de variables</div>
    <p class="aide">Les variables de tes essais y sont ajoutées automatiquement, avec leurs réglages (unité, seuil, consigne). Tu les retrouves lors de la création d’un essai.</p>
    ${(ETAT.biblio || []).length ? `<div class="stack s">${ETAT.biblio.map((v, i) => `<div class="obs-row"><span class="grow"><b>${esc(v.nom)}</b> <span class="muted" style="font-size:14px">· ${TYPES[v.type] ? TYPES[v.type].nom : v.type}${v.unite ? ' · ' + esc(v.unite) : ''}</span></span><button class="x" data-act="biblio-del" data-i="${i}" aria-label="Retirer de la bibliothèque">×</button></div>`).join('')}</div>` : '<p class="aide">Vide pour l’instant.</p>'}</section>
  <section class="card stack"><div class="lbl">Importer depuis le Carnet d’essais</div>
    <p class="aide">Dans le Carnet d’essais, touche « Copier toutes les données », puis colle le texte ici.</p>
    <textarea id="import-carnet" placeholder="Colle ici les données copiées"></textarea>
    <div><button class="btn" data-act="import-carnet">Importer</button></div></section>
  <section class="card stack"><div class="lbl">Fiabilité des calculs</div>
    <p class="aide">Rejoue les calculs sur des jeux de données dont les résultats sont publiés (R, SciPy).</p>
    <div><button class="btn" data-act="autotest">Auto-test des calculs</button></div></section>
  <section class="card stack"><div class="lbl">Glossaire</div><details><summary style="cursor:pointer;font-weight:600">Afficher les définitions</summary><div class="gl stack s" style="margin-top:10px">${GLOSSAIRE.map(([t, d]) => `<p class="aide"><b style="color:var(--ink)">${t}</b> : ${d}</p>`).join('')}</div></details></section>
  <section class="card stack"><div class="lbl">À propos</div><p class="aide">Essais v${VERSION}. Tout fonctionne hors ligne, aucune donnée ne quitte l’appareil. L’app aide à décider sur le terrain ; elle ne remplace pas un statisticien pour une publication.</p>
    <div><button class="btn sm ghost" data-act="verif-maj">Rechercher une mise à jour</button></div></section>`;
  infosStockage().then(s => { const el = document.getElementById('stock'); if (!el) return;
    el.textContent = (s.usage != null ? `Utilisé : ${fr(s.usage / 1048576, 1)} Mo${s.quota ? ' sur ' + fr(s.quota / 1073741824, 1) + ' Go disponibles' : ''}. ` : '') + (s.persist ? 'Données protégées contre l’effacement automatique.' : 'Données non protégées : touche « Protéger mes données ».'); });
}

/* ---------- Sauvegarde / restauration ---------- */
const b64 = blob => new Promise(res => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.readAsDataURL(blob); });
async function sauvegarder() {
  const avec = document.getElementById('avec-photos') ? document.getElementById('avec-photos').checked : true;
  await Promise.all(Object.values(ETAT.essais).map(sauverNow)).catch(() => {});
  const photos = [];
  if (avec) { const ps = await DB.tous('photos').catch(() => []); for (const p of ps) photos.push({ id: p.id, essaiId: p.essaiId, date: p.date, type: p.blob.type, data: await b64(p.blob) }); }
  const data = { app: 'Essais', version: VERSION, date: new Date().toISOString(), essais: Object.values(ETAT.essais), modeles: Object.values(ETAT.modeles), photos };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const ok = await partager(blob, `essais-sauvegarde-${today()}.json`);
  if (ok) { ETAT.reglages.derniereSauvegarde = new Date().toISOString(); majReglages(); toast('Sauvegarde prête'); render(); }
}
async function lireSauvegarde(file) {
  try { const d = JSON.parse(await file.text()); if (d.app !== 'Essais' || !Array.isArray(d.essais)) throw 0;
    view.restau = { date: d.date, essais: d.essais, modeles: d.modeles || [], photos: d.photos || [] }; view.confirm = null; render();
  } catch (e) { toast('Ce fichier n’est pas une sauvegarde de l’app Essais.', 3500); }
}
async function restaurer(remplacer) {
  const R = view.restau; if (!R) return;
  try {
    if (remplacer) { await DB.vider('essais'); await DB.vider('photos'); await DB.vider('modeles'); ETAT.essais = {}; ETAT.modeles = {}; }
    for (const p of R.photos) { const bin = atob(p.data), arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i); await DB.put('photos', { id: p.id, essaiId: p.essaiId, date: p.date, blob: new Blob([arr], { type: p.type || 'image/jpeg' }) }); }
    for (const e of R.essais) { ETAT.essais[e.id] = e; await DB.put('essais', e); }
    for (const m of R.modeles) { ETAT.modeles[m.id] = m; await DB.put('modeles', m); }
    toast(`${R.essais.length} essai(s) restauré(s)`); view.restau = null; go({ ecran: 'accueil' });
  } catch (e) { toast('Restauration interrompue : stockage plein ?', 4000); }
}

/* ================= AUTO-TEST ================= */
function casTests() {
  const S = Stats;
  const ctrl = [4.17, 5.58, 5.18, 6.11, 4.50, 4.61, 5.17, 4.53, 5.33, 5.14], t1 = [4.81, 4.17, 4.41, 3.59, 5.87, 3.83, 6.03, 4.89, 4.32, 4.69], t2 = [6.31, 5.12, 5.54, 5.50, 5.37, 5.29, 4.92, 6.15, 5.80, 5.26];
  const t2b = t2.slice(0, 8), anD = S.anova1([ctrl, t1, t2b]), lamD = [t1, t2b].map(g => Math.sqrt(g.length / (g.length + 10)));
  const dun = [t1, t2b].map(g => 1 - S.pdunnett(Math.abs((S.mean(g) - S.mean(ctrl)) / Math.sqrt(anD.mse * (1 / g.length + 0.1))), lamD, anD.df2));
  const sw = S.shapiro(ctrl), sw2 = S.shapiro([1, 2, 3, 4, 10, 25, 3, 2, 1, 5, 6, 7, 8, 30, 2]), lev = S.levene([ctrl, t1, t2]);
  const Y2 = { '0,0': [10, 11, 12], '0,1': [13, 14, 13], '1,0': [11, 12, 12], '1,1': [17, 16, 18], '2,0': [9, 10, 11], '2,1': [12, 13, 14] }, ob2 = [];
  Object.entries(Y2).forEach(([k, v]) => { const [a, b] = k.split(',').map(Number); v.forEach((y, r) => ob2.push({ a, b, y, bloc: r })); });
  const an2 = S.anova2(ob2, 3, 2, false), an2b = S.anova2(ob2, 3, 2, true);
  const an = S.anova1([ctrl, t1, t2]), w = S.welch(t2, ctrl), d = S.desc(ctrl), bl = S.anovaBlocs([[10, 12, 14], [11, 14, 15], [9, 11, 13], [12, 13, 17]]), ch = S.chi2Prop([246, 263, 250], [300, 300, 300]);
  return [
    ['ANOVA à un facteur : F (PlantGrowth)', an.F, 4.846088, 1e-5, 'R : summary(aov(weight ~ group, PlantGrowth))'],
    ['ANOVA à un facteur : p (PlantGrowth)', an.p, 0.01591, 1e-5, 'R : summary(aov(weight ~ group, PlantGrowth))'],
    ['Welch trt2 – ctrl : t', w.t, 2.134020, 1e-5, 'R : t.test(trt2, ctrl)'],
    ['Welch trt2 – ctrl : ddl', w.df, 16.785764, 1e-5, 'R : t.test(trt2, ctrl)'],
    ['Welch trt2 – ctrl : p', w.p, 0.047899, 1e-5, 'R : t.test(trt2, ctrl)'],
    ['Welch : borne basse IC 95 %', w.lo, 0.005128, 1e-5, 'R : t.test(trt2, ctrl)$conf.int'],
    ['Quartile 1 (type 7)', d.q1, 4.55, 1e-9, 'R : quantile(ctrl)'],
    ['Quartile 3 (type 7)', d.q3, 5.2925, 1e-9, 'R : quantile(ctrl)'],
    ['Écart-type', d.sd, 0.583091, 1e-5, 'R : sd(ctrl)'],
    ['ANOVA en blocs : F traitement', bl.F, 43.4, 1e-6, 'R : aov(y ~ t + b)'],
    ['ANOVA en blocs : p traitement', bl.p, 0.000270, 1e-6, 'R : aov(y ~ t + b)'],
    ['ANOVA en blocs : p bloc', bl.pBloc, 0.004919, 1e-6, 'R : aov(y ~ t + b)'],
    ['Fisher exact 8/10 contre 3/10', S.fisher2x2(8, 2, 3, 7), 0.069779, 1e-5, 'R : fisher.test(matrix(c(8,3,2,7),2))'],
    ['Fisher exact 1/10 contre 11/14', S.fisher2x2(1, 9, 11, 3), 0.0027595, 1e-6, 'R : fisher.test'],
    ['χ² 3 × 2 sans correction', ch.p, 0.136272, 1e-5, 'R : chisq.test(…, correct = FALSE)'],
    ['Loi t : P(T < 1,5), 4 ddl', S.tcdf(1.5, 4), 0.896, 1e-9, 'R : pt(1.5, 4)'],
    ['Quantile t 97,5 %, 3 ddl', S.tinv(0.975, 3), 3.182446, 1e-5, 'R : qt(0.975, 3)'],
    ['Loi F : P(F > 1,2), 5 et 40 ddl', S.fsurv(1.2, 5, 40), 0.326708, 1e-5, 'R : pf(1.2, 5, 40, lower = FALSE)'],
    ['Loi χ² : P(χ² > 10), 4 ddl', S.chi2surv(10, 4), 0.040428, 1e-5, 'R : pchisq(10, 4, lower = FALSE)'],
    ['Loi normale : quantile 97,5 %', S.ninv(0.975), 1.959964, 1e-5, 'R : qnorm(0.975)'],
    ['Tukey : P(Q < 3,5), k = 3, 10 ddl', S.ptukey(3.5, 3, 10), 0.922897, 1e-5, 'R : ptukey(3.5, 3, 10)'],
    ['Tukey : quantile 95 %, k = 4, 6 ddl', S.qtukey(0.95, 4, 6), 4.895599, 1e-4, 'R : qtukey(0.95, 4, 6)'],
    ['Dunnett PlantGrowth trt1 contre ctrl', dun[0], 0.347421, 5e-4, 'SciPy : stats.dunnett(trt1, trt2[:8], control = ctrl)'],
    ['Dunnett PlantGrowth trt2 contre ctrl', dun[1], 0.205994, 5e-4, 'SciPy : stats.dunnett'],
    ['Shapiro-Wilk : W (ctrl)', sw.W, 0.956681, 1e-5, 'R : shapiro.test(ctrl)'],
    ['Shapiro-Wilk : p (ctrl)', sw.p, 0.747473, 1e-4, 'R : shapiro.test(ctrl)'],
    ['Shapiro-Wilk : p (données asymétriques, n = 15)', sw2.p, 0.000206, 1e-5, 'R : shapiro.test'],
    ['Levene (médiane) PlantGrowth : p', lev.p, 0.341227, 1e-5, 'R : car::leveneTest(weight ~ group)'],
    ['ANOVA 2 facteurs : p interaction', an2.AB.p, 0.029636, 1e-5, 'R : aov(y ~ a * b)'],
    ['ANOVA 2 facteurs + blocs : p interaction', an2b.AB.p, 0.005216, 1e-5, 'R : aov(y ~ a * b + bloc)'],
    ['Probabilité bêta 8/10 > 3/10 (Monte-Carlo)', S.probBeta(8, 10, 3, 10, 'plus', 0, 40000).pMieux, 0.985, 0.01, 'Intégration numérique exacte ≈ 0,985']
  ].map(([nom, obt, att, tol, src]) => ({ nom, obt, att, tol, src, ok: Math.abs(obt - att) <= Math.max(tol, Math.abs(att) * 1e-4) }));
}
function renderAutotest() {
  const cs = casTests(), ok = cs.filter(c => c.ok).length;
  app.innerHTML = `<header class="top"><button class="icon-btn" data-act="reglages" aria-label="Retour">‹</button><div class="titre"><div class="eyebrow">Fiabilité</div><h1>Auto-test des calculs</h1></div></header>
  <section class="verdict ${ok === cs.length ? 'v-bon' : 'v-mauvais'}"><div class="big">${ok} sur ${cs.length} vérifications réussies</div><p>Chaque calcul est comparé à la valeur publiée par R ou SciPy pour le même jeu de données.</p></section>
  <section class="card"><div class="tbl-wrap"><table><thead><tr><th>Calcul</th><th>Obtenu</th><th>Attendu</th><th></th></tr></thead><tbody>
    ${cs.map(c => `<tr><td style="white-space:normal;min-width:180px">${esc(c.nom)}<br><span class="muted" style="font-size:12px">${esc(c.src)}</span></td><td class="mono">${c.obt.toPrecision(6)}</td><td class="mono">${c.att}</td><td class="${c.ok ? 'ok' : 'ko'}">${c.ok ? 'OK' : 'Écart'}</td></tr>`).join('')}
  </tbody></table></div></section>`;
}

/* ================= PHOTO EN GRAND ================= */
function voirPhoto(pid) {
  const ov = document.getElementById('overlay');
  ov.innerHTML = `<div class="wrap stack" style="padding-block:16px"><div class="row"><span class="grow"></span><button class="btn" data-act="photo-fermer">Fermer</button></div>
    <img data-pid="${pid}" alt="Photo" style="width:100%;border-radius:12px;background:var(--sunk)">
    <div class="row">${view.confirm === 'photo' ? `<button class="btn danger" data-act="photo-suppr-ok" data-pid="${pid}">Supprimer la photo</button><button class="btn ghost" data-act="photo-voir" data-pid="${pid}">Annuler</button>` : `<button class="btn ghost" data-act="photo-suppr" data-pid="${pid}" style="color:var(--mauvais)">Supprimer</button>`}</div></div>`;
  ov.hidden = false; hydraterPhotos(ov);
}
async function supprimerPhoto(pid) {
  const e = ETAT.essais[view.id];
  if (e) { Object.values(e.mesures || {}).forEach(m => { if (m.photos) m.photos = m.photos.filter(x => x !== pid); }); (e.observations || []).forEach(o => { if (o.photos) o.photos = o.photos.filter(x => x !== pid); }); sauver(e, 'Photo supprimée'); }
  await DB.del('photos', pid).catch(() => {});
  document.getElementById('overlay').hidden = true; view.confirm = null; render();
}

/* ================= ÉVÉNEMENTS ================= */
const cur = () => ETAT.essais[view.id];
document.addEventListener('click', async ev => {
  const b = ev.target.closest('[data-act]'); if (!b || b.disabled) return;
  const act = b.dataset.act, e = cur();
  if (act.startsWith('wiz-') && wiz && wizClic(act, b)) return;
  if (e && view.ecran === 'essai' && /^(cal|iv)-|^gps$/.test(act) && suiviClic(act, b, e)) return;
  const u = b.dataset.u, vId = b.dataset.v;
  switch (act) {
    case 'accueil': go({ ecran: 'accueil' }); break;
    case 'nouveau': ouvrirAssistant(null); break;
    case 'modeles': go({ ecran: 'modeles' }); break;
    case 'reglages': go({ ecran: 'reglages' }); break;
    case 'autotest': go({ ecran: 'autotest' }); break;
    case 'ouvrir': go({ ecran: 'essai', id: b.dataset.id, onglet: 'saisie' }); break;
    case 'filtre': view.filtre = b.dataset.v; render(); break;
    case 'onglet': if (view.onglet === 'saisie' && b.dataset.v === 'saisie') view.remplirU = null; view.onglet = b.dataset.v; view.confirm = null; render(); window.scrollTo(0, 0); break;
    case 'confirm-non': view.confirm = null; render(); break;
    // saisie
    case 'saisie-var': view.saisieVar = vId; render(); break;
    case 'saisie-mode': view.saisieMode = vId; if (vId === 'terrain') { view.focusTerrain = true; view.terrainDebut = true; } render(); break;
    case 'saisie-date': view.date = vId; view.remplirU = null; render(); break;
    case 'r-ouvrir': view.remplirU = b.dataset.id; view.remplirV = null; view.focusSaisie = true; render(); window.scrollTo(0, 0); break;
    case 'r-liste': view.remplirU = null; view.remplirV = null; render(); window.scrollTo(0, 0); break;
    case 'r-options': view.rOptions = !view.rOptions; render(); break;
    case 'r-var': view.remplirV = +vId; view.focusSaisie = true; render(); break;
    case 'r-suivant': clearTimeout(view.tAvance); avancer(e); break;
    case 'aide-ok': ETAT.reglages.aideRemplir = true; majReglages(); render(); break;
    case 'section': view.section = vId; view.confirm = null; render(); break;
    case 't-prec': view.terrainI = Math.max(0, (view.terrainI || 0) - 1); view.focusTerrain = true; render(); window.scrollTo(0, 0); break;
    case 't-suiv': view.terrainI = (view.terrainI || 0) + 1; view.focusTerrain = true; render(); window.scrollTo(0, 0); break;
    case 'u-prec': view.saisieU = Math.max(0, (view.saisieU || 0) - 1); render(); window.scrollTo(0, 0); break;
    case 'u-suiv': view.saisieU = Math.min(e.unites.length - 1, (view.saisieU || 0) + 1); render(); window.scrollTo(0, 0); break;
    case 'meteo': { const j = (e.journees = e.journees || {})[view.date] = Object.assign({}, (e.journees || {})[view.date]); j.meteo = j.meteo === vId ? '' : vId; view.jourOuvert = true; sauver(e); render(); break; }
    case 'tap': { const m = ensureM(e, u, b.dataset.v, view.date); m.ok = (+m.ok || 0) + (+b.dataset.x); m.n = (+m.n || 0) + 1; (m.tap = m.tap || []).push(+b.dataset.x); sauver(e); rafraichirCarte(e, u, b.dataset.v); if (navigator.vibrate) navigator.vibrate(15); apresSaisie(e, u); break; }
    case 'score': { const m = ensureM(e, u, b.dataset.v, view.date); m.vals.push(+b.dataset.x); sauver(e); rafraichirCarte(e, u, b.dataset.v); if (navigator.vibrate) navigator.vibrate(15); apresSaisie(e, u); break; }
    case 'cat': { const m = ensureM(e, u, b.dataset.v, view.date); m.cats = m.cats || {}; m.cats[b.dataset.x] = (m.cats[b.dataset.x] || 0) + 1; (m.tap = m.tap || []).push(b.dataset.x); sauver(e); rafraichirCarte(e, u, b.dataset.v); apresSaisie(e, u); break; }
    case 'annuler': { const v = e.variables.find(x => x.id === b.dataset.v); const m = getM(e, u, v.id, view.date); if (!m) break;
      if (v.type === 'binaire') { const x = (m.tap || []).pop(); if (x == null) break; m.ok = Math.max(0, (+m.ok || 0) - x); m.n = Math.max(0, (+m.n || 0) - 1); }
      else if (v.type === 'categorie') { const x = (m.tap || []).pop(); if (x == null) break; m.cats[x] = Math.max(0, (m.cats[x] || 0) - 1); }
      else m.vals.pop();
      sauver(e); rafraichirCarte(e, u, v.id); break; }
    case 'add-val': ajouterValeurs(e, u, b.dataset.v); break;
    case 'val': { const key = u + b.dataset.v + b.dataset.i; if (view.arme === key) { const m = getM(e, u, b.dataset.v, view.date); m.vals.splice(+b.dataset.i, 1); view.arme = null; sauver(e, 'Valeur retirée'); } else { view.arme = key; clearTimeout(view.tArme); view.tArme = setTimeout(() => { view.arme = null; if (cur()) rafraichirCarte(cur(), u, b.dataset.v); }, 3000); } rafraichirCarte(e, u, b.dataset.v); break; }
    case 'exclure': { const m = ensureM(e, u, b.dataset.v, view.date); m.exclu = !m.exclu; const un = e.unites.find(x => x.id === u); sauver(e, `${un ? un.code : ''} · ${(e.variables.find(x => x.id === b.dataset.v) || {}).nom} : donnée ${m.exclu ? 'exclue' : 'réintégrée'} (${fdate(view.date)})`); rafraichirCarte(e, u, b.dataset.v); break; }
    // résultats
    case 'res-var': view.resVar = vId; view.resDate = null; render(); break;
    case 'res-fac': view.resFac = vId; render(); break;
    // plan
    case 'plan-tirer': if (e.plan.tire) { view.confirm = 'tirer'; render(); } else { tirerPlan(e); sauver(e, 'Plan tiré au sort'); render(); } break;
    case 'plan-tirer-ok': tirerPlan(e); view.confirm = null; sauver(e, 'Plan tiré au sort à nouveau'); render(); toast('Nouveau plan tiré au sort'); break;
    // carnet
    case 'obs-add': { const t = document.getElementById('obs-txt').value.trim(); if (!t && !(view.obsPhotos || []).length) { toast('Écris une observation'); break; }
      (e.observations = e.observations || []).push({ id: 'o-' + uid(), date: document.getElementById('obs-date').value || today(), texte: t, photos: view.obsPhotos || [] }); view.obsPhotos = []; sauver(e, 'Observation ajoutée'); render(); toast('Observation notée'); break; }
    case 'obs-del': view.confirm = 'obs-' + b.dataset.id; render(); break;
    case 'obs-del-ok': e.observations = e.observations.filter(o => o.id !== b.dataset.id); view.confirm = null; sauver(e, 'Observation supprimée'); render(); break;
    // infos
    case 'temoin': { const f = e.facteurs[+b.dataset.f]; f.modalites.forEach((m, i) => m.temoin = i === +b.dataset.m); sauver(e, `Témoin : ${f.modalites[+b.dataset.m].nom}`); render(); break; }
    case 'var-add': { const v = { id: 'v-' + uid(), nom: 'Nouvelle variable', type: 'continue', unite: '', min: '', max: '', sens: 'plus', seuil: '', echelle: 5, categories: [], notes: '' }; e.variables.push(v); view.varOuverte = v.id; sauver(e, 'Variable ajoutée'); render(); break; }
    case 'var-biblio-add': { const v = clone(biblioProposee(e)[+b.dataset.i]); if (!v) break; v.id = 'v-' + uid(); e.variables.push(Object.assign({ unite: '', min: '', max: '', sens: 'plus', seuil: '', echelle: 5, categories: [], notes: '', cible: '' }, v)); view.varOuverte = v.id; sauver(e, 'Variable ajoutée : ' + v.nom); render(); break; }
    case 'var-biblio': { const n = ajouterBiblio(e.variables.filter(x => x.id === b.dataset.id)); toast(n ? 'Ajoutée à ta bibliothèque' : 'Déjà dans ta bibliothèque'); break; }
    case 'biblio-del': ETAT.biblio.splice(+b.dataset.i, 1); DB.setReglage('biblio', ETAT.biblio).catch(() => {}); render(); break;
    case 'aller-ok': allerA(); break;
    case 'afaire': go({ ecran: 'essai', id: b.dataset.id, onglet: 'saisie', date: b.dataset.v, remplirU: null }); break;
    case 'var-del': view.confirm = 'var-' + b.dataset.id; render(); break;
    case 'var-del-ok': { const id = b.dataset.id; const v = e.variables.find(x => x.id === id); e.variables = e.variables.filter(x => x.id !== id); Object.keys(e.mesures || {}).forEach(k => { if (e.mesures[k].v === id) delete e.mesures[k]; }); view.confirm = null; sauver(e, `Variable supprimée : ${v ? v.nom : ''}`); render(); break; }
    case 'structure': ouvrirStructure(e); break;
    case 'csv': partager(new Blob([csvEssai(e)], { type: 'text/csv;charset=utf-8' }), `${(e.nom || 'essai').replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}.csv`); break;
    case 'modele-save': { const m = versModele(e); ETAT.modeles[m.id] = m; DB.put('modeles', m).catch(() => {}); toast('Modèle enregistré'); break; }
    case 'dupliquer': { const c = clone(e); c.id = 'e-' + uid(); c.nom = e.nom + ' (copie)'; c.mesures = {}; c.journees = {}; c.observations = []; c.historique = []; c.statut = 'preparation'; c.debut = today(); c.cree = new Date().toISOString();
      c.unites.forEach(x => x.id = 'u-' + uid() + Math.random().toString(36).slice(2, 5)); sauver(c, 'Dupliqué depuis « ' + e.nom + ' »'); go({ ecran: 'essai', id: c.id, onglet: 'plan' }); toast('Essai dupliqué, sans les données'); break; }
    case 'suppr': view.confirm = 'suppr'; render(); break;
    case 'suppr-ok': { const id = e.id; const pids = []; Object.values(e.mesures || {}).forEach(m => pids.push(...(m.photos || []))); (e.observations || []).forEach(o => pids.push(...(o.photos || [])));
      clearTimeout(timers[id]); delete ETAT.essais[id]; await DB.del('essais', id).catch(() => {}); for (const p of pids) await DB.del('photos', p).catch(() => {}); go({ ecran: 'accueil' }); toast('Essai supprimé'); break; }
    // modèles
    case 'modele-utiliser': { const m = MODELES.find(x => x.id === b.dataset.id) || ETAT.modeles[b.dataset.id]; ouvrirAssistant(m); break; }
    case 'modele-del': view.confirm = b.dataset.id; render(); break;
    case 'modele-del-ok': delete ETAT.modeles[b.dataset.id]; DB.del('modeles', b.dataset.id).catch(() => {}); view.confirm = null; render(); break;
    // réglages
    case 'theme': ETAT.reglages.theme = vId; appliquerTheme(); majReglages(); render(); break;
    case 'sauvegarder': sauvegarder(); break;
    case 'restau-fusion': restaurer(false); break;
    case 'restau-remplacer': view.confirm = 'remplacer'; render(); break;
    case 'restau-remplacer-ok': restaurer(true); break;
    case 'restau-annuler': view.restau = null; view.confirm = null; render(); break;
    case 'persist': { let ok = false; try { ok = navigator.storage && navigator.storage.persist ? await navigator.storage.persist() : false; } catch (x) {} toast(ok ? 'Données protégées' : 'Protection refusée : installe l’app sur l’écran d’accueil puis réessaie.', 3500); render(); break; }
    case 'import-carnet': { const t = document.getElementById('import-carnet').value.trim(); if (!t) { toast('Colle d’abord les données'); break; }
      try { const arr = importerCarnet(JSON.parse(t)); if (!arr.length) throw 0; arr.forEach(x => sauver(x)); toast(`${arr.length} essai(s) importé(s)`); go({ ecran: 'accueil', filtre: 'tous' }); }
      catch (x) { toast('Texte illisible : copie-le depuis le bouton « Copier toutes les données » du Carnet.', 4000); } break; }
    case 'verif-maj': if (swReg) { swReg.update().then(() => toast(majDispo ? 'Nouvelle version prête' : 'Tu as la dernière version')).catch(() => toast('Hors ligne : réessaie plus tard')); } else toast('Mise à jour indisponible ici'); break;
    case 'maj': if (swReg && swReg.waiting) swReg.waiting.postMessage('skipWaiting'); else location.reload(); break;
    // photos
    case 'photo-voir': view.confirm = null; voirPhoto(b.dataset.pid); break;
    case 'photo-fermer': document.getElementById('overlay').hidden = true; view.confirm = null; break;
    case 'photo-suppr': view.confirm = 'photo'; voirPhoto(b.dataset.pid); break;
    case 'photo-suppr-ok': supprimerPhoto(b.dataset.pid); break;
  }
});

document.addEventListener('input', ev => {
  const el = ev.target;
  if (view.ecran === 'wizard' && wiz && el.dataset.w) { wizInput(el, false); return; }
  const e = cur(); if (!e || view.ecran !== 'essai') return;
  if (suiviInput(el, e)) return;
  if (el.dataset.m) { // champ de mesure
    const m = ensureM(e, el.dataset.u, el.dataset.v, view.date), k = el.dataset.m;
    if (k === 'txt' || k === 'raison') m[k] = el.value;
    else { m[k] = el.value === '' ? '' : (k === 'pct' ? num(el.value) : Math.max(0, Math.round(num(el.value)))); if (k !== 'pct') m.tap = []; if (k === 'pct' && el.value !== '') { m.ok = ''; m.n = ''; } }
    sauver(e);
    const s = document.getElementById(`s-${el.dataset.u}-${el.dataset.v}`); const v = e.variables.find(x => x.id === el.dataset.v); if (s && v) s.innerHTML = resumeMesure(v, m);
    return;
  }
  if (el.dataset.jour) { e.journees = e.journees || {}; const j = e.journees[view.date] = Object.assign({}, e.journees[view.date]); j[el.dataset.jour] = el.value; sauver(e); return; }
  if (el.dataset.e) { e[el.dataset.e] = el.value; sauver(e); if (el.dataset.e === 'nom') { const h = app.querySelector('.top h1'); if (h) h.textContent = el.value || 'Sans nom'; } return; }
  if (el.dataset.mo) { const [fi, mi] = el.dataset.mo.split('.').map(Number); e.facteurs[fi].modalites[mi].nom = el.value; sauver(e); return; }
  if (el.dataset.var) { const [vi, k] = el.dataset.var.split('.'); e.variables[+vi][k] = el.value; sauver(e); return; }
  if (el.dataset.w && el.dataset.w[0] === '§') { const [vi, k] = el.dataset.w.slice(1).split('.'); const v = e.variables[+vi];
    if (k === 'categoriesTxt') v.categories = el.value.split(',').map(s => s.trim()).filter(Boolean); else v[k] = el.value; sauver(e); return; }
});
document.addEventListener('change', async ev => {
  const el = ev.target;
  if (view.ecran === 'wizard' && wiz && el.dataset.w) { wizInput(el, true); return; }
  if (el.id === 'restaurer' && el.files[0]) { lireSauvegarde(el.files[0]); return; }
  if (el.id === 'rappel') { ETAT.reglages.rappelJours = +el.value; majReglages(); return; }
  const e = cur();
  if (el.dataset.photoU && el.files[0] && e) { const f = el.files[0]; toast('Photo en cours…', 1200);
    try { const id = await ajouterPhoto(e, f); const m = ensureM(e, el.dataset.photoU, el.dataset.photoV, view.date); (m.photos = m.photos || []).push(id); sauver(e); rafraichirCarte(e, el.dataset.photoU, el.dataset.photoV); toast('Photo ajoutée'); }
    catch (x) { toast('Photo impossible à enregistrer', 3000); } return; }
  if (el.id === 'obs-photo' && el.files[0] && e) { try { const id = await ajouterPhoto(e, el.files[0]); (view.obsPhotos = view.obsPhotos || []).push(id); const n = document.getElementById('obs-photo-n'); if (n) n.textContent = view.obsPhotos.length + ' photo(s) prête(s)'; } catch (x) { toast('Photo impossible à enregistrer'); } return; }
  if (el.dataset.sel === 'date') { view.date = el.value || today(); view.remplirU = null; render(); return; }
  if (el.dataset.sel === 'unite') { view.saisieU = +el.value; render(); return; }
  if (el.dataset.sel === 'resdate') { view.resDate = el.value; render(); return; }
  if (el.dataset.sel === 'ordre') { view.ordre = el.value; ETAT.reglages.ordre = el.value; majReglages(); view.terrainDebut = true; render(); return; }
  if (el.dataset.sel === 'auto') { ETAT.reglages.autoAvance = el.checked; majReglages(); return; }
  if (el.dataset.planE && e) { e.plan[el.dataset.planE] = Math.max(1, +el.value || 1); ajusterGrille(e); e.plan.tire = null; sauver(e, 'Disposition du plan modifiée'); render(); return; }
  if (e && view.ecran === 'essai' && (el.tagName === 'SELECT' && (el.dataset.e === 'statut' || el.dataset.rerender || (el.dataset.w && el.dataset.w[0] === '§')))) {
    if (el.dataset.var) { const vi = +el.dataset.var.split('.')[0]; view.varOuverte = e.variables[vi].id; }
    if (el.dataset.w) { const vi = +el.dataset.w.slice(1).split('.')[0]; view.varOuverte = e.variables[vi].id; }
    sauver(e, el.dataset.e === 'statut' ? 'Statut : ' + STATUTS[el.value] : null); render();
  }
  if (e && el.dataset.e && el.tagName !== 'SELECT') sauver(e, null);
});
document.addEventListener('keydown', ev => {
  const el = ev.target;
  if (ev.key === 'Enter' && el.dataset.addval) { ev.preventDefault(); ajouterValeurs(cur(), el.dataset.u, el.dataset.v); }
  if (ev.key === 'Enter' && el.id === 'aller') { ev.preventDefault(); allerA(); }
});
document.addEventListener('toggle', ev => { if (ev.target.id === 'jour') view.jourOuvert = ev.target.open; }, true);

function allerA() {
  const e = cur(), el = document.getElementById('aller'); if (!e || !el) return; const q = el.value.trim().toUpperCase(); if (!q) return;
  const us = ordreUnites(e, view.ordre || ETAT.reglages.ordre || 'rangee');
  let i = us.findIndex(u => u.code.toUpperCase() === q); if (i < 0) i = us.findIndex(u => u.code.toUpperCase().endsWith(q.replace(/^\D+/, '').padStart(2, '0'))); if (i < 0) i = us.findIndex(u => u.code.toUpperCase().includes(q));
  if (i < 0) { toast('Code introuvable : ' + q); return; } view.terrainI = i; view.focusTerrain = true; render(); window.scrollTo(0, 0);
}

/* ================= THÈME, SERVICE WORKER, DÉMARRAGE ================= */
function appliquerTheme() { const t = ETAT.reglages.theme; if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; }
let swReg = null, majDispo = false;
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  try {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(reg => {
      swReg = reg;
      const surveiller = w => { if (!w) return; w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) { majDispo = true; if (view.ecran === 'accueil') render(); } }); };
      if (reg.waiting && navigator.serviceWorker.controller) { majDispo = true; }
      reg.addEventListener('updatefound', () => surveiller(reg.installing));
      if (reg.installing) surveiller(reg.installing);
      reg.update().catch(() => {});
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    }).catch(() => {});
    let rechargé = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (rechargé) return; rechargé = true; location.reload(); });
  } catch (e) {}
}
(async function demarrer() {
  render();
  await chargerTout();
  appliquerTheme();
  render();
})();

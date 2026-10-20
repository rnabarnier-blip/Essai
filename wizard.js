/* Essais — assistant de création d'essai */
'use strict';
let wiz = null; // { etape, mode: 'nouveau'|'structure', e }
const ETAPES = ['Départ', 'Infos', 'Facteurs', 'Dispositif', 'Variables', 'Plan'];

function ouvrirAssistant(modele) {
  wiz = { etape: modele ? 1 : 0, mode: 'nouveau', e: depuisModele(modele || {}) };
  if (modele && modele.id && !modele.id.startsWith('m-')) wiz.e.nom = '';
  view = { ecran: 'wizard' }; render(); window.scrollTo(0, 0);
}
function ouvrirStructure(e) {
  wiz = { etape: 2, mode: 'structure', e: clone(e) };
  view = { ecran: 'wizard', retour: e.id }; render(); window.scrollTo(0, 0);
}
function getPath(o, p) { return p.split('.').reduce((a, k) => a == null ? a : a[k], o); }
function setPath(o, p, v) { const ks = p.split('.'); const last = ks.pop(); const t = ks.reduce((a, k) => a[k], o); t[last] = v; }

function renderWizard() {
  const e = wiz.e, et = wiz.etape;
  const titre = wiz.mode === 'structure' ? 'Modifier la structure' : 'Nouvel essai';
  let corps = '';
  if (et === 0) corps = wizDepart();
  else if (et === 1) corps = wizInfos(e);
  else if (et === 2) corps = wizFacteurs(e);
  else if (et === 3) corps = wizDispositif(e);
  else if (et === 4) corps = wizVariables(e);
  else corps = wizPlan(e);
  const dernier = et === 5;
  app.innerHTML = `
  <header class="top"><button class="icon-btn" data-act="wiz-quitter" aria-label="Fermer l’assistant">×</button>
    <div class="titre"><div class="eyebrow">Étape ${et + 1} sur 6 · ${ETAPES[et]}</div><h1>${titre}</h1></div></header>
  <div class="steps">${ETAPES.map((_, i) => `<i class="${i <= et ? 'on' : ''}"></i>`).join('')}</div>
  <div class="stack" style="margin-top:18px">${corps}</div>
  ${et > 0 ? `<div class="wiz-nav">
    ${et > (wiz.mode === 'structure' ? 2 : 0) ? `<button class="btn ghost" data-act="wiz-prec">Retour</button>` : ''}
    <button class="btn pri" data-act="${dernier ? 'wiz-fin' : 'wiz-suiv'}">${dernier ? (wiz.mode === 'structure' ? 'Enregistrer' : 'Créer l’essai') : 'Continuer'}</button></div>` : ''}`;
}

function wizDepart() {
  const perso = Object.values(ETAT.modeles);
  const carte = (m, perso) => `<button class="card item" data-act="wiz-modele" data-id="${m.id}">
      <div class="row nowrap"><span class="t grow">${esc(m.nom)}</span>${m.theme ? `<span class="tag">${esc(m.theme)}</span>` : ''}</div>
      <span class="meta">${esc(m.resume || '')}${perso ? ' · mon modèle' : ''}</span></button>`;
  return `<button class="card item" data-act="wiz-vierge"><span class="t">Essai vierge</span><span class="meta">Tu définis tout toi-même, étape par étape.</span></button>
    ${perso.length ? `<div class="lbl" style="margin-top:8px">Mes modèles</div><div class="list">${perso.map(m => carte(m, true)).join('')}</div>` : ''}
    <div class="lbl" style="margin-top:8px">Modèles prêts à l’emploi</div><div class="list">${MODELES.map(m => carte(m)).join('')}</div>`;
}

function champ(lbl, path, o) {
  o = o || {}; const val = getPath(wiz.e, path) ?? '';
  const attrs = `id="w-${path.replace(/\./g, '-')}" data-w="${path}" ${o.ph ? `placeholder="${esc(o.ph)}"` : ''} ${o.list ? `list="${o.list}"` : ''}`;
  const input = o.area ? `<textarea ${attrs}>${esc(val)}</textarea>` : `<input ${attrs} type="${o.type || 'text'}" ${o.type === 'number' ? 'inputmode="decimal"' : ''} value="${esc(val)}">`;
  return `<label class="f">${lbl}${input}${o.aide ? `<span class="aide">${o.aide}</span>` : ''}</label>`;
}

function wizInfos(e) {
  const themes = [...new Set(Object.values(ETAT.essais).map(x => x.theme).concat(['Chauffe', 'Greffage', 'Pépinière', 'Vigne', 'Traitements', 'Cave']).filter(Boolean))];
  const dossiers = [...new Set(Object.values(ETAT.essais).map(x => x.dossier).filter(Boolean).concat([String(new Date().getFullYear())]))];
  return `${champ('Nom de l’essai', 'nom', { ph: 'ex. Couvertures de chauffe, chauffe 2' })}
    <div class="cols2 r">${champ('Dossier (année)', 'dossier', { list: 'dl-dossiers', ph: 'ex. 2026 ou Année 1' })}${champ('Thème', 'theme', { list: 'dl-themes', ph: 'ex. Chauffe' })}</div>
    <datalist id="dl-themes">${themes.map(t => `<option value="${esc(t)}">`).join('')}</datalist>
    <datalist id="dl-dossiers">${dossiers.map(t => `<option value="${esc(t)}">`).join('')}</datalist>
    ${champ('Objectif', 'objectif', { area: true, ph: 'Ce que tu veux savoir à la fin de l’essai' })}
    ${champ('Question posée', 'question', { ph: 'ex. La couverture change-t-elle la soudure ?' })}
    ${champ('Hypothèse', 'hypothese', { ph: 'Ce que tu penses observer, et pourquoi' })}
    <div class="cols2 r">${champ('Début', 'debut', { type: 'date' })}${champ('Fin prévue', 'fin', { type: 'date' })}</div>
    <div class="cols2 r">${champ('Lieu', 'lieu', { ph: 'ex. Chambre de chauffe 1' })}${champ('Responsable', 'responsable', { ph: 'Qui suit l’essai' })}</div>
    ${champ('Notes', 'notes', { area: true })}`;
}

function wizFacteurs(e) {
  return `<p class="aide">Un facteur, c’est ce que tu fais varier (ex. la couverture). Ses modalités sont les variantes testées. Désigne le <b>témoin</b> : ta pratique habituelle, celle à laquelle tout est comparé.</p>
  ${e.facteurs.map((f, fi) => `<div class="card stack">
    <div class="row nowrap"><label class="f grow">Facteur ${fi + 1}<input id="w-f${fi}" data-w="facteurs.${fi}.nom" value="${esc(f.nom)}" placeholder="ex. Couverture"></label>
      ${e.facteurs.length > 1 ? `<button class="x" data-act="wiz-del-fac" data-i="${fi}" aria-label="Supprimer ce facteur" style="margin-top:22px">×</button>` : ''}</div>
    <label class="row nowrap" style="font-size:15px"><input type="checkbox" data-w="facteurs.${fi}.quantitatif" ${f.quantitatif ? 'checked' : ''}> Facteur chiffré (doses, températures, durées)</label>
    ${f.quantitatif ? `<label class="f">Unité des doses<input data-w="facteurs.${fi}.unite" value="${esc(f.unite)}" placeholder="ex. L/ha, °C, jours"></label>` : ''}
    <div class="lbl">Modalités</div>
    <div class="stack s">${f.modalites.map((m, mi) => `<div class="mod-row ${f.quantitatif ? 'dose' : ''}">
      <input data-w="facteurs.${fi}.modalites.${mi}.nom" value="${esc(m.nom)}" aria-label="Nom de la modalité ${mi + 1}" placeholder="Modalité ${mi + 1}">
      ${f.quantitatif ? `<input type="number" inputmode="decimal" data-w="facteurs.${fi}.modalites.${mi}.dose" value="${esc(m.dose)}" placeholder="dose" aria-label="Dose">` : ''}
      <button class="temoin-btn" data-act="wiz-temoin" data-f="${fi}" data-m="${mi}" aria-pressed="${!!m.temoin}">${m.temoin ? 'Témoin' : 'Témoin ?'}</button>
      <button class="x" data-act="wiz-del-mod" data-f="${fi}" data-m="${mi}" aria-label="Supprimer la modalité">×</button></div>`).join('')}</div>
    <div><button class="btn sm ghost" data-act="wiz-add-mod" data-f="${fi}">+ Modalité</button></div>
  </div>`).join('')}
  ${e.facteurs.length < 3 ? `<button class="btn ghost" data-act="wiz-add-fac">+ Ajouter un 2ᵉ facteur (essai factoriel)</button>` : ''}`;
}

function wizDispositif(e) {
  const T = traitements(e).length, R = e.dispositif === 'bandes' ? 1 : (+e.repetitions || 1);
  const avert = [];
  if (e.dispositif === 'deux' && (e.facteurs.length > 1 || e.facteurs[0].modalites.length !== 2)) avert.push('Ce dispositif compare exactement 2 modalités d’un seul facteur. Choisis plutôt « Plusieurs modalités ».');
  if (e.dispositif === 'factoriel' && e.facteurs.length < 2) avert.push('Un essai factoriel demande au moins 2 facteurs (retourne à l’étape précédente pour en ajouter un).');
  if (e.facteurs.length > 1 && !['factoriel', 'blocs', 'crd'].includes(e.dispositif)) avert.push('Tu as plusieurs facteurs : le dispositif factoriel est le plus adapté.');
  if (e.dispositif !== 'bandes' && e.dispositif !== 'observation' && R < 3) avert.push('Moins de 3 répétitions : il sera difficile de conclure. Vise 3 à 4 répétitions minimum.');
  const lblR = e.dispositif === 'blocs' ? 'Nombre de blocs' : e.dispositif === 'observation' ? 'Nombre d’unités observées' : 'Répétitions par modalité';
  return `<div class="choice">${Object.entries(DISPOSITIFS).map(([k, d]) => `<label class="opt compact"><input type="radio" name="disp" data-w="dispositif" value="${k}" ${e.dispositif === k ? 'checked' : ''}><b>${d.nom}</b><span>${d.aide}</span></label>`).join('')}</div>
  <div class="card stack">
    <label class="f">Unité expérimentale<input id="w-uniteNom" data-w="uniteNom" value="${esc(e.uniteNom)}" placeholder="palox, rang, parcelle, plant, cuve…">
      <span class="aide">Ce qui reçoit une modalité de façon indépendante. Les plants d’un même palox ne sont pas des répétitions : ce sont des sous-échantillons.</span></label>
    <div class="chips">${['palox', 'lot', 'rang', 'parcelle', 'pot', 'plant', 'cuve'].map(u => `<button class="chip" data-act="wiz-unite" data-v="${u}" aria-pressed="${e.uniteNom === u}">${u}</button>`).join('')}</div>
    ${e.dispositif !== 'bandes' ? `<label class="f">${lblR}<input id="w-reps" type="number" inputmode="numeric" min="1" max="50" data-w="repetitions" value="${esc(e.repetitions)}"></label>` : ''}
    <p class="aide"><b>${e.dispositif === 'observation' ? R : T * R} ${esc(e.uniteNom || 'unités')}</b> au total${e.dispositif !== 'observation' ? ` (${T} modalité${T > 1 ? 's' : ''} × ${R})` : ''}.</p>
  </div>
  ${avert.map(a => `<div class="al warn"><span>${a}</span></div>`).join('')}`;
}

function wizVariables(e) {
  return `<p class="aide">Ce que tu mesures ou observes. Ajoute-en autant que tu veux : chacune aura son propre résultat.</p>
  ${e.variables.map((v, vi) => `<div class="card stack">
    <div class="row nowrap"><label class="f grow">Variable ${vi + 1}<input id="w-v${vi}" data-w="variables.${vi}.nom" value="${esc(v.nom)}" placeholder="ex. Soudure 360°"></label>
      <button class="x" data-act="wiz-del-var" data-i="${vi}" aria-label="Supprimer la variable" style="margin-top:22px">×</button></div>
    <label class="f">Type<select data-w="variables.${vi}.type" data-rerender="1">${Object.entries(TYPES).map(([k, t]) => `<option value="${k}" ${v.type === k ? 'selected' : ''}>${t.nom} (${t.ex})</option>`).join('')}</select></label>
    ${varChamps(v, 'variables.' + vi)}
  </div>`).join('')}
  <button class="btn ghost" data-act="wiz-add-var">+ Ajouter une variable</button>`;
}
function varChamps(v, p) {
  const t = v.type, out = [];
  const inp = (lbl, k, o) => `<label class="f">${lbl}<input data-w="${p}.${k}" value="${esc(v[k] ?? '')}" ${o && o.num ? 'type="number" inputmode="decimal"' : ''} placeholder="${esc((o && o.ph) || '')}"></label>`;
  if (['continue', 'comptage', 'delai'].includes(t)) {
    out.push(`<div class="cols2">${inp('Unité', 'unite', { ph: t === 'delai' ? 'jours' : 'ex. cm' })}${inp('Seuil utile', 'seuil', { num: 1, ph: 'ex. 3' })}</div>`);
    out.push(`<div class="cols2">${inp('Minimum attendu', 'min', { num: 1 })}${inp('Maximum attendu', 'max', { num: 1 })}</div>`);
  } else if (t === 'binaire' || t === 'proportion') {
    out.push(inp('Seuil utile (points de %)', 'seuil', { num: 1, ph: 'ex. 5' }));
  } else if (t === 'ordinale') {
    out.push(`<div class="cols2">${inp('Note maximale', 'echelle', { num: 1, ph: '5' })}${inp('Seuil utile (points)', 'seuil', { num: 1, ph: 'ex. 0,5' })}</div>`);
  } else if (t === 'categorie') {
    out.push(`<label class="f">Catégories (séparées par des virgules)<input data-w="${p}.categoriesTxt" value="${esc((v.categories || []).join(', '))}" placeholder="ex. Sain, Moisi, Sec, Cassé"></label>`);
  }
  if (!['categorie', 'texte'].includes(t)) out.push(`<label class="f">Le meilleur résultat, c’est…<select data-w="${p}.sens"><option value="plus" ${v.sens !== 'moins' ? 'selected' : ''}>Plus haut (reprise, croissance)</option><option value="moins" ${v.sens === 'moins' ? 'selected' : ''}>Plus bas (mortalité, maladie, casse)</option></select></label>`);
  if (['binaire', 'proportion', 'continue', 'comptage', 'ordinale', 'delai'].includes(t)) out.push(`<p class="aide">Le seuil utile est l’écart minimum qui vaut la peine de changer de pratique. L’app calcule la probabilité de le dépasser.</p>`);
  out.push(`<label class="f">Consigne de mesure<input data-w="${p}.notes" value="${esc(v.notes || '')}" placeholder="ex. 50 plants par palox à la sortie de chauffe"></label>`);
  return out.join('');
}

function wizPlan(e) {
  if (!e.unites.length || wiz.rebuild) { construireUnites(e); wiz.rebuild = false; }
  const blocs = e.dispositif === 'blocs';
  return `<p class="aide">Le tirage au sort répartit les modalités dans la chambre ou la parcelle pour éviter qu’un emplacement favorise une modalité.${blocs ? ' Chaque bloc correspond à une rangée.' : ''}</p>
  ${blocs ? '' : `<div class="cols2"><label class="f">Rangées<input type="number" inputmode="numeric" min="1" data-w="plan.lignes" data-plan="1" value="${esc(e.plan.lignes)}"></label><label class="f">Places par rangée<input type="number" inputmode="numeric" min="1" data-w="plan.colonnes" data-plan="1" value="${esc(e.plan.colonnes)}"></label></div>`}
  <button class="btn" data-act="wiz-tirer">${e.plan.tire ? 'Tirer au sort à nouveau' : 'Tirer au sort le plan'}</button>
  ${e.plan.tire ? planHTML(e) : `<p class="aide">Tu peux aussi tirer le plan plus tard, depuis l’onglet Plan.</p>`}`;
}

function planHTML(e) {
  const L = e.plan.lignes, C = e.plan.colonnes, grid = {};
  e.unites.forEach(u => { if (u.pos) grid[u.pos.l + ',' + u.pos.c] = u; });
  const T = traitements(e);
  let cells = '';
  for (let l = 0; l < L; l++) {
    cells += `<div class="plan-lab">${e.dispositif === 'blocs' ? 'B' + (l + 1) : 'R' + (l + 1)}</div>`;
    for (let c = 0; c < C; c++) { const u = grid[l + ',' + c];
      cells += u ? `<div class="cell" style="background:${couleur(trtIndex(e, u))}"><b>${esc(u.code)}</b><span>${esc(trtNom(e, u))}</span></div>` : `<div class="cell vide">—</div>`; }
  }
  return `<div class="plan-wrap"><div class="plan" style="grid-template-columns:auto repeat(${C}, minmax(74px, 1fr))">${cells}</div></div>
    <div class="legend">${T.map(t => `<span><i style="background:${couleur(t.i)}"></i>${esc(t.nom)}</span>`).join('')}</div>`;
}

function wizValider() {
  const e = wiz.e, et = wiz.etape;
  if (et === 1 && !e.nom.trim()) { toast('Donne un nom à l’essai'); focusEl('w-nom'); return false; }
  if (et === 2) {
    for (const f of e.facteurs) {
      if (!f.nom.trim()) { toast('Donne un nom à chaque facteur'); return false; }
      f.modalites = f.modalites.filter(m => m.nom.trim());
      if (f.modalites.length < 2) { toast(`« ${f.nom} » doit avoir au moins 2 modalités`); render(); return false; }
      if (!f.modalites.some(m => m.temoin)) f.modalites[0].temoin = true;
    }
    if (e.facteurs.length > 1 && ['deux', 'crd'].includes(e.dispositif)) e.dispositif = 'factoriel';
  }
  if (et === 3) {
    if (!e.uniteNom.trim()) { toast('Indique l’unité expérimentale'); return false; }
    const r = +e.repetitions; if (e.dispositif !== 'bandes' && !(r >= 1 && r <= 50)) { toast('Nombre de répétitions entre 1 et 50'); return false; }
    if (e.dispositif === 'deux' && (e.facteurs.length > 1 || e.facteurs[0].modalites.length !== 2)) e.dispositif = e.facteurs.length > 1 ? 'factoriel' : 'crd';
    e.repetitions = e.dispositif === 'bandes' ? 1 : r;
    wiz.rebuild = true;
  }
  if (et === 4) {
    e.variables = e.variables.filter(v => v.nom.trim());
    if (!e.variables.length) { toast('Ajoute au moins une variable'); render(); return false; }
    e.variables.forEach(v => { if (v.categoriesTxt != null) { v.categories = v.categoriesTxt.split(',').map(s => s.trim()).filter(Boolean); delete v.categoriesTxt; }
      if (v.type === 'categorie' && !v.categories.length) v.categories = ['A', 'B']; if (v.type === 'ordinale' && !(+v.echelle >= 1)) v.echelle = 5; });
  }
  return true;
}
function focusEl(id) { setTimeout(() => { const el = document.getElementById(id); if (el) el.focus(); }, 30); }

function wizTerminer() {
  const e = wiz.e;
  if (!e.unites.length) construireUnites(e);
  if (wiz.mode === 'structure') {
    const orig = ETAT.essais[wiz.e.id];
    Object.assign(orig, { facteurs: e.facteurs, dispositif: e.dispositif, uniteNom: e.uniteNom, repetitions: e.repetitions, variables: e.variables, unites: e.unites, plan: e.plan, mesures: {} });
    sauver(orig, 'Structure de l’essai modifiée'); wiz = null; go({ ecran: 'essai', id: orig.id, onglet: 'plan' }); toast('Structure enregistrée'); return;
  }
  e.statut = 'en-cours';
  sauver(e, 'Essai créé'); const id = e.id; wiz = null;
  go({ ecran: 'essai', id, onglet: 'saisie' }); toast('Essai créé');
}

function wizClic(act, b) {
  const e = wiz.e;
  switch (act) {
    case 'wiz-quitter': { const r = wiz.mode === 'structure' ? view.retour : null; wiz = null; r ? go({ ecran: 'essai', id: r, onglet: 'infos' }) : go({ ecran: 'accueil' }); return true; }
    case 'wiz-vierge': wiz.etape = 1; break;
    case 'wiz-modele': { const m = MODELES.find(x => x.id === b.dataset.id) || ETAT.modeles[b.dataset.id]; if (m) { wiz.e = depuisModele(m); if (m.perso) wiz.e.nom = ''; } wiz.etape = 1; break; }
    case 'wiz-suiv': if (!wizValider()) return true; wiz.etape++; break;
    case 'wiz-prec': wiz.etape = Math.max(0, wiz.etape - 1); break;
    case 'wiz-fin': if (!e.plan.tire && e.dispositif !== 'observation') { /* plan pas tiré : on accepte */ } wizTerminer(); return true;
    case 'wiz-temoin': { const f = e.facteurs[+b.dataset.f]; f.modalites.forEach((m, i) => m.temoin = i === +b.dataset.m); break; }
    case 'wiz-del-mod': { const f = e.facteurs[+b.dataset.f]; if (f.modalites.length <= 2) { toast('Garde au moins 2 modalités'); return true; } const wasT = f.modalites[+b.dataset.m].temoin; f.modalites.splice(+b.dataset.m, 1); if (wasT) f.modalites[0].temoin = true; break; }
    case 'wiz-add-mod': { const f = e.facteurs[+b.dataset.f]; f.modalites.push({ id: 'mo-' + uid(), nom: '', temoin: false, dose: '' }); render(); focusEl(''); const ins = app.querySelectorAll(`[data-w^="facteurs.${b.dataset.f}.modalites."][data-w$=".nom"]`); if (ins.length) ins[ins.length - 1].focus(); return true; }
    case 'wiz-add-fac': e.facteurs.push({ id: 'f-' + uid(), nom: '', quantitatif: false, unite: '', modalites: [{ id: 'mo-' + uid() + 'a', nom: '', temoin: true, dose: '' }, { id: 'mo-' + uid() + 'b', nom: '', temoin: false, dose: '' }] }); if (['deux', 'crd'].includes(e.dispositif)) e.dispositif = 'factoriel'; break;
    case 'wiz-del-fac': e.facteurs.splice(+b.dataset.i, 1); if (e.facteurs.length === 1 && e.dispositif === 'factoriel') e.dispositif = 'crd'; break;
    case 'wiz-unite': e.uniteNom = b.dataset.v; break;
    case 'wiz-add-var': e.variables.push({ id: 'v-' + uid(), nom: '', type: 'continue', unite: '', min: '', max: '', sens: 'plus', seuil: '', echelle: 5, categories: [], notes: '' }); render(); focusEl('w-v' + (e.variables.length - 1)); return true;
    case 'wiz-del-var': e.variables.splice(+b.dataset.i, 1); break;
    case 'wiz-tirer': construireUnites(e); tirerPlan(e); break;
    default: return false;
  }
  render(); if (['wiz-suiv', 'wiz-prec', 'wiz-vierge', 'wiz-modele'].includes(act)) window.scrollTo(0, 0);
  return true;
}
function wizInput(el, isChange) {
  const p = el.dataset.w; if (!p) return false;
  let v = el.type === 'checkbox' ? el.checked : el.value;
  setPath(wiz.e, p, v);
  if (el.dataset.plan) { wiz.e.plan.tire = null; }
  if (isChange && (el.type === 'checkbox' || el.type === 'radio' || el.dataset.rerender || p === 'repetitions' || el.dataset.plan)) {
    if (p === 'repetitions' || p === 'dispositif') wiz.rebuild = true;
    if (el.dataset.plan) { ajusterGrille(wiz.e); }
    render();
  }
  return true;
}

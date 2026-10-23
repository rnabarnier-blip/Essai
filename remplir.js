/* Essais — remplir un essai pas à pas : un palox, une question à la fois */
'use strict';

function consigne(v) {
  if (v.notes && v.notes.trim()) return v.notes.trim();
  const n = +v.cible > 0 ? +v.cible : null;
  switch (v.type) {
    case 'binaire': return `Regarde ${n ? n + ' plants' : 'les plants'} un par un. Pour chaque plant, touche Oui si « ${v.nom} » est présent, Non sinon.`;
    case 'ordinale': return `Donne une note de 0 à ${Math.round(+v.echelle || 5)} à chaque plant${n ? ' (' + n + ' plants)' : ''}. Une note par plant.`;
    case 'categorie': return `Pour chaque plant, touche la catégorie qui lui correspond${n ? ' (' + n + ' plants)' : ''}.`;
    case 'proportion': return 'Compte les plants réussis et le nombre total de plants, puis écris les deux chiffres.';
    case 'texte': return 'Écris ce que tu observes. C’est facultatif.';
    case 'comptage': return `Compte et écris un nombre par plant${n ? ' (' + n + ' plants)' : ''}, puis touche Ajouter.`;
    case 'delai': return 'Écris le nombre de jours pour chaque plant, puis touche Ajouter.';
    default: return `Mesure ${n ? n + ' plants' : 'chaque plant'} et écris la valeur${v.unite ? ' en ' + v.unite : ''}, puis touche Ajouter. Tu peux en écrire plusieurs séparées par un espace.`;
  }
}

function ongletRemplir(e) {
  const date = view.date || (view.date = today());
  if (!e.variables.length) return `<section class="card empty"><h2>Rien à remplir pour l’instant</h2><p class="aide">Ajoute d’abord ce que tu veux mesurer dans l’onglet Essai.</p></section>`;
  const vars = varsDuJour(e, date);
  const us = ordreUnites(e, ETAT.reglages.ordre || 'rangee');
  if (view.remplirU && us.some(u => u.id === view.remplirU)) return ecranPalox(e, date, vars, us);
  view.remplirU = null;
  return ecranListe(e, date, vars, us);
}

/* ---------- Écran 1 : la liste des palox ---------- */
function ecranListe(e, date, vars, us) {
  const UN = e.uniteNom || 'unité';
  const etat = u => uniteFaite(e, u, vars, date) ? 'fait' : vars.some(v => mesureRemplie(getM(e, u.id, v.id, date))) ? 'partiel' : 'vide';
  const faits = us.filter(u => etat(u) === 'fait').length;
  const prochain = us.find(u => etat(u) !== 'fait');
  const prevu = (e.calendrier || []).find(c => c.date === date);
  const j = (e.journees || {})[date] || {};
  const dates = [...new Set(Object.values(e.mesures || {}).filter(mesureRemplie).map(m => m.d).concat((e.calendrier || []).map(c => c.date)))].sort().reverse();
  const cell = u => { const s = etat(u), c = couleur(trtIndex(e, u));
    return `<button class="pal ${s}" data-act="r-ouvrir" data-id="${u.id}" style="${s === 'fait' ? `background:${c};color:var(--bg)` : s === 'partiel' ? `border-color:${c}` : ''}" aria-label="${esc(u.code)}, ${esc(trtNom(e, u))}, ${s === 'fait' ? 'rempli' : s === 'partiel' ? 'commencé' : 'à faire'}">
      <b>${esc(u.code)}${s === 'fait' ? ' ✓' : ''}</b><span>${esc(trtNom(e, u))}</span></button>`; };
  let grille;
  const avecPos = us.every(u => u.pos);
  if (avecPos) {
    const L = Math.max(...us.map(u => u.pos.l)) + 1, C = Math.max(...us.map(u => u.pos.c)) + 1, g = {};
    us.forEach(u => g[u.pos.l + ',' + u.pos.c] = u);
    let h = ''; for (let l = 0; l < L; l++) { h += `<div class="plan-lab">${e.dispositif === 'blocs' ? 'B' : 'R'}${l + 1}</div>`; for (let c = 0; c < C; c++) h += g[l + ',' + c] ? cell(g[l + ',' + c]) : '<span></span>'; }
    grille = `<div class="plan-wrap"><div class="plan" style="grid-template-columns:auto repeat(${C}, minmax(78px, 1fr))">${h}</div></div>`;
  } else grille = `<div class="pal-list">${us.map(cell).join('')}</div>`;

  return `<section class="stack">
    ${ETAT.reglages.aideRemplir ? '' : `<div class="card stack s aide-card"><h2>Comment remplir ton essai</h2>
      <ol class="etapes"><li>Touche <b>Commencer</b> (ou un ${esc(UN)} dans le plan).</li><li>L’app te dit quel ${esc(UN)} observer et te pose <b>une question à la fois</b>, avec la consigne.</li><li>Réponds avec les gros boutons. Quand c’est fini, elle passe <b>toute seule</b> au suivant.</li></ol>
      <p class="aide">Tout est enregistré au fur et à mesure. Tu peux t’arrêter et reprendre quand tu veux.</p>
      <div><button class="btn sm" data-act="aide-ok">J’ai compris</button></div></div>`}
    <div class="card stack s">
      <div class="row nowrap"><div class="grow"><div class="lbl">Mesures du</div><div style="font-size:19px;font-weight:700">${fdate(date)} <span class="mono muted" style="font-size:14px;font-weight:500">${jPlus(e, date)}</span></div></div>
        <button class="btn sm ghost" data-act="r-options">${view.rOptions ? 'Fermer' : 'Changer'}</button></div>
      ${prevu && prevu.note ? `<p class="aide">${esc(prevu.note)}</p>` : ''}
      <p class="aide">À noter : <b style="color:var(--ink)">${esc(vars.map(v => v.nom).join(', '))}</b></p>
      ${view.rOptions ? `<div class="stack s" style="margin-top:6px">
        <label class="f">Date<input type="date" data-sel="date" value="${esc(date)}"></label>
        ${dates.length ? `<div class="scroll-x">${dates.slice(0, 10).map(d => `<button class="chip" data-act="saisie-date" data-v="${d}" aria-pressed="${d === date}">${fdate(d)}</button>`).join('')}</div>` : ''}
        <label class="f">Ordre de passage<select data-sel="ordre">${[['rangee', 'Rangée par rangée'], ['serpentin', 'En aller-retour'], ['code', 'Par numéro']].map(([k, l]) => `<option value="${k}" ${(ETAT.reglages.ordre || 'rangee') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      </div>` : ''}
    </div>
    <div class="row"><div class="progress grow"><i style="width:${us.length ? faits / us.length * 100 : 0}%"></i></div><span class="mono muted" style="font-size:14px">${faits}/${us.length} ${esc(UN)}</span></div>
    ${prochain ? `<button class="btn pri block big-btn" data-act="r-ouvrir" data-id="${prochain.id}">${faits === 0 && !us.some(u => etat(u) === 'partiel') ? 'Commencer' : 'Continuer'} : ${esc(prochain.code)} <span style="font-weight:500">· ${esc(trtNom(e, prochain))}</span></button>`
      : `<div class="verdict v-bon"><div class="big">Tout est rempli pour le ${fdate(date)}</div><div><button class="btn sm" data-act="onglet" data-v="resultats">Voir les résultats</button></div></div>`}
    <div class="card stack s"><div class="lbl">Plan · touche un ${esc(UN)} pour le remplir</div>${grille}
      <div class="legend"><span><i style="background:var(--accent)"></i>rempli ✓</span><span><i style="border:2px solid var(--accent);background:transparent"></i>commencé</span><span><i style="background:var(--sunk)"></i>à faire</span></div></div>
    <details class="card" id="jour" ${view.jourOuvert ? 'open' : ''}><summary>Noter la météo ou une remarque du jour</summary>
      <div class="stack" style="margin-top:12px">
        <div class="chips">${['Soleil', 'Nuageux', 'Pluie', 'Vent', 'Gel'].map(m => `<button class="chip" data-act="meteo" data-v="${m}" aria-pressed="${j.meteo === m}">${m}</button>`).join('')}</div>
        <div class="cols2"><label class="f">Température (°C)<input type="number" inputmode="decimal" data-jour="temp" value="${esc(j.temp ?? '')}"></label><label class="f">Humidité (%)<input type="number" inputmode="decimal" data-jour="hum" value="${esc(j.hum ?? '')}"></label></div>
        <label class="f">Remarque<input data-jour="remarques" value="${esc(j.remarques || '')}" placeholder="ex. porte restée ouverte"></label>
      </div></details>
  </section>`;
}

/* ---------- Écran 2 : un palox, une question ---------- */
function ecranPalox(e, date, vars, us) {
  const UN = e.uniteNom || 'unité';
  const i = us.findIndex(u => u.id === view.remplirU), u = us[i];
  let k = view.remplirV;
  if (k == null || k >= vars.length) { k = vars.findIndex(v => !varFaite(v, getM(e, u.id, v.id, date))); if (k < 0) k = 0; }
  view.remplirV = k;
  const v = vars[k], m = getM(e, u.id, v.id, date) || {};
  const c = couleur(trtIndex(e, u));
  const cible = +v.cible > 0 && !['texte', 'proportion'].includes(v.type) ? +v.cible : 0;
  const n = compteMesure(v, m);
  const suite = prochaineEtape(e, us, vars, i, k, date);
  const d = `data-u="${u.id}" data-v="${v.id}"`;
  let rep;
  if (v.type === 'binaire') rep = `<div class="tap-row"><button class="tap oui" data-act="tap" data-x="1" ${d}>Oui<small>${+m.ok || 0}</small></button><button class="tap non" data-act="tap" data-x="0" ${d}>Non<small>${(+m.n || 0) - (+m.ok || 0)}</small></button></div>
      <details><summary class="muted" style="cursor:pointer;font-size:15px">Je connais déjà le total</summary>
      <div class="direct" style="margin-top:8px"><span class="muted">Oui</span><input type="number" inputmode="numeric" min="0" data-m="ok" ${d} value="${esc(m.ok ?? '')}" aria-label="Nombre de oui"><span class="muted">sur</span><input type="number" inputmode="numeric" min="0" data-m="n" ${d} value="${esc(m.n ?? '')}" aria-label="Nombre de plants observés"></div></details>`;
  else rep = widget(e, u, v, m).replace(/<div><button class="btn sm ghost" data-act="annuler"[^]*?<\/div>/, '');
  const annulable = (v.type === 'binaire' || v.type === 'categorie') ? (m.tap || []).length : ['ordinale'].includes(v.type) ? (m.vals || []).length : 0;
  return `<section class="stack question">
    <div class="row nowrap"><button class="btn sm ghost" data-act="r-liste">‹ Tous les ${esc(UN)}</button><span class="grow"></span><span class="mono muted" style="font-size:14px">${i + 1} sur ${us.length}</span></div>
    <div class="card terrain-head" style="border-color:${c}">
      <div class="row nowrap"><span class="code big" style="background:${c}">${esc(u.code)}</span>
        <div class="grow" style="min-width:0"><div style="font-weight:700;font-size:19px">${esc(trtNom(e, u))}</div>
        <div class="muted" style="font-size:14px">${[u.pos ? 'Rangée ' + (u.pos.l + 1) + ', place ' + (u.pos.c + 1) : '', u.bloc ? 'bloc ' + u.bloc : ''].filter(Boolean).join(' · ') || 'Va à ce ' + esc(UN)}</div></div></div></div>
    ${vars.length > 1 ? `<div class="scroll-x">${vars.map((x, j) => `<button class="chip" data-act="r-var" data-v="${j}" aria-pressed="${j === k}">${varFaite(x, getM(e, u.id, x.id, date)) ? '✓ ' : ''}${j + 1}. ${esc(x.nom)}</button>`).join('')}</div>` : ''}
    <div class="card stack" id="c-${u.id}-${v.id}">
      <div>${vars.length > 1 ? `<div class="lbl">Question ${k + 1} sur ${vars.length}</div>` : ''}<h2 style="font-size:24px">${esc(v.nom)}${v.unite && v.type !== 'binaire' ? ` <span class="muted" style="font-weight:500">(${esc(v.unite)})</span>` : ''}</h2></div>
      <p class="consigne">${esc(consigne(v))}</p>
      ${m.exclu ? `<div class="al warn"><span>Ce ${esc(UN)} est exclu pour cette question${m.raison ? ' : ' + esc(m.raison) : ''}.</span></div>` : rep}
      ${cible ? `<div class="stack s"><div class="row"><div class="progress grow big"><i style="width:${Math.min(100, n / cible * 100)}%"></i></div><span class="mono" style="font-size:17px;font-weight:700">${n} / ${cible}</span></div>
        <p class="aide">${n >= cible ? 'C’est bon, on passe à la suite.' : 'plants observés sur ' + cible}</p></div>` : ''}
      <div class="sum" id="s-${u.id}-${v.id}">${resumeMesure(cible ? Object.assign({}, v, { cible: '' }) : v, m)}</div>
      ${annulable ? `<div><button class="btn sm ghost" data-act="annuler" ${d}>Annuler le dernier</button></div>` : ''}
    </div>
    ${suite ? `<button class="btn pri block big-btn" data-act="r-suivant">${esc(suite.label)}</button>` : `<button class="btn pri block big-btn" data-act="r-liste">Terminé : retour au plan</button>`}
    <details class="card" ${m.exclu || (m.photos || []).length ? 'open' : ''}><summary>Photo ou problème sur ce ${esc(UN)}</summary>
      <div class="stack s" style="margin-top:10px">
        ${thumbs(m.photos)}
        <div class="row"><span class="btn sm ghost file-btn">Prendre une photo<input type="file" accept="image/*" capture="environment" data-photo-u="${u.id}" data-photo-v="${v.id}" aria-label="Prendre une photo"></span>
          <button class="btn sm ghost" data-act="exclure" ${d}>${m.exclu ? 'Ne plus exclure' : 'Exclure (palox abîmé…)'}</button></div>
        ${m.exclu ? `<label class="f">Pourquoi ?<input data-m="raison" ${d} value="${esc(m.raison || '')}" placeholder="ex. palox renversé"></label>` : ''}
        <p class="aide">Une donnée exclue reste visible mais n’entre pas dans les calculs.</p>
      </div></details>
  </section>`;
}

/* Étape suivante : question suivante du même palox, sinon prochain palox pas fini */
function prochaineEtape(e, us, vars, i, k, date) {
  const u = us[i];
  for (let j = k + 1; j < vars.length; j++) if (!varFaite(vars[j], getM(e, u.id, vars[j].id, date))) return { u: u.id, v: j, label: `Question suivante : ${vars[j].nom}` };
  for (let j = 0; j < k; j++) if (!varFaite(vars[j], getM(e, u.id, vars[j].id, date))) return { u: u.id, v: j, label: `Question suivante : ${vars[j].nom}` };
  for (let a = 1; a < us.length; a++) { const x = us[(i + a) % us.length]; if (!uniteFaite(e, x, vars, date)) return { u: x.id, v: null, label: `${e.uniteNom ? e.uniteNom[0].toUpperCase() + e.uniteNom.slice(1) : 'Unité'} suivant : ${x.code}` }; }
  return null;
}
function avancer(e) {
  const date = view.date, vars = varsDuJour(e, date), us = ordreUnites(e, ETAT.reglages.ordre || 'rangee');
  const i = us.findIndex(u => u.id === view.remplirU); if (i < 0) { view.remplirU = null; render(); return; }
  const s = prochaineEtape(e, us, vars, i, view.remplirV || 0, date);
  if (!s) { view.remplirU = null; render(); toast('Tout est rempli pour cette date', 3000); window.scrollTo(0, 0); return; }
  if (s.u !== view.remplirU) toast(`${us[i].code} terminé → ${us.find(x => x.id === s.u).code}`, 1600);
  view.remplirU = s.u; view.remplirV = s.v; view.focusSaisie = true; render(); window.scrollTo(0, 0);
}
/* Après chaque réponse : passe tout seul si le nombre de plants prévu est atteint */
function apresSaisie(e, uId) {
  if (view.onglet !== 'saisie' || !view.remplirU || view.remplirU !== uId || ETAT.reglages.autoAvance === false) return;
  const vars = varsDuJour(e, view.date), v = vars[view.remplirV || 0]; if (!v) return;
  if (!(+v.cible > 0) || !varFaite(v, getM(e, uId, v.id, view.date))) return;
  if (navigator.vibrate) navigator.vibrate([30, 60, 30]);
  clearTimeout(view.tAvance); view.tAvance = setTimeout(() => { if (cur() === e && view.remplirU === uId) avancer(e); }, 500);
}

/* ---------- Onglet Essai : infos, plan, calendrier ---------- */
function ongletEssaiInfos(e) {
  const sec = view.section || 'infos';
  const corps = sec === 'plan' ? ongletPlan(e) : sec === 'suivi' ? ongletSuivi(e) : ongletInfos(e);
  return `<div class="chips" style="margin-top:14px">${[['infos', 'Infos et questions'], ['plan', 'Plan'], ['suivi', 'Calendrier et interventions']].map(([k, l]) => `<button class="chip" data-act="section" data-v="${k}" aria-pressed="${sec === k}">${l}</button>`).join('')}</div>${corps}`;
}

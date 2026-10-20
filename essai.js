/* Essais — fiche d'un essai : saisie, résultats, plan, carnet, infos */
'use strict';
const ONGLETS = [['saisie', 'Saisie'], ['resultats', 'Résultats'], ['plan', 'Plan'], ['carnet', 'Carnet'], ['infos', 'Infos']];

function renderEssai() {
  const e = ETAT.essais[view.id]; if (!e) { go({ ecran: 'accueil' }); return; }
  let corps = '';
  if (view.onglet === 'saisie') corps = ongletSaisie(e);
  else if (view.onglet === 'resultats') corps = ongletResultats(e);
  else if (view.onglet === 'plan') corps = ongletPlan(e);
  else if (view.onglet === 'carnet') corps = ongletCarnet(e);
  else corps = ongletInfos(e);
  app.innerHTML = `
  <header class="top"><button class="icon-btn" data-act="accueil" aria-label="Retour aux essais">‹</button>
    <div class="titre"><div class="eyebrow">${esc([e.dossier, e.theme, STATUTS[e.statut]].filter(Boolean).join(' · '))}</div><h1>${esc(e.nom || 'Sans nom')}</h1></div></header>
  <div class="tabs" role="tablist">${ONGLETS.map(([k, l]) => `<button role="tab" data-act="onglet" data-v="${k}" aria-selected="${view.onglet === k}">${l}</button>`).join('')}</div>
  <div id="pane">${corps}</div>`;
  hydraterPhotos(app);
}

/* ================= SAISIE ================= */
function ongletSaisie(e) {
  const date = view.date || (view.date = today());
  const vars = e.variables;
  if (!vars.length) return `<section class="card empty"><h2>Aucune variable</h2><p class="aide">Ajoute une variable dans l’onglet Infos.</p></section>`;
  const mode = view.saisieMode || 'variable';
  const j = (e.journees || {})[date] || {};
  const dates = [...new Set(Object.values(e.mesures || {}).filter(mesureRemplie).map(m => m.d))].sort().reverse();
  let liste = '';
  if (mode === 'variable') {
    const v = vars.find(x => x.id === view.saisieVar) || vars[0]; view.saisieVar = v.id;
    const faits = e.unites.filter(u => mesureRemplie(getM(e, u.id, v.id, date))).length;
    liste = `<div class="scroll-x" style="margin-top:4px">${vars.map(x => `<button class="chip" data-act="saisie-var" data-v="${x.id}" aria-pressed="${x.id === v.id}">${esc(x.nom)}</button>`).join('')}</div>
      ${v.notes ? `<p class="aide">${esc(v.notes)}</p>` : ''}
      <div class="row"><div class="progress grow"><i style="width:${e.unites.length ? faits / e.unites.length * 100 : 0}%"></i></div><span class="mono muted" style="font-size:14px">${faits}/${e.unites.length}</span></div>
      <div class="stack">${e.unites.map(u => carteSaisie(e, u, v, date, 'variable')).join('')}</div>`;
  } else {
    const idx = Math.min(Math.max(0, view.saisieU || 0), e.unites.length - 1); view.saisieU = idx; const u = e.unites[idx];
    liste = `<div class="unit-nav">
        <button class="icon-btn" data-act="u-prec" aria-label="Unité précédente" ${idx === 0 ? 'disabled' : ''}>‹</button>
        <select id="sel-unite" data-sel="unite" aria-label="Choisir l’unité">${e.unites.map((x, i) => `<option value="${i}" ${i === idx ? 'selected' : ''}>${esc(x.code)} · ${esc(trtNom(e, x))}${e.unites.length && vars.every(v => mesureRemplie(getM(e, x.id, v.id, date))) ? ' ✓' : ''}</option>`).join('')}</select>
        <button class="icon-btn" data-act="u-suiv" aria-label="Unité suivante" ${idx >= e.unites.length - 1 ? 'disabled' : ''}>›</button></div>
      <div class="stack">${vars.map(v => carteSaisie(e, u, v, date, 'unite')).join('')}</div>
      ${idx < e.unites.length - 1 ? `<button class="btn pri block" data-act="u-suiv">Suivant : ${esc(e.unites[idx + 1].code)}</button>` : ''}`;
  }
  return `<section class="stack">
    <div class="row nowrap"><label class="f grow">Date de mesure<input type="date" id="saisie-date" data-sel="date" value="${esc(date)}"></label></div>
    ${dates.length ? `<div class="scroll-x">${dates.slice(0, 8).map(d => `<button class="chip" data-act="saisie-date" data-v="${d}" aria-pressed="${d === date}">${fdate(d)}</button>`).join('')}</div>` : ''}
    <details class="card" ${view.jourOuvert ? 'open' : ''} id="jour"><summary>Conditions du jour${j.meteo || j.temp ? ` <span class="muted" style="font-weight:500;margin-left:6px">· ${esc([j.meteo, j.temp !== '' && j.temp != null ? j.temp + ' °C' : ''].filter(Boolean).join(', '))}</span>` : ''}</summary>
      <div class="stack" style="margin-top:12px">
        <div class="chips">${['Soleil', 'Nuageux', 'Pluie', 'Vent', 'Gel'].map(m => `<button class="chip" data-act="meteo" data-v="${m}" aria-pressed="${j.meteo === m}">${m}</button>`).join('')}</div>
        <div class="cols2"><label class="f">Température (°C)<input type="number" inputmode="decimal" data-jour="temp" value="${esc(j.temp ?? '')}"></label><label class="f">Humidité (%)<input type="number" inputmode="decimal" data-jour="hum" value="${esc(j.hum ?? '')}"></label></div>
        <label class="f">Remarques<input data-jour="remarques" value="${esc(j.remarques || '')}" placeholder="ex. porte restée ouverte"></label>
      </div></details>
    <div class="tabs" style="margin-top:0"><button data-act="saisie-mode" data-v="variable" aria-selected="${mode === 'variable'}">Par variable</button><button data-act="saisie-mode" data-v="unite" aria-selected="${mode === 'unite'}">Par ${esc(e.uniteNom || 'unité')}</button></div>
    ${liste}
  </section>`;
}

function carteSaisie(e, u, v, date, mode) {
  const m = getM(e, u.id, v.id, date) || {};
  const rempli = mesureRemplie(m);
  const titre = mode === 'variable'
    ? `<span class="code" style="background:${couleur(trtIndex(e, u))}">${esc(u.code)}</span><span class="grow" style="font-weight:600;min-width:0">${esc(trtNom(e, u))}${u.bloc ? ` <span class="muted">· bloc ${u.bloc}</span>` : ''}</span>`
    : `<span class="grow" style="font-weight:700">${esc(v.nom)}${v.unite ? ` <span class="muted">(${esc(v.unite)})</span>` : ''}</span>`;
  return `<div class="card unit-card ${m.exclu ? 'exclu' : ''}" id="c-${u.id}-${v.id}">
    <div class="unit-head"><span class="done-dot ${rempli ? 'on' : ''}"></span>${titre}</div>
    ${widget(e, u, v, m)}
    <div class="sum" id="s-${u.id}-${v.id}">${resumeMesure(v, m)}</div>
    ${thumbs(m.photos)}
    <div class="row">
      <span class="btn sm ghost file-btn">Photo<input type="file" accept="image/*" capture="environment" data-photo-u="${u.id}" data-photo-v="${v.id}" aria-label="Ajouter une photo"></span>
      <button class="btn sm ghost" data-act="exclure" data-u="${u.id}" data-v="${v.id}">${m.exclu ? 'Réintégrer' : 'Exclure'}</button>
    </div>
    ${m.exclu ? `<label class="f">Raison de l’exclusion<input data-m="raison" data-u="${u.id}" data-v="${v.id}" value="${esc(m.raison || '')}" placeholder="ex. palox renversé"></label>` : ''}
  </div>`;
}

function widget(e, u, v, m) {
  const d = `data-u="${u.id}" data-v="${v.id}"`;
  switch (v.type) {
    case 'binaire': return `<div class="tap-row"><button class="tap oui" data-act="tap" data-x="1" ${d}>Oui<small>${+m.ok || 0}</small></button><button class="tap non" data-act="tap" data-x="0" ${d}>Non<small>${(+m.n || 0) - (+m.ok || 0)}</small></button></div>
      <div><button class="btn sm ghost" data-act="annuler" ${d} ${(m.tap || []).length ? '' : 'disabled'}>Annuler le dernier</button></div>
      <div class="direct"><span class="muted">ou saisir</span><input type="number" inputmode="numeric" min="0" data-m="ok" ${d} value="${esc(m.ok ?? '')}" placeholder="oui" aria-label="Nombre de oui"><span class="muted">sur</span><input type="number" inputmode="numeric" min="0" data-m="n" ${d} value="${esc(m.n ?? '')}" placeholder="total" aria-label="Total observé"></div>`;
    case 'proportion': return `<div class="row nowrap"><input type="number" inputmode="numeric" min="0" data-m="ok" ${d} value="${esc(m.ok ?? '')}" placeholder="réussis" aria-label="Réussis"><span class="muted">sur</span><input type="number" inputmode="numeric" min="0" data-m="n" ${d} value="${esc(m.n ?? '')}" placeholder="total" aria-label="Total"></div>
      <label class="f" style="font-weight:500">ou pourcentage direct<input type="number" inputmode="decimal" data-m="pct" ${d} value="${esc(m.pct ?? '')}" placeholder="%"></label>`;
    case 'ordinale': {
      const max = Math.max(1, Math.round(+v.echelle || 5)); const cnt = {}; (m.vals || []).forEach(x => cnt[x] = (cnt[x] || 0) + 1);
      return `<div class="score-row">${Array.from({ length: max + 1 }, (_, k) => `<button class="score" data-act="score" data-x="${k}" ${d}>${k}<small>${cnt[k] || 0}</small></button>`).join('')}</div>
        <div><button class="btn sm ghost" data-act="annuler" ${d} ${(m.vals || []).length ? '' : 'disabled'}>Annuler la dernière note</button></div>`;
    }
    case 'categorie': {
      const cats = v.categories && v.categories.length ? v.categories : ['A', 'B'];
      return `<div class="score-row" style="grid-template-columns:repeat(auto-fit,minmax(110px,1fr))">${cats.map(c => `<button class="score" style="font-size:16px" data-act="cat" data-x="${esc(c)}" ${d}>${esc(c)}<small>${(m.cats || {})[c] || 0}</small></button>`).join('')}</div>
        <div><button class="btn sm ghost" data-act="annuler" ${d} ${(m.tap || []).length ? '' : 'disabled'}>Annuler le dernier</button></div>`;
    }
    case 'texte': return `<textarea data-m="txt" ${d} placeholder="Observation">${esc(m.txt || '')}</textarea>`;
    default: {
      const mn = v.min === '' ? -Infinity : +v.min, mx = v.max === '' ? Infinity : +v.max;
      return `<div class="row nowrap"><input id="in-${u.id}-${v.id}" inputmode="decimal" enterkeyhint="done" data-addval="1" ${d} placeholder="${v.unite ? esc(v.unite) + ' · ' : ''}une ou plusieurs valeurs"><button class="btn pri" data-act="add-val" ${d}>Ajouter</button></div>
        ${(m.vals || []).length ? `<div class="vals">${m.vals.map((x, i) => `<button class="val ${x < mn || x > mx ? 'hors' : ''} ${view.arme === u.id + v.id + i ? 'armed' : ''}" data-act="val" data-i="${i}" ${d}>${view.arme === u.id + v.id + i ? 'Retirer ?' : x.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}</button>`).join('')}</div>` : ''}`;
    }
  }
}
function resumeMesure(v, m) {
  if (!m || !mesureRemplie(m)) return `<span>Pas encore de donnée</span>`;
  if (v.type === 'binaire' || v.type === 'proportion') {
    if (m.n !== '' && +m.n > 0) return `<span>Total <b>${+m.ok || 0} / ${+m.n}</b></span><span>Taux <b>${fr((+m.ok || 0) / +m.n * 100, 1)} %</b></span>${+m.ok > +m.n ? '<span style="color:var(--mauvais)">Réussis &gt; total</span>' : ''}`;
    if (m.pct !== '') return `<span>Taux <b>${fr(+m.pct, 1)} %</b></span>`;
    return '';
  }
  if (v.type === 'categorie') { const t = Object.values(m.cats || {}).reduce((s, x) => s + x, 0); return `<span>Total <b>${t}</b></span>` + Object.entries(m.cats || {}).filter(([, n]) => n).map(([k, n]) => `<span>${esc(k)} <b>${fr(n / t * 100, 0)} %</b></span>`).join(''); }
  if (v.type === 'texte') return `<span>Texte noté</span>`;
  const vals = m.vals || []; if (!vals.length) return `<span>Photo seulement</span>`;
  const d = Stats.desc(vals);
  return `<span>n <b>${d.n}</b></span><span>Moyenne <b>${fr(d.mean, 2)}${v.unite ? ' ' + esc(v.unite) : ''}</b></span>${d.n > 1 ? `<span>Écart-type <b>${fr(d.sd, 2)}</b></span>` : ''}`;
}
function rafraichirCarte(e, uId, vId) {
  const u = e.unites.find(x => x.id === uId), v = e.variables.find(x => x.id === vId), el = document.getElementById(`c-${uId}-${vId}`);
  if (!u || !v || !el) { render(); return; }
  const t = document.createElement('div'); t.innerHTML = carteSaisie(e, u, v, view.date, view.saisieMode || 'variable'); el.replaceWith(t.firstElementChild);
  hydraterPhotos(document.getElementById(`c-${uId}-${vId}`));
  const prog = app.querySelector('.progress');
  if (prog && (view.saisieMode || 'variable') === 'variable') { const faits = e.unites.filter(x => mesureRemplie(getM(e, x.id, vId, view.date))).length; prog.firstElementChild.style.width = (faits / e.unites.length * 100) + '%'; prog.nextElementSibling.textContent = faits + '/' + e.unites.length; }
}
function ajouterValeurs(e, uId, vId) {
  const el = document.getElementById(`in-${uId}-${vId}`); if (!el) return;
  const raw = el.value.trim(); if (!raw) return;
  const parts = raw.replace(/(\d),(\d)/g, '$1.$2').split(/[\s;]+/).filter(Boolean).map(Number);
  if (parts.some(x => !isFinite(x))) { toast('Valeur non reconnue : utilise des chiffres'); return; }
  const v = e.variables.find(x => x.id === vId);
  const mn = v.min === '' ? -Infinity : +v.min, mx = v.max === '' ? Infinity : +v.max;
  const hors = parts.filter(x => x < mn || x > mx);
  const m = ensureM(e, uId, vId, view.date); m.vals.push(...parts);
  sauver(e); rafraichirCarte(e, uId, vId);
  if (hors.length) toast(`Valeur hors bornes (${v.min === '' ? '…' : v.min} à ${v.max === '' ? '…' : v.max}) : vérifie la saisie`, 3500);
  const n = document.getElementById(`in-${uId}-${vId}`); if (n) n.focus();
}

/* ================= RÉSULTATS ================= */
function ongletResultats(e) {
  const vars = e.variables;
  if (!vars.length) return `<section class="card empty"><h2>Aucune variable</h2></section>`;
  const v = vars.find(x => x.id === view.resVar) || vars.find(x => Analyse.analysable(x.type)) || vars[0]; view.resVar = v.id;
  const r = Analyse.analyser(e, v.id, { date: view.resDate, facteurId: view.resFac });
  const isP = v.type === 'binaire' || v.type === 'proportion';
  const uw = isP ? 'pts' : (v.unite || '');
  let html = `<div class="scroll-x" style="margin-top:4px">${vars.map(x => `<button class="chip" data-act="res-var" data-v="${x.id}" aria-pressed="${x.id === v.id}">${esc(x.nom)}</button>`).join('')}</div>`;
  if ((r.dates || []).length > 1) html += `<label class="f">Date analysée<select data-sel="resdate">${r.dates.map(d => `<option value="${d}" ${d === r.date ? 'selected' : ''}>${fdate(d)}</option>`).join('')}</select></label>`;
  if (e.facteurs.length > 1) html += `<div class="chips">${e.facteurs.map(f => `<button class="chip" data-act="res-fac" data-v="${f.id}" aria-pressed="${r.facteur && r.facteur.id === f.id}">${esc(f.nom)}</button>`).join('')}</div>`;

  if (v.type === 'categorie') return `<section class="stack">${html}${tableCategories(e, v, r.date || Analyse.datesVariable(e, v.id).slice(-1)[0])}</section>`;
  if (r.raison) return `<section class="stack">${html}<div class="verdict v-neutre"><div class="big">Pas encore de résultat</div><p>${esc(r.raison)}</p></div>${alertesHTML(r.alertes)}</section>`;

  const cs = r.comps.filter(c => c.p != null);
  if (cs.length) {
    const best = cs.slice().sort((a, b) => (b.gain > 0) - (a.gain > 0) || a.p - b.p)[0];
    html += `<div class="verdict ${best.verdict.cls}"><div class="lbl" style="color:inherit">${best.verdict.txt}${cs.length > 1 ? ' · meilleur écart' : ''}</div><div class="big">${esc(best.nom)} contre ${esc(r.groupes[r.ref].nom)}</div><p>${esc(best.phrase)}</p></div>`;
  }
  html += alertesHTML(r.alertes);
  html += graphique(r, v, isP);
  if (r.global) html += `<div class="card"><div class="row nowrap"><span class="grow"><b>Toutes les modalités ensemble</b><br><span class="muted" style="font-size:14px">${r.global.test}${r.global.taille != null ? ` · ${r.global.tailleNom} = ${fr(r.global.taille, 2)}` : ''}</span></span><span class="pill ${r.global.p < 0.05 ? 'v-bon' : r.global.p < 0.2 ? 'v-incertain' : 'v-neutre'}">p = ${fp(r.global.p)}</span></div>
    <p class="aide" style="margin-top:8px">${r.global.p < 0.05 ? 'Au moins une modalité se distingue vraiment des autres.' : r.global.p < 0.2 ? 'Il y a peut-être des différences entre modalités, à confirmer.' : 'Rien ne montre que les modalités diffèrent entre elles.'}${r.global.pBloc != null ? ` Effet des blocs : p = ${fp(r.global.pBloc)}${r.global.pBloc < 0.05 ? ' (l’emplacement compte, le dispositif en blocs était utile).' : '.'}` : ''}</p></div>`;
  r.comps.forEach(c => {
    if (c.p == null) { html += `<div class="card"><div class="row"><h3 class="grow">${esc(c.nom)}</h3><span class="pill v-neutre">Pas assez de données</span></div></div>`; return; }
    const col = { 'v-bon': 'var(--bon)', 'v-mauvais': 'var(--mauvais)', 'v-incertain': 'var(--incertain)', 'v-equiv': 'var(--equiv)' }[c.verdict.cls] || 'var(--neutre)';
    html += `<div class="card comp">
      <div class="row"><h3 class="grow">${esc(c.nom)} <span class="muted" style="font-weight:500">contre ${esc(r.groupes[r.ref].nom)}</span></h3><span class="pill ${c.verdict.cls}">${c.verdict.txt}</span></div>
      <div class="prob" style="color:${col}"><span class="p">${c.pMieux > 0.995 ? '&gt; 99' : c.pMieux < 0.005 ? '&lt; 1' : fr(c.pMieux * 100, 0)} %</span><span class="muted">de chances de faire mieux que le témoin</span></div>
      <div class="meter" style="color:${col}"><i style="width:${(c.pMieux * 100).toFixed(1)}%"></i></div>
      ${c.pSeuil != null ? `<p class="aide"><b style="color:var(--ink)">${Analyse.pc(c.pSeuil)} %</b> de chances que l’avantage dépasse ton seuil de ${fr(+v.seuil, 1)} ${esc(uw)}.</p>` : ''}
      <p>${esc(c.phrase)}</p>
      <div class="kv">
        <div><div class="k">Écart</div><div class="v">${sg(c.diff, isP ? 1 : 2)} ${esc(uw)}</div></div>
        <div><div class="k">Variation</div><div class="v">${c.pct != null ? sg(c.pct, 0) + ' %' : '—'}</div></div>
        <div><div class="k">Fourchette 95 %</div><div class="v">${sg(c.lo, isP ? 1 : 2)} à ${sg(c.hi, isP ? 1 : 2)}</div></div>
        <div><div class="k">p (hasard)</div><div class="v">${fp(c.p)}</div></div>
        ${c.tost ? `<div><div class="k">Équivalence (TOST)</div><div class="v">p = ${fp(c.tost.p)}</div></div>` : ''}
      </div>
      <p class="muted" style="font-size:13px">${esc(c.test)} · ${esc(c.detail || '')}</p></div>`;
  });
  html += `<div class="card stack s"><div class="lbl">Test utilisé et pourquoi</div><p><b>${esc(r.methode.nom)}</b></p><p class="aide">${esc(r.methode.pourquoi)}</p></div>`;
  html += tableDesc(r, v, isP);
  html += expliqueMoi();
  return `<section class="stack">${html}</section>`;
}
function alertesHTML(al) { if (!al || !al.length) return ''; const ord = { grave: 0, warn: 1, info: 2 }; return `<div class="alertes">${al.slice().sort((a, b) => ord[a.niv] - ord[b.niv]).map(a => `<div class="al ${a.niv}"><span>${esc(a.txt)}</span></div>`).join('')}</div>`; }

function graphique(r, v, isP) {
  const bs = r.barres.filter(b => !b.vide); if (!bs.length) return '';
  const vals = bs.flatMap(b => [b.val, b.lo, b.hi, ...(b.pts || [])]).filter(x => x != null && isFinite(x));
  let lo = isP ? 0 : Math.min(0, ...vals), hi = isP ? 100 : Math.max(...vals);
  if (!isP) { const pad = (hi - lo) * 0.08 || 1; hi += pad; if (lo < 0) lo -= pad; }
  const W = 400, L = 6, Rr = 10, rowH = 60, top = 8, H = top + bs.length * rowH + 28;
  const x = val => L + (val - lo) / (hi - lo) * (W - L - Rr);
  const ticks = []; const step = niceStep((hi - lo) / 5); for (let t = Math.ceil(lo / step) * step; t <= hi + 1e-9; t += step) ticks.push(t);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Graphique des moyennes par modalité">`;
  ticks.forEach(t => { s += `<line x1="${x(t)}" x2="${x(t)}" y1="${top}" y2="${H - 24}" stroke="var(--line)" stroke-width="1"/><text x="${x(t)}" y="${H - 8}" text-anchor="middle" font-size="13" fill="var(--muted)" font-family="ui-monospace,monospace">${fr(t, step < 1 ? 1 : 0)}</text>`; });
  bs.forEach((b, i) => {
    const y = top + i * rowH;
    s += `<text x="${L}" y="${y + 16}" font-size="15" fill="var(--ink)" font-weight="600">${esc(b.nom)}${b.temoin ? ' (témoin)' : ''} · ${fr(b.val, isP ? 1 : 2)}${isP ? ' %' : (v.unite ? ' ' + esc(v.unite) : '')}</text>`;
    s += `<rect x="${x(Math.max(lo, 0))}" y="${y + 26}" width="${Math.max(1, x(b.val) - x(Math.max(lo, 0)))}" height="20" rx="4" fill="${b.temoin ? 'var(--neutre)' : 'var(--accent)'}" opacity="0.85"/>`;
    if (b.lo != null && b.hi != null) s += `<line x1="${x(b.lo)}" x2="${x(b.hi)}" y1="${y + 36}" y2="${y + 36}" stroke="var(--ink)" stroke-width="2"/><line x1="${x(b.lo)}" x2="${x(b.lo)}" y1="${y + 29}" y2="${y + 43}" stroke="var(--ink)" stroke-width="2"/><line x1="${x(b.hi)}" x2="${x(b.hi)}" y1="${y + 29}" y2="${y + 43}" stroke="var(--ink)" stroke-width="2"/>`;
    (b.pts || []).forEach((p, k) => { s += `<circle cx="${x(p)}" cy="${y + 30 + (k % 3) * 6}" r="4" fill="var(--surface)" stroke="var(--ink)" stroke-width="1.5"/>`; });
  });
  s += `</svg>`;
  return `<div class="card chart stack s"><div class="lbl">${isP ? 'Taux' : 'Moyenne'} par modalité · trait = fourchette à 95 % · ronds = chaque ${esc(ETAT.essais[view.id].uniteNom || 'unité')}</div>${s}</div>`;
}
function niceStep(x) { const p = Math.pow(10, Math.floor(Math.log10(x || 1))); const n = x / p; return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * p; }

function tableDesc(r, v, isP) {
  const rows = r.groupes.map(g => { const d = g.d; if (!d.n) return `<tr><td>${esc(g.nom)}</td><td colspan="8" style="text-align:left" class="muted">pas de donnée</td></tr>`;
    return `<tr><td>${esc(g.nom)}${g.temoin ? ' <span class="tag">témoin</span>' : ''}</td><td>${d.n}</td>${isP ? `<td>${g.n != null ? g.ok + '/' + g.n : '—'}</td>` : `<td>${g.sub}</td>`}<td>${fr(d.mean, 2)}</td><td>${fr(d.median, 2)}</td><td>${d.n > 1 ? fr(d.sd, 2) : '—'}</td><td>${d.n > 1 ? fr(d.cv, 0) : '—'}</td><td>${fr(d.min, 2)}–${fr(d.max, 2)}</td><td>${d.n > 1 ? fr(d.lo, 2) + ' à ' + fr(d.hi, 2) : '—'}</td></tr>`; }).join('');
  return `<details class="card"><summary>Statistiques descriptives</summary><div class="tbl-wrap" style="margin-top:10px"><table>
    <thead><tr><th>Modalité</th><th>Unités</th><th>${isP ? 'Plants' : 'Mesures'}</th><th>Moyenne</th><th>Médiane</th><th>Écart-type</th><th>CV %</th><th>Min–max</th><th>IC 95 %</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="aide" style="margin-top:8px">Calculé sur la valeur de chaque ${esc(ETAT.essais[view.id].uniteNom || 'unité')}${isP ? ' (taux en %)' : ' (moyenne de ses mesures)'}.</p></details>`;
}
function tableCategories(e, v, date) {
  if (!date) return `<div class="verdict v-neutre"><div class="big">Pas encore de données</div></div>`;
  const fac = e.facteurs[0], cats = v.categories || [];
  const rows = fac.modalites.map(mo => { const tot = {}; let T = 0; e.unites.filter(u => u.trt[fac.id] === mo.id).forEach(u => { const m = getM(e, u.id, v.id, date); if (!m || m.exclu) return; Object.entries(m.cats || {}).forEach(([k, n]) => { tot[k] = (tot[k] || 0) + n; T += n; }); });
    return `<tr><td>${esc(mo.nom)}</td>${cats.map(c => `<td>${tot[c] || 0}${T ? ` <span class="muted">(${fr((tot[c] || 0) / T * 100, 0)} %)</span>` : ''}</td>`).join('')}<td>${T}</td></tr>`; }).join('');
  return `<div class="card"><div class="lbl">Répartition au ${fdate(date)}</div><div class="tbl-wrap" style="margin-top:10px"><table><thead><tr><th>Modalité</th>${cats.map(c => `<th>${esc(c)}</th>`).join('')}<th>Total</th></tr></thead><tbody>${rows}</tbody></table></div><p class="aide" style="margin-top:8px">Le test du χ² sur les catégories arrive dans la prochaine version.</p></div>`;
}
function expliqueMoi() {
  return `<details class="card"><summary>Explique-moi</summary><div class="gl">${GLOSSAIRE.map(([t, d]) => `<p><b>${t}</b> : ${d}</p>`).join('')}</div></details>`;
}
const GLOSSAIRE = [
  ['Chances de faire mieux', 'si tu refaisais l’essai dans les mêmes conditions, la probabilité que la modalité batte encore le témoin. 50 % veut dire « on ne sait pas » ; au-dessus de 95 %, c’est solide.'],
  ['Seuil utile', 'l’écart minimum qui justifierait de changer de pratique (coût, travail). Un effet réel mais minuscule n’a pas d’intérêt.'],
  ['p (hasard)', 'la probabilité d’obtenir un écart au moins aussi grand si la modalité n’avait en réalité aucun effet. Sous 0,05 on parle d’effet probable, sous 0,01 d’effet très probable. Ce n’est pas la probabilité que l’hypothèse soit vraie.'],
  ['Fourchette à 95 %', 'l’écart réel se trouve très probablement entre ces deux valeurs. Si elle passe par zéro, l’effet n’est pas démontré.'],
  ['Pas de différence utile', 'test d’équivalence (TOST) : l’écart est démontré plus petit que ton seuil dans les deux sens. On peut alors conclure que les modalités se valent en pratique, ce qui est plus fort que « pas d’effet détecté ».'],
  ['Témoin', 'la modalité de référence, en général ta pratique habituelle, conduite dans les mêmes conditions que les autres.'],
  ['Unité expérimentale', 'ce qui reçoit une modalité de façon indépendante (un palox, une parcelle, une cuve). C’est le nombre d’unités, pas de plants, qui fait la force d’un essai.'],
  ['Répétition', 'une unité expérimentale de plus pour la même modalité. Il en faut au moins 3, idéalement 4 ou plus.'],
  ['Pseudo-réplication', 'compter comme répétitions des mesures qui ne sont pas indépendantes, par exemple 50 plants d’un même palox. L’écart peut alors venir du palox et pas de la modalité.'],
  ['Bloc', 'un groupe d’unités placées au même endroit (une rangée de la chambre). Chaque bloc reçoit toutes les modalités, ce qui retire l’effet de l’emplacement.'],
  ['Tirage au sort', 'répartir les modalités au hasard pour qu’aucune ne soit avantagée par sa position (près du chauffage, de la porte, en bout de rang).'],
  ['Surdispersion', 'quand les palox d’une même modalité diffèrent plus que le hasard ne l’explique. L’app compare alors les palox entre eux plutôt que d’additionner les plants.'],
  ['Test t de Welch', 'compare deux moyennes sans supposer que les deux groupes ont la même variabilité.'],
  ['ANOVA', 'teste si au moins une modalité se distingue parmi plusieurs. En blocs, elle retire d’abord l’effet du bloc.'],
  ['Test du χ² et test exact de Fisher', 'comparent des pourcentages calculés sur des comptages. Fisher est utilisé quand les effectifs sont petits.'],
  ['Limites', 'l’app aide à décider sur le terrain. Pour une publication ou une décision lourde, fais relire l’analyse par un statisticien.']
];

/* ================= PLAN ================= */
function ongletPlan(e) {
  const donnees = aDesDonnees(e);
  const T = traitements(e);
  return `<section class="stack">
    <div class="card stack s"><div class="lbl">Dispositif</div><p><b>${esc(DISPOSITIFS[e.dispositif].nom)}</b></p>
      <p class="aide">${e.unites.length} ${esc(e.uniteNom)} · ${T.length} modalité(s)${e.dispositif === 'blocs' ? ` · ${Math.max(...e.unites.map(u => u.bloc || 0))} blocs` : ` · ${e.repetitions} répétition(s)`}${e.plan.tire ? ` · tiré au sort le ${fdate(e.plan.tire)}` : ' · plan pas encore tiré au sort'}</p></div>
    ${e.plan.tire ? `<div class="card stack">${planHTML(e)}</div>` : ''}
    ${e.dispositif !== 'blocs' ? `<div class="cols2"><label class="f">Rangées<input type="number" inputmode="numeric" min="1" data-plan-e="lignes" value="${esc(e.plan.lignes)}" ${donnees ? 'disabled' : ''}></label><label class="f">Places par rangée<input type="number" inputmode="numeric" min="1" data-plan-e="colonnes" value="${esc(e.plan.colonnes)}" ${donnees ? 'disabled' : ''}></label></div>` : ''}
    ${donnees ? `<p class="aide">Des données sont déjà saisies : le plan ne peut plus être tiré à nouveau.</p>` :
      view.confirm === 'tirer' ? `<div class="card stack"><p>Tirer un nouveau plan ? Les codes des ${esc(e.uniteNom)} vont changer.</p><div class="row"><button class="btn pri" data-act="plan-tirer-ok">Tirer au sort</button><button class="btn ghost" data-act="confirm-non">Annuler</button></div></div>` :
      `<button class="btn ${e.plan.tire ? 'ghost' : 'pri'}" data-act="plan-tirer">${e.plan.tire ? 'Tirer au sort à nouveau' : 'Tirer au sort le plan'}</button>`}
    <div class="card"><div class="lbl">Liste des ${esc(e.uniteNom)}</div><div class="tbl-wrap" style="margin-top:8px"><table><thead><tr><th>Code</th><th>Modalité</th>${e.dispositif === 'blocs' ? '<th>Bloc</th>' : '<th>Rép.</th>'}<th>Position</th></tr></thead><tbody>
      ${e.unites.map(u => `<tr><td><span class="code" style="background:${couleur(trtIndex(e, u))};font-size:13px">${esc(u.code)}</span></td><td style="text-align:left">${esc(trtNom(e, u))}</td><td>${e.dispositif === 'blocs' ? u.bloc : u.rep}</td><td>${u.pos ? 'R' + (u.pos.l + 1) + ' · ' + (u.pos.c + 1) : '—'}</td></tr>`).join('')}</tbody></table></div>
      <p class="aide" style="margin-top:8px">Les étiquettes QR à imprimer arrivent dans une prochaine version. En attendant, écris le code sur chaque ${esc(e.uniteNom)}.</p></div>
  </section>`;
}

/* ================= CARNET ================= */
function ongletCarnet(e) {
  const obs = (e.observations || []).slice().sort((a, b) => b.date.localeCompare(a.date));
  const jours = Object.entries(e.journees || {}).filter(([, j]) => j.meteo || j.temp || j.hum || j.remarques).sort((a, b) => b[0].localeCompare(a[0]));
  return `<section class="stack">
    <div class="card stack"><div class="lbl">Nouvelle observation</div>
      <input type="date" id="obs-date" value="${today()}">
      <textarea id="obs-txt" placeholder="Ce que tu as observé"></textarea>
      <div class="row"><span class="btn ghost file-btn">Photo<input type="file" accept="image/*" capture="environment" id="obs-photo" aria-label="Photo de l’observation"></span><span class="muted" id="obs-photo-n" style="font-size:14px">${(view.obsPhotos || []).length ? view.obsPhotos.length + ' photo(s) prête(s)' : ''}</span><span class="grow"></span><button class="btn pri" data-act="obs-add">Noter</button></div>
    </div>
    <div class="card"><div class="lbl">Observations</div>${obs.length ? obs.map(o => `<div class="obs"><div class="row nowrap"><span class="mono muted grow" style="font-size:13px">${fdate(o.date)}</span>
      ${view.confirm === 'obs-' + o.id ? `<button class="btn sm danger" data-act="obs-del-ok" data-id="${o.id}">Supprimer</button><button class="btn sm ghost" data-act="confirm-non">Non</button>` : `<button class="x" data-act="obs-del" data-id="${o.id}" aria-label="Supprimer l’observation">×</button>`}</div>
      <p>${esc(o.texte)}</p>${thumbs(o.photos)}</div>`).join('') : `<p class="aide" style="margin-top:8px">Aucune observation pour l’instant.</p>`}</div>
    ${jours.length ? `<div class="card"><div class="lbl">Conditions relevées</div><div class="hist" style="margin-top:8px">${jours.map(([d, j]) => `<div><b style="color:var(--ink)">${fdate(d)}</b> · ${esc([j.meteo, j.temp !== '' && j.temp != null ? j.temp + ' °C' : '', j.hum !== '' && j.hum != null ? j.hum + ' % HR' : '', j.remarques].filter(Boolean).join(' · '))}</div>`).join('')}</div></div>` : ''}
    <details class="card"><summary>Historique des modifications</summary><div class="hist" style="margin-top:10px">${(e.historique || []).slice().reverse().map(h => `<div><span class="mono">${fdatetime(h.t)}</span> · ${esc(h.txt)}</div>`).join('') || 'Rien pour l’instant.'}</div></details>
  </section>`;
}

/* ================= INFOS ================= */
function ongletInfos(e) {
  const donnees = aDesDonnees(e);
  const fi = (lbl, k, o) => { o = o || {}; const val = e[k] ?? ''; return `<label class="f">${lbl}${o.area ? `<textarea data-e="${k}">${esc(val)}</textarea>` : `<input data-e="${k}" type="${o.type || 'text'}" value="${esc(val)}" ${o.list ? `list="${o.list}"` : ''}>`}</label>`; };
  const themes = [...new Set(Object.values(ETAT.essais).map(x => x.theme).filter(Boolean))], dossiers = [...new Set(Object.values(ETAT.essais).map(x => x.dossier).filter(Boolean))];
  return `<section class="stack">
    <div class="card stack">
      ${fi('Nom', 'nom')}
      <label class="f">Statut<select data-e="statut">${Object.entries(STATUTS).map(([k, l]) => `<option value="${k}" ${e.statut === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <div class="cols2 r">${fi('Dossier (année)', 'dossier', { list: 'dl-d' })}${fi('Thème', 'theme', { list: 'dl-t' })}</div>
      <datalist id="dl-d">${dossiers.map(t => `<option value="${esc(t)}">`).join('')}</datalist><datalist id="dl-t">${themes.map(t => `<option value="${esc(t)}">`).join('')}</datalist>
      ${fi('Objectif', 'objectif', { area: 1 })}${fi('Question posée', 'question')}${fi('Hypothèse', 'hypothese')}
      <div class="cols2 r">${fi('Début', 'debut', { type: 'date' })}${fi('Fin', 'fin', { type: 'date' })}</div>
      <div class="cols2 r">${fi('Lieu', 'lieu')}${fi('Responsable', 'responsable')}</div>
      ${fi('Notes et conclusion', 'notes', { area: 1 })}
    </div>
    <div class="card stack"><div class="lbl">Modalités</div>
      ${e.facteurs.map((f, fi_) => `<div class="stack s"><b>${esc(f.nom)}</b>${f.modalites.map((m, mi) => `<div class="mod-row" style="grid-template-columns:1fr auto"><input data-mo="${fi_}.${mi}" value="${esc(m.nom)}" aria-label="Nom de la modalité"><button class="temoin-btn" data-act="temoin" data-f="${fi_}" data-m="${mi}" aria-pressed="${!!m.temoin}">${m.temoin ? 'Témoin' : 'Témoin ?'}</button></div>`).join('')}</div>`).join('')}
    </div>
    <div class="card stack"><div class="lbl">Variables</div>
      ${e.variables.map((v, vi) => `<details class="stack" ${view.varOuverte === v.id ? 'open' : ''}><summary class="row nowrap" style="cursor:pointer"><b class="grow">${esc(v.nom)}</b><span class="tag">${TYPES[v.type].nom}</span></summary>
        <div class="stack" style="margin-top:10px">
          <label class="f">Nom<input data-var="${vi}.nom" value="${esc(v.nom)}"></label>
          ${aDesDonnees(e, v.id) ? '' : `<label class="f">Type<select data-var="${vi}.type" data-rerender="1">${Object.entries(TYPES).map(([k, t]) => `<option value="${k}" ${v.type === k ? 'selected' : ''}>${t.nom}</option>`).join('')}</select></label>`}
          ${varChamps(v, '§' + vi)}
          ${view.confirm === 'var-' + v.id ? `<div class="row"><span class="grow">Supprimer « ${esc(v.nom)} » et ses données ?</span><button class="btn sm danger" data-act="var-del-ok" data-id="${v.id}">Supprimer</button><button class="btn sm ghost" data-act="confirm-non">Non</button></div>` : `<div><button class="btn sm ghost" data-act="var-del" data-id="${v.id}" style="color:var(--mauvais)">Supprimer la variable</button></div>`}
        </div></details>`).join('<hr class="sep">')}
      <button class="btn ghost" data-act="var-add">+ Ajouter une variable</button>
    </div>
    <div class="card stack"><div class="lbl">Structure</div>
      <p class="aide">${donnees ? 'Des données sont saisies : facteurs, dispositif et nombre de répétitions sont verrouillés pour ne pas les mélanger. Duplique l’essai pour repartir d’une autre structure.' : 'Tant qu’aucune donnée n’est saisie, tu peux changer les facteurs, le dispositif et les répétitions.'}</p>
      <div><button class="btn ghost" data-act="structure" ${donnees ? 'disabled' : ''}>Modifier la structure</button></div></div>
    <div class="card stack"><div class="lbl">Partager et réutiliser</div>
      <div class="row"><button class="btn ghost" data-act="csv">Exporter en CSV</button><button class="btn ghost" data-act="modele-save">Enregistrer comme modèle</button><button class="btn ghost" data-act="dupliquer">Dupliquer sans les données</button></div></div>
    <div class="card stack">${view.confirm === 'suppr' ? `<p>Supprimer « ${esc(e.nom)} », ses données et ses photos ? C’est définitif.</p><div class="row"><button class="btn danger" data-act="suppr-ok">Supprimer</button><button class="btn ghost" data-act="confirm-non">Annuler</button></div>` : `<div><button class="btn ghost" data-act="suppr" style="color:var(--mauvais)">Supprimer l’essai</button></div>`}</div>
  </section>`;
}

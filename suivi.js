/* Essais — suivi : calendrier des observations, interventions, fiche du site, bibliothèque de variables */
'use strict';
const TYPES_INTERV = ['Application', 'Arrosage', 'Mise en chauffe', 'Sortie de chauffe', 'Plantation', 'Taille', 'Autre'];

function ajouterJours(d, n) { const x = new Date((d || today()) + 'T12:00:00'); x.setDate(x.getDate() + n); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); }
function joursEntre(a, b) { return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5); }

/* Statut d'une observation prévue */
function statutObs(e, c) {
  const vars = c.vars && c.vars.length ? e.variables.filter(v => c.vars.includes(v.id)) : e.variables;
  const us = e.unites, faites = us.filter(u => uniteFaite(e, u, vars, c.date)).length;
  const t = today(), pct = us.length ? faites / us.length : 0;
  if (us.length && faites === us.length) return { code: 'fait', txt: 'Fait', cls: 'v-bon', pct };
  if (c.date < t) return { code: 'retard', txt: faites ? `En retard · ${faites}/${us.length}` : `En retard de ${joursEntre(c.date, t)} j`, cls: 'v-mauvais', pct };
  if (c.date === t) return { code: 'jour', txt: faites ? `Aujourd’hui · ${faites}/${us.length}` : 'Aujourd’hui', cls: 'v-incertain', pct };
  return { code: 'avenir', txt: `Dans ${joursEntre(t, c.date)} j`, cls: 'v-neutre', pct };
}
function prochaineObs(e) { return (e.calendrier || []).filter(c => statutObs(e, c).code !== 'fait').sort((a, b) => a.date.localeCompare(b.date))[0] || null; }
function aFaire() {
  const t = today(), out = [];
  Object.values(ETAT.essais).filter(e => e.statut !== 'termine').forEach(e => (e.calendrier || []).forEach(c => { if (c.date <= t) { const s = statutObs(e, c); if (s.code !== 'fait') out.push({ e, c, s }); } }));
  return out.sort((a, b) => a.c.date.localeCompare(b.c.date));
}

/* ================= ONGLET SUIVI ================= */
function ongletSuivi(e) {
  e.calendrier = e.calendrier || []; e.interventions = e.interventions || []; e.site = e.site || {};
  const cal = e.calendrier.slice().sort((a, b) => a.date.localeCompare(b.date));
  const iv = e.interventions.slice().sort((a, b) => b.date.localeCompare(a.date));
  const f = view.calForm || (view.calForm = { date: ajouterJours(today(), 7), vars: e.variables.filter(v => v.type !== 'texte').map(v => v.id), rep: false, tous: 7, fois: 3, note: '' });
  const fi = view.ivForm || (view.ivForm = { date: today(), type: 'Application', mods: [], produit: '', dose: '', unite: '', rem: '' });
  const fac = e.facteurs[0];
  return `<section class="stack">
  <div class="card stack"><div class="row"><h2 class="grow">Calendrier des observations</h2><span class="muted mono" style="font-size:14px">${cal.filter(c => statutObs(e, c).code === 'fait').length}/${cal.length}</span></div>
    <p class="aide">Prévois les dates de notation (ex. sortie de chauffe J+18, puis tous les 7 jours). L’accueil te rappelle ce qui est à faire.</p>
    ${cal.length ? `<div class="stack s">${cal.map(c => { const s = statutObs(e, c); return `<div class="obs-row">
      <div class="grow" style="min-width:0"><div class="row" style="gap:4px 8px"><b style="white-space:nowrap">${fdate(c.date)}</b><span class="mono muted" style="font-size:13px">${jPlus(e, c.date)}</span><span class="pill ${s.cls}">${s.txt}</span></div>
        <div class="muted" style="font-size:14px">${esc(c.vars && c.vars.length ? e.variables.filter(v => c.vars.includes(v.id)).map(v => v.nom).join(', ') : 'Toutes les variables')}${c.note ? ' · ' + esc(c.note) : ''}</div></div>
      ${view.confirm === 'cal-' + c.id ? `<button class="btn sm danger" data-act="cal-del-ok" data-id="${c.id}">Retirer</button><button class="btn sm ghost" data-act="confirm-non">Non</button>` :
        `${s.code !== 'fait' && c.date <= ajouterJours(today(), 1) ? `<button class="btn sm pri" data-act="cal-saisir" data-v="${c.date}">Saisir</button>` : ''}<button class="x" data-act="cal-del" data-id="${c.id}" aria-label="Retirer cette date">×</button>`}</div>`; }).join('')}</div>` : ''}
    <details class="stack" ${view.calOuvert || !cal.length ? 'open' : ''} id="cal-form"><summary class="btn ghost sm" style="display:inline-flex;width:fit-content">+ Prévoir une observation</summary>
      <div class="stack" style="margin-top:12px">
        <label class="f">Date<input type="date" data-cal="date" value="${esc(f.date)}"></label>
        <div class="chips">${[['Aujourd’hui', 0], ['+7 j', 7], ['+14 j', 14], ['+21 j', 21]].map(([l, n]) => `<button class="chip" data-act="cal-jours" data-n="${n}">${l}</button>`).join('')}${e.debut ? `<button class="chip" data-act="cal-debut" data-n="18">Début +18 j</button>` : ''}</div>
        <div class="lbl">Variables à noter</div>
        <div class="chips">${e.variables.map(v => `<button class="chip" data-act="cal-var" data-v="${v.id}" aria-pressed="${f.vars.includes(v.id)}">${esc(v.nom)}</button>`).join('')}</div>
        <label class="row nowrap" style="font-size:15px"><input type="checkbox" data-cal="rep" ${f.rep ? 'checked' : ''}> Répéter</label>
        ${f.rep ? `<div class="cols2"><label class="f">Tous les (jours)<input type="number" inputmode="numeric" min="1" data-cal="tous" value="${esc(f.tous)}"></label><label class="f">Nombre de fois<input type="number" inputmode="numeric" min="2" max="30" data-cal="fois" value="${esc(f.fois)}"></label></div>` : ''}
        <label class="f">Note<input data-cal="note" value="${esc(f.note)}" placeholder="ex. sortie de chauffe, 50 plants par palox"></label>
        <div><button class="btn pri" data-act="cal-add">Ajouter au calendrier</button></div>
      </div></details>
  </div>

  <div class="card stack"><h2>Interventions</h2>
    <p class="aide">Note ce qui a été fait aux plants : application de produit, arrosage, mise en chauffe… avec la dose et les modalités concernées.</p>
    ${iv.length ? `<div class="stack s">${iv.map(x => `<div class="obs-row"><div class="grow" style="min-width:0">
        <div class="row" style="gap:4px 8px"><b>${esc(x.type)}</b><span class="muted" style="white-space:nowrap">${fdate(x.date)}</span><span class="mono muted" style="font-size:13px">${jPlus(e, x.date)}</span></div>
        <div class="muted" style="font-size:14px">${esc([x.produit, x.dose !== '' && x.dose != null ? x.dose + ' ' + (x.unite || '') : '', x.mods && x.mods.length ? x.mods.map(id => (fac.modalites.find(m => m.id === id) || {}).nom).filter(Boolean).join(', ') : 'toutes les modalités', x.rem].filter(Boolean).join(' · '))}</div></div>
      ${view.confirm === 'iv-' + x.id ? `<button class="btn sm danger" data-act="iv-del-ok" data-id="${x.id}">Supprimer</button><button class="btn sm ghost" data-act="confirm-non">Non</button>` : `<button class="x" data-act="iv-del" data-id="${x.id}" aria-label="Supprimer l’intervention">×</button>`}</div>`).join('')}</div>` : ''}
    <details class="stack" ${view.ivOuvert ? 'open' : ''} id="iv-form"><summary class="btn ghost sm" style="display:inline-flex;width:fit-content">+ Noter une intervention</summary>
      <div class="stack" style="margin-top:12px">
        <div class="chips">${TYPES_INTERV.map(t => `<button class="chip" data-act="iv-type" data-v="${t}" aria-pressed="${fi.type === t}">${t}</button>`).join('')}</div>
        <label class="f">Date<input type="date" data-iv="date" value="${esc(fi.date)}"></label>
        <label class="f">Produit ou détail<input data-iv="produit" value="${esc(fi.produit)}" placeholder="ex. Biostimulant X, eau, paraffine"></label>
        <div class="cols2"><label class="f">Dose<input type="number" inputmode="decimal" data-iv="dose" value="${esc(fi.dose)}"></label><label class="f">Unité<input data-iv="unite" value="${esc(fi.unite)}" placeholder="mL/L, L/ha…"></label></div>
        <div class="lbl">Modalités concernées</div>
        <div class="chips"><button class="chip" data-act="iv-mod" data-v="" aria-pressed="${!fi.mods.length}">Toutes</button>${fac.modalites.map(m => `<button class="chip" data-act="iv-mod" data-v="${m.id}" aria-pressed="${fi.mods.includes(m.id)}">${esc(m.nom)}</button>`).join('')}</div>
        <label class="f">Remarques<input data-iv="rem" value="${esc(fi.rem)}" placeholder="conditions, opérateur…"></label>
        <div><button class="btn pri" data-act="iv-add">Enregistrer l’intervention</button></div>
      </div></details>
  </div>

  <div class="card stack"><h2>Fiche du site</h2>
    ${e.site.lat != null ? `<p class="mono" style="font-size:14px">${fr(e.site.lat, 5)} ; ${fr(e.site.lon, 5)}${e.site.acc ? ` · ± ${Math.round(e.site.acc)} m` : ''}</p>` : ''}
    <div class="row">${e.site.lat != null ? `<a class="btn sm ghost" href="https://maps.apple.com/?ll=${e.site.lat},${e.site.lon}&q=${encodeURIComponent(e.nom)}" target="_blank" rel="noopener">Voir sur la carte</a>` : '<span class="grow aide">Position GPS non enregistrée.</span>'}
      <button class="btn sm" data-act="gps">${e.site.lat != null ? 'Mettre à jour' : 'Enregistrer ma position'}</button></div>
    <label class="f">Lieu<input data-e="lieu" value="${esc(e.lieu || '')}" placeholder="ex. Chambre de chauffe 1, Vivero Richter"></label>
    <label class="f">Matériel végétal<input data-site="materiel" value="${esc(e.site.materiel || '')}" placeholder="cépage, porte-greffe, clone, lot"></label>
    <label class="f">Sol ou substrat<input data-site="sol" value="${esc(e.site.sol || '')}" placeholder="ex. sciure humide, tourbe"></label>
    <label class="f">Conditions prévues<input data-site="consigne" value="${esc(e.site.consigne || '')}" placeholder="ex. 28 °C, 85 % HR"></label>
  </div>
  </section>`;
}

/* ================= Bibliothèque de variables ================= */
function cleVar(v) { return (v.nom || '').trim().toLowerCase() + '|' + v.type; }
function ajouterBiblio(vars) {
  ETAT.biblio = ETAT.biblio || []; const ks = new Set(ETAT.biblio.map(cleVar)); let n = 0;
  vars.forEach(v => { if (!v.nom || !v.nom.trim() || ks.has(cleVar(v))) return; const c = clone(v); delete c.id; delete c.categoriesTxt; ETAT.biblio.push(c); ks.add(cleVar(v)); n++; });
  if (n) DB.setReglage('biblio', ETAT.biblio).catch(() => {});
  return n;
}
function biblioProposee(e) {
  const deja = new Set(e.variables.map(cleVar)); const vu = new Set(); const out = [];
  (ETAT.biblio || []).concat(MODELES.flatMap(m => m.variables)).forEach(v => { const k = cleVar(v); if (deja.has(k) || vu.has(k)) return; vu.add(k); out.push(v); });
  return out;
}

/* ================= Actions du suivi ================= */
function suiviClic(act, b, e) {
  const f = view.calForm, fi = view.ivForm;
  switch (act) {
    case 'cal-jours': f.date = ajouterJours(today(), +b.dataset.n); view.calOuvert = true; break;
    case 'cal-debut': f.date = ajouterJours(e.debut, +b.dataset.n); view.calOuvert = true; break;
    case 'cal-var': { const id = b.dataset.v; f.vars = f.vars.includes(id) ? f.vars.filter(x => x !== id) : f.vars.concat(id); view.calOuvert = true; break; }
    case 'cal-add': {
      if (!f.date) { toast('Choisis une date'); return true; }
      const n = f.rep ? Math.min(30, Math.max(2, +f.fois || 2)) : 1, pas = Math.max(1, +f.tous || 7);
      e.calendrier = e.calendrier || [];
      for (let k = 0; k < n; k++) { const d = ajouterJours(f.date, k * pas); if (e.calendrier.some(c => c.date === d)) continue; e.calendrier.push({ id: 'c-' + uid() + k, date: d, vars: f.vars.slice(), note: f.note }); }
      sauver(e, `${n} observation(s) prévue(s) à partir du ${fdate(f.date)}`); view.calForm = null; view.calOuvert = false; toast(n > 1 ? `${n} dates ajoutées` : 'Date ajoutée'); break;
    }
    case 'cal-del': view.confirm = 'cal-' + b.dataset.id; break;
    case 'cal-del-ok': e.calendrier = e.calendrier.filter(c => c.id !== b.dataset.id); view.confirm = null; sauver(e, 'Observation prévue retirée'); break;
    case 'cal-saisir': view.date = b.dataset.v; view.onglet = 'saisie'; view.remplirU = null; render(); window.scrollTo(0, 0); return true;
    case 'iv-type': fi.type = b.dataset.v; view.ivOuvert = true; break;
    case 'iv-mod': { const id = b.dataset.v; fi.mods = !id ? [] : fi.mods.includes(id) ? fi.mods.filter(x => x !== id) : fi.mods.concat(id); view.ivOuvert = true; break; }
    case 'iv-add': {
      if (!fi.date) { toast('Choisis une date'); return true; }
      (e.interventions = e.interventions || []).push({ id: 'i-' + uid(), date: fi.date, type: fi.type, mods: fi.mods.slice(), produit: fi.produit, dose: fi.dose === '' ? '' : num(fi.dose), unite: fi.unite, rem: fi.rem });
      sauver(e, `Intervention : ${fi.type}${fi.produit ? ' (' + fi.produit + ')' : ''} le ${fdate(fi.date)}`);
      view.ivForm = { date: fi.date, type: fi.type, mods: [], produit: fi.produit, dose: fi.dose, unite: fi.unite, rem: '' }; view.ivOuvert = false; toast('Intervention notée'); break;
    }
    case 'iv-del': view.confirm = 'iv-' + b.dataset.id; break;
    case 'iv-del-ok': e.interventions = e.interventions.filter(x => x.id !== b.dataset.id); view.confirm = null; sauver(e, 'Intervention supprimée'); break;
    case 'gps': {
      if (!navigator.geolocation) { toast('Position indisponible sur cet appareil'); return true; }
      toast('Recherche de la position…', 8000);
      navigator.geolocation.getCurrentPosition(p => { e.site = e.site || {}; Object.assign(e.site, { lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy, date: new Date().toISOString() }); sauver(e, 'Position GPS enregistrée'); toast('Position enregistrée'); render(); },
        err => toast(err && err.code === 1 ? 'Position refusée : autorise la localisation pour Safari dans Réglages › Confidentialité.' : 'Position introuvable : réessaie à l’extérieur.', 4500), { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 });
      return true;
    }
    default: return false;
  }
  render(); return true;
}
function suiviInput(el, e) {
  if (el.dataset.cal) { const k = el.dataset.cal; view.calForm[k] = el.type === 'checkbox' ? el.checked : el.value; view.calOuvert = true; if (el.type === 'checkbox') render(); return true; }
  if (el.dataset.iv) { view.ivForm[el.dataset.iv] = el.value; return true; }
  if (el.dataset.site) { e.site = e.site || {}; e.site[el.dataset.site] = el.value; sauver(e); return true; }
  return false;
}

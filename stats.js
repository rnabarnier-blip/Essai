/* Essais — moteur statistique (calculs 100 % dans l'app, aucun envoi en ligne) */
(function (G) {
'use strict';
const S = {};

/* ---------- Fonctions spéciales ---------- */
function lgamma(x) {
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
  x -= 1; let a = c[0]; const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}
function betacf(a, b, x) {
  const F = 1e-300; const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap; if (Math.abs(d) < F) d = F; d = 1 / d; let h = d;
  for (let m = 1; m <= 500; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < F) d = F; c = 1 + aa / c; if (Math.abs(c) < F) c = F; d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < F) d = F; c = 1 + aa / c; if (Math.abs(c) < F) c = F; d = 1 / d;
    const del = d * c; h *= del; if (Math.abs(del - 1) < 3e-15) break;
  }
  return h;
}
function ibeta(x, a, b) {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
}
function gammp(a, x) {
  if (x <= 0) return 0; const lg = -x + a * Math.log(x) - lgamma(a);
  if (x < a + 1) { let ap = a, sum = 1 / a, del = sum; for (let n = 0; n < 1000; n++) { ap++; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-15) break; } return Math.min(1, sum * Math.exp(lg)); }
  let b = x + 1 - a, c = 1e300, d = 1 / b, h = d;
  for (let i = 1; i < 1000; i++) { const an = -i * (i - a); b += 2; d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300; c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-15) break; }
  return Math.max(0, 1 - Math.exp(lg) * h);
}
S.lgamma = lgamma; S.ibeta = ibeta;

/* ---------- Lois ---------- */
S.tcdf = function (t, df) {
  if (!isFinite(t)) return t > 0 ? 1 : 0;
  if (!isFinite(df)) return S.ncdf(t);
  const tail = 0.5 * ibeta(df / (df + t * t), df / 2, 0.5);
  return t > 0 ? 1 - tail : tail;
};
S.tinv = function (p, df) {
  if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
  let lo = -1e3, hi = 1e3;
  for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (S.tcdf(m, df) < p) lo = m; else hi = m; if (hi - lo < 1e-12) break; }
  return (lo + hi) / 2;
};
S.ncdf = function (z) {
  // erfc précis (Numerical Recipes)
  const x = Math.abs(z) / Math.SQRT2, t = 1 / (1 + 0.5 * x);
  const r = t * Math.exp(-x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return z >= 0 ? 1 - r / 2 : r / 2;
};
S.ninv = function (p) {
  let lo = -40, hi = 40; for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (S.ncdf(m) < p) lo = m; else hi = m; } return (lo + hi) / 2;
};
S.fsurv = function (F, d1, d2) { if (!(F > 0)) return 1; if (!isFinite(F)) return 0; return ibeta(d2 / (d2 + d1 * F), d2 / 2, d1 / 2); };
S.chi2surv = function (x, k) { if (!(x > 0)) return 1; return Math.max(0, 1 - gammp(k / 2, x / 2)); };

function lchoose(n, k) { return lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1); }
S.fisher2x2 = function (a, b, c, d) {
  const n1 = a + b, c1 = a + c, N = a + b + c + d;
  const pr = x => Math.exp(lchoose(n1, x) + lchoose(N - n1, c1 - x) - lchoose(N, c1));
  const p0 = pr(a); let s = 0;
  for (let x = Math.max(0, c1 - (N - n1)); x <= Math.min(n1, c1); x++) { const p = pr(x); if (p <= p0 * (1 + 1e-7)) s += p; }
  return Math.min(1, s);
};

/* ---------- Hasard reproductible ---------- */
S.rng = function (seed) {
  let s = seed >>> 0;
  return function () { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
};
S.shuffle = function (arr, r) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function rnorm(r) { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }
function rgamma(k, r) {
  if (k < 1) return rgamma(k + 1, r) * Math.pow(r(), 1 / k);
  const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
  for (;;) { let x, v; do { x = rnorm(r); v = 1 + c * x; } while (v <= 0); v = v * v * v; const u = r();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v; if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v; }
}
function rbeta(a, b, r) { const x = rgamma(a, r), y = rgamma(b, r); return x / (x + y); }

/* ---------- Descriptifs ---------- */
S.mean = a => a.reduce((s, x) => s + x, 0) / a.length;
S.variance = a => { if (a.length < 2) return NaN; const m = S.mean(a); return a.reduce((s, x) => s + (x - m) * (x - m), 0) / (a.length - 1); };
S.quantile = function (a, p) { // type 7 (défaut R)
  const s = a.slice().sort((x, y) => x - y); if (!s.length) return NaN;
  const h = (s.length - 1) * p, lo = Math.floor(h); return s[lo] + (h - lo) * ((s[Math.min(lo + 1, s.length - 1)]) - s[lo]);
};
S.desc = function (a) {
  const n = a.length; if (!n) return { n: 0 };
  const m = S.mean(a), v = S.variance(a), sd = Math.sqrt(v), se = sd / Math.sqrt(n);
  const q = n > 1 ? S.tinv(0.975, n - 1) : NaN;
  return { n, mean: m, median: S.quantile(a, 0.5), sd, se, cv: m !== 0 ? sd / Math.abs(m) * 100 : NaN,
    min: Math.min(...a), max: Math.max(...a), q1: S.quantile(a, 0.25), q3: S.quantile(a, 0.75),
    lo: m - q * se, hi: m + q * se };
};

/* ---------- Tests ---------- */
S.welch = function (a, b) { // a = traitement, b = témoin ; diff = a - b
  const n1 = a.length, n2 = b.length, v1 = S.variance(a), v2 = S.variance(b);
  const diff = S.mean(a) - S.mean(b), se = Math.sqrt(v1 / n1 + v2 / n2);
  if (!(se > 0)) return { diff, se: 0, df: n1 + n2 - 2, t: diff === 0 ? 0 : Infinity * Math.sign(diff), p: diff === 0 ? 1 : 0, lo: diff, hi: diff };
  const df = Math.pow(se, 4) / (Math.pow(v1 / n1, 2) / (n1 - 1) + Math.pow(v2 / n2, 2) / (n2 - 1));
  const t = diff / se, p = 2 * (1 - S.tcdf(Math.abs(t), df)), q = S.tinv(0.975, df);
  return { diff, se, df, t, p, lo: diff - q * se, hi: diff + q * se };
};
S.anova1 = function (groups) { // groups: tableaux de nombres
  const all = groups.flat(), N = all.length, k = groups.length, gm = S.mean(all);
  const ssb = groups.reduce((s, g) => s + g.length * Math.pow(S.mean(g) - gm, 2), 0);
  const ssw = groups.reduce((s, g) => { const m = S.mean(g); return s + g.reduce((t, x) => t + (x - m) * (x - m), 0); }, 0);
  const df1 = k - 1, df2 = N - k, msw = ssw / df2;
  const F = msw === 0 ? (ssb === 0 ? 0 : Infinity) : (ssb / df1) / msw;
  return { F, df1, df2, p: df2 > 0 ? S.fsurv(F, df1, df2) : NaN, mse: msw, eta2: (ssb + ssw) > 0 ? ssb / (ssb + ssw) : 0 };
};
/* ANOVA en blocs complets : y[b][t] (pas de case vide) */
S.anovaBlocs = function (y) {
  const b = y.length, t = y[0].length, all = y.flat(), gm = S.mean(all);
  const tm = []; for (let j = 0; j < t; j++) tm.push(S.mean(y.map(r => r[j])));
  const bm = y.map(r => S.mean(r));
  const sst = all.reduce((s, x) => s + (x - gm) * (x - gm), 0);
  const sstr = b * tm.reduce((s, m) => s + (m - gm) * (m - gm), 0);
  const ssbl = t * bm.reduce((s, m) => s + (m - gm) * (m - gm), 0);
  const sse = Math.max(0, sst - sstr - ssbl);
  const dft = t - 1, dfb = b - 1, dfe = dft * dfb, mse = sse / dfe;
  const F = mse === 0 ? (sstr === 0 ? 0 : Infinity) : (sstr / dft) / mse;
  const Fb = mse === 0 ? (ssbl === 0 ? 0 : Infinity) : (ssbl / dfb) / mse;
  return { F, df1: dft, df2: dfe, p: S.fsurv(F, dft, dfe), Fbloc: Fb, pBloc: S.fsurv(Fb, dfb, dfe), mse, tm, bm, b, t,
    eta2p: (sstr + sse) > 0 ? sstr / (sstr + sse) : 0 };
};
/* chi² d'indépendance k×2 : ok[i], n[i] */
S.chi2Prop = function (ok, n) {
  const T = ok.reduce((s, x) => s + x, 0), N = n.reduce((s, x) => s + x, 0);
  if (T === 0 || T === N) return { chi2: 0, df: ok.length - 1, p: 1, minExp: 0 };
  let ch = 0, minExp = Infinity;
  ok.forEach((o, i) => { const e1 = n[i] * T / N, e2 = n[i] * (N - T) / N; minExp = Math.min(minExp, e1, e2);
    ch += (o - e1) ** 2 / e1 + ((n[i] - o) - e2) ** 2 / e2; });
  return { chi2: ch, df: ok.length - 1, p: S.chi2surv(ch, ok.length - 1), minExp };
};
/* Surdispersion : les unités d'une même modalité varient-elles plus que le hasard binomial ? */
S.surdispersion = function (groupes) { // groupes: [[{ok,n}...]...]
  let ch = 0, df = 0;
  groupes.forEach(us => { const u = us.filter(x => x.n > 0); if (u.length < 2) return;
    const T = u.reduce((s, x) => s + x.ok, 0), N = u.reduce((s, x) => s + x.n, 0); const p = T / N;
    if (p <= 0 || p >= 1) { df += u.length - 1; return; }
    u.forEach(x => { ch += (x.ok - x.n * p) ** 2 / (x.n * p * (1 - p)); }); df += u.length - 1; });
  return df > 0 ? { chi2: ch, df, phi: ch / df, p: S.chi2surv(ch, df) } : null;
};

/* ---------- Probabilités d'effet (bayésien simple) ---------- */
/* Écart ~ Student(df) centré sur diff, échelle se (a priori plat). gain = diff dans le « bon » sens */
S.probNormale = function (diff, se, df, sens, seuil) {
  const g = sens === 'moins' ? -diff : diff;
  if (!(se > 0)) return { pMieux: g > 0 ? 1 : g < 0 ? 0 : 0.5, pSeuil: seuil > 0 ? (g > seuil ? 1 : 0) : null };
  return { pMieux: S.tcdf(g / se, df), pSeuil: seuil > 0 ? S.tcdf((g - seuil) / se, df) : null };
};
/* Bêta-binomiale, a priori uniforme ; seuil en points de % */
S.probBeta = function (okT, nT, okC, nC, sens, seuil, tirages) {
  const r = S.rng(20261020); const N = tirages || 20000; let w = 0, ws = 0; const s = (seuil || 0) / 100;
  for (let i = 0; i < N; i++) { const d = rbeta(okT + 1, nT - okT + 1, r) - rbeta(okC + 1, nC - okC + 1, r);
    const g = sens === 'moins' ? -d : d; if (g > 0) w++; if (s > 0 && g > s) ws++; }
  return { pMieux: w / N, pSeuil: s > 0 ? ws / N : null };
};
/* Équivalence (TOST) : écart dans ±seuil ? */
S.tost = function (diff, se, df, seuil) {
  if (!(seuil > 0) || !(se > 0)) return null;
  const p1 = 1 - S.tcdf((diff + seuil) / se, df), p2 = S.tcdf((diff - seuil) / se, df);
  return { p: Math.max(p1, p2) };
};

/* ---------- Intégration numérique (Simpson composite) ---------- */
function simpson(f, a, b, n) { if (n % 2) n++; const h = (b - a) / n; let s = f(a) + f(b); for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2); return s * h / 3; }
const phi = z => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
/* densité de s = sqrt(chi2(df)/df) et bornes utiles */
function sGrille(df) {
  const lc = (df / 2) * Math.log(df) - lgamma(df / 2) - (df / 2 - 1) * Math.log(2);
  const lo = Math.sqrt(Math.max(0, df - 12 * Math.sqrt(2 * df)) / df), hi = Math.sqrt((df + 12 * Math.sqrt(2 * df) + 50) / df);
  return { f: s => s <= 0 ? 0 : Math.exp(lc + (df - 1) * Math.log(s) - df * s * s / 2), lo, hi };
}
function avecS(df, g) { // ∫ f(s) g(s) ds, ou g(1) si df très grand
  if (!isFinite(df) || df > 2000) return g(1);
  const G_ = sGrille(df); return simpson(s => G_.f(s) * g(s), G_.lo, G_.hi, 240);
}
/* Loi de l'étendue studentisée : P(Q <= q) pour k moyennes et df ddl */
S.ptukey = function (q, k, df) {
  if (!(q > 0)) return 0;
  const W = w => Math.min(1, k * simpson(z => phi(z) * Math.pow(Math.max(0, S.ncdf(z) - S.ncdf(z - w)), k - 1), -8, 8 + w, 320));
  return Math.min(1, Math.max(0, avecS(df, s => W(q * s))));
};
S.qtukey = function (p, k, df) { let lo = 0, hi = 50; for (let i = 0; i < 45; i++) { const m = (lo + hi) / 2; if (S.ptukey(m, k, df) < p) lo = m; else hi = m; } return (lo + hi) / 2; };
/* Dunnett bilatéral : P(max|T_i| <= c), lambdas_i = sqrt(n_i / (n_i + n_témoin)) */
S.pdunnett = function (c, lambdas, df) {
  const L = lambdas.map(l => [l, Math.sqrt(1 - l * l)]);
  const inner = cs => simpson(z => { let pr = phi(z); for (const [l, r] of L) { pr *= Math.max(0, S.ncdf((l * z + cs) / r) - S.ncdf((l * z - cs) / r)); if (pr < 1e-300) return 0; } return pr; }, -8, 8, 320);
  return Math.min(1, Math.max(0, avecS(df, s => inner(c * s))));
};
/* Correction de Holm */
S.holm = function (ps) {
  const idx = ps.map((p, i) => [p, i]).filter(x => x[0] != null).sort((a, b) => a[0] - b[0]); const m = idx.length; const out = ps.slice(); let mx = 0;
  idx.forEach(([p, i], r) => { mx = Math.max(mx, Math.min(1, (m - r) * p)); out[i] = mx; }); return out;
};
/* Lettres de groupes (méthode des intervalles sur moyennes triées) : pv(i,j) p-value ajustée, sens 'plus' = la plus grande moyenne reçoit « a » */
S.lettres = function (moyennes, pv, alpha, sens) {
  alpha = alpha || 0.05; const k = moyennes.length;
  const ord = moyennes.map((m, i) => [m, i]).sort((a, b) => sens === 'moins' ? a[0] - b[0] : b[0] - a[0]).map(x => x[1]);
  const L = Array.from({ length: k }, () => ''); let derniereFin = -1; let n = 0;
  for (let a = 0; a < k; a++) {
    let b = a;
    while (b + 1 < k) { let ok = true; for (let x = a; x <= b + 1 && ok; x++) for (let y = x + 1; y <= b + 1; y++) if (pv(ord[x], ord[y]) < alpha) { ok = false; break; } if (!ok) break; b++; }
    if (b > derniereFin) { const lt = String.fromCharCode(97 + (n % 26)); n++; for (let x = a; x <= b; x++) L[ord[x]] += lt; derniereFin = b; }
  }
  return L;
};
/* Shapiro-Wilk (algorithme de Royston 1992, n de 3 à 5000) */
S.shapiro = function (x) {
  const n = x.length; if (n < 3) return null;
  const y = x.slice().sort((a, b) => a - b), mu = S.mean(y), ssq = y.reduce((s, v) => s + (v - mu) ** 2, 0);
  if (ssq === 0) return { W: 1, p: 1 };
  let a = new Array(n);
  if (n === 3) { a = [-Math.SQRT1_2, 0, Math.SQRT1_2]; }
  else {
    const m = Array.from({ length: n }, (_, i) => S.ninv((i + 1 - 0.375) / (n + 0.25))); const mm = m.reduce((s, v) => s + v * v, 0);
    const u = 1 / Math.sqrt(n), cn = m[n - 1] / Math.sqrt(mm), cn1 = m[n - 2] / Math.sqrt(mm);
    const an = cn + 0.221157 * u - 0.147981 * u ** 2 - 2.071190 * u ** 3 + 4.434685 * u ** 4 - 2.706056 * u ** 5;
    let phi_;
    if (n > 5) { const an1 = cn1 + 0.042981 * u - 0.293762 * u ** 2 - 1.752461 * u ** 3 + 5.682633 * u ** 4 - 3.582633 * u ** 5;
      phi_ = (mm - 2 * m[n - 1] ** 2 - 2 * m[n - 2] ** 2) / (1 - 2 * an ** 2 - 2 * an1 ** 2);
      for (let i = 0; i < n; i++) a[i] = m[i] / Math.sqrt(phi_); a[n - 1] = an; a[0] = -an; a[n - 2] = an1; a[1] = -an1; }
    else { phi_ = (mm - 2 * m[n - 1] ** 2) / (1 - 2 * an ** 2); for (let i = 0; i < n; i++) a[i] = m[i] / Math.sqrt(phi_); a[n - 1] = an; a[0] = -an; }
  }
  const W = Math.min(1, Math.pow(a.reduce((s, ai, i) => s + ai * y[i], 0), 2) / ssq);
  let p;
  if (n === 3) p = Math.max(0, Math.min(1, 6 / Math.PI * (Math.asin(Math.sqrt(W)) - Math.asin(Math.sqrt(0.75)))));
  else if (n <= 11) { const g = 0.459 * n - 2.273, m_ = 0.5440 - 0.39978 * n + 0.025054 * n * n - 0.0006714 * n ** 3, s = Math.exp(1.3822 - 0.77857 * n + 0.062767 * n * n - 0.0020322 * n ** 3);
    const w1 = g - Math.log(1 - W); p = w1 <= 0 ? 0 : 1 - S.ncdf((-Math.log(w1) - m_) / s); }
  else { const ln = Math.log(n), m_ = -1.5861 - 0.31082 * ln - 0.083751 * ln * ln + 0.0038915 * ln ** 3, s = Math.exp(-0.4803 - 0.082676 * ln + 0.0030302 * ln * ln);
    p = 1 - S.ncdf((Math.log(1 - W) - m_) / s); }
  return { W, p: Math.max(0, Math.min(1, p)) };
};
/* Levene centré sur la médiane (Brown-Forsythe) */
S.levene = function (groups) {
  const g = groups.filter(x => x.length > 0); if (g.length < 2 || g.some(x => x.length < 2)) return null;
  const z = g.map(x => { const md = S.quantile(x, 0.5); return x.map(v => Math.abs(v - md)); });
  const r = S.anova1(z); return { F: r.F, p: isFinite(r.p) ? r.p : 1 };
};
/* ANOVA à 2 facteurs équilibrée (avec blocs facultatifs). obs: [{a, b, y, bloc}] avec a ∈ 0..A-1, b ∈ 0..B-1 */
S.anova2 = function (obs, A, B, avecBlocs) {
  const N = obs.length, gm = S.mean(obs.map(o => o.y));
  const cell = {}; obs.forEach(o => (cell[o.a + ',' + o.b] = cell[o.a + ',' + o.b] || []).push(o.y));
  const r = cell['0,0'] ? cell['0,0'].length : 0;
  for (let i = 0; i < A; i++) for (let j = 0; j < B; j++) if (!cell[i + ',' + j] || cell[i + ',' + j].length !== r) return null;
  if (r < 1 || (!avecBlocs && r < 2)) return null;
  const mA = [], mB = [], mC = {};
  for (let i = 0; i < A; i++) mA.push(S.mean(obs.filter(o => o.a === i).map(o => o.y)));
  for (let j = 0; j < B; j++) mB.push(S.mean(obs.filter(o => o.b === j).map(o => o.y)));
  Object.keys(cell).forEach(k => mC[k] = S.mean(cell[k]));
  const ssT = obs.reduce((s, o) => s + (o.y - gm) ** 2, 0);
  const ssA = B * r * mA.reduce((s, m) => s + (m - gm) ** 2, 0), ssB = A * r * mB.reduce((s, m) => s + (m - gm) ** 2, 0);
  let ssAB = 0; for (let i = 0; i < A; i++) for (let j = 0; j < B; j++) ssAB += r * (mC[i + ',' + j] - mA[i] - mB[j] + gm) ** 2;
  let ssBl = 0, dfBl = 0;
  if (avecBlocs) { const bls = [...new Set(obs.map(o => o.bloc))]; if (bls.length !== r) return null; dfBl = r - 1;
    bls.forEach(bl => { const v = obs.filter(o => o.bloc === bl).map(o => o.y); if (v.length !== A * B) ssBl = NaN; else ssBl += A * B * (S.mean(v) - gm) ** 2; }); if (isNaN(ssBl)) return null; }
  const dfA = A - 1, dfB = B - 1, dfAB = dfA * dfB, dfE = N - 1 - dfA - dfB - dfAB - dfBl; if (dfE < 1) return null;
  const ssE = Math.max(0, ssT - ssA - ssB - ssAB - ssBl), mse = ssE / dfE;
  const t = (ss, df) => { const F = mse > 0 ? (ss / df) / mse : (ss > 0 ? Infinity : 0); return { ss, df, F, p: S.fsurv(F, df, dfE) }; };
  return { A: t(ssA, dfA), B: t(ssB, dfB), AB: t(ssAB, dfAB), bloc: avecBlocs ? t(ssBl, dfBl) : null, dfE, mse, ssE, r, mC, mA, mB };
};

G.Stats = S;
})(typeof window !== 'undefined' ? window : globalThis);

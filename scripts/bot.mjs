// Piloto automático en GitHub: ejecuta la propia app (el mismo archivo HTML) sin pantalla,
// con las cotizaciones publicadas, y guarda la cartera simulada en state.json.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { createHmac, pbkdf2Sync, randomBytes } from 'node:crypto';

const REPO = process.env.REPO || 'diazsantamariaivan-lgtm/trader-datos';
const QFILE = process.env.QFILE || 'q.json';
const FFILE = process.env.FFILE || 'f.json';
const NFILE = process.env.NFILE || 'n.json';
const CFILE = process.env.CFILE || 'c.json';
const XFILE = process.env.XFILE || 'x.json';
const AFILE = process.env.AFILE || 'a.json';
const MFILE = process.env.MFILE || 'm.json';
const STATE_IN = process.env.STATE_IN || 'botstate/state.enc.json';
const STATE_OLD = 'botstate/state.json';
const CLAVE = process.env.CLAVE || '';
const OUT = process.env.OUT || 'botout';
const NTFY = process.env.NTFY || '';
const APRT = process.env.APRTEMA || '';
const NTFYB = process.env.NTFYBASE || 'https://ntfy.sh';
const APP = process.env.APP || 'app/trader_a_mano.html';
const KEY = 'traderamano.v4';

if (CLAVE.length < 12) { console.log('Falta el secreto CARTERA_CLAVE (mínimo 12 caracteres): no se opera para no dejar la cartera sin cifrar.'); process.exit(0); }
const KEY0 = pbkdf2Sync(Buffer.from(CLAVE), Buffer.from('trader-a-mano-v1'), 30000, 32, 'sha256');
const KMAC = createHmac('sha256', KEY0).update('mac').digest();
const ks = (n, i) => { const m = Buffer.alloc(n.length + 5); n.copy(m); m[n.length] = 0x65; m.writeUInt32BE(i, n.length + 1); return createHmac('sha256', KEY0).update(m).digest(); };
function enc(obj) {
  const pt = Buffer.from(JSON.stringify(obj)), n = randomBytes(16), c = Buffer.alloc(pt.length);
  for (let i = 0; i < pt.length; i += 32) { const k = ks(n, i / 32); for (let j = 0; j < 32 && i + j < pt.length; j++) c[i + j] = pt[i + j] ^ k[j]; }
  const t = createHmac('sha256', KMAC).update(Buffer.concat([n, c])).digest();
  return { v: 1, n: n.toString('base64'), c: c.toString('base64'), t: t.toString('base64') };
}
function dec(env) {
  const n = Buffer.from(env.n, 'base64'), c = Buffer.from(env.c, 'base64'), t = Buffer.from(env.t, 'base64');
  const tg = createHmac('sha256', KMAC).update(Buffer.concat([n, c])).digest();
  if (!tg.equals(t)) throw new Error('clave incorrecta');
  const pt = Buffer.alloc(c.length);
  for (let i = 0; i < c.length; i += 32) { const k = ks(n, i / 32); for (let j = 0; j < 32 && i + j < c.length; j++) pt[i + j] = c[i + j] ^ k[j]; }
  return JSON.parse(pt.toString());
}
const cfg = JSON.parse(readFileSync('bot.json', 'utf8'));
if (cfg.activo === false) { console.log('bot.json: activo=false, no se hace nada'); process.exit(0); }
const Q = JSON.parse(readFileSync(QFILE, 'utf8'));
let NJ = null; try { if (existsSync(NFILE)) NJ = JSON.parse(readFileSync(NFILE, 'utf8')); } catch (e) { NJ = null; }
let MJ = null; try { if (existsSync(MFILE)) MJ = JSON.parse(readFileSync(MFILE, 'utf8')); } catch (e) { MJ = null; }
let AJ = null; try { if (existsSync(AFILE)) AJ = JSON.parse(readFileSync(AFILE, 'utf8')); } catch (e) { AJ = null; }
let XJ = null; try { if (existsSync(XFILE)) XJ = JSON.parse(readFileSync(XFILE, 'utf8')); } catch (e) { XJ = null; }
let CJ = null; try { if (existsSync(CFILE)) CJ = JSON.parse(readFileSync(CFILE, 'utf8')); } catch (e) { CJ = null; }
let FJ = null; try { if (existsSync(FFILE)) FJ = JSON.parse(readFileSync(FFILE, 'utf8')); } catch (e) { FJ = null; }
const ageMin = (Date.now() / 1000 - Q.at) / 60;
console.log('cotizaciones de hace', ageMin.toFixed(0), 'min,', Object.keys(Q.s).length, 'valores');

let prev = null;
if (existsSync(STATE_IN)) { try { prev = dec(JSON.parse(readFileSync(STATE_IN, 'utf8'))); } catch (e) { console.log('No se pudo descifrar la cartera guardada (¿cambiaste la clave?): se detiene para no borrarla.'); process.exit(1); } }
else if (existsSync(STATE_OLD)) { try { prev = JSON.parse(readFileSync(STATE_OLD, 'utf8')); console.log('Migrando la cartera antigua a formato cifrado'); } catch (e) {} }
const fresh = !prev || prev.resetId !== cfg.reinicio;

const now = new Date(), wd = now.getUTCDay(), hu = now.getUTCHours();
const OPEN = process.env.FORCE === '1' || (wd >= 1 && wd <= 5 && hu >= 8 && hu < 21);
if (!OPEN) console.log('Mercado cerrado: no se compra, solo se vigila y se guarda la cartera');
const S0 = fresh ? {} : prev.S;
const LRN = cfg.aprender_laboratorio !== false;
const seed = Object.assign({}, S0, {
  gh: REPO, auto: OPEN, ntfy: NTFY,
  riesgo: cfg.riesgo_por_operacion_pct, maxPos: cfg.max_por_valor_pct, maxOpen: cfg.max_posiciones,
  maxDays: cfg.dias_maximos, com: cfg.comision_eur, slip: cfg.deslizamiento_pct,
  limD: cfg.freno_perdida_dia_pct, limS: cfg.freno_perdida_semana_pct,
  uni: { on: cfg.indices }, fav: cfg.favoritas || [], srv: false, srvAt: 0,
  ...(cfg.fscore_minimo != null ? { minFs: +cfg.fscore_minimo } : {}), ...(cfg.roce_minimo_pct != null ? { minRoc: +cfg.roce_minimo_pct } : {}),
  ...(cfg.vetar_noticias_negativas != null ? { vetoNews: !!cfg.vetar_noticias_negativas } : {}), ...(cfg.mercado_vigilar != null ? { regOn: !!cfg.mercado_vigilar } : {}),
  ...(cfg.analistas != null ? { anOn: !!cfg.analistas } : {}), ...(cfg.resultados_dias != null ? { earnD: +cfg.resultados_dias } : {}),
  modo: cfg.estrategia || 'mom', lrnOn: cfg.aprender_laboratorio !== false, momN: (LRN && S0.lrn) ? S0.lrn.N : (cfg.momentum_n || 20), momFreq: (LRN && S0.lrn) ? S0.lrn.f : (cfg.revision_momentum || 'm'), momFilt: (LRN && S0.lrn) ? S0.lrn.filt : true, momW: (LRN && S0.lrn) ? S0.lrn.w : 12, labCustom: Array.isArray(cfg.laboratorio) ? cfg.laboratorio : [], labGrid: cfg.laboratorio_100 !== false
});
// operaciones compartidas por otras apps (solo señales y resultado) llegadas al tema común
function aprOk(e) { return e && typeof e.u === 'string' && e.u.length <= 40 && Array.isArray(e.f) && e.f.length === 5 && e.f.every(x => x === 0 || x === 1) && Number.isFinite(e.pnl) && Math.abs(e.pnl) < 100 && ['objetivo', 'stop', 'tiempo'].includes(e.why) && Number.isFinite(e.days) && e.days >= 0 && e.days <= 60 && (e.gross == null || (Number.isFinite(e.gross) && Math.abs(e.gross) < 100)) && (e.pred == null || (Number.isFinite(e.pred.pT) && Number.isFinite(e.pred.ev))); }
let ext = (!fresh && S0.ext) ? S0.ext.slice() : [];
if (APRT) {
  try {
    const r = await fetch(NTFYB + '/' + encodeURIComponent(APRT) + '/json?poll=1&since=12h');
    const txt = await r.text(), have = new Set(ext.map(e => e.u)); let n = 0;
    for (const ln of txt.split('\n')) {
      if (!ln.trim()) continue;
      try { const m = JSON.parse(ln); if (m.event !== 'message') continue; const e = JSON.parse(m.message); if (e.k !== 'apr') continue; const rec = { u: e.u, f: e.f, pnl: e.pnl, gross: e.gross, why: e.why, days: e.days, pred: e.pred, src: 'x' }; if (aprOk(rec) && !have.has(rec.u)) { have.add(rec.u); ext.push(rec); n++; } } catch (e) {}
    }
    console.log('Operaciones compartidas nuevas:', n, '· total', ext.length);
  } catch (e) { console.log('No se pudo leer el tema compartido:', e.message); }
}
ext = ext.slice(-800);
seed.ext = ext; seed.apr = true; seed.aprT = '';
if (fresh) {
  Object.assign(seed, { cap0: cfg.capital, cash: cfg.capital, pos: [], closed: [], eq: [], log: [], startedAt: Date.now(), buysToday: 0, buyDay: '', trk: [] });
  console.log('Cartera nueva con', cfg.capital, '€');
}
if (!(ageMin <= 45)) { console.log('Cotizaciones demasiado antiguas: no se opera esta vez'); process.exit(0); }

const NTFYQ = [];
const html = readFileSync(APP, 'utf8');
const spList = (Q.idx.find(g => g.id === 'SP500') || { s: [] }).s;
const ok = b => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(b)), json: () => Promise.resolve(b) });
const errs = [];
const dom = new JSDOM(html, {
  runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://bot.local/',
  beforeParse(w) {
    w.localStorage.setItem(KEY, JSON.stringify(seed));
    w.fetch = (u, o) => {
      u = String(u);
      if (u.startsWith('https://ntfy.sh/')) { NTFYQ.push({ u, o: { method: (o && o.method) || 'POST', headers: o && o.headers, body: o && o.body } }); return ok({}); }
      if (u.includes('wikipedia')) return ok({ parse: { text: { '*': '<table class="wikitable"><tbody><tr><th>x</th></tr>' + spList.map(t => '<tr><td>' + t + '</td></tr>').join('') + '</tbody></table>' } } });
      if (u.includes('/quotes/q.json')) return ok(Q);
      if (u.includes('/fund/f.json') && FJ) return ok(FJ);
      if (u.includes('/news/n.json') && NJ) return ok(NJ);
      if (u.includes('/check/c.json') && CJ) return ok(CJ);
      if (u.includes('/ctx/x.json') && XJ) return ok(XJ);
      if (u.includes('/ana/a.json') && AJ) return ok(AJ);
      if (u.includes('/mom/m.json') && MJ) return ok(MJ);
      return Promise.reject(new TypeError('sin red'));
    };
    w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (t, k) => k === 'measureText' ? () => ({ width: 50 }) : () => {}, set: () => true });
    w.addEventListener('error', e => errs.push(e.message));
  }
});
const w = dom.window, d = w.document, $ = id => d.getElementById(id);
const wait = ms => new Promise(r => setTimeout(r, ms));
async function until(f, ms) { const t = Date.now(); while (Date.now() - t < ms) { if (f()) return true; await wait(200); } return false; }

await wait(800);
const done = await until(() => !$('stBtn').disabled && Object.keys(w.__trader.S.rows).length > 0, 280000);
if (!done) { console.log('La pasada no terminó a tiempo'); process.exit(1); }
const T = w.__trader, S = T.S;

// resumen diario hacia las 21:00 (hora de Madrid) una sola vez
const today = new Date().toISOString().slice(0, 10), hh = +new Date().toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Europe/Madrid' });
if (hh >= 21 && S.sumDay !== today && NTFY) {
  const eq = T.equity(), pl = eq - S.cap0;
  S.sumDay = today;
  S.outbox.push({ t: Date.now(), title: 'Trader a mano · resumen', body: 'Cartera ' + eq.toFixed(2) + ' € (' + (pl >= 0 ? '+' : '') + pl.toFixed(2) + ' € desde el inicio) · ' + S.pos.length + ' posiciones abiertas · ' + S.closed.length + ' cerradas.' });
}
await until(() => !S.outbox.length, 20000);
w.localStorage.setItem(KEY, JSON.stringify(S));

const KEEP = ['ext', 'cap0', 'cash', 'pos', 'closed', 'eq', 'log', 'W', 'cal', 'buyDay', 'buysToday', 'brakeDay', 'startedAt', 'favAl', 'sumDay', 'trk', 'fx', 'momAt', 'momMonth', 'shadow', 'shBench', 'labGrid', 'lrn', 'lrnLog', 'momFilt', 'momW', 'lrnDay'];
const outS = {}; KEEP.forEach(k => { if (S[k] !== undefined) outS[k] = S[k]; });
const eq = T.equity();
const state = { at: Date.now(), resetId: cfg.reinicio, equity: eq, config: cfg, S: outS };
mkdirSync(OUT, { recursive: true });
const own = S.closed.filter(t => !t.manual && t.why !== 'manual' && t.u).map(t => ({ u: t.u, f: t.f, pnl: t.pct, gross: t.gross, why: t.why, days: t.days, pred: t.pred, src: 'p' })).filter(aprOk);
const seen = new Set(own.map(e => e.u)), pool = own.concat((S.ext || []).filter(e => !seen.has(e.u)));
writeFileSync(OUT + '/aprendizaje.json', JSON.stringify({ at: Date.now(), t: pool.slice(-800) }));
writeFileSync(OUT + '/state.enc.json', JSON.stringify(enc(state)));
// los avisos se mandan después de guardar la cartera (paso siguiente del workflow)
writeFileSync('ntfy-queue.json', JSON.stringify(NTFYQ));
console.log('Cartera', eq.toFixed(2), '€ · efectivo', S.cash.toFixed(2), '· abiertas', S.pos.length, '· cerradas', S.closed.length, '· errores', errs.slice(0, 2));
process.exit(0);

// Piloto automático en GitHub: ejecuta la propia app (el mismo archivo HTML) sin pantalla,
// con las cotizaciones publicadas, y guarda la cartera simulada en state.json.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const REPO = process.env.REPO || 'diazsantamariaivan-lgtm/trader-datos';
const QFILE = process.env.QFILE || 'q.json';
const STATE_IN = process.env.STATE_IN || 'botstate/state.json';
const OUT = process.env.OUT || 'botout';
const NTFY = process.env.NTFY || '';
const APP = process.env.APP || 'app/trader_a_mano.html';
const KEY = 'traderamano.v4';

const cfg = JSON.parse(readFileSync('bot.json', 'utf8'));
if (cfg.activo === false) { console.log('bot.json: activo=false, no se hace nada'); process.exit(0); }
const Q = JSON.parse(readFileSync(QFILE, 'utf8'));
const ageMin = (Date.now() / 1000 - Q.at) / 60;
console.log('cotizaciones de hace', ageMin.toFixed(0), 'min,', Object.keys(Q.s).length, 'valores');

let prev = null;
if (existsSync(STATE_IN)) { try { prev = JSON.parse(readFileSync(STATE_IN, 'utf8')); } catch (e) {} }
const fresh = !prev || prev.resetId !== cfg.reinicio;

const S0 = fresh ? {} : prev.S;
const seed = Object.assign({}, S0, {
  gh: REPO, auto: true, ntfy: NTFY,
  riesgo: cfg.riesgo_por_operacion_pct, maxPos: cfg.max_por_valor_pct, maxOpen: cfg.max_posiciones,
  maxDays: cfg.dias_maximos, com: cfg.comision_eur, slip: cfg.deslizamiento_pct,
  limD: cfg.freno_perdida_dia_pct, limS: cfg.freno_perdida_semana_pct,
  uni: { on: cfg.indices }, fav: cfg.favoritas || [], srv: false, srvAt: 0
});
if (fresh) {
  Object.assign(seed, { cap0: cfg.capital, cash: cfg.capital, pos: [], closed: [], eq: [], log: [], startedAt: Date.now(), buysToday: 0, buyDay: '', trk: [] });
  console.log('Cartera nueva con', cfg.capital, '€');
}
if (ageMin > 45) { console.log('Cotizaciones demasiado antiguas: no se opera esta vez'); process.exit(0); }

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
      if (u.startsWith('https://ntfy.sh/')) return fetch(u, o);
      if (u.includes('wikipedia')) return ok({ parse: { text: { '*': '<table class="wikitable"><tbody><tr><th>x</th></tr>' + spList.map(t => '<tr><td>' + t + '</td></tr>').join('') + '</tbody></table>' } } });
      if (u.includes('/quotes/q.json')) return ok(Q);
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

const KEEP = ['cap0', 'cash', 'pos', 'closed', 'eq', 'log', 'W', 'cal', 'buyDay', 'buysToday', 'brakeDay', 'startedAt', 'favAl', 'sumDay', 'trk', 'fx'];
const outS = {}; KEEP.forEach(k => { if (S[k] !== undefined) outS[k] = S[k]; });
const eq = T.equity();
const state = { at: Date.now(), resetId: cfg.reinicio, equity: eq, config: cfg, S: outS };
mkdirSync(OUT, { recursive: true });
writeFileSync(OUT + '/state.json', JSON.stringify(state));
console.log('Cartera', eq.toFixed(2), '€ · efectivo', S.cash.toFixed(2), '· abiertas', S.pos.length, '· cerradas', S.closed.length, '· errores', errs.slice(0, 2));
process.exit(0);

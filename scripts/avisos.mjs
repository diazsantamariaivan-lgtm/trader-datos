// Envía los avisos que dejó el piloto, una vez guardada la cartera.
import { readFileSync, existsSync } from 'fs';
if (!existsSync('ntfy-queue.json')) process.exit(0);
const q = JSON.parse(readFileSync('ntfy-queue.json', 'utf8'));
for (const m of q) { try { await fetch(m.u, m.o); } catch (e) { console.log('aviso no enviado:', e.message); } }
console.log('avisos enviados:', q.length);

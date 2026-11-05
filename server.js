import http from 'node:http';
import { randomInt, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { room, player, act, options } from './game.js';
const root = fileURLToPath(new URL('./public/', import.meta.url));
const dataDir = process.env.DATA_DIR || fileURLToPath(new URL('./.data/', import.meta.url));
mkdirSync(dataDir, { recursive: true });
const dbPath = `${dataDir}/rooms.json`;
const rooms = new Map(existsSync(dbPath) ? JSON.parse(readFileSync(dbPath, 'utf8')) : []);
const persist = () => { writeFileSync(`${dbPath}.tmp`, JSON.stringify([...rooms])); renameSync(`${dbPath}.tmp`, dbPath); };
const limits = new Map();
const send = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
function view(entry, token) {
  const id = entry.tokens[token]; if (!id) throw new Error('Your seat could not be found. Join the table again.');
  const g = entry.game, p = g.players.find(p => p.id === id);
  return { ...g, me: id, options: g.status === 'playing' && (g.phase === 'white' && !g.responses[id] || g.phase === 'color' && g.players[g.active].id === id) ? options(g, p) : [] };
}
const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) {
      if (req.method === 'GET' && url.pathname === '/api/state') {
        const entry = rooms.get(url.searchParams.get('code')); if (!entry) return send(res, 404, { error: 'That table was not found. Check the six-digit code.' });
        return send(res, 200, view(entry, req.headers.authorization?.replace('Bearer ', '')));
      }
      if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed.' });
      if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}` && req.headers.origin !== `https://${req.headers.host}`) return send(res, 403, { error: 'Use this app to make a move.' });
      let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 4096) { send(res, 413, { error: 'Request too large.' }); return; } }
      const input = JSON.parse(body || '{}');
      if (url.pathname === '/api/create' || url.pathname === '/api/join') {
        const key = req.socket.remoteAddress, now = Date.now(), limit = limits.get(key);
        if (limit && now - limit.time < 60000 && limit.count >= 30) return send(res, 429, { error: 'Too many attempts. Try again in a minute.' });
        limits.set(key, { time: limit && now - limit.time < 60000 ? limit.time : now, count: limit && now - limit.time < 60000 ? limit.count + 1 : 1 });
        const name = typeof input.name === 'string' ? input.name.trim().slice(0, 24) : ''; if (!name) throw new Error('Enter your name to take a seat.');
        const token = randomUUID(), p = player(randomUUID(), name); let code, entry;
        if (url.pathname === '/api/create') {
          do { code = String(randomInt(100000, 1000000)); } while (rooms.has(code));
          entry = { game: room(code, p), tokens: { [token]: p.id } }; rooms.set(code, entry);
        } else {
          code = String(input.code); entry = rooms.get(code); if (!entry) throw new Error('That table was not found. Check the six-digit code.');
          if (entry.game.status !== 'lobby') throw new Error('This game has already started. Ask the host for a new table.');
          if (entry.game.players.length >= 8) throw new Error('This table is full (8 players).');
          if (entry.game.players.some(x => x.name.toLowerCase() === name.toLowerCase())) throw new Error('That name is taken at this table. Try another.');
          entry.game.players.push(p); entry.tokens[token] = p.id; entry.game.revision++;
        }
        persist(); return send(res, 200, { token, code, state: view(entry, token) });
      }
      if (url.pathname === '/api/action') {
        const entry = rooms.get(String(input.code)); if (!entry) throw new Error('Table not found.');
        const token = req.headers.authorization?.replace('Bearer ', ''); const id = entry.tokens[token]; if (!id) return send(res, 401, { error: 'Your seat could not be found.' });
        if (input.revision !== entry.game.revision) return send(res, 409, { error: 'The table changed. Please choose again.', state: view(entry, token) });
        act(entry.game, id, input.action, () => randomInt(1, 7)); persist(); return send(res, 200, view(entry, token));
      }
      return send(res, 404, { error: 'Not found.' });
    }
    if (!['GET', 'HEAD'].includes(req.method)) return send(res, 405, { error: 'Method not allowed.' });
    const files = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'], '/favicon.svg': ['favicon.svg', 'image/svg+xml'] };
    const file = files[url.pathname]; if (!file) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': `${file[1]}; charset=utf-8`, 'Cache-Control': 'no-cache' }); res.end(req.method === 'HEAD' ? '' : readFileSync(root + file[0]));
  } catch (error) { send(res, 400, { error: error.message || 'Something went wrong. Please try again.' }); }
});
server.listen(Number(process.env.PORT || 3000), process.env.HOST || '0.0.0.0', () => console.log(`Dice Rows: http://localhost:${server.address().port}`));

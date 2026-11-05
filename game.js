export const COLORS = ['red', 'yellow', 'blue', 'green'];
export const numbers = color => Array.from({ length: 11 }, (_, i) => color === 'red' || color === 'yellow' ? i + 2 : 12 - i);
export const points = n => n * (n + 1) / 2;
export const score = p => COLORS.map(c => points(p.rows[c].marks.length + Number(p.rows[c].locked))).reduce((a, b) => a + b, 0) - p.penalties * 5;
export function player(id, name) { return { id, name, rows: Object.fromEntries(COLORS.map(c => [c, { marks: [], locked: false }])), penalties: 0 }; }
export function room(code, host) { return { code, players: [host], host: host.id, status: 'lobby', phase: 'roll', active: 0, round: 1, dice: null, locked: [], responses: {}, marked: false, revision: 0, log: ['The table is open. Make yourself at home.'] }; }
const fail = text => { throw new Error(text); };
function log(g, text) { g.log = [...g.log.slice(-11), text]; }
export function legal(g, p, color, value) {
  if (!COLORS.includes(color) || !Number.isInteger(value)) return false;
  const r = p.rows[color], ns = numbers(color), index = ns.indexOf(value);
  return index >= 0 && !g.locked.includes(color) && !r.locked && index > Math.max(-1, ...r.marks.map(n => ns.indexOf(n))) && (index !== 10 || r.marks.length >= 5);
}
export function options(g, p, phase = g.phase) {
  if (!g.dice) return [];
  const values = phase === 'white' ? [g.dice.white[0] + g.dice.white[1]] : null;
  return COLORS.flatMap(c => [...new Set(values || g.dice.white.map(w => w + g.dice[c]))].filter(n => legal(g, p, c, n)).map(n => ({ color: c, value: n })));
}
function mark(g, p, color, value) {
  p.rows[color].marks.push(value);
  if (numbers(color).at(-1) === value) { p.rows[color].locked = true; log(g, `${p.name} locked ${color}.`); }
  log(g, `${p.name} crossed ${value} in ${color}.`);
}
function collectLocks(g) { g.locked = COLORS.filter(c => g.players.some(p => p.rows[c].locked)); }
function finishTurn(g) {
  const p = g.players[g.active];
  if (!g.marked) { p.penalties++; log(g, `${p.name} took a −5 penalty.`); }
  collectLocks(g);
  if (g.locked.length >= 2 || p.penalties >= 4) { g.status = 'finished'; g.phase = 'finished'; log(g, 'The game is complete. Every cross counts.'); return; }
  g.active = (g.active + 1) % g.players.length; g.round++; g.phase = 'roll'; g.responses = {}; g.marked = false;
}
export function act(g, id, action, random = () => Math.floor(Math.random() * 6) + 1) {
  const p = g.players.find(p => p.id === id); if (!p) fail('Join this table first.');
  if (action.type === 'start') {
    if (g.status !== 'lobby' || id !== g.host) fail('Only the host can start a waiting game.');
    g.status = 'playing'; log(g, `${p.name} started the game.`);
  } else if (action.type === 'roll') {
    if (g.status !== 'playing' || g.phase !== 'roll' || g.players[g.active].id !== id) fail('Wait for your turn to roll.');
    g.dice = { white: [random(), random()], ...Object.fromEntries(COLORS.filter(c => !g.locked.includes(c)).map(c => [c, random()])) }; g.phase = 'white'; g.responses = {}; g.marked = false;
    log(g, `${p.name} rolled. White dice total ${g.dice.white.reduce((a,b) => a+b)}.`);
  } else if (action.type === 'choose') {
    if (g.status !== 'playing' || !['white', 'color'].includes(g.phase)) fail('There is no move to make yet.');
    if (g.phase === 'white' && g.responses[id]) fail('You already finished this step.');
    if (g.phase === 'color' && g.players[g.active].id !== id) fail('Only the active player can use a colored die.');
    if (!action.skip) {
      if (!options(g, p).some(o => o.color === action.color && o.value === action.value)) fail('That number is not available.');
      mark(g, p, action.color, action.value); if (g.players[g.active].id === id) g.marked = true;
    } else log(g, `${p.name} passed the ${g.phase === 'white' ? 'white' : 'color'} step.`);
    if (g.phase === 'white') {
      g.responses[id] = true;
      if (g.players.every(p => g.responses[p.id])) { collectLocks(g); g.phase = 'color'; }
    } else finishTurn(g);
  } else fail('Unknown action.');
  g.revision++; return g;
}

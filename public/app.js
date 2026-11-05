const app = document.querySelector('#app');
const colors = ['red', 'yellow', 'blue', 'green'];
const labels = { red: 'Red', yellow: 'Yellow', blue: 'Blue', green: 'Green' };
const ns = c => Array.from({ length: 11 }, (_, i) => ['red', 'yellow'].includes(c) ? i + 2 : 12 - i);
const points = n => n * (n + 1) / 2;
const total = p => colors.reduce((s, c) => s + points(p.rows[c].marks.length + Number(p.rows[c].locked)), 0) - 5 * p.penalties;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let session; try { session = JSON.parse(localStorage.getItem('dice-rows-seat')); } catch {}
let state = null, selected = null, busy = false, mode = 'host', online = true;
const lock = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v3"/></svg>';
const arrow = '<span aria-hidden="true">↗</span>';
function die(n, color = 'white') {
  const pips = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
  return `<div class="die ${color}" role="img" aria-label="${color} die: ${n}">${Array.from({ length: 9 }, (_, i) => `<i class="${pips[n]?.includes(i + 1) ? 'pip' : ''}"></i>`).join('')}</div>`;
}
function header() { return `<header class="topbar"><a href="/" class="brand" aria-label="Dice Rows home"><span class="brand-icon">${die(5, 'green')}</span>dice rows<span class="brand-period">.</span></a><button class="text-button" data-action="rules"><span class="question">?</span> How to play</button></header>`; }
function footer() { return '<footer><span>A LITTLE LUCK. A LITTLE STRATEGY.</span><span>Made for your kind of game night. ✳</span></footer>'; }
function demoCard() {
  return `<div class="preview-card"><div class="preview-head"><span class="eyebrow">YOUR NEXT GAME NIGHT</span><span class="mini-star">✳</span></div><h3>Good rolls.<br>Great company.</h3><p>Four colors. Endless little decisions.</p><div class="demo-rows">${colors.map((c, j) => `<div class="demo-row ${c}"><span class="demo-arrow">→</span>${ns(c).slice(0, 7).map((n, i) => `<span class="demo-number ${[1, 3, 4].includes(i + j) ? 'crossed' : ''}">${n}</span>`).join('')}<span class="demo-lock">${lock}</span></div>`).join('')}</div><div class="preview-bottom"><div class="demo-dice">${die(2)}${die(5)}${die(6, 'red')}</div><div><strong>Find your number.</strong><br><span>Make your move.</span></div></div><span class="paper-tag">every cross counts</span></div>`;
}
function landing() {
  app.innerHTML = `${header()}<main class="landing"><section class="intro"><div class="eyebrow"><span class="tiny-dot"></span> YOUR TABLE IS WAITING</div><h1>Roll with<br>your people<span>.</span></h1><p class="lead">A cozy little dice game for friends, near or far.<br class="desktop"> Grab a seat. Chase a good roll. Make it count.</p><div class="entry-card"><div class="tabs" role="tablist" aria-label="Game mode"><button role="tab" aria-selected="${mode === 'host'}" data-mode="host">Start a table ${arrow}</button><button role="tab" aria-selected="${mode === 'join'}" data-mode="join">Join friends ${arrow}</button></div><form id="entry-form"><label for="name">YOUR NAME</label><input id="name" name="name" autocomplete="nickname" maxlength="24" placeholder="What should we call you?" required>${mode === 'join' ? '<label for="code">TABLE CODE</label><input id="code" name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" placeholder="Six digits, one good time" required>' : ''}<button class="primary wide" type="submit">${mode === 'host' ? 'Create a table' : 'Take a seat'} <span>→</span></button></form><p class="entry-note">${mode === 'host' ? 'Get a code. Invite your friends. No accounts needed.' : 'Ask your host for the six-digit table code.'}</p></div><div class="little-features"><span>◎ 1–8 players</span><span>◷ Your pace</span><span>▤ Any phone</span></div></section><section class="landing-art" aria-label="Illustration of the scorecard">${demoCard()}<div class="art-note"><span>↖</span> Less setup. More game night.</div></section></main>${footer()}`;
}
function lobby() {
  const host = state.me === state.host;
  app.innerHTML = `${header()}<main class="lobby"><div class="eyebrow"><span class="tiny-dot"></span> THE GANG’S GETTING TOGETHER</div><h1>A seat for<br>everyone<span>.</span></h1><p class="lead">Share the code. Let the good rolls begin.</p><div class="lobby-card"><div class="code-label">YOUR TABLE CODE</div><button class="room-code" data-action="copy" aria-label="Copy table code ${state.code}">${state.code}<span>⧉</span></button><p class="muted">Friends can join on any device using this code.</p><div class="lobby-players">${state.players.map((p, i) => `<div><span class="avatar a${i % 4}">${esc(p.name.slice(0, 1).toUpperCase())}</span><strong>${esc(p.name)}</strong><span class="muted">${p.id === state.host ? 'Host' : 'Ready'}${p.id === state.me ? ' · you' : ''}</span></div>`).join('')}</div>${host ? '<button class="primary wide" data-action="start">Everyone’s here. Let’s play <span>→</span></button><p class="entry-note">You can also start solo to learn the ropes.</p>' : '<p class="waiting-note"><span class="tiny-dot"></span> Waiting for the host to start…</p>'}</div><button class="text-button exit" data-action="leave">Leave this table</button></main>${footer()}`;
}
function scorecard(p) {
  return `<section class="scorecard"><div class="section-heading"><div><span class="eyebrow">MAKE YOUR MARK</span><h2>Your scorecard</h2></div><span class="small-hint">Move left to right <span>→</span></span></div><div class="row-scroll" tabindex="0" role="region" aria-label="Your scorecard; scroll horizontally for all numbers"><div class="rows">${colors.map(c => {
    const r = p.rows[c], last = Math.max(-1, ...r.marks.map(n => ns(c).indexOf(n)));
    return `<div class="number-row ${c} ${state.locked.includes(c) ? 'row-locked' : ''}"><div class="row-label"><span>${labels[c]}</span><span>→</span></div><div class="number-cells">${ns(c).map((n, i) => {
      const crossed = r.marks.includes(n), available = state.options.some(o => o.color === c && o.value === n), chosen = selected?.color === c && selected?.value === n;
      return `<button class="number ${crossed ? 'crossed' : ''} ${i <= last && !crossed ? 'gone' : ''} ${available ? 'available' : ''} ${chosen ? 'selected' : ''} ${i === 10 ? 'last-number' : ''}" data-color="${c}" data-value="${n}" aria-label="${labels[c]} ${n}${crossed ? ', crossed' : i === 10 ? ', requires five previous crosses' : ''}" aria-pressed="${chosen}" ${!available || busy ? 'disabled' : ''}>${n}</button>`;
    }).join('')}<div class="lock-cell ${r.locked ? 'crossed' : ''}" aria-label="${labels[c]} ${r.locked ? 'locked' : 'lock; cross the last number after five previous marks'}">${lock}</div></div><div class="row-points">${points(r.marks.length + Number(r.locked))}<small>PTS</small></div></div>`;
  }).join('')}</div></div><div class="card-foot"><span>${lock} Last number + lock need <strong>5 earlier crosses.</strong></span><span class="scroll-hint">Swipe to see all numbers →</span></div></section>`;
}
function game() {
  const rowScroll = document.querySelector(".row-scroll")?.scrollLeft || 0;
  const p = state.players.find(p => p.id === state.me), active = state.players[state.active], mine = active.id === state.me;
  const canChoose = state.status === 'playing' && (state.phase === 'white' && !state.responses[state.me] || state.phase === 'color' && mine);
  const finished = state.status === 'finished';
  const phaseText = finished ? 'That’s a wrap.' : state.phase === 'roll' ? mine ? 'Your turn to roll.' : `${esc(active.name)} is up.` : state.phase === 'white' ? state.responses[state.me] ? 'Your choice is in.' : 'A little something for everyone.' : mine ? 'Add a little color.' : `${esc(active.name)} has one more choice.`;
  const instruction = finished ? 'The final scores are in. Good company is always a win.' : state.phase === 'roll' ? mine ? 'Give the dice a tumble. Everyone gets a chance to play.' : 'Sit tight. Your next chance to cross is coming.' : state.phase === 'white' ? state.responses[state.me] ? 'Waiting for everyone else to mark a number or pass.' : `Use the two white dice: ${state.dice.white[0]} + ${state.dice.white[1]} = <strong>${state.dice.white[0] + state.dice.white[1]}</strong>. Pick one row, or pass.` : mine ? 'Pair either white die with a colored die. Pick one number, or pass.' : 'Only the active player can pair a white and colored die.';
  app.innerHTML = `${header()}<main class="game-layout"><aside class="table-panel"><div class="table-code"><span class="eyebrow">YOUR TABLE</span><button data-action="copy">${state.code} <span>⧉</span></button></div><div class="players-title">AROUND THE TABLE <span>${state.players.length}</span></div><div class="player-list">${state.players.map((x, i) => `<div class="player-item ${x.id === active.id && !finished ? 'active-player' : ''}"><span class="avatar a${i % 4}">${esc(x.name.slice(0, 1).toUpperCase())}</span><div><strong>${esc(x.name)} ${x.id === state.me ? '<small>(you)</small>' : ''}</strong><span>${finished ? 'Final score' : state.phase === 'white' ? state.responses[x.id] ? '✓ Choice made' : 'Choosing…' : x.id === active.id ? 'Taking a turn' : 'At the table'}</span></div><b>${total(x)}<small>pts</small></b></div>`).join('')}</div><div class="table-tip"><span>✳</span><p>Big scores start<br>with little decisions.</p></div><button class="text-button exit" data-action="leave">Back to home</button><p class="rejoin-note">Your seat is saved in this browser.</p></aside><div class="play-area"><div class="game-topline"><span class="eyebrow">${finished ? 'UNTIL NEXT TIME' : `TURN ${state.round} · ${mine ? 'YOUR ROLL' : `${esc(active.name).toUpperCase()}’S ROLL`}`}</span><span class="live-status ${online ? '' : 'offline'}"><i></i>${online ? 'Table connected' : 'Reconnecting…'}</span></div><section class="turn-card"><div class="turn-heading"><div><h1>${phaseText}</h1><p>${instruction}</p></div>${state.phase === 'roll' && mine && !finished ? `<button class="primary roll-button" data-action="roll" ${busy ? 'disabled' : ''}><span>⚄</span> Roll the dice</button>` : ''}</div><div class="dice-line"><div class="dice-group white-dice">${(state.dice?.white || [2, 5]).map(n => die(n)).join('<span class="plus">+</span>')}<span class="dice-caption">${state.dice ? `WHITE TOTAL · ${state.dice.white[0] + state.dice.white[1]}` : 'FOR EVERYONE'}</span></div><div class="dice-divider"></div><div class="dice-group colored-dice">${colors.map(c => state.locked.includes(c) ? `<div class="removed-die ${c}" aria-label="${c} removed">${lock}</div>` : die(state.dice?.[c] || 1 + colors.indexOf(c), c)).join('')}<span class="dice-caption">${finished ? 'A GOOD GAME, WELL PLAYED' : 'ONE WHITE + ONE COLOR · ACTIVE PLAYER'}</span></div></div>${!finished ? `<div class="phase-track"><span class="${state.phase === 'white' ? 'current' : ''}"><b>1</b> Everyone: white dice</span><span class="track-arrow">→</span><span class="${state.phase === 'color' ? 'current' : ''}"><b>2</b> ${mine ? 'You' : esc(active.name)}: add a color</span></div>` : ''}</section>${finished ? results() : ''}${scorecard(p)}<section class="score-strip"><div class="score-label"><span class="eyebrow">THE LITTLE THINGS ADD UP</span><h3>Your score</h3></div><div class="score-equation">${colors.map((c, i) => `${i ? '<span class="math">+</span>' : ''}<div class="score-part ${c}"><b>${points(p.rows[c].marks.length + Number(p.rows[c].locked))}</b><span>${labels[c]}</span></div>`).join('')}<span class="math">−</span><div class="score-part penalty-score"><b>${p.penalties * 5}</b><span>Penalties</span></div><span class="math">=</span><div class="total-score"><b>${total(p)}</b><span>POINTS</span></div></div></section><div class="below-score"><div class="penalties"><span>Penalties</span>${Array.from({ length: 4 }, (_, i) => `<span class="penalty-box ${i < p.penalties ? 'taken' : ''}">${i < p.penalties ? '×' : '−5'}</span>`).join('')}<span class="muted">4 ends the game</span></div><button class="text-button" data-action="scoring">Scoring guide ↗</button></div>${!finished ? `<section class="action-bar" aria-live="polite"><div>${selected ? `<strong>Cross ${selected.value} in <span class="ink-${selected.color}">${labels[selected.color]}</span>?</strong><span>This also skips all earlier numbers.${ns(selected.color).at(-1) === selected.value ? ' This locks the row.' : ''}</span>` : canChoose ? `<strong>${state.options.length ? 'See a number you like?' : 'No available numbers this step.'}</strong><span>${state.options.length ? 'Tap a highlighted number, then confirm your cross.' : 'Pass to keep the table moving.'}</span>` : '<strong>All good. We’ll wait here.</strong><span>The table moves on when everyone has chosen.</span>'}</div><div class="action-buttons">${selected ? '<button class="secondary" data-action="cancel">Cancel</button><button class="primary" data-action="confirm">Confirm cross <span>×</span></button>' : canChoose ? '<button class="secondary" data-action="pass">Pass this step →</button>' : ''}</div></section>` : ''}<details class="activity"><summary>At the table <span>Latest moves</span></summary><ol>${[...state.log].reverse().map(l => `<li>${esc(l)}</li>`).join('')}</ol></details></div></main>${footer()}`;
  document.querySelector('.row-scroll').scrollLeft = rowScroll;
}
function results() {
  const ranked = [...state.players].sort((a,b) => total(b) - total(a)); const winners = ranked.filter(p => total(p) === total(ranked[0]));
  return `<section class="results"><span class="eyebrow">✳ ${winners.length > 1 ? 'SHARED VICTORY' : 'THE WINNING SEAT'}</span><h2>${winners.map(p => esc(p.name)).join(' & ')} ${winners.length > 1 ? 'win' : 'wins'} with ${total(ranked[0])} points.</h2><p>${state.locked.length >= 2 ? 'Two colors locked.' : 'Four penalties taken.'} Thanks for bringing your luck to the table.</p><button class="primary" data-action="new">Start a fresh table →</button></section>`;
}
function render() { if (!state) landing(); else if (state.status === 'lobby') lobby(); else game(); }
function toast(message) { const el = document.querySelector('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 4500); }
async function request(path, data) {
  const res = await fetch(`/api/${path}`, { method: data ? 'POST' : 'GET', headers: { ...(data ? { 'Content-Type': 'application/json' } : {}), ...(session ? { Authorization: `Bearer ${session.token}` } : {}) }, ...(data ? { body: JSON.stringify(data) } : {}), signal: AbortSignal.timeout(8000) });
  const result = await res.json(); if (!res.ok) { if (result.state) { state = result.state; selected = null; render(); } throw new Error(result.error); } return result;
}
async function action(a) {
  if (busy || !online) return; busy = true;
  try { state = await request('action', { code: session.code, revision: state.revision, action: a }); selected = null; }
  catch (e) { toast(e.message); } finally { busy = false; render(); }
}
async function poll() {
  if (!session || busy) return;
  try {
    const next = await request(`state?code=${session.code}`); const changed = !state || state.revision !== next.revision || !online;
    online = true; if (changed) { state = next; if (selected && !state.options.some(o => o.color === selected.color && o.value === selected.value)) selected = null; render(); }
  } catch (e) { if (online) { online = false; if (state) render(); else { landing(); toast('Could not reconnect to your table. Try again or start a new one.'); } } }
}
app.addEventListener('submit', async e => {
  if (e.target.id !== 'entry-form') return; e.preventDefault(); if (busy) return;
  const data = Object.fromEntries(new FormData(e.target)); busy = true; const button = e.target.querySelector('button[type="submit"]'); button.disabled = true; button.textContent = 'Finding your seat…';
  try { const result = await request(mode === 'host' ? 'create' : 'join', data); session = { code: result.code, token: result.token }; localStorage.setItem('dice-rows-seat', JSON.stringify(session)); state = result.state; online = true; render(); }
  catch (error) { toast(error.message); button.disabled = false; button.textContent = mode === 'host' ? 'Create a table →' : 'Take a seat →'; } finally { busy = false; }
});
app.addEventListener('click', async e => {
  const target = e.target.closest('button'); if (!target) return;
  if (target.dataset.mode) { const name = document.querySelector('#name')?.value || ''; mode = target.dataset.mode; landing(); document.querySelector('#name').value = name; return; }
  if (target.dataset.color) { selected = { color: target.dataset.color, value: Number(target.dataset.value) }; game(); document.querySelector('[data-action="confirm"]')?.focus({ preventScroll: true }); return; }
  switch (target.dataset.action) {
    case 'rules': case 'scoring': document.querySelector('#rules').showModal(); break;
    case 'copy': try { await navigator.clipboard.writeText(state.code); toast('Table code copied. Send it to your people.'); } catch { toast(`Your table code is ${state.code}.`); } break;
    case 'start': case 'roll': await action({ type: target.dataset.action }); break;
    case 'pass': await action({ type: 'choose', skip: true }); break;
    case 'confirm': if (selected) await action({ type: 'choose', ...selected }); break;
    case 'cancel': selected = null; render(); break;
    case 'leave': state = null; selected = null; session = null; landing(); toast('Your seat is still saved. Refresh to return to the table.'); break;
    case 'new': session = null; state = null; selected = null; localStorage.removeItem('dice-rows-seat'); landing(); break;
  }
});
render(); if (session) poll(); setInterval(poll, 1200);

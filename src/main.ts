import "./style.css";
import {
  colors,
  numbers,
  legal,
  rowScore,
  score,
  type Game,
  type Color,
  type Action,
} from "./rules";
const app = document.querySelector<HTMLDivElement>("#app")!;
let game: Game | undefined,
  id = localStorage.getItem("dice-rows-id") || "",
  selected = "",
  error = "",
  connected = false;
let ws: WebSocket;
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
function send(message: unknown) {
  if (connected) ws.send(JSON.stringify(message));
}
function connect() {
  ws = new WebSocket(
    `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws`,
  );
  ws.onopen = () => {
    connected = true;
    const token = localStorage.getItem("dice-rows-token");
    if (token) send({ type: "resume", token });
    render();
  };
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.type === "seat") {
      id = m.id;
      localStorage.setItem("dice-rows-id", id);
      localStorage.setItem("dice-rows-token", m.token);
    }
    if (m.type === "state") {
      game = m.game;
      selected = "";
      error = "";
    }
    if (m.type === "error") {
      error = m.message;
      if (error.includes("no longer available")) {
        localStorage.removeItem("dice-rows-token");
        game = undefined;
      }
    }
    render();
  };
  ws.onclose = () => {
    connected = false;
    render();
    setTimeout(connect, 1500);
  };
}
function equation(p: Game["players"][number]) {
  return `<div class="equation">${colors.map((c) => `<span class="${c}">${rowScore(c, p.card.rows[c])}</span>`).join("<b> + </b>")}${p.card.penalties ? `<b> − ${5 * p.card.penalties}</b>` : ""}<b> = ${score(p.card)}</b></div>`;
}
function options(c: Color, n: number): Action[] {
  return (["white", "color"] as Action[]).filter((a) =>
    legal(game!, id, c, n, a),
  );
}
function render() {
  const g = game,
    p = g?.players.find((p) => p.id === id);
  app.innerHTML = `<header><a href="/" aria-label="Dice Rows home">▧ <span>Dice Rows</span></a><small>ROLL. CHOOSE. CROSS.</small></header><main>${!connected ? '<div class="notice">Connecting… Your seat will resume automatically.</div>' : ""}${error ? `<div role="alert" class="error">${escape(error)}</div>` : ""}${
    !g
      ? `<section class="intro"><span class="eyebrow">A LITTLE LUCK. A LINE OF POSSIBILITIES.</span><h1>Make every<br>roll count.</h1><p>Gather your people. Find your numbers.<br>Build four rows, one choice at a time.</p></section><section class="panel"><label for="name">Your name</label><input id="name" maxlength="24" placeholder="What should we call you?" autocomplete="nickname"><button id="host" class="primary">Host game <span>↗</span></button><div class="divider">OR JOIN YOUR PEOPLE</div><label for="code">Game code</label><input id="code" inputmode="numeric" maxlength="6" placeholder="6-digit code"><button id="join">Join game →</button></section><p class="footnote">1–6 players · One phone each · No account needed</p>`
      : g.phase === "lobby"
        ? `<section class="intro compact"><span class="eyebrow">MAKE ROOM AT THE TABLE</span><h1>Your game is<br>coming together.</h1><p>Share this code with your people.</p></section><section class="panel"><div class="code-label">GAME CODE</div><div class="game-code">${g.code}</div><div class="divider">THE TABLE · ${g.players.length} / 6</div><ul class="players">${g.players.map((x, i) => `<li><span class="avatar">${i + 1}</span><strong>${escape(x.name)}</strong><small>${x.id === g.host ? "HOST" : x.id === id ? "YOU" : "READY"}</small></li>`).join("")}</ul>${id === g.host ? '<button id="start" class="primary">Start game →</button>' : '<p class="muted">Waiting for the host to start…</p>'}</section>`
        : g.phase === "ended"
          ? `<section class="intro compact"><span class="eyebrow">THE LAST ROLL</span><h1>Every mark<br>made a difference.</h1><p>${g.locked.length >= 2 ? "Two rows locked." : "Four penalties reached."} Here’s how the table finished.</p></section><section class="results">${[
              ...g.players,
            ]
              .sort((a, b) => score(b.card) - score(a.card))
              .map(
                (x) =>
                  `<article class="panel ${score(x.card) === Math.max(...g.players.map((x) => score(x.card))) ? "winner" : ""}"><div class="result-title"><h2>${escape(x.name)}</h2><span>${score(x.card) === Math.max(...g.players.map((x) => score(x.card))) ? "★ WINNER" : ""}</span></div>${equation(x)}<small>${x.card.penalties} ${x.card.penalties === 1 ? "penalty" : "penalties"}</small></article>`,
              )
              .join("")}</section><button id="new">Back to home</button>`
          : `<section class="turn-heading"><div><span class="eyebrow">ROLL ${g.round || "—"} · GAME ${g.code}</span><h1>${g.players[g.active].id === id ? "Your turn." : `${escape(g.players[g.active].name)}’s turn.`}</h1></div><span class="turn-badge">${g.phase === "roll" ? "READY TO ROLL" : "CHOOSE YOUR MARKS"}</span></section><section class="panel dice-panel"><div class="dice">${g.dice ? [...g.dice.white.map((v) => `<div class="die white" aria-label="White ${v}">${v}</div>`), ...colors.filter((c) => g.dice!.colored[c] !== undefined).map((c) => `<div class="die ${c}" aria-label="${c} ${g.dice!.colored[c]}">${g.dice!.colored[c]}</div>`)].join("") : '<p class="muted">A new roll, a new possibility.</p>'}</div>${g.phase === "roll" ? `<button id="roll" class="primary" ${g.players[g.active].id !== id ? "disabled" : ""}>Roll dice ↻</button>` : `<p class="dice-help">White sum <strong>${g.dice!.white[0] + g.dice!.white[1]}</strong> · ${g.players[g.active].id === id ? "You may also use a white + matching color." : "Choose one row, or pass."}</p>`}</section><section class="scorecard"><div class="card-heading"><h2>${escape(p!.name)}’s rows</h2><small>${p!.card.penalties} / 4 penalties</small></div>${colors
              .map(
                (c) =>
                  `<div class="row ${c} ${g.locked.includes(c) ? "locked" : ""}"><div class="row-label">${c}<span>${g.locked.includes(c) ? "LOCKED" : `${p!.card.rows[c].length} marks`}</span></div><div class="row-scroll"><div class="boxes">${numbers(
                    c,
                  )
                    .map((n, i) => {
                      const opts = options(c, n),
                        key = `${c}-${n}`,
                        marked = p!.card.rows[c].includes(n);
                      return `${i === 10 ? '<div class="lock-group">' : ""}<button class="box ${marked ? "marked" : ""} ${opts.length ? "legal" : ""} ${selected === key ? "selected" : ""}" data-color="${c}" data-number="${n}" ${!opts.length ? "disabled" : ""} aria-label="${c} ${n}${marked ? " marked" : selected === key ? " tap again to confirm" : ""}">${marked ? "×" : n}</button>`;
                    })
                    .join(
                      "",
                    )}<div class="box lock" aria-label="${c} lock">${p!.card.rows[c].includes(numbers(c)[10]) ? "×" : "🔒"}</div></div></div></div></div>`,
              )
              .join(
                "",
              )}${equation(p!)}</section><p class="hint" aria-live="polite">${selected ? "Tap the highlighted number again to confirm." : "Tap a glowing number to choose it. Tap again to mark."}</p>${g.phase === "decide" && !p!.done ? `<button id="finish" class="primary">${p!.actions.length ? "Confirm marks ✓" : "Pass →"}</button>${!p!.actions.length && g.players[g.active].id === id ? '<p class="penalty-note">Passing without a mark adds a −5 penalty.</p>' : ""}` : g.phase === "decide" ? '<div class="notice">Your choices are confirmed. Waiting for the table.</div>' : ""}<section class="table-status"><span class="eyebrow">AROUND THE TABLE</span>${g.players.map((x) => `<div><strong>${escape(x.name)}${x.id === id ? " (you)" : ""}</strong><span>${g.phase === "roll" ? (g.players[g.active].id === x.id ? "Rolling next" : "Waiting") : x.done ? "✓ Ready" : "Deciding…"}</span></div>`).join("")}</section><details><summary>How to play</summary><p>Mark numbers from left to right; anything skipped stays behind. Everyone can use the two white dice once. The roller can also use one white die + one matching colored die. Use white first to take both actions.</p><p>You need five marks before the final number. That number also marks the lock. Locks take effect for everyone after this roll. Finish your choices so the next player can roll. Two locked rows or four penalties ends the game.</p></details>`
  }</main><footer>FOUR ROWS. YOUR CALL.</footer>`;
  const click = (key: string, fn: () => void) =>
    document.getElementById(key)?.addEventListener("click", fn);
  const name = () =>
    (document.getElementById("name") as HTMLInputElement).value;
  click("host", () => send({ type: "host", name: name() }));
  click("join", () =>
    send({
      type: "join",
      name: name(),
      code: (document.getElementById("code") as HTMLInputElement).value.trim(),
    }),
  );
  for (const type of ["start", "roll"]) click(type, () => send({ type }));
  click("finish", () => send({ type: "finish" }));
  click("new", () => {
    localStorage.removeItem("dice-rows-token");
    localStorage.removeItem("dice-rows-id");
    location.reload();
  });
  document.querySelectorAll<HTMLButtonElement>("[data-number]").forEach(
    (b) =>
      (b.onclick = (e) => {
        e.stopPropagation();
        const c = b.dataset.color as Color,
          n = Number(b.dataset.number),
          key = `${c}-${n}`;
        if (selected === key) {
          const action = options(c, n)[0];
          send({ type: "mark", color: c, number: n, action });
          selected = "";
        } else selected = key;
        const offsets = [...document.querySelectorAll(".row-scroll")].map(
          (x) => x.scrollLeft,
        );
        render();
        document
          .querySelectorAll(".row-scroll")
          .forEach((x, i) => (x.scrollLeft = offsets[i]));
      }),
  );
}
document.addEventListener("click", () => {
  if (selected) {
    selected = "";
    const offsets = [...document.querySelectorAll(".row-scroll")].map(
      (x) => x.scrollLeft,
    );
    render();
    document
      .querySelectorAll(".row-scroll")
      .forEach((x, i) => (x.scrollLeft = offsets[i]));
  }
});
connect();

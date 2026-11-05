import React, { useEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import type { Game, RowColor } from "../shared/rules";
import { scoreTotal } from "../shared/score";
import { ScoreCard } from "./ScoreCard";
import { ScoreLine } from "./ScoreLine";
import "./style.css";
type Session = { token: string; playerId: string; game: Game };
function App() {
  const [session, setSession] = useState<Session | null>(null),
    [name, setName] = useState(""),
    [code, setCode] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function request(path: string, body?: unknown) {
    const res = await fetch(path, {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Something went wrong");
    return data;
  }
  const actionPending = useRef(false),
    revision = useRef(0);
  const [connectionError, setConnectionError] = useState("");
  useEffect(() => {
    if (!session) return;
    let live = true,
      polling = false;
    const id = setInterval(async () => {
      if (polling || actionPending.current) return;
      polling = true;
      const startedAt = revision.current;
      try {
        const data = await request("/api/game");
        if (live && startedAt === revision.current && !actionPending.current) {
          setSession((s) => (s ? { ...s, game: data.game } : s));
          setConnectionError("");
        }
      } catch {
        if (live)
          setConnectionError(
            "Connection lost. Keep this page open while we try again.",
          );
      } finally {
        polling = false;
      }
    }, 500);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [session?.token]);
  async function enter(host: boolean) {
    setBusy(true);
    setError("");
    try {
      setSession(
        await request(`/api/${host ? "host" : "join"}`, {
          name: name.trim(),
          code,
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function action(type: string, extra = {}) {
    if (actionPending.current) return;
    actionPending.current = true;
    revision.current += 1;
    setBusy(true);
    setError("");
    try {
      const data = await request("/api/action", { type, ...extra });
      setSession((s) => (s ? { ...s, game: data.game } : s));
      setConnectionError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      revision.current += 1;
      actionPending.current = false;
      setBusy(false);
    }
  }
  const game = session?.game,
    me = game?.players.find((p) => p.id === session?.playerId),
    active = game?.players.find((p) => p.id === game.activePlayerId),
    resolved = game?.resolvedPlayerIds.includes(session?.playerId || "");
  return (
    <main>
      <header className="brand">
        <a href="/">
          DICE <span>ROWS</span>
          <i>✳</i>
        </a>
        <span className="tag">A little luck. A little strategy.</span>
      </header>
      {connectionError && (
        <div className="error" role="status">
          {connectionError}
        </div>
      )}
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {!session ? (
        <>
          <section className="intro">
            <span className="eyebrow">ROLL / CHOOSE / CROSS</span>
            <h1>
              Good rolls.
              <br />
              Great company.
            </h1>
            <p>
              Four colorful rows. Six dice. A table full of possibilities. Bring
              your friends and see where the numbers take you.
            </p>
            <div className="mini-dice" aria-hidden="true">
              <b>⚄</b>
              <b>⚂</b>
              <b>⚅</b>
            </div>
          </section>
          <section className="entry panel">
            <h2>Make room for a game.</h2>
            <label>
              Your name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={24}
                placeholder="What should we call you?"
                autoComplete="nickname"
              />
            </label>
            <button
              className="primary"
              disabled={!name.trim() || busy}
              onClick={() => enter(true)}
            >
              Host game <span>↗</span>
            </button>
            <div className="divider">or join your friends</div>
            <label>
              Game code
              <input
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="6-digit code"
              />
            </label>
            <button
              className="secondary"
              disabled={!name.trim() || code.length !== 6 || busy}
              onClick={() => enter(false)}
            >
              Join game →
            </button>
          </section>
          <footer>2–5 FRIENDS · ONE PHONE EACH · ENDLESS POSSIBILITIES</footer>
        </>
      ) : game && me ? (
        <>
          {game.phase === "lobby" ? (
            <section className="lobby panel">
              <span className="eyebrow">THE TABLE IS OPEN</span>
              <h1>You're in.</h1>
              <p>Share this code with your friends.</p>
              <div className="game-code">{game.code}</div>
              <div className="section-label">
                YOUR TABLE <span>{game.players.length}/5</span>
              </div>
              <ul className="players">
                {game.players.map((p, i) => (
                  <li key={p.id}>
                    <span className="avatar">
                      {p.name.slice(0, 1).toUpperCase()}
                    </span>
                    <strong>{p.name}</strong>
                    <small>
                      {i === 0 ? "HOST" : p.id === me.id ? "YOU" : "READY"}
                    </small>
                  </li>
                ))}
              </ul>
              {game.players[0].id === me.id ? (
                <button
                  className="primary"
                  disabled={game.players.length < 2 || busy}
                  onClick={() => action("start")}
                >
                  Start game →
                </button>
              ) : (
                <p className="waiting">Waiting for the host to start…</p>
              )}
              <p className="hint">Everyone needs to keep this page open.</p>
            </section>
          ) : (
            <>
              <div className="game-heading">
                <div>
                  <span className="eyebrow">
                    {game.phase === "ended"
                      ? "THE FINAL TALLY"
                      : `ROUND ${game.turn + 1} · ${game.code}`}
                  </span>
                  <h1>
                    {game.phase === "ended"
                      ? "That’s a wrap."
                      : active?.id === me.id
                        ? "Your turn to roll."
                        : `${active?.name}’s turn.`}
                  </h1>
                </div>
                <span className="you-tag">{me.name}</span>
              </div>
              {game.phase === "ended" ? (
                <section className="panel final">
                  <h2>Every mark counts.</h2>
                  {[...game.players]
                    .sort((a, b) => {
                      return scoreTotal(b) - scoreTotal(a);
                    })
                    .map((p, i) => (
                      <div className="result" key={p.id}>
                        <span>{i === 0 ? "♛" : i + 1}</span>
                        <div>
                          <strong>{p.name}</strong>
                          <ScoreLine player={p} />
                        </div>
                      </div>
                    ))}
                  <p className="hint">Thanks for sharing the table.</p>
                </section>
              ) : (
                <section className="roll-panel panel">
                  <div className="dice-tray">
                    {game.dice ? (
                      <>
                        <div className="die white">{game.dice.white[0]}</div>
                        <div className="die white">{game.dice.white[1]}</div>
                        {(["red", "yellow", "blue", "green"] as RowColor[]).map(
                          (c) =>
                            game.dice?.colors[c] && (
                              <div key={c} className={`die ${c}`}>
                                {game.dice.colors[c]}
                              </div>
                            ),
                        )}
                      </>
                    ) : (
                      <p>The next possibility is one roll away.</p>
                    )}
                  </div>
                  {game.phase === "rolling" ? (
                    <button
                      className="primary"
                      disabled={active?.id !== me.id || busy}
                      onClick={() => action("roll")}
                    >
                      {active?.id === me.id
                        ? "Roll dice"
                        : "Waiting for the roll…"}
                    </button>
                  ) : (
                    <>
                      <p className="mark-help">
                        {resolved
                          ? "Your choices are in. Waiting for the table…"
                          : "Tap an available number twice to cross it off."}
                      </p>
                      <button
                        className="primary"
                        disabled={resolved || busy}
                        onClick={() => action("resolve")}
                      >
                        {resolved
                          ? "Waiting for everyone…"
                          : (game.turnMarks[me.id]?.count || 0) > 0
                            ? "Confirm marks"
                            : "No number"}
                      </button>
                      <span className="hint">
                        {game.resolvedPlayerIds.length} of {game.players.length}{" "}
                        players ready
                      </span>
                    </>
                  )}
                </section>
              )}
              <section className="your-card">
                <div className="section-label">
                  YOUR SCORECARD <span>{me.penalties}/4 penalties</span>
                </div>
                <ScoreCard
                  busy={busy}
                  game={game}
                  playerId={me.id}
                  onMark={(color, number, kind) =>
                    action("mark", { color, number, kind })
                  }
                />
                <div className="score-footer">
                  <span>YOUR TOTAL</span>
                  <ScoreLine player={me} />
                </div>
              </section>
              <details className="rules">
                <summary>A quick guide</summary>
                <p>
                  Move right in each row; skipped numbers stay behind. Everyone
                  can use the two white dice together. On your turn, you may
                  also use one white die with a matching colored die. Take the
                  white sum first if you want both.
                </p>
                <p>
                  Five marks unlock the last number. Crossing it also crosses
                  the lock. Two locked rows or four penalties finish the game.
                  Each penalty costs 5 points.
                </p>
              </details>
            </>
          )}
        </>
      ) : null}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<App />);

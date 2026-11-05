import React, { useEffect, useState } from "react";
import { canMark, type Game, type RowColor } from "../shared/rules";
type Kind = "white" | "combo";
export function ScoreCard({
  game,
  playerId,
  onMark,
  busy = false,
}: {
  busy?: boolean;
  game: Game;
  playerId: string;
  onMark: (color: RowColor, number: number, kind: Kind) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const player = game.players.find((p) => p.id === playerId)!;
  useEffect(() => {
    const cancel = () => setSelected(null);
    document.addEventListener("click", cancel);
    return () => document.removeEventListener("click", cancel);
  }, []);
  return (
    <div className="score-card">
      {(["red", "yellow", "blue", "green"] as RowColor[]).map((color, i) => {
        const nums = Array.from({ length: 11 }, (_, n) =>
          i < 2 ? n + 2 : 12 - n,
        );
        const marked = player.board[color];
        const box = (n: number) => {
          const white = canMark(game, playerId, color, n, "white");
          const combo = canMark(game, playerId, color, n, "combo");
          const kind: Kind = white ? "white" : "combo";
          const key = `${color}-${n}`;
          const checked = marked.includes(n);
          return (
            <button
              key={n}
              type="button"
              aria-label={`${color} ${n}${checked ? " marked" : ""}`}
              aria-pressed={selected === key}
              disabled={busy || checked || (!white && !combo)}
              className={`number ${checked ? "marked" : ""} ${selected === key ? "selected" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                if (selected === key) {
                  setSelected(null);
                  onMark(color, n, kind);
                } else setSelected(selected ? null : key);
              }}
            >
              {checked ? "×" : n}
            </button>
          );
        };
        return (
          <section
            className={`row ${color}`}
            key={color}
            aria-label={`${color} row`}
          >
            <div className="row-heading">
              <span>{color}</span>
              <span>
                {game.lockedRows.includes(color)
                  ? "Locked"
                  : i < 2
                    ? "2 → 12"
                    : "12 → 2"}{" "}
                · {marked.length + (marked.includes(nums[10]) ? 1 : 0)} marks
              </span>
            </div>
            <div className="row-scroll">
              <div className="row-numbers">
                {nums.slice(0, -1).map(box)}
                <div className="lock-pair">
                  {box(nums[10])}
                  <span
                    className={`lock ${marked.includes(nums[10]) ? "marked" : ""}`}
                    aria-label={`${color} lock`}
                  >
                    {marked.includes(nums[10]) ? "×" : "▣"}
                  </span>
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}

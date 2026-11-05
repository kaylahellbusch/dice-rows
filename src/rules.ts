export const colors = ["red", "yellow", "blue", "green"] as const;
export type Color = (typeof colors)[number];
export type Action = "white" | "color";
export interface Card {
  rows: Record<Color, number[]>;
  penalties: number;
}
export interface Player {
  id: string;
  name: string;
  card: Card;
  done: boolean;
  actions: Action[];
}
export interface Game {
  code: string;
  host: string;
  players: Player[];
  phase: "lobby" | "roll" | "decide" | "ended";
  active: number;
  locked: Color[];
  pending: Color[];
  dice: { white: number[]; colored: Partial<Record<Color, number>> } | null;
  round: number;
}
export function card(): Card {
  return { rows: { red: [], yellow: [], blue: [], green: [] }, penalties: 0 };
}
export function numbers(c: Color): number[] {
  return Array.from({ length: 11 }, (_, i) =>
    c === "red" || c === "yellow" ? i + 2 : 12 - i,
  );
}
export function createGame(code: string, id: string, name: string): Game {
  return {
    code,
    host: id,
    players: [{ id, name, card: card(), done: false, actions: [] }],
    phase: "lobby",
    active: 0,
    locked: [],
    pending: [],
    dice: null,
    round: 0,
  };
}
export function join(g: Game, id: string, name: string): void {
  if (g.phase !== "lobby") throw Error("This game has already started.");
  if (g.players.length >= 6) throw Error("This game is full.");
  g.players.push({ id, name, card: card(), done: false, actions: [] });
}
export function start(g: Game, id: string): void {
  if (g.host !== id || g.phase !== "lobby")
    throw Error("Only the host can start the lobby.");
  g.phase = "roll";
}
export function roll(g: Game, id: string, faces: number[]): void {
  if (g.phase !== "roll" || g.players[g.active].id !== id)
    throw Error("Wait for your turn to roll.");
  if (
    faces.length !== 6 ||
    faces.some((n) => !Number.isInteger(n) || n < 1 || n > 6)
  )
    throw Error("Invalid dice.");
  g.dice = { white: faces.slice(0, 2), colored: {} };
  colors.forEach((c, i) => {
    if (!g.locked.includes(c)) g.dice!.colored[c] = faces[i + 2];
  });
  g.players.forEach((p) => {
    p.done = false;
    p.actions = [];
  });
  g.pending = [];
  g.round++;
  g.phase = "decide";
}
export function legal(
  g: Game,
  id: string,
  c: Color,
  n: number,
  action: Action,
): boolean {
  const p = g.players.find((p) => p.id === id);
  if (
    !p ||
    g.phase !== "decide" ||
    p.done ||
    !g.dice ||
    !colors.includes(c) ||
    g.locked.includes(c)
  )
    return false;
  const ns = numbers(c),
    row = p.card.rows[c],
    index = ns.indexOf(n);
  if (
    index < 0 ||
    index <= Math.max(-1, ...row.map((v) => ns.indexOf(v))) ||
    row.includes(ns[10])
  )
    return false;
  if (index === 10 && row.length < 5) return false;
  if (action === "white")
    return !p.actions.length && n === g.dice.white[0] + g.dice.white[1];
  return (
    g.players[g.active].id === id &&
    !p.actions.includes("color") &&
    g.dice.colored[c] !== undefined &&
    g.dice.white.some((w) => w + (g.dice!.colored[c] as number) === n)
  );
}
export function mark(
  g: Game,
  id: string,
  c: Color,
  n: number,
  action: Action,
): void {
  if (!legal(g, id, c, n, action))
    throw Error("That mark is not legal for this roll.");
  const p = g.players.find((p) => p.id === id)!;
  p.card.rows[c].push(n);
  p.actions.push(action);
  if (n === numbers(c)[10] && !g.pending.includes(c)) g.pending.push(c);
}
export function finish(g: Game, id: string): void {
  const p = g.players.find((p) => p.id === id);
  if (g.phase !== "decide" || !p || p.done)
    throw Error("You have already finished or no roll is open.");
  p.done = true;
  if (!g.players.every((p) => p.done)) return;
  const active = g.players[g.active];
  if (!active.actions.length) active.card.penalties++;
  g.locked = [...new Set([...g.locked, ...g.pending])];
  g.pending = [];
  if (g.locked.length >= 2 || g.players.some((p) => p.card.penalties >= 4))
    g.phase = "ended";
  else {
    g.active = (g.active + 1) % g.players.length;
    g.phase = "roll";
  }
  g.dice = null;
}
export function rowScore(c: Color, row: number[]): number {
  const count = row.length + (row.includes(numbers(c)[10]) ? 1 : 0);
  return (count * (count + 1)) / 2;
}
export function score(c: Card): number {
  return (
    colors.reduce((s, color) => s + rowScore(color, c.rows[color]), 0) -
    5 * c.penalties
  );
}

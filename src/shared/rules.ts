export const COLORS = ["red", "yellow", "blue", "green"] as const;
export type RowColor = (typeof COLORS)[number];
export type MarkKind = "white" | "combo";
export type Board = Record<RowColor, number[]>;
export interface Player {
  id: string;
  name: string;
  board: Board;
  penalties: number;
}
export interface Dice {
  white: [number, number];
  colors: Partial<Record<RowColor, number>>;
}
export interface TurnMarks {
  white: boolean;
  combo: boolean;
  count: number;
}
export interface Game {
  code: string;
  players: Player[];
  activePlayerId: string;
  phase: "lobby" | "rolling" | "marking" | "ended";
  dice: Dice | null;
  lockedRows: RowColor[];
  resolvedPlayerIds: string[];
  turnMarks: Record<string, TurnMarks>;
  turn: number;
}
export function rowNumbers(c: RowColor): number[] {
  const ns = Array.from({ length: 11 }, (_, i) => i + 2);
  return c === "red" || c === "yellow" ? ns : ns.reverse();
}
export function createPlayer(id: string, name: string): Player {
  if (!name.trim()) throw Error("Enter a name");
  return {
    id,
    name: name.trim().slice(0, 30),
    board: { red: [], yellow: [], blue: [], green: [] },
    penalties: 0,
  };
}
export function createGame(
  code: string,
  host: Pick<Player, "id" | "name">,
): Game {
  return {
    code,
    players: [createPlayer(host.id, host.name)],
    activePlayerId: host.id,
    phase: "lobby",
    dice: null,
    lockedRows: [],
    resolvedPlayerIds: [],
    turnMarks: {},
    turn: 0,
  };
}
export function joinGame(g: Game, p: Pick<Player, "id" | "name">): Game {
  if (g.phase !== "lobby") throw Error("This game has already started");
  if (g.players.length >= 5) throw Error("This game is full");
  if (g.players.some((x) => x.id === p.id)) throw Error("Already joined");
  return { ...g, players: [...g.players, createPlayer(p.id, p.name)] };
}
export function startGame(g: Game, id: string): Game {
  if (id !== g.players[0]?.id || g.phase !== "lobby")
    throw Error("Only the host can start");
  if (g.players.length < 2) throw Error("At least two players are needed");
  return { ...g, phase: "rolling" };
}
export function rollDice(
  g: Game,
  id: string,
  random: () => number = Math.random,
): Game {
  if (g.phase !== "rolling" || id !== g.activePlayerId)
    throw Error("It is not your roll");
  const die = () => Math.min(6, Math.max(1, Math.floor(random() * 6) + 1));
  const colors: Dice["colors"] = {};
  for (const c of COLORS) if (!g.lockedRows.includes(c)) colors[c] = die();
  return {
    ...g,
    phase: "marking",
    dice: { white: [die(), die()], colors },
    resolvedPlayerIds: [],
    turnMarks: Object.fromEntries(
      g.players.map((p) => [p.id, { white: false, combo: false, count: 0 }]),
    ),
  };
}
export function canMark(
  g: Game,
  id: string,
  c: RowColor,
  n: number,
  kind: MarkKind,
): boolean {
  if (!COLORS.includes(c) || !["white", "combo"].includes(kind)) return false;
  const p = g.players.find((p) => p.id === id),
    m = g.turnMarks[id];
  if (
    !p ||
    !m ||
    g.phase !== "marking" ||
    !g.dice ||
    g.resolvedPlayerIds.includes(id) ||
    g.lockedRows.includes(c)
  )
    return false;
  const row = rowNumbers(c),
    i = row.indexOf(n),
    crossed = p.board[c];
  if (
    i < 0 ||
    (crossed.length > 0 && i <= row.indexOf(crossed[crossed.length - 1]))
  )
    return false;
  if (i === 10 && crossed.length < 5) return false;
  if (kind === "white")
    return !m.white && !m.combo && n === g.dice.white[0] + g.dice.white[1];
  return (
    id === g.activePlayerId &&
    !m.combo &&
    g.dice.colors[c] !== undefined &&
    g.dice.white.some((w) => w + g.dice!.colors[c]! === n)
  );
}
export function legalMarks(
  g: Game,
  id: string,
): {
  color: RowColor;
  number: number;
  kind: MarkKind;
}[] {
  return COLORS.flatMap((color) =>
    rowNumbers(color).flatMap((number) =>
      (["white", "combo"] as const)
        .filter((kind) => canMark(g, id, color, number, kind))
        .map((kind) => ({ color, number, kind })),
    ),
  );
}
export function markNumber(
  g: Game,
  id: string,
  c: RowColor,
  n: number,
  kind: MarkKind,
): Game {
  if (!canMark(g, id, c, n, kind)) throw Error("That mark is not allowed");
  const m = g.turnMarks[id];
  return {
    ...g,
    players: g.players.map((p) =>
      p.id === id
        ? { ...p, board: { ...p.board, [c]: [...p.board[c], n] } }
        : p,
    ),
    turnMarks: {
      ...g.turnMarks,
      [id]: { ...m, [kind]: true, count: m.count + 1 },
    },
  };
}
export function resolvePlayer(g: Game, id: string): Game {
  if (
    g.phase !== "marking" ||
    !g.players.some((p) => p.id === id) ||
    g.resolvedPlayerIds.includes(id)
  )
    throw Error("Cannot confirm this turn");
  const resolvedPlayerIds = [...g.resolvedPlayerIds, id];
  if (resolvedPlayerIds.length < g.players.length)
    return { ...g, resolvedPlayerIds };
  const players = g.players.map((p) =>
    p.id === g.activePlayerId && g.turnMarks[p.id].count === 0
      ? { ...p, penalties: p.penalties + 1 }
      : p,
  );
  const lockedRows = COLORS.filter(
    (c) =>
      g.lockedRows.includes(c) ||
      players.some((p) => p.board[c].includes(rowNumbers(c)[10])),
  );
  const ended = lockedRows.length >= 2 || players.some((p) => p.penalties >= 4),
    index = players.findIndex((p) => p.id === g.activePlayerId);
  return {
    ...g,
    players,
    lockedRows,
    resolvedPlayerIds,
    phase: ended ? "ended" : "rolling",
    activePlayerId: ended
      ? g.activePlayerId
      : players[(index + 1) % players.length].id,
    dice: ended ? g.dice : null,
    turn: g.turn + 1,
  };
}

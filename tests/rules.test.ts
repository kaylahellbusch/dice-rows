import { describe, it, expect } from "vitest";
import {
  createGame,
  join,
  start,
  roll,
  mark,
  legal,
  finish,
  score,
  rowScore,
  card,
  type Game,
} from "../src/rules";
function setup(two = false) {
  const g = createGame("123456", "a", "A");
  if (two) join(g, "b", "B");
  start(g, "a");
  return g;
}
const dice = [1, 1, 1, 1, 1, 1];
describe("rules", () => {
  it("enforces left-to-right and skipped numbers in both directions", () => {
    const g = setup();
    g.players[0].card.rows.red = [5];
    g.players[0].card.rows.blue = [9];
    roll(g, "a", [1, 3, 1, 1, 1, 1]);
    expect(legal(g, "a", "red", 4, "white")).toBe(false);
    expect(legal(g, "a", "blue", 4, "white")).toBe(true);
    expect(legal(g, "a", "blue", 10, "color")).toBe(false);
  });
  it("requires five existing marks and counts the lock in the score", () => {
    const g = setup();
    g.players[0].card.rows.red = [2, 3, 4, 5];
    roll(g, "a", [6, 6, 6, 6, 6, 6]);
    expect(legal(g, "a", "red", 12, "white")).toBe(false);
    g.players[0].card.rows.red.push(6);
    mark(g, "a", "red", 12, "white");
    expect(rowScore("red", g.players[0].card.rows.red)).toBe(28);
    expect(legal(g, "a", "red", 12, "color")).toBe(false);
  });
  it("requires white before color when using both actions", () => {
    let g = setup();
    roll(g, "a", [2, 5, 6, 1, 1, 1]);
    mark(g, "a", "red", 8, "color");
    expect(legal(g, "a", "yellow", 7, "white")).toBe(false);
    g = setup();
    roll(g, "a", [2, 5, 6, 1, 1, 1]);
    mark(g, "a", "yellow", 7, "white");
    mark(g, "a", "red", 8, "color");
    expect(g.players[0].actions).toEqual(["white", "color"]);
    expect(legal(g, "a", "red", 11, "color")).toBe(false);
  });
  it("nonactive players get one white mark and no colored action", () => {
    const g = setup(true);
    roll(g, "a", [2, 5, 6, 1, 1, 1]);
    expect(legal(g, "b", "red", 8, "color")).toBe(false);
    mark(g, "b", "red", 7, "white");
    expect(legal(g, "b", "yellow", 7, "white")).toBe(false);
  });
  it("waits for everyone and penalizes only the empty active player", () => {
    const g = setup(true);
    roll(g, "a", dice);
    finish(g, "a");
    expect(g.phase).toBe("decide");
    finish(g, "b");
    expect(g.players.map((p) => p.card.penalties)).toEqual([1, 0]);
    expect(g.active).toBe(1);
    expect(g.phase).toBe("roll");
  });
  it("does not penalize the active player who marks", () => {
    const g = setup();
    roll(g, "a", dice);
    mark(g, "a", "red", 2, "white");
    finish(g, "a");
    expect(g.players[0].card.penalties).toBe(0);
  });
  it("allows simultaneous last numbers, resolves locks, and removes the locked die", () => {
    const g = setup(true);
    g.players.forEach((p) => (p.card.rows.red = [2, 3, 4, 5, 6]));
    roll(g, "a", [6, 6, 6, 6, 6, 6]);
    mark(g, "a", "red", 12, "white");
    finish(g, "a");
    expect(g.locked).toEqual([]);
    mark(g, "b", "red", 12, "white");
    finish(g, "b");
    expect(g.locked).toEqual(["red"]);
    roll(g, "b", dice);
    expect(g.dice!.colored.red).toBeUndefined();
    expect(legal(g, "b", "red", 2, "white")).toBe(false);
  });
  it("ends only after resolving a roll with two locks", () => {
    const g = setup(true);
    g.locked = ["blue"];
    g.players[0].card.rows.red = [2, 3, 4, 5, 6];
    roll(g, "a", [6, 6, 1, 1, 1, 1]);
    mark(g, "a", "red", 12, "white");
    finish(g, "a");
    expect(g.phase).toBe("decide");
    finish(g, "b");
    expect(g.phase).toBe("ended");
  });
  it("ends at four penalties", () => {
    const g = setup();
    for (let i = 0; i < 4; i++) {
      roll(g, "a", dice);
      finish(g, "a");
    }
    expect(g.phase).toBe("ended");
    expect(g.players[0].card.penalties).toBe(4);
  });
  it("scores the given examples as 40 and 35", () => {
    const c = card();
    c.rows = {
      red: [2, 3],
      yellow: [2, 3, 4, 5, 6, 7],
      blue: [12, 11, 10],
      green: [12, 11, 10, 9],
    };
    expect(score(c)).toBe(40);
    c.penalties = 1;
    expect(score(c)).toBe(35);
  });
  it("rejects unauthorized rolls, invalid dice, repeated finish and invalid marks", () => {
    const g = setup(true);
    expect(() => roll(g, "b", dice)).toThrow();
    expect(() => roll(g, "a", [0, 1, 1, 1, 1, 1])).toThrow();
    roll(g, "a", dice);
    expect(() => mark(g, "b", "red", 5, "white")).toThrow();
    finish(g, "b");
    expect(() => finish(g, "b")).toThrow();
  });
  it("allows six players and rejects a seventh", () => {
    const g = createGame("123456", "a", "A");
    for (let i = 1; i < 6; i++) join(g, String(i), String(i));
    expect(() => join(g, "extra", "Extra")).toThrow("full");
    start(g, "a");
    expect(g.players).toHaveLength(6);
    expect(g.phase).toBe("roll");
  });
  it("scores all twelve marks including the lock as 78", () => {
    expect(rowScore("red", [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])).toBe(78);
  });
});

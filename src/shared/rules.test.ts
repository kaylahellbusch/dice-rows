import { describe, it, expect } from "vitest";
import {
  createGame,
  joinGame,
  startGame,
  rollDice,
  markNumber,
  canMark,
  resolvePlayer,
  type Game,
} from "./rules";
function setup(): Game {
  const g = rollDice(
    startGame(
      joinGame(createGame("123456", { id: "a", name: "A" }), {
        id: "b",
        name: "B",
      }),
      "a",
    ),
    "a",
    () => 0.5,
  );
  return {
    ...g,
    dice: { white: [3, 3], colors: { red: 4, yellow: 4, blue: 4, green: 4 } },
  };
}
function finish(g: Game) {
  return resolvePlayer(resolvePlayer(g, "a"), "b");
}
describe("rules", () => {
  it("left to right", () => {
    let g = setup();
    g.players[0].board.red = [7];
    expect(canMark(g, "a", "red", 6, "white")).toBe(false);
  });
  it("last number needs 5 marks and marks lock", () => {
    let g = setup();
    g.dice!.white = [6, 6];
    expect(canMark(g, "a", "red", 12, "white")).toBe(false);
    g.players[0].board.red = [2, 3, 4, 5, 6];
    g = markNumber(g, "a", "red", 12, "white");
    expect(finish(g).lockedRows).toContain("red");
  });
  it("white sum before color combo", () => {
    let g = markNumber(setup(), "a", "red", 7, "combo");
    expect(canMark(g, "a", "yellow", 6, "white")).toBe(false);
    g = markNumber(setup(), "a", "red", 6, "white");
    expect(canMark(g, "a", "red", 7, "combo")).toBe(true);
  });
  it("only active player uses color combo", () => {
    expect(canMark(setup(), "b", "red", 7, "combo")).toBe(false);
  });
  it("at most 2 marks for active, 1 for others", () => {
    let g = markNumber(setup(), "a", "red", 6, "white");
    g = markNumber(g, "a", "red", 7, "combo");
    expect(canMark(g, "a", "yellow", 7, "combo")).toBe(false);
    g = markNumber(g, "b", "red", 6, "white");
    expect(canMark(g, "b", "yellow", 6, "white")).toBe(false);
  });
  it("penalty only for active player", () => {
    const g = finish(setup());
    expect(g.players.map((p) => p.penalties)).toEqual([1, 0]);
  });
  it("locked row removes its die", () => {
    const g = setup();
    g.lockedRows = ["red"];
    g.phase = "rolling";
    expect(rollDice(g, "a").dice!.colors.red).toBeUndefined();
  });
  it("ends at 2 locked rows", () => {
    const g = setup();
    g.lockedRows = ["red", "blue"];
    expect(finish(g).phase).toBe("ended");
  });
  it("ends at 4 penalties", () => {
    const g = setup();
    g.players[0].penalties = 3;
    expect(finish(g).phase).toBe("ended");
  });
  it("waits for everyone and permits simultaneous last numbers", () => {
    let g = setup();
    g.dice!.white = [6, 6];
    g.players.forEach((p) => (p.board.red = [2, 3, 4, 5, 6]));
    g = markNumber(g, "a", "red", 12, "white");
    g = resolvePlayer(g, "a");
    expect(g.phase).toBe("marking");
    expect(canMark(g, "b", "red", 12, "white")).toBe(true);
  });
});

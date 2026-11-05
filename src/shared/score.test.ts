import { it, expect } from "vitest";
import { createPlayer } from "./rules";
import { scoreRow, scoreTotal } from "./score";
it("example scores", () => {
  const p = createPlayer("a", "A");
  p.board = {
    red: [2, 3],
    yellow: [2, 3, 4, 5, 6, 7],
    blue: [12, 11, 10],
    green: [12, 11, 10, 9],
  };
  expect(scoreTotal(p)).toBe(40);
  p.penalties = 1;
  expect(scoreTotal(p)).toBe(35);
  expect(scoreRow([2, 3, 4, 5, 6, 12], "red")).toBe(28);
});

// @vitest-environment jsdom
import React from "react";
import { it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { createPlayer } from "../shared/rules";
import { ScoreLine } from "./ScoreLine";
afterEach(cleanup);
it("colors each row's points", () => {
  const p = createPlayer("a", "Alice");
  p.board = {
    red: [2, 3],
    yellow: [2, 3, 4, 5, 6, 7],
    blue: [12, 11, 10],
    green: [12, 11, 10, 9],
  };
  const { container } = render(<ScoreLine player={p} />);
  expect(container.textContent).toBe("3 + 21 + 6 + 10 = 40");
  expect(
    [...container.querySelectorAll(".points")].map((e) => e.className),
  ).toEqual(["points red", "points yellow", "points blue", "points green"]);
  expect(screen.getByLabelText("Score 40")).toBeTruthy();
});

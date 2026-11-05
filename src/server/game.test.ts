// @vitest-environment node
import { describe, it, expect } from "vitest";
import { GameService } from "./game";
describe("server game", () => {
  it("rejects illegal mark", () => {
    const s = new GameService(),
      host = s.host("Ada"),
      guest = s.join(host.game.code, "Lin");
    s.action(host.token, { type: "start" });
    s.action(host.token, { type: "roll" });
    const before = structuredClone(s.read(host.token).game);
    expect(() =>
      s.action(guest.token, {
        type: "mark",
        color: "red",
        number: 12,
        kind: "combo",
      }),
    ).toThrow();
    expect(s.read(host.token).game).toEqual(before);
    expect(s.read(guest.token).game).toEqual(before);
  });
  it("isolates games and rejects forged sessions", () => {
    const s = new GameService(),
      a = s.host("Ada"),
      b = s.host("Bo");
    expect(a.game.code).toMatch(/^\d{6}$/);
    expect(b.game.code).not.toBe(a.game.code);
    expect(() => s.action("fake", { type: "start" })).toThrow();
    expect(() => s.join("000000", "Lin")).toThrow("No game with that code");
    expect(() => s.host(" ")).toThrow();
  });
  it("enforces host start and two to five players", () => {
    const s = new GameService(),
      a = s.host("Ada");
    expect(() => s.action(a.token, { type: "start" })).toThrow();
    const b = s.join(a.game.code, "Bo");
    expect(() => s.action(b.token, { type: "start" })).toThrow();
    for (const name of ["Cy", "Dee", "Eli"]) s.join(a.game.code, name);
    expect(() => s.join(a.game.code, "Flo")).toThrow("full");
    s.action(a.token, { type: "start" });
    expect(() => s.join(a.game.code, "Flo")).toThrow("started");
  });
});

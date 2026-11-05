import { it, expect } from "vitest";
import { WebSocket } from "ws";
import { gameServer } from "../server/index";
it("validates lobby, identity, authoritative dice and malformed moves over WebSockets", async () => {
  const server = gameServer(0);
  await new Promise<void>((r) => server.http.on("listening", r));
  const port = (server.http.address() as { port: number }).port;
  const sockets: WebSocket[] = [];
  async function client() {
    const ws = new WebSocket(`ws://localhost:${port}/ws`);
    sockets.push(ws);
    await new Promise((r) => ws.on("open", r));
    return ws;
  }
  async function request(ws: WebSocket, m: unknown) {
    await new Promise((r) => setTimeout(r, 20));
    return new Promise<any>((resolve) => {
      ws.once("message", (data) => resolve(JSON.parse(data.toString())));
      ws.send(JSON.stringify(m));
    });
  }
  try {
    const a = await client();
    expect((await request(a, { type: "host", name: " " })).message).toContain(
      "name",
    );
    const seat = await request(a, { type: "host", name: "A" });
    expect(seat.token).toHaveLength(64);
    const g = [...server.games.values()][0];
    const b = await client();
    expect(
      (await request(b, { type: "join", name: "B", code: "000000" })).message,
    ).toContain("not found");
    const bs = await request(b, { type: "join", name: "B", code: g.code });
    expect(bs.type).toBe("seat");
    await new Promise((r) => setTimeout(r, 10));
    expect((await request(b, { type: "start" })).type).toBe("error");
    await request(a, { type: "start" });
    const c = await client();
    expect(
      (await request(c, { type: "join", name: "C", code: g.code })).message,
    ).toContain("started");
    expect((await request(b, { type: "roll" })).type).toBe("error");
    await request(a, { type: "roll", faces: [6, 6, 6, 6, 6, 6] });
    expect(g.dice!.white.every((x) => x >= 1 && x <= 6)).toBe(true);
    expect(
      (
        await request(b, {
          type: "mark",
          color: "invalid",
          number: 2,
          action: "white",
        })
      ).type,
    ).toBe("error");
    const restored = await client();
    expect(
      (await request(restored, { type: "resume", token: seat.token })).id,
    ).toBe(seat.id);
    const stranger = await client();
    expect(
      (await request(stranger, { type: "resume", token: seat.id })).type,
    ).toBe("error");
  } finally {
    sockets.forEach((s) => s.terminate());
    server.close();
  }
});

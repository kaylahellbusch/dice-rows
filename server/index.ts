import { createServer } from "node:http";
import { randomInt, randomBytes } from "node:crypto";
import { WebSocketServer, WebSocket } from "ws";
import {
  colors,
  createGame,
  join,
  start,
  roll,
  mark,
  finish,
  type Game,
  type Color,
  type Action,
} from "../src/rules.js";
import { pathToFileURL } from "node:url";
export function gameServer(
  port = 3001,
  diceRoll: (game: Game) => number[] = (game) =>
    Array.from({ length: 6 }, (_, index) =>
      index >= 2 && game.locked.includes(colors[index - 2])
        ? 1
        : randomInt(1, 7),
    ),
) {
  const games = new Map<string, Game>();
  const seats = new Map<WebSocket, { game: Game; id: string }>();
  const tokens = new Map<string, { game: Game; id: string }>();
  const http = createServer((_req, res) => {
    res.writeHead(200);
    res.end("Dice Rows WebSocket server");
  });
  const wss = new WebSocketServer({
    server: http,
    path: "/ws",
    maxPayload: 4096,
  });
  const send = (ws: WebSocket, data: unknown) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
  };
  const broadcast = (g: Game) => {
    for (const [ws, s] of seats)
      if (s.game === g) send(ws, { type: "state", game: g });
  };
  wss.on("connection", (ws) => {
    ws.on("message", (raw) => {
      try {
        const m = JSON.parse(raw.toString());
        if (!m || typeof m.type !== "string") throw Error("Invalid message.");
        if (m.type === "resume") {
          const s = tokens.get(m.token);
          if (!s) throw Error("Your previous game is no longer available.");
          seats.set(ws, s);
          send(ws, { type: "seat", id: s.id, token: m.token });
          broadcast(s.game);
          return;
        }
        if (m.type === "host" || m.type === "join") {
          if (seats.has(ws)) throw Error("You already have a seat.");
          const name =
            typeof m.name === "string" ? m.name.trim().slice(0, 24) : "";
          if (!name) throw Error("Enter your name first.");
          const id = randomBytes(16).toString("hex");
          let g: Game;
          if (m.type === "host") {
            let code: string;
            do {
              code = String(randomInt(100000, 1000000));
            } while (games.has(code));
            g = createGame(code, id, name);
            games.set(code, g);
          } else {
            g = games.get(String(m.code))!;
            if (!g) throw Error("Game code not found.");
            join(g, id, name);
          }
          const token = randomBytes(32).toString("hex");
          const s = { game: g, id };
          tokens.set(token, s);
          seats.set(ws, s);
          send(ws, { type: "seat", id, token });
          broadcast(g);
          return;
        }
        const s = seats.get(ws);
        if (!s) throw Error("Join a game first.");
        const { game: g, id } = s;
        if (m.type === "start") start(g, id);
        else if (m.type === "roll") roll(g, id, diceRoll(g));
        else if (m.type === "mark") {
          if (!["white", "color"].includes(m.action))
            throw Error("Invalid action.");
          mark(g, id, m.color as Color, m.number, m.action as Action);
        } else if (m.type === "finish") finish(g, id);
        else throw Error("Unknown action.");
        broadcast(g);
      } catch (e) {
        send(ws, {
          type: "error",
          message: e instanceof Error ? e.message : "Invalid request.",
        });
      }
    });
    ws.on("close", () => seats.delete(ws));
  });
  http.listen(port, "0.0.0.0");
  return {
    http,
    wss,
    games,
    close: () => {
      for (const ws of wss.clients) ws.terminate();
      wss.close();
      http.close();
    },
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  gameServer(Number(process.env.PORT || 3001));

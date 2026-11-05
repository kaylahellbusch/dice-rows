import { randomInt, randomUUID } from "node:crypto";
import {
  createGame,
  joinGame,
  startGame,
  rollDice,
  markNumber,
  resolvePlayer,
  type Game,
  type RowColor,
} from "../shared/rules";

export class GameService {
  games = new Map<string, Game>();
  private sessions = new Map<string, { code: string; playerId: string }>();
  private name(value: unknown) {
    if (typeof value !== "string" || !value.trim() || value.trim().length > 24)
      throw new Error("Enter a name between 1 and 24 characters");
    return value.trim();
  }
  host(name: unknown) {
    const player = { id: randomUUID(), name: this.name(name) };
    let code: string;
    do {
      code = String(randomInt(100000, 1000000));
    } while (this.games.has(code));
    const game = createGame(code, player);
    this.games.set(code, game);
    return this.session(game, player.id);
  }
  join(code: unknown, name: unknown) {
    const cleanName = this.name(name);
    const game = this.games.get(String(code));
    if (!game) throw new Error("No game with that code");
    const player = { id: randomUUID(), name: cleanName };
    const next = joinGame(game, player);
    this.games.set(next.code, next);
    return this.session(next, player.id);
  }
  private session(game: Game, playerId: string) {
    const token = randomUUID();
    this.sessions.set(token, { code: game.code, playerId });
    return { token, playerId, game };
  }
  read(token: string) {
    const session = this.sessions.get(token);
    if (!session)
      throw new Error("Your game session is unavailable. Start a new game.");
    const game = this.games.get(session.code);
    if (!game) throw new Error("Your game has ended");
    return { session, game };
  }
  action(
    token: string,
    action: {
      type?: unknown;
      color?: unknown;
      number?: unknown;
      kind?: unknown;
    },
  ) {
    const { session, game } = this.read(token);
    let next: Game;
    switch (action.type) {
      case "start":
        next = startGame(game, session.playerId);
        break;
      case "roll":
        next = rollDice(
          game,
          session.playerId,
          () => randomInt(0, 0x100000000) / 0x100000000,
        );
        break;
      case "resolve":
        next = resolvePlayer(game, session.playerId);
        break;
      case "mark":
        if (
          !["red", "yellow", "blue", "green"].includes(String(action.color)) ||
          typeof action.number !== "number" ||
          !["white", "combo"].includes(String(action.kind))
        )
          throw new Error("Illegal mark");
        next = markNumber(
          game,
          session.playerId,
          action.color as RowColor,
          action.number,
          action.kind as "white" | "combo",
        );
        break;
      default:
        throw new Error("Unknown action");
    }
    this.games.set(next.code, next);
    return { game: next };
  }
}

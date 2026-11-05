import express from "express";
import { resolve } from "node:path";
import { GameService } from "./game";

const app = express();
const service = new GameService();
app.disable("x-powered-by");
app.use(express.json({ limit: "4kb" }));
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
const token = (req: express.Request) =>
  req.headers.authorization?.replace(/^Bearer /, "") ?? "";
app.post("/api/host", (req, res, next) => {
  try {
    res.json(service.host(req.body.name));
  } catch (error) {
    next(error);
  }
});
app.post("/api/join", (req, res, next) => {
  try {
    res.json(service.join(req.body.code, req.body.name));
  } catch (error) {
    next(error);
  }
});
app.get("/api/game", (req, res, next) => {
  try {
    res.json({ game: service.read(token(req)).game });
  } catch (error) {
    next(error);
  }
});
app.post("/api/action", (req, res, next) => {
  try {
    res.json(service.action(token(req), req.body));
  } catch (error) {
    next(error);
  }
});
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Unknown endpoint" });
});
app.use(
  (
    error: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    res
      .status(400)
      .json({ error: error.message || "Could not complete that action" });
  },
);
if (process.env.NODE_ENV === "production") {
  app.use(express.static(resolve("dist")));
  app.get(/.*/, (_req, res) => res.sendFile(resolve("dist/index.html")));
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
const port = Number(process.env.PORT || 3000);
app.listen(port, "0.0.0.0", () =>
  console.log(`Dice Rows: http://localhost:${port}`),
);

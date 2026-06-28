import cookieParser from "cookie-parser";
import express from "express";
import { env } from "./config/env.js";
import { prisma } from "./db/prisma.js";
import { agentsRouter } from "./routes/agents.js";
import { chatRouter } from "./routes/chat.js";

const app = express();

app.set("view engine", "ejs");
app.set("views", "views");

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use("/public", express.static("public"));

app.get("/", async (_req, res, next) => {
  try {
    const agents = await prisma.agent.findMany({
      where: { status: "active" },
      orderBy: { displayName: "asc" },
      select: { agentKey: true, displayName: true, description: true }
    });
    res.render("index", { agents });
  } catch (error) {
    next(error);
  }
});

app.get("/health", async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ ok: true });
});

app.use("/agents", agentsRouter);
app.use("/api/chat", chatRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(env.PORT, () => {
  console.log(`Agent demo running at http://localhost:${env.PORT}`);
});

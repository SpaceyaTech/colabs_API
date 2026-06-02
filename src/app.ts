import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import passport from "passport";

import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { swaggerSpec } from "./config/swagger";
import { connectRedis } from "./lib/redis";
import { configurePassport } from "./modules/auth/auth.strategy";
import { errorHandler } from "./middleware/errorHandler";
import { generalLimiter } from "./middleware/rateLimiter";

// Routes
import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/users/users.routes";
import projectRoutes from "./modules/projects/projects.routes";
import issueRoutes from "./modules/issues/issues.routes";
import gigRoutes from "./modules/gigs/gigs.routes";
import proposalRoutes from "./modules/proposals/proposals.routes";
import teamRoutes from "./modules/teams/teams.routes";

const app = express();

// ── Security & Parsing ───────────────────────────────────
const helmetDefault = helmet();
const helmetNoCsp = helmet({ contentSecurityPolicy: false });

app.use((req, res, next) => {
  if (req.path.startsWith("/api/docs")) return helmetNoCsp(req, res, next);
  return helmetDefault(req, res, next);
});

const allowedOrigins = [env.FRONTEND_URL, `http://localhost:${env.PORT}`];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || env.NODE_ENV === "development") {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  }),
);
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

// ── Rate Limiting ────────────────────────────────────────
app.use("/api", generalLimiter);

// ── Passport ─────────────────────────────────────────────
configurePassport();
app.use(passport.initialize());

// ── API Docs ─────────────────────────────────────────────
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ── Health Check ─────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV,
  });
});

// ── API Routes ───────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/gigs", gigRoutes);
app.use("/api/gigs/:gigId/proposals", proposalRoutes);
app.use("/api/teams", teamRoutes);

// ── 404 Handler ──────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ── Error Handler ────────────────────────────────────────
app.use(errorHandler);

// ── Start ────────────────────────────────────────────────
const start = async () => {
  await connectRedis();
  const port = parseInt(env.PORT);
  app.listen(port, () => {
    console.log(`🚀 Colabs API running on http://localhost:${port}`);
    console.log(`📚 Environment: ${env.NODE_ENV}`);
  });
};

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

export default app;

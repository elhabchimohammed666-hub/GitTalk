import "dotenv/config";
import http from "node:http";
import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import mongoose from "mongoose";
import { Server } from "socket.io";
import { connectDatabase } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import conversationRoutes from "./routes/conversationRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { configureSockets } from "./sockets/index.js";

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must contain at least 32 characters");
}

const app = express();
const httpServer = http.createServer(app);
const allowedOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.use(helmet());
app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 20 }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/conversations", conversationRoutes);
app.use(notFound);
app.use(errorHandler);

const io = new Server(httpServer, {
  cors: { origin: allowedOrigin, credentials: true }
});
configureSockets(io);

const port = Number(process.env.PORT) || 5000;

try {
  await connectDatabase();
  httpServer.listen(port, () => console.info(`DevHub API listening on port ${port}`));
} catch (error) {
  console.error("Server startup failed", error);
  process.exitCode = 1;
}

function shutdown() {
  io.close(() => {
    mongoose.disconnect().finally(() => process.exit(0));
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

import jwt from "jsonwebtoken";
import User from "../models/User.js";

function readSession(token) {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return typeof payload.userId === "string" ? payload.userId : null;
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return null;
    }
    throw error;
  }
}

function loadUser(userId, req, res, next) {
  User.findById(userId)
    .select("_id username bookmarks")
    .then((user) => {
      if (!user) return res.status(401).json({ message: "Authentication required" });
      req.user = user;
      return next();
    })
    .catch(next);
}

export function optionalAuth(req, res, next) {
  const token = req.cookies?.devhub_token;
  if (!token) return next();

  const userId = readSession(token);
  if (!userId) {
    return res.status(401).json({ message: "Invalid or expired session" });
  }

  return loadUser(userId, req, res, next);
}

export function requireAuth(req, res, next) {
  const token = req.cookies?.devhub_token;
  if (!token) return res.status(401).json({ message: "Authentication required" });

  const userId = readSession(token);
  if (!userId) {
    return res.status(401).json({ message: "Invalid or expired session" });
  }

  return loadUser(userId, req, res, next);
}

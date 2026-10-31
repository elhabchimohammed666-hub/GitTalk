import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { loginSchema, registerSchema } from "../validation/schemas.js";

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/"
});

function issueSession(userId, res) {
  const token = jwt.sign({ userId: userId.toString() }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });
  res.cookie("devhub_token", token, cookieOptions());
}

export async function register(req, res) {
  const input = registerSchema.parse(req.body);
  const user = await User.create(input);
  issueSession(user._id, res);
  res.status(201).json({
    user: { id: user.id, username: user.username, email: user.email }
  });
}

export async function login(req, res) {
  const input = loginSchema.parse(req.body);
  const user = await User.findOne({ email: input.email }).select("+password");
  const validPassword = user && (await user.comparePassword(input.password));

  if (!validPassword) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  issueSession(user._id, res);
  return res.json({
    user: { id: user.id, username: user.username, email: user.email }
  });
}

export function logout(req, res) {
  const { httpOnly, secure, sameSite, path } = cookieOptions();
  res.clearCookie("devhub_token", { httpOnly, secure, sameSite, path });
  res.status(204).end();
}

export async function getCurrentUser(req, res) {
  const user = await User.findById(req.user.id).select(
    "username email avatar bio links role location skills badges githubStats"
  );
  res.json({ user });
}

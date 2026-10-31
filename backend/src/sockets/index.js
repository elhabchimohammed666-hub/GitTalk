import cookie from "cookie";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { z } from "zod";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";

const sendMessageSchema = z.object({
  conversationId: z.string().regex(/^[a-f\d]{24}$/i),
  text: z.string().trim().min(1).max(5000)
});

export function configureSockets(io) {
  io.use((socket, next) => {
    try {
      const cookies = cookie.parse(socket.handshake.headers.cookie ?? "");
      const token = cookies.devhub_token;
      if (!token) return next(new Error("Authentication required"));

      const { userId } = jwt.verify(token, process.env.JWT_SECRET);
      if (!mongoose.isValidObjectId(userId)) {
        return next(new Error("Invalid session"));
      }

      socket.data.userId = userId;
      return next();
    } catch (error) {
      return next(new Error("Invalid or expired session"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.data.userId;
    socket.join(`user:${userId}`);
    await User.updateOne({ _id: userId }, { $set: { isOnline: true } });
    io.emit("presence:changed", { userId, isOnline: true });

    socket.on("message:send", async (payload, acknowledge) => {
      try {
        const input = sendMessageSchema.parse(payload);
        const conversation = await Conversation.findOne({
          _id: input.conversationId,
          participants: userId
        });
        if (!conversation) throw new Error("Conversation not found");

        const message = await Message.create({
          conversation: conversation._id,
          sender: userId,
          text: input.text
        });
        conversation.lastMessage = message._id;
        await conversation.save();

        const result = await message.populate("sender", "username avatar");
        for (const participant of conversation.participants) {
          io.to(`user:${participant}`).emit("message:new", result);
          if (participant.toString() !== userId) {
            io.to(`user:${participant}`).emit("notification:unread", {
              conversationId: conversation.id
            });
          }
        }
        acknowledge?.({ ok: true, message: result });
      } catch (error) {
        if (error.name !== "ZodError" && error.message !== "Conversation not found") {
          console.error("Socket message delivery failed", error);
        }
        acknowledge?.({
          ok: false,
          message: error.name === "ZodError"
            ? "Invalid message data"
            : error.message === "Conversation not found"
              ? error.message
              : "Unable to send message"
        });
      }
    });

    socket.on("message:read", async (payload, acknowledge) => {
      try {
        const conversationId = payload?.conversationId;
        if (!mongoose.isValidObjectId(conversationId)) {
          throw new Error("Invalid conversation identifier");
        }
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId
        }).select("_id participants");
        if (!conversation) throw new Error("Conversation not found");

        const readAt = new Date();
        await Message.updateMany(
          { conversation: conversationId, sender: { $ne: userId }, isRead: false },
          { $set: { isRead: true, readAt } }
        );
        for (const participant of conversation.participants) {
          if (participant.toString() !== userId) {
            io.to(`user:${participant}`).emit("message:read", {
              conversationId,
              readerId: userId,
              readAt
            });
          }
        }
        acknowledge?.({ ok: true });
      } catch (error) {
        if (error.message !== "Conversation not found" &&
            error.message !== "Invalid conversation identifier") {
          console.error("Socket read receipt failed", error);
        }
        acknowledge?.({
          ok: false,
          message: error.message === "Conversation not found" ||
            error.message === "Invalid conversation identifier"
            ? error.message
            : "Unable to mark messages as read"
        });
      }
    });

    socket.on("disconnect", async () => {
      const activeSockets = await io.in(`user:${userId}`).fetchSockets();
      if (activeSockets.length === 0) {
        await User.updateOne(
          { _id: userId },
          { $set: { isOnline: false, lastSeenAt: new Date() } }
        );
        io.emit("presence:changed", { userId, isOnline: false });
      }
    });
  });
}

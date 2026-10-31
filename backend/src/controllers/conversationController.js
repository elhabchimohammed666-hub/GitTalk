import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";

export async function listConversations(req, res) {
  const conversations = await Conversation.find({ participants: req.user.id })
    .sort({ updatedAt: -1 })
    .populate("participants", "username avatar isOnline lastSeenAt")
    .populate({
      path: "lastMessage",
      select: "sender text isRead createdAt"
    });

  res.json({ conversations });
}

export async function createConversation(req, res) {
  const participantId = req.body?.participantId;
  if (!mongoose.isValidObjectId(participantId)) {
    return res.status(400).json({ message: "A valid other participant is required" });
  }

  const normalizedParticipantId = new mongoose.Types.ObjectId(participantId).toString();
  if (normalizedParticipantId === req.user.id) {
    return res.status(400).json({ message: "A valid other participant is required" });
  }

  const participant = await User.findById(normalizedParticipantId).select("_id");
  if (!participant) return res.status(404).json({ message: "User not found" });

  const participantIds = [req.user.id, normalizedParticipantId].sort();
  const participantKey = participantIds.join(":");
  const conversation = await Conversation.findOneAndUpdate(
    { participantKey },
    { $setOnInsert: { participants: participantIds, participantKey } },
    { upsert: true, new: true, runValidators: true }
  )
    .populate("participants", "username avatar isOnline lastSeenAt")
    .populate("lastMessage", "sender text isRead createdAt");

  res.status(200).json({ conversation });
}

export async function listMessages(req, res) {
  const { conversationId } = req.params;
  if (!mongoose.isValidObjectId(conversationId)) {
    return res.status(400).json({ message: "Invalid conversation identifier" });
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: req.user.id
  }).select("_id");
  if (!conversation) return res.status(404).json({ message: "Conversation not found" });

  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 30, 1), 100);
  const [messages, total] = await Promise.all([
    Message.find({ conversation: conversationId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("sender", "username avatar"),
    Message.countDocuments({ conversation: conversationId })
  ]);

  res.json({ messages: messages.reverse(), page, pages: Math.ceil(total / limit), total });
}

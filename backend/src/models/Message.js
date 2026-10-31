import mongoose from "mongoose";

const { Schema, model } = mongoose;

const messageSchema = new Schema(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    text: { type: String, required: true, trim: true, maxlength: 5000 },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null }
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: -1 });

export default model("Message", messageSchema);

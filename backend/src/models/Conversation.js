import mongoose from "mongoose";

const { Schema, model } = mongoose;

const conversationSchema = new Schema(
  {
    participants: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      validate: {
        validator: (participants) => participants.length === 2,
        message: "A private conversation must have exactly two participants"
      },
      required: true
    },
    participantKey: { type: String, required: true, unique: true, select: false },
    lastMessage: { type: Schema.Types.ObjectId, ref: "Message", default: null }
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1, updatedAt: -1 });

conversationSchema.pre("validate", function setParticipantKey() {
  if (this.participants?.length === 2) {
    this.participantKey = this.participants
      .map((participant) => participant.toString())
      .sort()
      .join(":");
  }
});

export default model("Conversation", conversationSchema);

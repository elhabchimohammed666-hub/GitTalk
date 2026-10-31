import mongoose from "mongoose";

const { Schema, model } = mongoose;

const postSchema = new Schema(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    content: { type: String, required: true, maxlength: 50000 },
    type: {
      type: String,
      enum: ["showcase", "question", "article"],
      required: true,
      default: "article"
    },
    tags: [{ type: String, trim: true, lowercase: true, maxlength: 40 }],
    upvotes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    downvotes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    upvoteCount: { type: Number, min: 0, default: 0 },
    downvoteCount: { type: Number, min: 0, default: 0 },
    commentCount: { type: Number, min: 0, default: 0 }
  },
  { timestamps: true }
);

postSchema.index({ title: "text", content: "text", tags: "text" });
postSchema.index({ createdAt: -1 });
postSchema.index({ upvoteCount: -1, createdAt: -1 });

export default model("Post", postSchema);

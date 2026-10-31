import mongoose from "mongoose";

const { Schema, model } = mongoose;

const commentSchema = new Schema(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    content: { type: String, required: true, trim: true, maxlength: 10000 },
    parentCommentId: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
      index: true
    },
    upvotes: [{ type: Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true }
);

commentSchema.index({ post: 1, createdAt: 1 });

export default model("Comment", commentSchema);

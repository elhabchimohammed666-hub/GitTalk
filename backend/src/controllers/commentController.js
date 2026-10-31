import mongoose from "mongoose";
import Comment from "../models/Comment.js";
import Post from "../models/Post.js";
import { createCommentSchema } from "../validation/schemas.js";

export async function listComments(req, res) {
  const { postId } = req.params;
  if (!mongoose.isValidObjectId(postId)) {
    return res.status(400).json({ message: "Invalid post identifier" });
  }

  const comments = await Comment.find({ post: postId })
    .sort({ createdAt: 1 })
    .populate("author", "username avatar role");
  return res.json({ comments });
}

export async function addComment(req, res) {
  const { postId } = req.params;
  if (!mongoose.isValidObjectId(postId)) {
    return res.status(400).json({ message: "Invalid post identifier" });
  }

  const input = createCommentSchema.parse(req.body);
  const post = await Post.findById(postId).select("_id");
  if (!post) return res.status(404).json({ message: "Post not found" });

  if (input.parentCommentId) {
    const parent = await Comment.findOne({
      _id: input.parentCommentId,
      post: postId
    }).select("_id");
    if (!parent) {
      return res.status(400).json({ message: "Parent comment must belong to this post" });
    }
  }

  const comment = await Comment.create({
    post: postId,
    author: req.user.id,
    content: input.content,
    parentCommentId: input.parentCommentId ?? null
  });

  try {
    await Post.updateOne({ _id: postId }, { $inc: { commentCount: 1 } });
  } catch (error) {
    await Comment.deleteOne({ _id: comment._id });
    throw error;
  }

  await comment.populate("author", "username avatar role");
  return res.status(201).json({ comment });
}

import mongoose from "mongoose";
import Post from "../models/Post.js";
import User from "../models/User.js";
import { createPostSchema } from "../validation/schemas.js";

export async function listPosts(req, res) {
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 50);
  const tags = typeof req.query.tags === "string"
    ? req.query.tags.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean)
    : [];
  const filter = {};

  if (tags.length) filter.tags = { $in: tags };
  if (["showcase", "question", "article"].includes(req.query.type)) {
    filter.type = req.query.type;
  }
  if (typeof req.query.q === "string" && req.query.q.trim()) {
    filter.$text = { $search: req.query.q.trim().slice(0, 100) };
  }

  const sort = req.query.sort === "top"
    ? { upvoteCount: -1, createdAt: -1 }
    : req.query.sort === "trending"
      ? { upvoteCount: -1, createdAt: -1 }
      : { createdAt: -1 };

  if (req.query.sort === "trending") {
    filter.createdAt = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
  }

  const [documents, total] = await Promise.all([
    Post.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .select("author title content type tags upvotes downvotes upvoteCount downvoteCount commentCount createdAt updatedAt")
      .populate("author", "username avatar role"),
    Post.countDocuments(filter)
  ]);

  const posts = documents.map((post) => {
    const data = post.toObject();
    data.vote = req.user
      ? post.upvotes.some((voter) => voter.equals(req.user._id))
        ? 1
        : post.downvotes.some((voter) => voter.equals(req.user._id))
          ? -1
          : 0
      : 0;
    data.isBookmarked = req.user
      ? req.user.bookmarks.some((bookmark) => bookmark.equals(post._id))
      : false;
    delete data.upvotes;
    delete data.downvotes;
    return data;
  });

  res.json({ posts, page, pages: Math.ceil(total / limit), total });
}

export async function createPost(req, res) {
  const input = createPostSchema.parse(req.body);
  const post = await Post.create({ ...input, author: req.user.id });
  await post.populate("author", "username avatar role");
  res.status(201).json({ post });
}

async function setPostVote(req, res, vote) {
  const { postId } = req.params;
  if (!mongoose.isValidObjectId(postId)) {
    return res.status(400).json({ message: "Invalid post identifier" });
  }

  const userId = new mongoose.Types.ObjectId(req.user.id);
  const activeVotes = vote === 1 ? "upvotes" : "downvotes";
  const oppositeVotes = vote === 1 ? "downvotes" : "upvotes";
  const post = await Post.findOneAndUpdate(
    { _id: postId },
    [
      {
        $set: {
          [activeVotes]: {
            $cond: [
              { $in: [userId, `$${activeVotes}`] },
              {
                $filter: {
                  input: `$${activeVotes}`,
                  as: "voter",
                  cond: { $ne: ["$$voter", userId] }
                }
              },
              { $setUnion: [`$${activeVotes}`, [userId]] }
            ]
          },
          [oppositeVotes]: {
            $filter: {
              input: `$${oppositeVotes}`,
              as: "voter",
              cond: { $ne: ["$$voter", userId] }
            }
          }
        }
      },
      {
        $set: {
          upvoteCount: { $size: "$upvotes" },
          downvoteCount: { $size: "$downvotes" }
        }
      }
    ],
    {
      new: true,
      projection: { upvoteCount: 1, downvoteCount: 1, upvotes: 1, downvotes: 1 }
    }
  );

  if (!post) return res.status(404).json({ message: "Post not found" });
  return res.json({
    upvoteCount: post.upvoteCount,
    downvoteCount: post.downvoteCount,
    vote: post.upvotes.some((voter) => voter.equals(userId))
      ? 1
      : post.downvotes.some((voter) => voter.equals(userId))
        ? -1
        : 0
  });
}

export const upvotePost = (req, res) => setPostVote(req, res, 1);
export const downvotePost = (req, res) => setPostVote(req, res, -1);

export async function togglePostBookmark(req, res) {
  const { postId } = req.params;
  if (!mongoose.isValidObjectId(postId)) {
    return res.status(400).json({ message: "Invalid post identifier" });
  }

  if (!(await Post.exists({ _id: postId }))) {
    return res.status(404).json({ message: "Post not found" });
  }

  const bookmarkId = new mongoose.Types.ObjectId(postId);
  const user = await User.findOneAndUpdate(
    { _id: req.user.id },
    [{
      $set: {
        bookmarks: {
          $cond: [
            { $in: [bookmarkId, "$bookmarks"] },
            {
              $filter: {
                input: "$bookmarks",
                as: "bookmark",
                cond: { $ne: ["$$bookmark", bookmarkId] }
              }
            },
            { $setUnion: ["$bookmarks", [bookmarkId]] }
          ]
        }
      }
    }],
    { new: true, projection: { bookmarks: 1 } }
  );

  if (!user) return res.status(404).json({ message: "User not found" });
  return res.json({
    isBookmarked: user.bookmarks.some((bookmark) => bookmark.equals(bookmarkId))
  });
}

import { Router } from "express";
import { addComment, listComments } from "../controllers/commentController.js";
import {
  createPost,
  downvotePost,
  listPosts,
  togglePostBookmark,
  upvotePost
} from "../controllers/postController.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/", optionalAuth, asyncHandler(listPosts));
router.post("/", requireAuth, asyncHandler(createPost));
router.post("/:postId/upvote", requireAuth, asyncHandler(upvotePost));
router.post("/:postId/downvote", requireAuth, asyncHandler(downvotePost));
router.post("/:postId/bookmark", requireAuth, asyncHandler(togglePostBookmark));
router.get("/:postId/comments", asyncHandler(listComments));
router.post("/:postId/comments", requireAuth, asyncHandler(addComment));

export default router;

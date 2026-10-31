import { Router } from "express";
import {
  createConversation,
  listConversations,
  listMessages
} from "../controllers/conversationController.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(requireAuth);
router.get("/", asyncHandler(listConversations));
router.post("/", asyncHandler(createConversation));
router.get("/:conversationId/messages", asyncHandler(listMessages));

export default router;

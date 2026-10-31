import { Router } from "express";
import { getCurrentUser, login, logout, register } from "../controllers/authController.js";
import { finishGithubAuth, startGithubAuth } from "../controllers/githubAuthController.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.post("/register", asyncHandler(register));
router.post("/login", asyncHandler(login));
router.post("/logout", logout);
router.get("/me", requireAuth, asyncHandler(getCurrentUser));
router.get("/github", startGithubAuth);
router.get("/github/callback", asyncHandler(finishGithubAuth));

export default router;

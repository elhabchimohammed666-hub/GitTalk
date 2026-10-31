import { z } from "zod";

export const registerSchema = z.object({
  username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(72)
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(72)
});

export const createPostSchema = z.object({
  title: z.string().trim().min(1).max(180),
  content: z.string().min(1).max(50000),
  type: z.enum(["showcase", "question", "article"]).default("article"),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).default([])
});

export const createCommentSchema = z.object({
  content: z.string().trim().min(1).max(10000),
  parentCommentId: z.string().regex(/^[a-f\d]{24}$/i).nullable().optional()
});

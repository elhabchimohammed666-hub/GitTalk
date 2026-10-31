import { lazy, Suspense, useState } from "react";
import { ArrowDown, ArrowUp, Bookmark, MessageCircle, MoreHorizontal } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../api/client.js";
import { useAuth } from "../features/auth/AuthContext.jsx";
import CommentsPanel from "./CommentsPanel.jsx";

const MarkdownContent = lazy(() => import("./MarkdownContent.jsx"));

const typeLabels = {
  showcase: "Projet",
  question: "Question",
  article: "Article"
};

function timeAgo(date) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60_000));
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
}

export default function PostCard({ post, onRequireAuth }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [voteError, setVoteError] = useState("");
  const [commentsOpen, setCommentsOpen] = useState(false);
  const voteMutation = useMutation({
    mutationFn: (direction) => apiRequest(`/api/posts/${post._id}/${direction > 0 ? "upvote" : "downvote"}`, {
      method: "POST"
    }),
    onMutate: async (direction) => {
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      const previous = queryClient.getQueriesData({ queryKey: ["posts"] });
      queryClient.setQueriesData({ queryKey: ["posts"] }, (current) => {
        if (!current?.posts) return current;
        return {
          ...current,
          posts: current.posts.map((item) => {
            if (item._id !== post._id) return item;
            const oldVote = item.vote || 0;
            const vote = oldVote === direction ? 0 : direction;
            return {
              ...item,
              vote,
              upvoteCount: (item.upvoteCount || 0) + (vote === 1 ? 1 : 0) - (oldVote === 1 ? 1 : 0),
              downvoteCount: (item.downvoteCount || 0) + (vote === -1 ? 1 : 0) - (oldVote === -1 ? 1 : 0)
            };
          })
        };
      });
      return { previous };
    },
    onError: (error, _direction, context) => {
      context?.previous?.forEach(([key, value]) => queryClient.setQueryData(key, value));
      setVoteError(error.message);
      if (error.status === 401) onRequireAuth();
    },
    onSuccess: (result) => {
      setVoteError("");
      queryClient.setQueriesData({ queryKey: ["posts"] }, (current) => {
        if (!current?.posts) return current;
        return {
          ...current,
          posts: current.posts.map((item) => item._id === post._id
            ? { ...item, vote: result.vote, upvoteCount: result.upvoteCount, downvoteCount: result.downvoteCount }
            : item)
        };
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["posts"] })
  });
  const bookmarkMutation = useMutation({
    mutationFn: () => apiRequest(`/api/posts/${post._id}/bookmark`, { method: "POST" }),
    onSuccess: ({ isBookmarked }) => {
      queryClient.setQueriesData({ queryKey: ["posts"] }, (current) => current?.posts
        ? {
          ...current,
          posts: current.posts.map((item) => item._id === post._id
            ? { ...item, isBookmarked }
            : item)
        }
        : current);
    },
    onError: (error) => {
      setVoteError(error.message);
      if (error.status === 401) onRequireAuth();
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["posts"] })
  });

  const author = post.author || {};
  const initials = (author.username || "?").slice(0, 2).toUpperCase();

  return (
    <article className="post-card">
      <div className="post-layout">
        <div className="vote-column" aria-label="Votes">
          <button
            className={`vote-button ${post.vote === 1 ? "vote-active" : ""}`}
            onClick={() => user ? voteMutation.mutate(1) : onRequireAuth()}
            aria-label="Upvote"
            aria-pressed={post.vote === 1}
            disabled={voteMutation.isPending}
          ><ArrowUp size={19} /></button>
          <span className="vote-count">{post.upvoteCount || 0}</span>
          <button
            className={`vote-button downvote-button ${post.vote === -1 ? "downvote-active" : ""}`}
            onClick={() => user ? voteMutation.mutate(-1) : onRequireAuth()}
            aria-label="Downvote"
            aria-pressed={post.vote === -1}
            disabled={voteMutation.isPending}
          ><ArrowDown size={18} /></button>
        </div>

        <div className="post-main">
          <div className="post-author-row">
            {author.avatar
              ? <img className="avatar" src={author.avatar} alt="" />
              : <div className="avatar avatar-fallback">{initials}</div>}
            <div className="author-meta">
              <strong>{author.username || "Développeur"}</strong>
              <span>{timeAgo(post.createdAt)} · {author.role || "membre"}</span>
            </div>
            <span className={`post-type type-${post.type}`}>{typeLabels[post.type] || "Article"}</span>
            <button className="icon-button post-more" aria-label="Plus d'options"><MoreHorizontal size={20} /></button>
          </div>

          <h2 className="post-title">{post.title}</h2>
          <div className="markdown-body post-content">
            <Suspense fallback={<p className="markdown-loading">Chargement du contenu…</p>}>
              <MarkdownContent content={post.content} />
            </Suspense>
          </div>

          {post.tags?.length > 0 && (
            <div className="post-tags">
              {post.tags.map((tag) => <span className="tag-pill" key={tag}>#{tag}</span>)}
            </div>
          )}

          <div className="post-actions">
            <button className="post-action" aria-expanded={commentsOpen} onClick={() => setCommentsOpen(!commentsOpen)}>
              <MessageCircle size={17} /> {post.commentCount || 0} commentaires
            </button>
            <button
              className={`post-action ${post.isBookmarked ? "bookmark-active" : ""}`}
              onClick={() => user ? bookmarkMutation.mutate() : onRequireAuth()}
              aria-pressed={Boolean(post.isBookmarked)}
              disabled={bookmarkMutation.isPending}
            >
              <Bookmark size={17} /> {post.isBookmarked ? "Enregistré" : "Enregistrer"}
            </button>
          </div>
          {voteError && <p className="inline-error" role="alert">{voteError}</p>}
          {commentsOpen && <CommentsPanel postId={post._id} onRequireAuth={onRequireAuth} />}
        </div>
      </div>
    </article>
  );
}

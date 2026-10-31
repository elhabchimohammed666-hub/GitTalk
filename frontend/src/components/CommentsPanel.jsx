import { useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../api/client.js";

function CommentItem({ comment, replies, postId, onRequireAuth }) {
  const [replying, setReplying] = useState(false);
  const [content, setContent] = useState("");
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => apiRequest(`/api/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify({ content, parentCommentId: comment._id })
    }),
    onSuccess: () => {
      setContent("");
      setReplying(false);
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (error) => {
      if (error.status === 401) onRequireAuth();
    }
  });

  return (
    <article className="comment-item">
      <div className="comment-avatar">{(comment.author?.username || "?").slice(0, 1).toUpperCase()}</div>
      <div className="comment-content">
        <div className="comment-byline">
          <strong>{comment.author?.username || "Membre"}</strong>
          <span>{new Date(comment.createdAt).toLocaleDateString("fr-FR")}</span>
        </div>
        <p>{comment.content}</p>
        <button className="reply-button" onClick={() => setReplying(!replying)}>
          <MessageCircle size={13} /> Répondre
        </button>
        {replying && (
          <form className="reply-form" onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}>
            <input value={content} maxLength="10000" onChange={(event) => setContent(event.target.value)} placeholder={`Répondre à ${comment.author?.username || "ce commentaire"}…`} autoFocus />
            <button aria-label="Envoyer la réponse" disabled={!content.trim() || mutation.isPending}><Send size={14} /></button>
          </form>
        )}
        {replies.map((reply) => (
          <CommentItem
            key={reply._id}
            comment={reply}
            replies={reply.children}
            postId={postId}
            onRequireAuth={onRequireAuth}
          />
        ))}
      </div>
    </article>
  );
}

export default function CommentsPanel({ postId, onRequireAuth }) {
  const [content, setContent] = useState("");
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["comments", postId],
    queryFn: () => apiRequest(`/api/posts/${postId}/comments`)
  });
  const mutation = useMutation({
    mutationFn: () => apiRequest(`/api/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify({ content })
    }),
    onSuccess: () => {
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (error) => {
      if (error.status === 401) onRequireAuth();
    }
  });

  const comments = query.data?.comments || [];
  const byId = new Map(comments.map((comment) => [comment._id, { ...comment, children: [] }]));
  const roots = [];
  for (const comment of comments) {
    const node = byId.get(comment._id);
    const parentId = comment.parentCommentId?.toString();
    const parent = parentId ? byId.get(parentId) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  return (
    <section className="comments-panel" aria-label="Commentaires">
      <form className="new-comment-form" onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}>
        <input value={content} maxLength="10000" onChange={(event) => setContent(event.target.value)} placeholder="Écrire un commentaire…" />
        <button aria-label="Envoyer le commentaire" disabled={!content.trim() || mutation.isPending}><Send size={15} /></button>
      </form>
      {mutation.isError && mutation.error.status !== 401 && <p className="inline-error">{mutation.error.message}</p>}
      {query.isLoading ? <p className="comments-status">Chargement des commentaires…</p>
        : query.isError ? <p className="comments-status">Impossible de charger les commentaires.</p>
          : roots.length === 0 ? <p className="comments-status">Pas encore de commentaires. Lancez la conversation !</p>
            : roots.map((comment) => (
              <CommentItem
                key={comment._id}
                comment={comment}
                replies={comment.children}
                postId={postId}
                onRequireAuth={onRequireAuth}
              />
            ))}
    </section>
  );
}

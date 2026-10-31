import { useState } from "react";
import { Image, Link2, Send, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../api/client.js";

const initialForm = { title: "", content: "", type: "article", tags: "" };

export default function PostComposer({ user, onRequireAuth }) {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [errorMessage, setErrorMessage] = useState("");
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (payload) => apiRequest("/api/posts", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
    onSuccess: () => {
      setForm(initialForm);
      setExpanded(false);
      setErrorMessage("");
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (error) => {
      setErrorMessage(error.message);
      if (error.status === 401) onRequireAuth();
    }
  });

  function submit(event) {
    event.preventDefault();
    mutation.mutate({
      title: form.title,
      content: form.content,
      type: form.type,
      tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
    });
  }

  return (
    <section className={`composer-card ${expanded ? "composer-expanded" : ""}`}>
      <div className="composer-prompt">
        {user?.avatar
          ? <img className="avatar" src={user.avatar} alt="" />
          : <div className="avatar avatar-fallback">{user?.username?.slice(0, 2).toUpperCase() || "D"}</div>}
        {!expanded ? (
          <button className="composer-input" onClick={() => user ? setExpanded(true) : onRequireAuth()}>
            Partagez ce que vous construisez…
          </button>
        ) : (
          <button className="icon-button composer-close" onClick={() => setExpanded(false)} aria-label="Fermer">
            <X size={18} />
          </button>
        )}
      </div>

      {!expanded ? (
        <div className="composer-shortcuts">
          <button onClick={() => user ? setExpanded(true) : onRequireAuth()}><Image size={17} /> Projet</button>
          <button onClick={() => user ? setExpanded(true) : onRequireAuth()}><Link2 size={17} /> Article</button>
          <button onClick={() => user ? setExpanded(true) : onRequireAuth()}><span className="question-shortcut">?</span> Question</button>
        </div>
      ) : (
        <form className="composer-form" onSubmit={submit}>
          <label>
            Titre
            <input value={form.title} maxLength="180" required placeholder="Un titre qui donne envie de lire" onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </label>
          <div className="composer-row">
            <label>
              Type de publication
              <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
                <option value="article">Article / Tutoriel</option>
                <option value="showcase">Projet showcase</option>
                <option value="question">Question technique</option>
              </select>
            </label>
            <label>
              Tags (séparés par des virgules)
              <input value={form.tags} placeholder="react, node, mongodb" onChange={(event) => setForm({ ...form, tags: event.target.value })} />
            </label>
          </div>
          <label>
            Contenu <span className="label-hint">Markdown accepté</span>
            <textarea value={form.content} rows="6" maxLength="50000" required placeholder={"Partagez votre idée, votre code ou votre question…\n\n```js\nconsole.log('Hello DevHub');\n```"} onChange={(event) => setForm({ ...form, content: event.target.value })} />
          </label>
          {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}
          <div className="composer-submit-row">
            <span className="markdown-note">Markdown et blocs de code pris en charge</span>
            <button className="primary-button" disabled={mutation.isPending}>
              <Send size={16} /> {mutation.isPending ? "Publication…" : "Publier"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

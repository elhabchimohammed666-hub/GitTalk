import { useState } from "react";
import { Github, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, API_URL } from "../api/client.js";

export default function AuthDialog({ onClose, notice = "" }) {
  const [mode, setMode] = useState("login");
  const [errorMessage, setErrorMessage] = useState("");
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (formData) =>
      apiRequest(`/api/auth/${mode === "login" ? "login" : "register"}`, {
        method: "POST",
        body: JSON.stringify(formData)
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["current-user"] });
      onClose();
    },
    onError: (error) => setErrorMessage(error.message)
  });

  function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    const form = new FormData(event.currentTarget);
    mutation.mutate({
      ...(mode === "register" ? { username: form.get("username") } : {}),
      email: form.get("email"),
      password: form.get("password")
    });
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="auth-dialog" aria-labelledby="auth-heading" role="dialog" aria-modal="true">
        <button className="icon-button dialog-close" onClick={onClose} aria-label="Fermer">
          <X size={19} />
        </button>
        <div className="brand-mark dialog-brand">D</div>
        <h2 id="auth-heading">{mode === "login" ? "Ravi de vous revoir" : "Rejoignez DevHub"}</h2>
        <p className="dialog-subtitle">
          {mode === "login" ? "Connectez-vous pour participer à la communauté." : "Créez votre espace développeur."}
        </p>
        {notice && <p className="auth-notice" role="status">{notice}</p>}
        {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}
        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "register" && (
            <label>
              Nom d'utilisateur
              <input name="username" autoComplete="username" minLength="3" maxLength="30" required />
            </label>
          )}
          <label>
            Adresse e-mail
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Mot de passe
            <input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength="8" required />
          </label>
          <button className="primary-button full-button" disabled={mutation.isPending}>
            {mutation.isPending ? "Un instant…" : mode === "login" ? "Se connecter" : "Créer mon compte"}
          </button>
        </form>
        <div className="auth-divider"><span>ou continuer avec</span></div>
        <a className="github-button" href={`${API_URL}/api/auth/github`}>
          <Github size={18} /> Continuer avec GitHub
        </a>
        <p className="switch-auth">
          {mode === "login" ? "Pas encore de compte ?" : "Vous avez déjà un compte ?"}
          <button onClick={() => { setErrorMessage(""); setMode(mode === "login" ? "register" : "login"); }}>
            {mode === "login" ? "S'inscrire" : "Se connecter"}
          </button>
        </p>
      </section>
    </div>
  );
}

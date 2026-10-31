import { useEffect, useState } from "react";
import { Bell, ChevronDown, Code2, Compass, LogOut, MessageSquare, Search, UserRound } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Feed from "./pages/Feed.jsx";
import AuthDialog from "./components/AuthDialog.jsx";
import { AuthProvider, useAuth } from "./features/auth/AuthContext.jsx";
import { apiRequest } from "./api/client.js";

function AppShell() {
  const { user } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [authNotice, setAuthNotice] = useState("");
  const queryClient = useQueryClient();
  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("/api/auth/logout", { method: "POST" }),
    onSuccess: () => {
      queryClient.setQueryData(["current-user"], null);
      setShowMenu(false);
    }
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (error === "github_account_exists") {
      window.history.replaceState({}, "", window.location.pathname);
      setAuthNotice("Cette adresse e-mail est déjà utilisée. Connectez-vous avec votre mot de passe.");
      setShowAuth(true);
    } else if (error === "github_auth_failed") {
      window.history.replaceState({}, "", window.location.pathname);
      setAuthNotice("La connexion GitHub a échoué. Réessayez ou utilisez votre adresse e-mail.");
      setShowAuth(true);
    } else if (error === "github_email_required") {
      window.history.replaceState({}, "", window.location.pathname);
      setAuthNotice("Ajoutez une adresse e-mail vérifiée à votre compte GitHub pour continuer.");
      setShowAuth(true);
    }
  }, []);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="/" aria-label="DevHub, accueil">
            <span className="brand-mark"><Code2 size={21} strokeWidth={2.5} /></span>
            <span>dev<span className="brand-accent">hub</span></span>
          </a>
          <form className="top-search" onSubmit={(event) => {
            event.preventDefault();
            const value = new FormData(event.currentTarget).get("global-search")?.toString() || "";
            window.dispatchEvent(new CustomEvent("devhub:search", { detail: value }));
          }}>
            <Search size={18} />
            <input name="global-search" placeholder="Rechercher sur DevHub…" aria-label="Rechercher" />
            <kbd>⌘ K</kbd>
          </form>
          <nav className="top-actions" aria-label="Navigation principale">
            <a className="top-nav-link top-nav-current" href="#"><Compass size={18} /><span>Explorer</span></a>
            <button className="icon-button top-icon" aria-label="Messages" onClick={() => setShowAuth(!user)}><MessageSquare size={19} /></button>
            <button className="icon-button top-icon notification-button" aria-label="Notifications" onClick={() => setShowAuth(!user)}><Bell size={19} /><i /></button>
            {user ? (
              <div className="account-wrap">
                <button className="account-button" onClick={() => setShowMenu(!showMenu)}>
                  {user.avatar ? <img className="avatar avatar-small" src={user.avatar} alt="" /> : <span className="avatar avatar-small avatar-fallback">{user.username?.slice(0, 2).toUpperCase()}</span>}
                  <ChevronDown size={15} />
                </button>
                {showMenu && <div className="account-menu">
                  <div className="account-menu-user"><strong>{user.username}</strong><span>{user.email}</span></div>
                  <button onClick={() => logoutMutation.mutate()} disabled={logoutMutation.isPending}><LogOut size={16} /> Déconnexion</button>
                </div>}
              </div>
            ) : (
              <div className="auth-actions">
                <button className="login-button" onClick={() => setShowAuth(true)}>Connexion</button>
                <button className="primary-button header-join" onClick={() => setShowAuth(true)}>Rejoindre</button>
              </div>
            )}
          </nav>
        </div>
      </header>
      <div className="mobile-tabs">
        <a className="mobile-tab-active" href="#"><Compass size={17} /> Explorer</a>
        <button onClick={() => setShowAuth(!user)}><MessageSquare size={17} /> Messages</button>
        <button onClick={() => setShowAuth(!user)}><UserRound size={17} /> Profil</button>
      </div>
      <Feed onRequireAuth={() => setShowAuth(true)} />
      {showAuth && <AuthDialog notice={authNotice} onClose={() => { setShowAuth(false); setAuthNotice(""); }} />}
    </div>
  );
}

export default function App() {
  return <AuthProvider><AppShell /></AuthProvider>;
}

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../api/client.js";
import PostCard from "../components/PostCard.jsx";
import PostComposer from "../components/PostComposer.jsx";
import { useAuth } from "../features/auth/AuthContext.jsx";
import { ChevronDown, Flame, Hash, LoaderCircle, Search, Sparkles } from "lucide-react";

const popularTags = ["react", "javascript", "typescript", "nodejs", "python", "opensource"];

export default function Feed({ onRequireAuth }) {
  const { user } = useAuth();
  const [sort, setSort] = useState("recent");
  const [selectedTag, setSelectedTag] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    function handleGlobalSearch(event) {
      const value = typeof event.detail === "string" ? event.detail : "";
      setSearchInput(value);
      setSearch(value.trim());
    }
    window.addEventListener("devhub:search", handleGlobalSearch);
    return () => window.removeEventListener("devhub:search", handleGlobalSearch);
  }, []);

  const query = useQuery({
    queryKey: ["posts", { sort, selectedTag, search }],
    queryFn: () => {
      const params = new URLSearchParams({ sort, limit: "20" });
      if (selectedTag) params.set("tags", selectedTag);
      if (search) params.set("q", search);
      return apiRequest(`/api/posts?${params.toString()}`);
    }
  });

  function submitSearch(event) {
    event.preventDefault();
    setSearch(searchInput.trim());
  }

  return (
    <div className="feed-grid">
      <aside className="left-sidebar">
        <section className="side-card welcome-card">
          <div className="welcome-icon"><Sparkles size={20} /></div>
          <h2>Le hub des développeurs</h2>
          <p>Partagez vos projets, apprenez ensemble et rencontrez la communauté.</p>
          {!user && <button className="primary-button side-join" onClick={onRequireAuth}>Rejoindre DevHub</button>}
        </section>
        <nav className="side-card nav-card" aria-label="Navigation du fil">
          <button className={`side-nav-link ${sort === "recent" ? "side-nav-active" : ""}`} onClick={() => setSort("recent")}>
            <Sparkles size={18} /> Pour vous
          </button>
          <button className={`side-nav-link ${sort === "trending" ? "side-nav-active" : ""}`} onClick={() => setSort("trending")}>
            <Flame size={18} /> Tendances
          </button>
          <button className={`side-nav-link ${sort === "top" ? "side-nav-active" : ""}`} onClick={() => setSort("top")}>
            <Hash size={18} /> Les plus votés
          </button>
        </nav>
        <section className="side-card tags-card">
          <div className="side-card-heading"><h3>Technologies populaires</h3><span>Explorer</span></div>
          {popularTags.map((tag) => (
            <button
              className={`popular-tag ${selectedTag === tag ? "popular-tag-active" : ""}`}
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? "" : tag)}
            >
              <span className="tag-dot">#</span>{tag}
            </button>
          ))}
          {selectedTag && <button className="clear-filter" onClick={() => setSelectedTag("")}>Effacer le filtre</button>}
        </section>
      </aside>

      <main className="feed-main">
        <div className="feed-heading">
          <div>
            <span className="eyebrow">LA COMMUNAUTÉ DEV</span>
            <h1>Votre fil d’actualité</h1>
          </div>
          <button className="sort-select" onClick={() => setSort(sort === "recent" ? "top" : sort === "top" ? "trending" : "recent")}>
            {sort === "recent" ? "Plus récents" : sort === "top" ? "Plus votés" : "Tendances"}
            <ChevronDown size={16} />
          </button>
        </div>

        <form className="feed-search" onSubmit={submitSearch}>
          <Search size={19} />
          <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Rechercher un sujet, une techno…" aria-label="Recherche globale" />
          <button type="submit">Rechercher</button>
        </form>

        <PostComposer user={user} onRequireAuth={onRequireAuth} />

        {selectedTag && (
          <div className="active-filter">Publications avec <strong>#{selectedTag}</strong><button onClick={() => setSelectedTag("")}>Retirer</button></div>
        )}
        {search && (
          <div className="active-filter">Résultats pour <strong>« {search} »</strong><button onClick={() => { setSearch(""); setSearchInput(""); }}>Effacer</button></div>
        )}

        {query.isLoading ? (
          <div className="feed-state"><LoaderCircle className="spinner" size={25} /><span>Chargement du fil…</span></div>
        ) : query.isError ? (
          <div className="feed-state feed-error">
            <strong>Impossible de charger le fil.</strong>
            <span>{query.error.message}</span>
            <button className="secondary-button" onClick={() => query.refetch()}>Réessayer</button>
          </div>
        ) : query.data.posts.length === 0 ? (
          <div className="feed-state empty-state">
            <div className="empty-emoji">✦</div>
            <strong>Aucune publication pour l’instant</strong>
            <span>Essayez un autre filtre ou lancez la conversation.</span>
            {selectedTag && <button className="secondary-button" onClick={() => setSelectedTag("")}>Voir tout le fil</button>}
          </div>
        ) : (
          <div className="post-list">
            {query.data.posts.map((post) => <PostCard key={post._id} post={post} onRequireAuth={onRequireAuth} />)}
            {query.data.pages > 1 && <p className="pagination-note">Page {query.data.page} sur {query.data.pages}</p>}
          </div>
        )}
      </main>

      <aside className="right-sidebar">
        <section className="side-card trend-card">
          <div className="trend-title"><div className="trend-icon"><Flame size={18} /></div><h3>À la une cette semaine</h3></div>
          <p>Les idées et discussions qui font vibrer la communauté.</p>
          <button onClick={() => setSort("trending")}>Explorer les tendances <span>→</span></button>
        </section>
        <section className="side-card community-card">
          <div className="community-art"><span>DEV</span><span>HUB</span><i>✳</i></div>
          <h3>Construisons mieux, ensemble.</h3>
          <p>Une communauté créée par des développeurs, pour les développeurs.</p>
          {!user && <button onClick={onRequireAuth}>Créer un compte gratuit</button>}
        </section>
        <footer className="sidebar-footer">
          <span>À propos</span><span>Règles de la communauté</span><span>Confidentialité</span>
          <small>© 2026 DevHub · Fait avec soin pour les devs</small>
        </footer>
      </aside>
    </div>
  );
}

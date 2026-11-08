import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { useToast } from "../toast.jsx";
import Composer from "./Composer.jsx";
import FollowRow from "./FollowRow.jsx";
import Gallery from "./Gallery.jsx";
import PhotoModal from "./PhotoModal.jsx";
import PostList from "./PostList.jsx";
import ProfileCard from "./ProfileCard.jsx";
import SearchBox from "./SearchBox.jsx";
import Topbar from "./Topbar.jsx";

/** Inicio: perfil · publicaciones (o galería de miniaturas) · sugerencias de a quién seguir. */
export default function FeedPage({ user, setUser, onLogout }) {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [pubs, setPubs] = useState(0);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(new Set());
  const [suggested, setSuggested] = useState([]);
  const [view, setView] = useState("feed");       // feed | gallery
  const [scope, setScope] = useState("all");      // galería: all | mine
  const [gVersion, setGVersion] = useState(0);    // sube para recargar la galería
  const [photoId, setPhotoId] = useState(null);

  const loadFeed = useCallback(async (p) => {
    setLoading(true);
    try {
      const r = await api(`/publications/feed/${p}`);
      setPage(p); setPages(r.totalPages || 1);
      setItems((prev) => (p === 1 ? r.items : prev.concat(r.items)));
    } catch (e) { toast(e.message, true); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => {
    loadFeed(1);
    (async () => {
      const [mine, fr, fg, sg] = await Promise.allSettled([
        api(`/publications/profile/${user.id}/1`), api(`/follow/followers/${user.id}`), api(`/follow/following/${user.id}`), api("/follow/suggestions"),
      ]);
      setPubs(mine.value?.totalDocs || 0);
      setFollowers(fr.value?.count || 0);
      setFollowing(new Set((fg.value?.following || []).map((f) => f.followed_user?._id)));
      setSuggested(sg.value?.users || []);
    })();
  }, [user.id, loadFeed]);

  async function toggleFollow(id) {
    const was = following.has(id);
    try {
      if (was) await api(`/follow/unfollow/${id}`, { method: "DELETE" });
      else await api("/follow/follow", { method: "POST", body: { followed_user: id } });
      setFollowing((prev) => { const n = new Set(prev); if (was) n.delete(id); else n.add(id); return n; });
    } catch (e) { toast(e.message, true); }
  }

  const onPosted = (pub, withPhoto) => {
    setItems((l) => [{ type: "post", at: new Date().toISOString(), publication: pub }, ...l]);
    setPubs((n) => n + 1);
    if (withPhoto) setGVersion((v) => v + 1);
  };
  const onDeleted = (id) => {
    setItems((l) => l.filter((i) => i.publication._id !== id));
    setPubs((n) => Math.max(0, n - 1));
    setGVersion((v) => v + 1);
  };
  const onRepost = (pub, on) => setItems((l) => on
    ? [{ type: "repost", at: new Date().toISOString(), by: user, publication: pub }, ...l]
    : l.filter((i) => !(i.type === "repost" && i.by?._id === user.id && i.publication._id === pub._id)));

  return (
    <>
      <Topbar onLogout={onLogout} me={user} search={<SearchBox following={following} onToggle={toggleFollow} />} />
      <div className="shell">
        <ProfileCard user={user} setUser={setUser} counts={{ pubs, followers, following: following.size }} />

        <main>
          <Composer user={user} onPosted={onPosted} />

          <div className="views">
            <div className="nav" role="tablist">
              <button role="tab" aria-selected={view === "feed"} onClick={() => setView("feed")}>Publicaciones</button>
              <button role="tab" aria-selected={view === "gallery"} onClick={() => setView("gallery")}>Galería de fotos</button>
            </div>
            {view === "gallery" && (
              <div className="nav sm" role="tablist">
                <button role="tab" aria-selected={scope === "all"} onClick={() => setScope("all")}>Todas</button>
                <button role="tab" aria-selected={scope === "mine"} onClick={() => setScope("mine")}>Mis fotos</button>
              </div>
            )}
          </div>

          {view === "feed" ? (
            <div className="list">
              {loading && !items.length
                ? <p className="sub center-text">Cargando…</p>
                : <PostList items={items} me={user} empty="Aún no hay publicaciones. Escribe la primera." onDeleted={onDeleted} onRepost={onRepost} onOpenPhoto={setPhotoId} />}
              {!loading && page < pages && <div className="center-text"><button className="btn ghost" onClick={() => loadFeed(page + 1)}>Ver más</button></div>}
            </div>
          ) : (
            <Gallery scope={scope} version={gVersion} onOpen={setPhotoId} />
          )}
        </main>

        <aside className="box rail">
          <h4>A quién seguir</h4>
          {suggested.length
            ? suggested.slice(0, 5).map((u) => <FollowRow key={u._id} user={u} following={following} onToggle={toggleFollow} />)
            : <p className="sub">Aún no hay otras personas para seguir.</p>}
        </aside>
      </div>

      {photoId && <PhotoModal id={photoId} me={user} onClose={() => setPhotoId(null)} onDeleted={() => { setPhotoId(null); onDeleted(photoId); }} />}
    </>
  );
}

import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { useToast } from "../toast.jsx";
import Avatar from "./Avatar.jsx";
import Icon from "./Icon.jsx";
import Mentions from "./Mentions.jsx";
import PhotoModal from "./PhotoModal.jsx";
import PostModal from "./PostModal.jsx";
import Topbar from "./Topbar.jsx";

const TABS = [["posts", "Publicaciones", "grid"], ["videos", "Videos", "film"], ["reposts", "Reposts", "rt"], ["tagged", "Etiquetadas", "tag"]];
const EMPTY = {
  posts: ["Aún no hay publicaciones.", "Aún no has publicado nada."],
  videos: ["Aún no hay videos.", "Aún no has subido videos."],
  reposts: ["Aún no ha compartido publicaciones.", "Aún no has compartido publicaciones."],
  tagged: ["Aún no hay publicaciones donde lo hayan etiquetado.", "Aquí aparecen las publicaciones donde otras personas escriben @tu_nick."],
};

/** Perfil estilo Instagram con banner (como YouTube): publicaciones, videos, reposts y etiquetadas. */
export default function ProfilePage({ me, onLogout, nick }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("posts");
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);
  const [photoId, setPhotoId] = useState(null);

  useEffect(() => {
    setData(null); setErr(""); setTab("posts"); setItems([]);
    api(`/profile/${encodeURIComponent(nick)}`).then(setData).catch((e) => setErr(e.message));
  }, [nick]);

  const load = useCallback(async (t, p) => {
    setLoading(true);
    try {
      const r = await api(`/profile/${encodeURIComponent(nick)}/${t}?page=${p}`);
      setItems((prev) => (p === 1 ? r.items : prev.concat(r.items)));
      setPage(p); setMore(r.hasMore);
    } catch (e) { toast(e.message, true); }
    finally { setLoading(false); }
  }, [nick, toast]);

  const uid = data?.user?._id;
  useEffect(() => { if (uid) load(tab, 1); }, [uid, tab, load]);

  async function toggleFollow() {
    const was = data.isFollowing;
    try {
      if (was) await api(`/follow/unfollow/${uid}`, { method: "DELETE" });
      else await api("/follow/follow", { method: "POST", body: { followed_user: uid } });
      setData((d) => ({ ...d, isFollowing: !was, counts: { ...d.counts, followers: d.counts.followers + (was ? -1 : 1) } }));
    } catch (e) { toast(e.message, true); }
  }

  const removed = (id) => {
    setItems((l) => l.filter((i) => i.publication._id !== id));
    setData((d) => (d.isMe ? { ...d, counts: { ...d.counts, posts: Math.max(0, d.counts.posts - 1) } } : d));
  };
  const selectTab = (t) => { if (t !== tab) { setItems([]); setLoading(true); setTab(t); } };

  const bar = <Topbar onLogout={onLogout} me={me} back />;
  if (err) return <>{bar}<div className="pf"><div className="box empty">{err}<br /><a className="link" href="#/">Volver al inicio</a></div></div></>;
  if (!data) return <>{bar}<div className="pf"><p className="sub center-text">Cargando perfil…</p></div></>;

  const { user, counts, isMe } = data;
  return (
    <>
      {bar}
      <div className="pf">
        <div className="banner" style={user.bannerUrl ? { backgroundImage: `url(${user.bannerUrl})` } : undefined} />
        <header className="pf-head">
          <Avatar user={user} size={104} />
          <div className="pf-info">
            <div className="pf-row">
              <h1>{user.name}</h1>
              {isMe
                ? <a className="btn ghost" href="#/config/perfil">Editar perfil</a>
                : <button className={"btn" + (data.isFollowing ? " ghost" : "")} onClick={toggleFollow}>{data.isFollowing ? "Siguiendo" : "Seguir"}</button>}
            </div>
            <p className="sub">@{user.nick}</p>
            <div className="pf-stats">
              <span><b>{counts.posts}</b> publicaciones</span>
              <span><b>{counts.followers}</b> seguidores</span>
              <span><b>{counts.following}</b> seguidos</span>
            </div>
            {user.bio && <p className="pf-bio"><Mentions text={user.bio} /></p>}
          </div>
        </header>

        <nav className="pf-tabs" role="tablist">
          {TABS.map(([key, label, icon]) => (
            <button key={key} role="tab" aria-selected={tab === key} onClick={() => selectTab(key)}><Icon name={icon} /><span>{label}</span></button>
          ))}
        </nav>

        {!loading && !items.length && <div className="box empty">{EMPTY[tab][isMe ? 1 : 0]}</div>}
        <div className="pgrid">
          {items.map((it, i) => {
            const p = it.publication;
            return (
              <button key={`${p._id}-${i}`} className={"ptile" + (p.hasImage ? "" : " txt")} onClick={() => setOpen(p)} aria-label={p.text ? `Abrir publicación: ${p.text.slice(0, 40)}` : "Abrir publicación"}>
                {p.hasImage ? <img src={p.thumbUrl} alt="" loading="lazy" /> : <span className="ptxt">{p.text.slice(0, 140)}</span>}
                {p.isVideo && <span className="badge"><Icon name="play" fill /></span>}
                {tab === "reposts" && <span className="badge l"><Icon name="rt" /></span>}
              </button>
            );
          })}
        </div>
        {loading && <p className="sub center-text">Cargando…</p>}
        {!loading && more && <div className="center-text"><button className="btn ghost" onClick={() => load(tab, page + 1)}>Ver más</button></div>}
      </div>

      {open && <PostModal publication={open} me={me} onClose={() => setOpen(null)} onDeleted={removed} onOpenPhoto={setPhotoId} />}
      {photoId && <PhotoModal id={photoId} me={me} onClose={() => setPhotoId(null)} onDeleted={() => { const id = photoId; setPhotoId(null); setOpen(null); removed(id); }} />}
    </>
  );
}

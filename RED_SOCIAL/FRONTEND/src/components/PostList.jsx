import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api";
import { ago } from "../util";
import Avatar from "./Avatar.jsx";
import PostCard from "./PostCard.jsx";

/** Tarjeta de actividad para comentarios (secciones "Me gusta" y "Comentarios" de Configuración). */
function ActivityComment({ item, label }) {
  const c = item.comment, pu = c.publication;
  return (
    <article className="box post">
      <small className="rp">{label}{pu?.user ? ` en la publicación de @${pu.user.nick}` : ""} · {ago(item.at)}</small>
      <div className="ph"><Avatar user={c.user} size={32} /><div><b>{c.user?.name || "Usuario eliminado"}</b><small>@{c.user?.nick || ""}</small></div></div>
      <p className="txt">{c.text}</p>
      {pu?.text && <small className="quote">“{pu.text.slice(0, 90)}{pu.text.length > 90 ? "…" : ""}”</small>}
    </article>
  );
}

/**
 * Lista de publicaciones. Pide los contadores (likes, comentarios, reposts, guardado) de todas las
 * publicaciones visibles en UNA sola petición por lote de 50, y los reparte a cada tarjeta.
 */
export default function PostList({ items, me, empty, commentLabel = "Comentaste", onDeleted, onRepost, onUnsave, onOpenPhoto }) {
  const [stats, setStats] = useState({});
  const asked = useRef(new Set());

  useEffect(() => {
    const ids = [...new Set(items.map((i) => i.publication?._id).filter(Boolean))].filter((id) => !asked.current.has(id));
    if (!ids.length) return;
    ids.forEach((id) => asked.current.add(id));
    (async () => {
      for (let i = 0; i < ids.length; i += 50) {
        try { const r = await api("/social/stats", { method: "POST", body: { ids: ids.slice(i, i + 50) } }); setStats((s) => ({ ...s, ...r.stats })); }
        catch { /* sin contadores: se muestran en cero */ }
      }
    })();
  }, [items]);

  const patch = useCallback((id, fn) => setStats((s) => ({ ...s, [id]: fn(s[id] || { likes: 0, dislikes: 0, comments: 0, reposts: 0, mine: 0, saved: false, reposted: false }) })), []);

  if (!items.length) return <div className="box empty">{empty}</div>;
  return items.map((it, i) => it.comment
    ? <ActivityComment key={`c-${it.comment._id}-${i}`} item={it} label={commentLabel} />
    : <PostCard key={`${it.type || "p"}-${it.publication._id}-${it.by?._id || ""}`} item={it} me={me} stats={stats[it.publication._id]} patch={patch}
        onDeleted={onDeleted} onRepost={onRepost} onUnsave={onUnsave} onOpenPhoto={onOpenPhoto} />);
}

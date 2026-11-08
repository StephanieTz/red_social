import { useState } from "react";
import { api } from "../api";
import { ago } from "../util";
import { useToast } from "../toast.jsx";
import Avatar from "./Avatar.jsx";
import Icon from "./Icon.jsx";
import Mentions from "./Mentions.jsx";

export const ZERO = { likes: 0, dislikes: 0, comments: 0, reposts: 0, mine: 0, saved: false, reposted: false };

function Comment({ c, reply, canDelete, onLike, onReply, onDelete }) {
  return (
    <div className={"c" + (reply ? " rep" : "")}>
      <a href={c.user ? `#/u/${c.user.nick}` : undefined}><Avatar user={c.user} size={reply ? 26 : 32} /></a>
      <div className="cb">
        <a className="nm" href={c.user ? `#/u/${c.user.nick}` : undefined}><b>{c.user?.name || "Usuario eliminado"}</b></a> <small>@{c.user?.nick || ""} · {ago(c.createdAt)}</small>
        <p>{reply && c.replyTo && <a className="mn" href={`#/u/${c.replyTo.nick}`}>@{c.replyTo.nick} </a>}<Mentions text={c.text} /></p>
        <div className="ca">
          <button className={"link" + (c.liked ? " on" : "")} onClick={() => onLike(c)}>{c.liked ? "Te gusta" : "Me gusta"}{c.likes ? ` · ${c.likes}` : ""}</button>
          <button className="link" onClick={() => onReply(c)}>Responder</button>
          {canDelete && <button className="link" onClick={() => onDelete(c)}>Eliminar</button>}
        </div>
      </div>
    </div>
  );
}

/**
 * Publicación: texto, foto (clic = foto completa y transformaciones), me gusta / no me gusta, comentarios con
 * respuestas, repost y guardar. Los contadores llegan por lotes desde PostList (`stats`) y se actualizan al instante.
 */
export default function PostCard({ item, me, stats, patch, onDeleted, onRepost, onUnsave, onOpenPhoto }) {
  const p = item.publication, u = p.user || {}, id = p._id, s = stats || ZERO;
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState(null);
  const [reply, setReply] = useState(null);
  const [text, setText] = useState("");
  const [sure, setSure] = useState(false);
  const [imgSrc, setImgSrc] = useState(p.imageUrl);

  async function react(v) {
    const prev = s, next = { ...prev };
    if (prev.mine === 1) next.likes--;
    if (prev.mine === -1) next.dislikes--;
    next.mine = prev.mine === v ? 0 : v;
    if (next.mine === 1) next.likes++;
    if (next.mine === -1) next.dislikes++;
    patch(id, () => next);
    try { await api("/social/react", { method: "POST", body: { publication: id, value: v } }); }
    catch (e) { patch(id, () => prev); toast(e.message, true); }
  }

  async function save() {
    const prev = s;
    patch(id, (x) => ({ ...x, saved: !prev.saved }));
    try {
      await api("/social/save", { method: "POST", body: { publication: id } });
      toast(prev.saved ? "Quitado de guardados" : "Guardado");
      if (prev.saved) onUnsave?.(id);
    } catch (e) { patch(id, () => prev); toast(e.message, true); }
  }

  async function repost() {
    if (u._id === me.id) return toast("No puedes compartir tu propia publicación", true);
    const prev = s, on = !prev.reposted;
    patch(id, (x) => ({ ...x, reposted: on, reposts: x.reposts + (on ? 1 : -1) }));
    try {
      await api("/social/repost", { method: "POST", body: { publication: id } });
      toast(on ? "Compartido en tu perfil" : "Ya no lo compartes");
      onRepost?.(p, on);
    } catch (e) { patch(id, () => prev); toast(e.message, true); }
  }

  async function toggleComments() {
    const next = !open;
    setOpen(next);
    if (next && !comments) {
      try { setComments((await api(`/social/comments/${id}`)).comments); }
      catch (e) { setOpen(false); toast(e.message, true); }
    }
  }

  async function send(e) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    try {
      const r = await api("/social/comment", { method: "POST", body: { publication: id, text: t, parent: reply?._id } });
      setComments((l) => [...(l || []), r.comment]);
      patch(id, (x) => ({ ...x, comments: x.comments + 1 }));
      setText(""); setReply(null);
    } catch (err) { toast(err.message, true); }
  }

  async function likeComment(c) {
    const flip = (x) => ({ ...x, liked: !c.liked, likes: x.likes + (c.liked ? -1 : 1) });
    setComments((l) => l.map((x) => (x._id === c._id ? flip(x) : x)));
    try { await api("/social/comment-like", { method: "POST", body: { comment: c._id } }); }
    catch (err) { setComments((l) => l.map((x) => (x._id === c._id ? c : x))); toast(err.message, true); }
  }

  async function delComment(c) {
    try {
      const r = await api(`/social/comment/${c._id}`, { method: "DELETE" });
      setComments((l) => l.filter((x) => !r.removed.includes(x._id)));
      patch(id, (x) => ({ ...x, comments: Math.max(0, x.comments - r.removed.length) }));
    } catch (err) { toast(err.message, true); }
  }

  async function del() {
    if (!sure) { setSure(true); setTimeout(() => setSure(false), 3000); return; }
    try { await api(`/photos/${id}`, { method: "DELETE" }); toast("Publicación eliminada"); onDeleted?.(id); }
    catch (e) { toast(e.message, true); }
  }

  const roots = (comments || []).filter((c) => !c.parentId);
  return (
    <article className="box post">
      {item.type === "repost" && <small className="rp"><Icon name="rt" /> {item.by?._id === me.id ? "Compartiste" : `${item.by?.name || "Alguien"} compartió`}</small>}
      <div className="ph">
        <a href={u.nick ? `#/u/${u.nick}` : undefined}><Avatar user={u} size={40} /></a>
        <div><a className="nm" href={u.nick ? `#/u/${u.nick}` : undefined}><b>{u.name || "Usuario eliminado"}</b></a><small>@{u.nick || "anónimo"} · {ago(p.createdAt)}</small></div>
        {u._id === me.id && <button className="link" onClick={del}>{sure ? "¿Seguro?" : "Eliminar"}</button>}
      </div>
      {p.text && <p className="txt"><Mentions text={p.text} /></p>}
      {p.isVideo && <video className="pic vid" controls preload="metadata" playsInline poster={p.imageUrl} src={p.fullUrl} />}
      {p.hasImage && !p.isVideo && (
        <button className="pic-btn" onClick={() => onOpenPhoto?.(id)} aria-label="Ver foto completa y transformaciones">
          <img className="pic" src={imgSrc} alt="Imagen de la publicación" loading="lazy" onError={() => imgSrc !== p.fullUrl && setImgSrc(p.fullUrl)}
            style={p.width && p.height ? { aspectRatio: `${p.width} / ${p.height}` } : undefined} />
        </button>
      )}
      <div className="acts">
        <button className={"act" + (s.mine === 1 ? " on" : "")} aria-pressed={s.mine === 1} aria-label="Me gusta" onClick={() => react(1)}><Icon name="up" />{s.likes}</button>
        <button className={"act dis" + (s.mine === -1 ? " on" : "")} aria-pressed={s.mine === -1} aria-label="No me gusta" onClick={() => react(-1)}><Icon name="up" />{s.dislikes}</button>
        <button className={"act" + (open ? " on" : "")} aria-expanded={open} aria-label="Comentarios" onClick={toggleComments}><Icon name="cm" />{s.comments}</button>
        <button className={"act rt" + (s.reposted ? " on" : "")} aria-pressed={s.reposted} aria-label="Compartir" onClick={repost}><Icon name="rt" />{s.reposts}</button>
        <button className={"act sv" + (s.saved ? " on" : "")} aria-pressed={s.saved} aria-label="Guardar" onClick={save}><Icon name="sv" /></button>
      </div>
      {open && (
        <div className="cm">
          {!comments && <p className="sub">Cargando comentarios…</p>}
          {comments && !roots.length && <p className="sub">Sé el primero en comentar.</p>}
          {roots.map((c) => (
            <div key={c._id}>
              <Comment c={c} canDelete={c.user?._id === me.id || u._id === me.id} onLike={likeComment} onReply={setReply} onDelete={delComment} />
              {comments.filter((r) => r.parentId === c._id).map((r) => (
                <Comment key={r._id} c={r} reply canDelete={r.user?._id === me.id || u._id === me.id} onLike={likeComment} onReply={setReply} onDelete={delComment} />
              ))}
            </div>
          ))}
          <div className="cf">
            {reply && <div className="chip">Respondiendo a @{reply.user?.nick} <button type="button" onClick={() => setReply(null)} aria-label="Cancelar respuesta">✕</button></div>}
            <form onSubmit={send}><input value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder="Escribe un comentario" aria-label="Comentario" required /><button className="btn">Enviar</button></form>
          </div>
        </div>
      )}
    </article>
  );
}

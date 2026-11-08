import { useEffect, useRef, useState } from "react";
import { api, removeBanner, uploadAvatar, uploadBanner } from "../api";
import { useToast } from "../toast.jsx";
import Avatar from "./Avatar.jsx";
import Icon from "./Icon.jsx";
import PostList from "./PostList.jsx";
import Topbar from "./Topbar.jsx";

const MENU = [
  ["perfil", "Editar perfil", "user"],
  ["guardado", "Guardado", "sv"],
  ["actividad", "Tu actividad", "act"],
  ["seguridad", "Contraseña y seguridad", "lock"],
];

function Chips({ options, value, onChange }) {
  return (
    <div className="nav sm" role="tablist">
      {options.map(([v, l]) => <button key={v} role="tab" aria-selected={v === value} onClick={() => onChange(v)}>{l}</button>)}
    </div>
  );
}

// ---------- Editar perfil ----------
function EditProfile({ user, setUser }) {
  const toast = useToast();
  const file = useRef(null);
  const bannerFile = useRef(null);
  const [f, setF] = useState({ name: user.name, nick: user.nick, bio: user.bio || "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function save(e) {
    e.preventDefault(); setErr(""); setBusy(true);
    try { setUser((await api("/user/update", { method: "PUT", body: f })).user); toast("Perfil actualizado"); }
    catch (ex) { setErr(ex.message); }
    finally { setBusy(false); }
  }
  async function avatar(e) {
    const img = e.target.files?.[0]; e.target.value = "";
    if (!img) return;
    try { setUser(await uploadAvatar(img)); toast("Foto actualizada"); } catch (ex) { toast(ex.message, true); }
  }
  async function banner(e) {
    const img = e.target.files?.[0]; e.target.value = "";
    if (!img) return;
    try { setUser(await uploadBanner(img)); toast("Banner actualizado"); } catch (ex) { toast(ex.message, true); }
  }
  async function dropBanner() {
    try { setUser(await removeBanner()); toast("Banner eliminado"); } catch (ex) { toast(ex.message, true); }
  }

  return (
    <>
      <h2>Editar perfil</h2>
      <section className="box bn">
        <div className="banner sm" style={user.bannerUrl ? { backgroundImage: `url(${user.bannerUrl})` } : undefined}>{!user.bannerUrl && <span>Sin banner</span>}</div>
        <div className="bn-actions">
          <div><b>Banner del perfil</b><p className="sub small">Se muestra arriba de tu perfil (recomendado 1500×500, máx. 5 MB).</p></div>
          <div className="row">
            <button className="btn ghost" onClick={() => bannerFile.current.click()}>{user.bannerUrl ? "Cambiar banner" : "Subir banner"}</button>
            {user.bannerUrl && <button className="btn ghost" onClick={dropBanner}>Quitar</button>}
          </div>
        </div>
        <input ref={bannerFile} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={banner} />
      </section>
      <section className="box pr">
        <Avatar user={user} size={64} />
        <div><b>{user.nick}</b><p className="sub">{user.name}</p></div>
        <button className="btn" onClick={() => file.current.click()}>Cambiar foto</button>
        <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={avatar} />
      </section>
      <form className="box fields" onSubmit={save}>
        <label>Nombre<input value={f.name} onChange={set("name")} maxLength={50} required /></label>
        <label>Nick de usuario<input value={f.nick} onChange={set("nick")} maxLength={20} pattern="[A-Za-z0-9_.]{3,20}" title="3 a 20 caracteres: letras, números, _ o ." autoCapitalize="none" required /></label>
        <label className="bio-box">
          <span className="bio-head"><span>Biografía</span><span className="count">{f.bio.length} / 160</span></span>
          <textarea value={f.bio} onChange={set("bio")} maxLength={160} placeholder="Cuéntale a la gente quién eres. Puedes usar @menciones." />
        </label>
        {err && <p className="err-msg" role="alert">{err}</p>}
        <button className="btn" disabled={busy}>Guardar cambios</button>
      </form>
    </>
  );
}

// ---------- Guardado ----------
function Saved({ me }) {
  const [type, setType] = useState("all");
  const [items, setItems] = useState(null);
  useEffect(() => {
    setItems(null);
    api(`/social/saved?type=${type}`).then((r) => setItems(r.items)).catch(() => setItems([]));
  }, [type]);
  const drop = (id) => setItems((l) => l.filter((i) => i.publication._id !== id));
  return (
    <>
      <h2>Guardado</h2>
      <Chips options={[["all", "Todo"], ["image", "Fotos"]]} value={type} onChange={setType} />
      <div className="list">
        {items === null ? <p className="sub">Cargando…</p>
          : <PostList items={items} me={me} onUnsave={drop} onDeleted={drop}
              empty={type === "image" ? "No tienes fotos guardadas." : "Aún no has guardado nada. Usa el marcador en cualquier publicación."} />}
      </div>
    </>
  );
}

// ---------- Actividad ----------
const ACT = [["likes", "Me gusta"], ["comments", "Comentarios"], ["reposts", "Reposts"], ["posts", "Mis publicaciones"]];
const ACT_EMPTY = { likes: "Todavía no has dado me gusta a nada.", comments: "Todavía no has comentado.", reposts: "Todavía no has compartido publicaciones.", posts: "Todavía no has publicado nada." };

function Activity({ me }) {
  const [tab, setTab] = useState("likes");
  const [items, setItems] = useState(null);
  useEffect(() => {
    setItems(null);
    api(`/social/activity/${tab}`).then((r) => setItems(r.items)).catch(() => setItems([]));
  }, [tab]);
  const drop = (id) => setItems((l) => l.filter((i) => i.publication?._id !== id));
  return (
    <>
      <h2>Tu actividad</h2>
      <Chips options={ACT} value={tab} onChange={setTab} />
      <div className="list">
        {items === null ? <p className="sub">Cargando…</p>
          : <PostList items={items} me={me} empty={ACT_EMPTY[tab]} commentLabel={tab === "likes" ? "Te gustó este comentario" : "Comentaste"}
              onDeleted={drop} onRepost={(p, on) => tab === "reposts" && !on && drop(p._id)} />}
      </div>
    </>
  );
}

// ---------- Seguridad ----------
function Security({ onLogout }) {
  const toast = useToast();
  const [f, setF] = useState({ current: "", next: "", repeat: "" });
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault(); setErr("");
    if (f.next !== f.repeat) return setErr("Las contraseñas nuevas no coinciden");
    try { await api("/user/password", { method: "PUT", body: { current: f.current, next: f.next } }); toast("Contraseña actualizada"); setF({ current: "", next: "", repeat: "" }); }
    catch (ex) { setErr(ex.message); }
  }
  return (
    <>
      <h2>Contraseña y seguridad</h2>
      <form className="box fields" onSubmit={submit}>
        <h4>Cambiar contraseña</h4>
        <label>Contraseña actual<input type="password" value={f.current} onChange={set("current")} autoComplete="current-password" required /></label>
        <label>Nueva contraseña (mínimo 8 caracteres)<input type="password" value={f.next} onChange={set("next")} autoComplete="new-password" minLength={8} maxLength={128} required /></label>
        <label>Repite la nueva contraseña<input type="password" value={f.repeat} onChange={set("repeat")} autoComplete="new-password" required /></label>
        {err && <p className="err-msg" role="alert">{err}</p>}
        <button className="btn">Actualizar contraseña</button>
      </form>
      <section className="box bar">
        <div><b>Cerrar sesión</b><p className="sub">Termina tu sesión en este dispositivo.</p></div>
        <button className="btn ghost" onClick={onLogout}>Cerrar sesión</button>
      </section>
    </>
  );
}

/** Configuración con menú lateral (como Instagram): perfil, guardado, actividad y seguridad. */
export default function SettingsPage({ user, setUser, onLogout, tab }) {
  const current = MENU.some((m) => m[0] === tab) ? tab : "perfil";
  return (
    <>
      <Topbar onLogout={onLogout} me={user} back hideSettings />
      <div className="settings">
        <aside className="side box">
          <h1><Icon name="gear" /> Configuración</h1>
          <nav>
            {MENU.map(([key, label, icon]) => (
              <a key={key} href={`#/config/${key}`} className={key === current ? "on" : ""}><Icon name={icon} />{label}</a>
            ))}
          </nav>
          <a className="side-link" href={`#/u/${user.nick}`}>Ver mi perfil →</a>
        </aside>
        <section className="content">
          {current === "perfil" && <EditProfile user={user} setUser={setUser} />}
          {current === "guardado" && <Saved me={user} />}
          {current === "actividad" && <Activity me={user} />}
          {current === "seguridad" && <Security onLogout={onLogout} />}
        </section>
      </div>
    </>
  );
}

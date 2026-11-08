import { useRef } from "react";
import { uploadAvatar } from "../api";
import { useToast } from "../toast.jsx";
import Avatar from "./Avatar.jsx";

/** Tarjeta de perfil de la columna izquierda: portada, foto (clic para cambiarla), estadísticas y acceso a Configuración. */
export default function ProfileCard({ user, setUser, counts }) {
  const file = useRef(null);
  const toast = useToast();

  async function change(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try { setUser(await uploadAvatar(f)); toast("Foto actualizada"); } catch (err) { toast(err.message, true); }
  }

  return (
    <aside className="box me">
      <div className="cover" />
      <div className="in">
        <button className="pick" onClick={() => file.current.click()} aria-label="Cambiar foto de perfil"><Avatar user={user} size={68} /></button>
        <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={change} />
        <h3>{user.name}</h3>
        <p>@{user.nick}</p>
        {user.bio && <p className="bio">{user.bio}</p>}
        <div className="stats">
          <div><b>{counts.pubs}</b><span>Publicaciones</span></div>
          <div><b>{counts.followers}</b><span>Seguidores</span></div>
          <div><b>{counts.following}</b><span>Siguiendo</span></div>
        </div>
        <a className="link" href="#/config/perfil">Configuración y actividad →</a>
      </div>
    </aside>
  );
}

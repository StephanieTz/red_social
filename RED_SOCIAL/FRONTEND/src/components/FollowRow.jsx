import Avatar from "./Avatar.jsx";

/** Fila de usuario con enlace a su perfil y botón Seguir / Siguiendo (sugerencias y búsqueda). */
export default function FollowRow({ user, following, onToggle }) {
  const f = following.has(user._id);
  return (
    <div className="sug">
      <a href={`#/u/${user.nick}`}><Avatar user={user} size={38} /></a>
      <a className="who" href={`#/u/${user.nick}`}><b>{user.name}</b><small>@{user.nick}</small></a>
      <button className={"btn" + (f ? " ghost" : "")} onClick={() => onToggle(user._id)}>{f ? "Siguiendo" : "Seguir"}</button>
    </div>
  );
}

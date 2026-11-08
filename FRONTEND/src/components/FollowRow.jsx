import Avatar from "./Avatar.jsx";

/** Fila de usuario con botón Seguir / Siguiendo (sugerencias y resultados de búsqueda). */
export default function FollowRow({ user, following, onToggle }) {
  const f = following.has(user._id);
  return (
    <div className="sug">
      <Avatar user={user} size={38} />
      <div><b>{user.name}</b><small>@{user.nick}</small></div>
      <button className={"btn" + (f ? " ghost" : "")} onClick={() => onToggle(user._id)}>{f ? "Siguiendo" : "Seguir"}</button>
    </div>
  );
}

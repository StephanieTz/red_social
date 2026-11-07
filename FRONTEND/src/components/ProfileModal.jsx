import { useState } from "react";
import { api } from "../api";
import Avatar from "./Avatar.jsx";
import Modal from "./Modal.jsx";

export default function ProfileModal({ user, onClose, onSaved }) {
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio || "");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function save(e) {
    e.preventDefault(); setErr(""); setMsg("");
    try { const r = await api("/user/update", { method: "PUT", body: { name, bio } }); onSaved(r.user); setMsg("Perfil actualizado."); }
    catch (ex) { setErr(ex.message); }
  }

  async function avatar(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setErr(""); setMsg("");
    try { const form = new FormData(); form.append("file0", f); const r = await api("/user/upload", { method: "POST", form }); onSaved(r.user); setMsg("Foto de perfil actualizada."); }
    catch (ex) { setErr(ex.message); }
  }

  return (
    <Modal title="Mi perfil" onClose={onClose}>
      <div className="author"><Avatar user={user} size={64} />
        <label className="btn ghost">Cambiar foto<input type="file" accept="image/jpeg,image/png,image/webp" onChange={avatar} hidden /></label>
      </div>
      <form onSubmit={save}>
        <label>Nombre<input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} required /></label>
        <label>Biografía<textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={160} rows={3} /></label>
        <p className="muted small">@{user.nick}</p>
        {msg && <p className="ok-msg">{msg}</p>}{err && <p className="err-msg">{err}</p>}
        <button className="btn">Guardar</button>
      </form>
    </Modal>
  );
}

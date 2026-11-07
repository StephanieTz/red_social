import { useEffect, useState } from "react";
import { api, fmtBytes, fmtDate } from "../api";
import Avatar from "./Avatar.jsx";
import Modal from "./Modal.jsx";

/** Foto en resolución completa + todas sus transformaciones (selector de versiones). */
export default function PhotoModal({ id, me, onClose, onDeleted }) {
  const [photo, setPhoto] = useState(null);
  const [current, setCurrent] = useState("ORIGINAL");
  const [err, setErr] = useState("");

  useEffect(() => { api(`/photos/${id}`).then((r) => setPhoto(r.photo)).catch((e) => setErr(e.message)); }, [id]);

  async function remove() {
    if (!confirm("¿Eliminar esta foto y todas sus versiones?")) return;
    try { await api(`/photos/${id}`, { method: "DELETE" }); onDeleted(); } catch (e) { setErr(e.message); }
  }

  const versions = photo ? [{ type: "ORIGINAL", label: "Original", ...photo.original }, ...photo.transforms] : [];
  const shown = versions.find((v) => v.type === current) || versions[0];

  return (
    <Modal title="Foto" onClose={onClose} wide>
      {err && <p className="err-msg">{err}</p>}
      {!photo && !err && <p className="muted">Cargando…</p>}
      {photo && shown && (
        <div className="detail">
          <div className="stage"><img src={shown.url} alt={photo.caption || "Foto"} /></div>
          <aside>
            <div className="author"><Avatar user={photo.user} size={40} /><div><b>{photo.user?.name}</b><br /><span className="muted small">@{photo.user?.nick} · {fmtDate(photo.createdAt)}</span></div></div>
            {photo.caption && <p>{photo.caption}</p>}

            <h4>Versiones</h4>
            <div className="variants">
              {versions.map((v) => (
                <button key={v.type} className={v.type === shown.type ? "on" : ""} onClick={() => setCurrent(v.type)}>
                  <img src={v.url} alt="" loading="lazy" /><span>{v.label}</span>
                </button>
              ))}
            </div>
            <p className="muted small">{shown.label}: {shown.width}×{shown.height}px · {fmtBytes(shown.sizeBytes)}</p>
            <a className="btn ghost" href={shown.url} download>⬇ Descargar esta versión</a>

            {photo.analysis && <>
              <h4>Análisis</h4>
              <p className="small">👤 Rostros detectados: <b>{photo.analysis.faceCount}</b> <span className="muted">({photo.analysis.provider === "REKOGNITION" ? "Amazon Rekognition" : "face-api.js"})</span></p>
              {photo.analysis.labels?.length > 0 && <p className="chips">{photo.analysis.labels.map((l) => <span key={l.name}>{l.name}</span>)}</p>}
            </>}

            {(photo.user?.id === me.id || me.role === "admin") && <button className="btn danger" onClick={remove}>Eliminar foto</button>}
          </aside>
        </div>
      )}
    </Modal>
  );
}

import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { detectFaces } from "../faceDetect";
import Modal from "./Modal.jsx";

/**
 * Subida de una foto. Al elegir el archivo se detectan los rostros en el navegador (face-api.js) y se
 * muestran sobre la vista previa; el servidor luego crea miniatura + 3 transformaciones y guarda todo en S3.
 */
export default function UploadModal({ onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [size, setSize] = useState(null);       // tamaño natural de la imagen
  const [faces, setFaces] = useState(null);     // null = sin analizar · [] = ninguno
  const [scanning, setScanning] = useState(false);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const imgRef = useRef(null);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  function pick(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setErr(""); setFaces(null); setSize(null);
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return setErr("Elige una imagen JPG, PNG o WEBP.");
    if (f.size > 10 * 1024 * 1024) return setErr("La imagen supera los 10 MB.");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function scan() {
    const img = imgRef.current;
    setSize({ w: img.naturalWidth, h: img.naturalHeight });
    setScanning(true);
    try { setFaces(await detectFaces(img)); }
    catch { setFaces(null); } // si el modelo no carga, se publica igual (sin análisis del navegador)
    finally { setScanning(false); }
  }

  async function publish() {
    setBusy(true); setErr("");
    try {
      const form = new FormData();
      form.append("text", caption);
      if (faces) form.append("faces", JSON.stringify(faces));
      form.append("file", file); // el archivo va al final
      await api("/photos", { method: "POST", form });
      onDone();
    } catch (ex) { setErr(ex.message); setBusy(false); }
  }

  return (
    <Modal title="Subir foto" onClose={busy ? () => {} : onClose}>
      {!file ? (
        <label className="drop">
          <span>📷 Elige una foto</span><small>JPG, PNG o WEBP · máximo 10 MB</small>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} hidden />
        </label>
      ) : (
        <>
          <div className="preview">
            <img ref={imgRef} src={preview} alt="Vista previa" onLoad={scan} />
            {size && faces?.map((b, i) => (
              <i key={i} className="face-box" style={{ left: `${(b.x / size.w) * 100}%`, top: `${(b.y / size.h) * 100}%`, width: `${(b.width / size.w) * 100}%`, height: `${(b.height / size.h) * 100}%` }} />
            ))}
          </div>
          <p className="muted small">
            {scanning ? "Buscando rostros…" : faces == null ? "Análisis de rostros no disponible." : faces.length ? `👤 Se detectaron ${faces.length} rostro(s).` : "No se detectaron rostros."}
          </p>
          <textarea value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={500} placeholder="Escribe una descripción (opcional)" rows={3} />
          <div className="row end">
            <button className="btn ghost" disabled={busy} onClick={() => { setFile(null); setPreview(null); setFaces(null); }}>Cambiar foto</button>
            <button className="btn" disabled={busy || scanning} onClick={publish}>{busy ? "Procesando…" : "Publicar"}</button>
          </div>
          {busy && <p className="muted small">Creando miniatura y versiones (blanco y negro, sepia, ampliada)…</p>}
        </>
      )}
      {err && <p className="err-msg" role="alert">{err}</p>}
    </Modal>
  );
}

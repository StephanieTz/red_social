import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { detectFaces } from "../faceDetect";
import { useToast } from "../toast.jsx";
import Avatar from "./Avatar.jsx";

const MAX_MB = 10;

/**
 * Crear publicación: texto y, opcionalmente, una foto. Al elegir la foto se detectan los rostros en el
 * navegador (face-api.js); el servidor crea la miniatura y las tres transformaciones y la guarda en S3.
 */
export default function Composer({ user, onPosted }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [size, setSize] = useState(null);
  const [faces, setFaces] = useState(null); // null = sin analizar
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const imgRef = useRef(null);
  const input = useRef(null);
  const toast = useToast();

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function clear() { setFile(null); setPreview(null); setFaces(null); setSize(null); if (input.current) input.current.value = ""; }

  function pick(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { toast("Elige una imagen JPG, PNG o WEBP", true); return clear(); }
    if (f.size > MAX_MB * 1024 * 1024) { toast(`La imagen debe pesar menos de ${MAX_MB} MB`, true); return clear(); }
    setFaces(null); setSize(null); setFile(f); setPreview(URL.createObjectURL(f));
  }

  async function scan() {
    const img = imgRef.current;
    setSize({ w: img.naturalWidth, h: img.naturalHeight });
    setScanning(true);
    try { setFaces(await detectFaces(img)); } catch { setFaces(null); } // si el modelo no carga, se publica igual
    finally { setScanning(false); }
  }

  async function publish() {
    setBusy(true);
    try {
      const form = new FormData();
      form.append("text", text.trim());
      if (file && faces) form.append("faces", JSON.stringify(faces));
      if (file) form.append("file", file); // el archivo va al final
      const r = await api("/photos", { method: "POST", form });
      onPosted(r.publication, Boolean(file));
      setText(""); clear(); toast("Publicado");
    } catch (e) { toast(e.message, true); }
    finally { setBusy(false); }
  }

  const canPublish = !busy && !scanning && (text.trim() || file);

  return (
    <section className="box compose">
      <div className="row">
        <Avatar user={user} size={44} />
        <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={500} aria-label="Nueva publicación"
          placeholder="¿Qué estás pensando?" onKeyDown={(e) => e.key === "Enter" && (e.ctrlKey || e.metaKey) && canPublish && publish()} />
      </div>
      {preview && (
        <>
          <div className="preview">
            <div className="pv-inner">
              <img ref={imgRef} src={preview} alt="Vista previa" onLoad={scan} />
              {size && faces?.map((b, i) => (
                <i key={i} className="face-box" style={{ left: `${(b.x / size.w) * 100}%`, top: `${(b.y / size.h) * 100}%`, width: `${(b.width / size.w) * 100}%`, height: `${(b.height / size.h) * 100}%` }} />
              ))}
            </div>
            <button type="button" onClick={clear}>Quitar</button>
          </div>
          <p className="sub small">
            {scanning ? "Buscando rostros…" : faces == null ? "Análisis de rostros no disponible." : faces.length ? `👤 Se detectaron ${faces.length} rostro(s).` : "No se detectaron rostros."}
          </p>
        </>
      )}
      <div className="bar">
        <label className="btn ghost attach">Foto<input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={pick} /></label>
        <button className="btn" disabled={!canPublish} onClick={publish}>{busy ? "Publicando…" : "Publicar"}</button>
      </div>
      {busy && file && <p className="sub small">Creando miniatura y versiones (blanco y negro, sepia, ampliada)…</p>}
    </section>
  );
}

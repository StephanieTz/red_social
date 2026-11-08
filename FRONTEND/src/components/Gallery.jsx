import { useCallback, useEffect, useState } from "react";
import { api } from "../api";

/**
 * Cuadrícula de MINIATURAS (400×400). Se pide una página de 24 a la vez, las imágenes se cargan de forma
 * diferida (loading="lazy") y el navegador las cachea (las URLs son inmutables). La foto completa solo se
 * descarga cuando el usuario abre el detalle.
 */
export default function Gallery({ scope, version, onOpen }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async (p, replace) => {
    setLoading(true); setErr("");
    try {
      const r = await api(`/photos?page=${p}&limit=24${scope === "mine" ? "&mine=1" : ""}`);
      setItems((prev) => (replace ? r.items : [...prev, ...r.items]));
      setPage(r.page); setPages(r.totalPages);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }, [scope]);

  useEffect(() => { load(1, true); }, [load, version]);

  if (!loading && !err && !items.length)
    return <div className="box empty">{scope === "mine" ? "Aún no has subido fotos." : "Todavía no hay fotos."}<br />Usa el botón “Foto” al crear una publicación.</div>;

  return (
    <>
      {err && <p className="err-msg">{err}</p>}
      <div className="grid">
        {items.map((p) => (
          <button key={p.id} className="tile" onClick={() => onOpen(p.id)} aria-label={`Abrir foto de ${p.user?.nick || "usuario"}`}>
            <img src={p.thumbUrl} alt={p.caption || "Foto"} loading="lazy" decoding="async" width="400" height="400" />
            <span className="tile-meta">@{p.user?.nick}{p.faceCount > 0 && ` · ${p.faceCount} 👤`}</span>
          </button>
        ))}
      </div>
      {loading && <p className="sub center-text">Cargando…</p>}
      {!loading && page < pages && <div className="center-text"><button className="btn ghost" onClick={() => load(page + 1, false)}>Ver más</button></div>}
    </>
  );
}

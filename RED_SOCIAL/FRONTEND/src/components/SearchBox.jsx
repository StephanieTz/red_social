import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import FollowRow from "./FollowRow.jsx";

/** Buscador de personas de la barra superior (con espera de 250 ms entre teclas). */
export default function SearchBox({ following, onToggle }) {
  const [q, setQ] = useState("");
  const [found, setFound] = useState(null); // null = cerrado
  const box = useRef(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setFound(null); return; }
    const t = setTimeout(async () => {
      try { const r = await api("/social/search?q=" + encodeURIComponent(term)); setFound(r.users); } catch { setFound([]); }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const close = (e) => { if (!box.current?.contains(e.target)) setFound(null); };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  return (
    <div className="search" ref={box}>
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setFound(null)}
        placeholder="Buscar personas" autoComplete="off" autoCapitalize="none" aria-label="Buscar usuarios" />
      {found && (
        <div className="results">
          {found.length ? found.map((u) => <FollowRow key={u._id} user={u} following={following} onToggle={onToggle} />) : <p className="sub pad">No encontramos a nadie con ese nombre.</p>}
        </div>
      )}
    </div>
  );
}

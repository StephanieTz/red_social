import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Icon from "./Icon.jsx";

/**
 * Animación de creadores de la pantalla de bienvenida: tres columnas de tarjetas (video o foto) que suben y
 * bajan lentamente. Los elementos salen de /showcase/showcase.json (ver public/showcase/LEEME.md); mientras
 * esté vacío se muestran tarjetas de ejemplo.
 */
const RATIOS = ["3 / 4", "1 / 1", "4 / 5", "9 / 14", "3 / 4", "1 / 1"];
const GRADS = ["linear-gradient(160deg,#7a1230,#2a0a2e)", "linear-gradient(160deg,#374365,#1a2340)", "linear-gradient(160deg,#a02a45,#4a1230)", "linear-gradient(160deg,#4a3a7a,#1c1840)", "linear-gradient(160deg,#8a3a1f,#3a1420)"];
const EXAMPLES = ["@creador1", "@creador2", "@creador3", "@creador4", "@creador5", "@creador6", "@creador7", "@creador8", "@creador9"].map((name) => ({ name, example: true }));

function Wave({ seed }) {
  return <span className="wave" aria-hidden="true">{Array.from({ length: 22 }, (_, k) => <i key={k} style={{ height: `${22 + ((k * 37 + seed * 13) % 70)}%` }} />)}</span>;
}

function Card({ it, idx }) {
  return (
    <figure className="sc-card" style={{ aspectRatio: RATIOS[idx % RATIOS.length] }}>
      {it.example ? <div className="sc-ph" style={{ background: GRADS[idx % GRADS.length] }}><span>{it.name[1].toUpperCase()}</span></div>
        : it.type === "video" ? <video src={it.src} poster={it.poster} muted loop autoPlay playsInline preload="metadata" />
        : <img src={it.src} alt={it.name || "Creador"} loading="lazy" />}
      <figcaption>
        <span className="play"><Icon name="play" fill /></span>
        <Wave seed={idx} />
        {it.name && <small>{it.name}</small>}
      </figcaption>
    </figure>
  );
}

function Column({ cards, reverse, delay }) {
  const wrap = useRef(null), track = useRef(null);
  const [dist, setDist] = useState(0);
  useLayoutEffect(() => {
    const measure = () => setDist(Math.max(0, track.current.scrollHeight - wrap.current.clientHeight));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap.current); ro.observe(track.current);
    return () => ro.disconnect();
  }, [cards]);
  const style = { "--dist": `${dist}px`, animationDuration: `${Math.max(16, dist / 12)}s`, animationDelay: `-${delay}s`, animationDirection: reverse ? "alternate-reverse" : "alternate" };
  return <div className="sc-col" ref={wrap}><div className="sc-track" ref={track} style={dist > 0 ? style : undefined}>{cards}</div></div>;
}

export default function Showcase() {
  const [items, setItems] = useState(null);
  useEffect(() => {
    fetch("/showcase/showcase.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => setItems(Array.isArray(j.items) ? j.items.slice(0, 18) : []))
      .catch(() => setItems([]));
  }, []);

  const cols = useMemo(() => {
    if (items === null) return [[], [], []];
    const base = items.length ? items : EXAMPLES;
    const full = Array.from({ length: Math.max(base.length, 9) }, (_, i) => base[i % base.length]);
    const out = [[], [], []];
    full.forEach((it, i) => out[i % 3].push(<Card key={i} it={it} idx={i} />));
    return out;
  }, [items]);

  return (
    <div className="showcase" aria-hidden="true">
      <Column cards={cols[0]} delay={0} />
      <Column cards={cols[1]} delay={9} reverse />
      <Column cards={cols[2]} delay={4} />
    </div>
  );
}

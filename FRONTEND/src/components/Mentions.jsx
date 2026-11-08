/** Texto con @menciones convertidas en enlaces al perfil (así funcionan las «Etiquetadas»). */
export default function Mentions({ text }) {
  return String(text ?? "").split(/(@[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*)/g).map((part, i) =>
    part.length >= 4 && part[0] === "@" ? <a key={i} className="mn" href={`#/u/${part.slice(1)}`}>{part}</a> : part);
}

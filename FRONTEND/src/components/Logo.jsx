import { useState } from "react";

/** Logo de Clipzy: usa /brand/CLIPZY.webp (animado), luego .jpg y, si no existen, el texto. */
export default function Logo({ className = "" }) {
  const [step, setStep] = useState(0);
  const src = ["/brand/CLIPZY.webp", "/brand/CLIPZY.jpg"][step];
  if (!src) return <span className={"logo-text " + className}>Clip<span>zy</span></span>;
  return <img className={"logo-img " + className} src={src} alt="Clipzy" onError={() => setStep((s) => s + 1)} />;
}

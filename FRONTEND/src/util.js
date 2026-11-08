/** Fecha relativa en español: "hace 3 horas", "justo ahora". */
export function ago(d) {
  const s = (new Date(d) - Date.now()) / 1000;
  const r = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
  for (const [unit, n] of [["day", 86400], ["hour", 3600], ["minute", 60]]) if (Math.abs(s) >= n) return r.format(Math.round(s / n), unit);
  return "justo ahora";
}

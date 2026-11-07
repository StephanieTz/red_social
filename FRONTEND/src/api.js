/** Cliente HTTP mínimo. La sesión viaja en una cookie httpOnly: JavaScript nunca ve el token. */
export async function api(path, { method = "GET", body, form } = {}) {
  const headers = {};
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { headers["Content-Type"] = "application/json"; payload = JSON.stringify(body); }

  let res;
  try { res = await fetch("/api" + path, { method, headers, body: payload, credentials: "same-origin" }); }
  catch { throw new Error("No hay conexión con el servidor."); }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || "Algo salió mal"), { status: res.status });
  return data;
}

export const fmtBytes = (n) => (n == null ? "—" : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`);
export const fmtDate = (d) => new Date(d).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });

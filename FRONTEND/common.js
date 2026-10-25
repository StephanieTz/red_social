   const ORIGIN = location.protocol.startsWith("http") && (location.port === "4000" || location.hostname !== "localhost") ? location.origin : "http://localhost:4000";const API = ORIGIN + "/api";

// El token vive en una cookie httpOnly (el navegador la gestiona; JavaScript no puede leerla).
// Aquí solo guardamos datos públicos del usuario para pintar la interfaz.
const Session = {
  get user() { try { return JSON.parse(localStorage.getItem("user")); } catch { return null; } },
  save(u) { localStorage.setItem("user", JSON.stringify({ id: u._id || u.id, name: u.name, nick: u.nick, image: u.image || null, bio: u.bio || "" })); },
  clear() { ["user", "token", "userName"].forEach(k => localStorage.removeItem(k)); }
};

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const COLORS = ["#E6223A", "#690722", "#621D43", "#644765", "#374365"];
function avatar(u, size) {
  const n = (u?.name || u?.nick || "?").trim(), ini = n.split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  const c = COLORS[[...(u?.nick || n)].reduce((a, ch) => a + ch.charCodeAt(0), 0) % COLORS.length];
  const img = u?.image ? `<img src="${ORIGIN}/uploads/${encodeURIComponent(u.image)}" alt="">` : "";
  return `<span class="avatar" style="--av:${c};${size ? `--s:${size}px` : ""}">${esc(ini)}${img}</span>`;
}
// (la política de seguridad del servidor no permite onerror en línea, así que se escucha aquí)
document.addEventListener("error", e => { const t = e.target; if (t.tagName === "IMG" && t.parentElement?.classList.contains("avatar")) t.remove(); }, true);

async function api(path, { method = "GET", body, form } = {}) {
  const headers = {}; let payload;
  if (form) payload = form; else if (body) { headers["Content-Type"] = "application/json"; payload = JSON.stringify(body); }
  let res;
  try { res = await fetch(API + path, { method, headers, body: payload, credentials: "include" }); }
  catch { throw new Error("No hay conexión con el servidor. Revisa que esté encendido."); }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !path.startsWith("/user/login") && !path.startsWith("/user/register")) {
    Session.clear(); location.href = "index.html"; throw new Error(data.message || "Sesión expirada");
  }
  if (!res.ok) throw new Error(data.message || "Algo salió mal");
  return data;
}

function toast(msg, err) {
  let box = document.querySelector(".toasts");
  if (!box) { box = document.createElement("div"); box.className = "toasts"; box.setAttribute("aria-live", "polite"); document.body.append(box); }
  const t = document.createElement("div"); t.className = "toast" + (err ? " err" : ""); t.textContent = msg; box.append(t);
  setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 220); }, 3500);
}
function ago(d) {
  const s = (new Date(d) - Date.now()) / 1000, r = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
  for (const [u, n] of [["day", 86400], ["hour", 3600], ["minute", 60]]) if (Math.abs(s) >= n) return r.format(Math.round(s / n), u);
  return "justo ahora";
}
const isVideo = f => /\.(mp4|webm)$/i.test(f || "");
function mediaHTML(f) {
  if (!f) return "";
  const src = `${ORIGIN}/uploads/${encodeURIComponent(f)}`;
  return isVideo(f) ? `<video class="pic" controls preload="metadata" playsinline src="${src}"></video>` : `<img class="pic" loading="lazy" alt="Imagen de la publicación" src="${src}">`;
}
async function logout() { try { await api("/user/logout", { method: "POST" }); } catch {} Session.clear(); location.href = "index.html"; }

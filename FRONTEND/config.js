let me = Session.user;
if (!me) { location.replace("index.html"); throw new Error("Sin sesión"); }
const $ = id => document.getElementById(id);
const TABS = ["perfil", "guardado", "actividad", "seguridad"];
let tab = "perfil", sub = { guardado: "all", actividad: "likes" };

function chips(opts, current, attr) {
  return `<div class="nav sm" role="tablist">${opts.map(([v, l]) => `<button role="tab" ${attr}="${v}" aria-selected="${v === current}">${l}</button>`).join("")}</div>`;
}
function setTab(t) {
  tab = TABS.includes(t) ? t : "perfil"; history.replaceState(null, "", "#" + tab);
  document.querySelectorAll("#tabs button").forEach(b => b.setAttribute("aria-selected", b.dataset.tab === tab));
  ({ perfil: viewPerfil, guardado: viewGuardado, actividad: viewActividad, seguridad: viewSeguridad })[tab]();
}
document.querySelectorAll("#tabs button").forEach(b => (b.onclick = () => setTab(b.dataset.tab)));

// ---------- Perfil ----------
function viewPerfil() {
  $("view").innerHTML = `<section class="box"><div class="pr"><button class="pick" id="pick" aria-label="Cambiar foto">${avatar(me, 72)}</button>
    <div><b>${esc(me.name)}</b><p class="sub">@${esc(me.nick)}</p><button class="btn ghost" id="chg" style="padding:7px 14px;margin-top:6px">Cambiar foto</button></div></div></section>
    <section class="box"><form class="fields" id="pf">
      <label>Nombre<input id="fName" maxlength="50" value="${esc(me.name)}" required></label>
      <label>Nick de usuario<input id="fNick" maxlength="20" value="${esc(me.nick)}" autocapitalize="none" required></label>
      <label>Biografía<textarea id="fBio" maxlength="160" placeholder="Cuéntale a la gente quién eres">${esc(me.bio || "")}</textarea></label>
      <p class="err-msg" role="alert"></p><button class="btn">Guardar cambios</button></form></section>`;
  $("pick").onclick = $("chg").onclick = () => $("avatarFile").click();
  $("pf").onsubmit = async e => {
    e.preventDefault(); const msg = e.target.querySelector(".err-msg"), btn = e.target.querySelector("button"); msg.textContent = ""; btn.disabled = true;
    try {
      const r = await api("/user/update", { method: "PUT", body: { name: $("fName").value, nick: $("fNick").value, bio: $("fBio").value } });
      me = { id: r.user._id, name: r.user.name, nick: r.user.nick, image: r.user.image, bio: r.user.bio }; Session.save(me); toast("Perfil actualizado"); viewPerfil();
    } catch (err) { msg.textContent = err.message; btn.disabled = false; }
  };
}
$("avatarFile").onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  if (f.size > 5 * 1024 * 1024) return toast("La imagen debe pesar menos de 5 MB", true);
  const fd = new FormData(); fd.append("file0", f);
  try { const r = await api("/user/upload", { method: "POST", form: fd }); me = { ...me, image: r.user.image }; Session.save(me); toast("Foto actualizada"); viewPerfil(); }
  catch (err) { toast(err.message, true); }
  e.target.value = "";
};

// ---------- listas de publicaciones (Guardado / Actividad) ----------
PostUI.bind($("view"));
PostUI.hooks.deleted = id => PostUI.drop(id);
PostUI.hooks.unsaved = id => { if (tab === "guardado") PostUI.drop(id); };
PostUI.hooks.repost = (p, on) => { if (tab === "actividad" && sub.actividad === "reposts" && !on) PostUI.drop(p._id); };

async function loadList(url, render, empty) {
  const box = $("list"); box.innerHTML = '<p class="empty">Cargando…</p>';
  try {
    const r = await api(url);
    box.innerHTML = r.items.length ? r.items.map(render).join("") : `<div class="box empty">${empty}</div>`;
    PostUI.load(r.items.map(i => i.publication).filter(Boolean));
  } catch (e) { box.innerHTML = `<div class="box empty">${esc(e.message)}</div>`; }
}

function viewGuardado() {
  $("view").innerHTML = chips([["all", "Todo"], ["image", "Fotos"], ["video", "Videos"]], sub.guardado, "data-s") + '<div id="list" class="list"></div>';
  $("view").querySelectorAll("[data-s]").forEach(b => (b.onclick = () => { sub.guardado = b.dataset.s; viewGuardado(); }));
  const empty = { all: "Aún no has guardado nada. Usa el icono de marcador en cualquier publicación.", image: "No tienes fotos guardadas.", video: "No tienes videos guardados." }[sub.guardado];
  loadList(`/social/saved?type=${sub.guardado}`, i => PostUI.card({ type: "post", publication: i.publication }), empty);
}

function actCard(i, kind) {
  const c = i.comment, pu = c.publication;
  const label = kind === "likes" ? "Te gustó este comentario" : "Comentaste" + (pu?.user ? ` en la publicación de @${esc(pu.user.nick)}` : "");
  return `<article class="box post"><small class="rp">${label} · ${ago(i.at)}</small>
    <div class="ph">${avatar(c.user, 32)}<div><b>${esc(c.user?.name || "Usuario eliminado")}</b><small>@${esc(c.user?.nick || "")}</small></div></div>
    <p>${esc(c.text)}</p>${pu?.text ? `<small class="quote">“${esc(pu.text.slice(0, 90))}${pu.text.length > 90 ? "…" : ""}”</small>` : ""}</article>`;
}
function viewActividad() {
  $("view").innerHTML = chips([["likes", "Me gusta"], ["comments", "Comentarios"], ["reposts", "Reposts"], ["posts", "Mis publicaciones"]], sub.actividad, "data-s") + '<div id="list" class="list"></div>';
  $("view").querySelectorAll("[data-s]").forEach(b => (b.onclick = () => { sub.actividad = b.dataset.s; viewActividad(); }));
  const k = sub.actividad;
  const empty = { likes: "Todavía no has dado me gusta a nada.", comments: "Todavía no has comentado.", reposts: "Todavía no has compartido publicaciones.", posts: "Todavía no has publicado nada." }[k];
  loadList(`/social/activity/${k}`, i => i.comment ? actCard(i, k) : PostUI.card({ type: k === "reposts" ? "repost" : "post", by: me, publication: i.publication }), empty);
}

// ---------- Seguridad ----------
function viewSeguridad() {
  $("view").innerHTML = `<section class="box"><form class="fields" id="sf"><h4 style="font:700 17px var(--f-d)">Cambiar contraseña</h4>
    <label>Contraseña actual<input id="pCur" type="password" autocomplete="current-password" required></label>
    <label>Nueva contraseña (mínimo 8 caracteres)<input id="pNew" type="password" autocomplete="new-password" minlength="8" maxlength="72" required></label>
    <label>Repite la nueva contraseña<input id="pRep" type="password" autocomplete="new-password" required></label>
    <p class="err-msg" role="alert"></p><button class="btn">Actualizar contraseña</button></form></section>
    <section class="box"><div class="bar"><div><b>Cerrar sesión</b><p class="sub">Termina tu sesión en este dispositivo.</p></div><button class="btn ghost" id="lo">Cerrar sesión</button></div></section>`;
  $("lo").onclick = logout;
  $("sf").onsubmit = async e => {
    e.preventDefault(); const msg = e.target.querySelector(".err-msg"), btn = e.target.querySelector("button"); msg.textContent = "";
    if ($("pNew").value !== $("pRep").value) return (msg.textContent = "Las contraseñas nuevas no coinciden");
    btn.disabled = true;
    try { await api("/user/password", { method: "PUT", body: { current: $("pCur").value, next: $("pNew").value } }); toast("Contraseña actualizada"); e.target.reset(); }
    catch (err) { msg.textContent = err.message; }
    btn.disabled = false;
  };
}

setTab(location.hash.slice(1));
api("/user/me").then(r => { me = { id: r.user._id, name: r.user.name, nick: r.user.nick, image: r.user.image, bio: r.user.bio }; Session.save(me); if (tab === "perfil") viewPerfil(); }).catch(() => {});

let me = Session.user;
if (!me) { location.replace("index.html"); throw new Error("Sin sesión"); }
let items = [], page = 1, pages = 1, following = new Set(), counts = { pubs: 0, followers: 0, following: 0 }, found = [];
const $ = id => document.getElementById(id);

function renderMe() {
  $("me").innerHTML = `<div class="cover"></div><div class="in">
    <button class="pick" id="pick" aria-label="Cambiar foto de perfil">${avatar(me)}</button>
    <h3>${esc(me.name)}</h3><p>@${esc(me.nick)}</p>${me.bio ? `<p class="bio">${esc(me.bio)}</p>` : ""}
    <div class="stats"><div><b>${counts.pubs}</b><span>Publicaciones</span></div><div><b>${counts.followers}</b><span>Seguidores</span></div><div><b>${counts.following}</b><span>Siguiendo</span></div></div>
    <a class="link" href="config.html" style="display:inline-block;margin-top:10px;padding-left:0">Configuración y actividad →</a></div>`;
  $("meMini").innerHTML = avatar(me);
  $("pick").onclick = () => $("avatarFile").click();
}
function renderFeed() {
  $("feed").innerHTML = items.length ? PostUI.cards(items) : '<div class="box empty" style="margin-top:16px">Aún no hay publicaciones. Escribe la primera.</div>';
  $("more").hidden = page >= pages;
}
function sugRow(u) {
  const f = following.has(u._id);
  return `<div class="sug">${avatar(u, 38)}<div><b>${esc(u.name)}</b><small>@${esc(u.nick)}</small></div><button class="btn ${f ? "ghost" : ""}" data-f="${u._id}">${f ? "Siguiendo" : "Seguir"}</button></div>`;
}
function renderSug(users) {
  const list = users.filter(u => u._id !== me.id).slice(0, 5);
  $("sug").innerHTML = list.length ? list.map(sugRow).join("") : '<p class="sub">Aún no hay otras personas registradas.</p>';
}
function renderResults() {
  const box = $("results"); box.hidden = false;
  box.innerHTML = found.length ? found.map(sugRow).join("") : '<p class="sub" style="padding:10px 0">No encontramos a nadie con ese nombre.</p>';
}
const repaintFollow = () => { renderSug(window.suggested || []); if (!$("results").hidden) renderResults(); };

async function loadFeed(p = 1) {
  try {
    const r = await api(`/publication/feed/${p}`);
    page = p; pages = r.totalPages || 1; items = p === 1 ? r.items : items.concat(r.items);
    renderFeed(); PostUI.load(r.items.map(i => i.publication));
  } catch (e) { toast(e.message, true); }
}
async function loadSide() {
  const [pubs, fr, fg, ul] = await Promise.allSettled([api(`/publication/profile/${me.id}/1`), api(`/follow/followers/${me.id}`), api(`/follow/following/${me.id}`), api("/user/list/1")]);
  counts.pubs = pubs.value?.totalDocs || 0; counts.followers = fr.value?.count || 0;
  following = new Set((fg.value?.following || []).map(f => f.followed_user?._id)); counts.following = following.size;
  renderMe(); window.suggested = ul.value?.users || []; renderSug(window.suggested);
}

// ---------- composer (foto o video) ----------
$("text").oninput = $("file").onchange = () => {
  const f = $("file").files[0], pv = $("preview"), img = pv.querySelector("img"), vid = pv.querySelector("video");
  if (f && f.size > (f.type.startsWith("video") ? 50 : 5) * 1024 * 1024) { toast(f.type.startsWith("video") ? "El video debe pesar menos de 50 MB" : "La imagen debe pesar menos de 5 MB", true); $("file").value = ""; return $("file").onchange(); }
  pv.hidden = !f; img.hidden = !f || f.type.startsWith("video"); vid.hidden = !f || !f.type.startsWith("video");
  if (f) (f.type.startsWith("video") ? vid : img).src = URL.createObjectURL(f);
  $("publish").disabled = !$("text").value.trim();
};
$("rmImg").onclick = () => { $("file").value = ""; $("file").onchange(); };
async function publish() {
  const text = $("text").value.trim(); if (!text || $("publish").disabled) return;
  const fd = new FormData(); fd.append("text", text); if ($("file").files[0]) fd.append("file0", $("file").files[0]);
  $("publish").disabled = true;
  try {
    const r = await api("/publication/create", { method: "POST", form: fd });
    items.unshift({ type: "post", at: new Date().toISOString(), publication: { ...r.publication, user: { _id: me.id, name: me.name, nick: me.nick, image: me.image } } });
    counts.pubs++; $("text").value = ""; $("rmImg").click(); renderFeed(); renderMe(); PostUI.load([r.publication]); toast("Publicado");
  } catch (e) { toast(e.message, true); $("publish").disabled = false; }
}
$("publish").onclick = publish;
$("text").onkeydown = e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) publish(); };
$("more").onclick = () => loadFeed(page + 1);

// ---------- interacciones de publicaciones ----------
PostUI.bind($("feed"));
PostUI.hooks.deleted = id => { items = items.filter(i => i.publication._id !== id); counts.pubs = Math.max(0, counts.pubs - 1); renderFeed(); renderMe(); };
PostUI.hooks.repost = (p, on) => {
  if (on) items.unshift({ type: "repost", at: new Date().toISOString(), by: { _id: me.id, name: me.name }, publication: p });
  else items = items.filter(i => !(i.type === "repost" && i.by?._id === me.id && i.publication._id === p._id));
  renderFeed();
};

// ---------- seguir + buscador ----------
async function toggleFollow(e) {
  const b = e.target.closest("[data-f]"); if (!b) return; const id = b.dataset.f, was = following.has(id);
  b.disabled = true;
  try {
    if (was) await api(`/follow/unfollow/${id}`, { method: "DELETE" });
    else await api("/follow/follow", { method: "POST", body: { followed_user: id } });
    was ? following.delete(id) : following.add(id); counts.following = following.size; renderMe(); repaintFollow();
  } catch (err) { toast(err.message, true); b.disabled = false; }
}
$("sug").onclick = toggleFollow; $("results").onclick = toggleFollow;
let tm;
$("q").oninput = () => {
  clearTimeout(tm); const q = $("q").value.trim();
  if (q.length < 2) { $("results").hidden = true; return; }
  tm = setTimeout(async () => {
    try { const r = await api("/social/search?q=" + encodeURIComponent(q)); if ($("q").value.trim() === q) { found = r.users; renderResults(); } }
    catch (err) { toast(err.message, true); }
  }, 250);
};
$("q").onkeydown = e => { if (e.key === "Escape") $("results").hidden = true; };
document.addEventListener("click", e => { if (!e.target.closest(".search")) $("results").hidden = true; });

// ---------- foto de perfil ----------
$("avatarFile").onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  if (f.size > 5 * 1024 * 1024) return toast("La imagen debe pesar menos de 5 MB", true);
  const fd = new FormData(); fd.append("file0", f);
  try {
    const r = await api("/user/upload", { method: "POST", form: fd });
    me = { ...me, image: r.user.image }; Session.save(me);
    items.forEach(i => { if (i.publication.user?._id === me.id) i.publication.user.image = me.image; });
    renderMe(); renderFeed(); PostUI.load(items.map(i => i.publication)); toast("Foto actualizada");
  } catch (err) { toast(err.message, true); }
  e.target.value = "";
};
$("logout").onclick = logout;

renderMe(); renderFeed(); loadFeed(1); loadSide();
// valida la sesión con el servidor y refresca tu perfil (foto, nombre, bio)
api("/user/me").then(r => { me = { id: r.user._id, name: r.user.name, nick: r.user.nick, image: r.user.image, bio: r.user.bio }; Session.save(me); renderMe(); }).catch(() => {});

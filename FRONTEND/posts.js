// Componente compartido de publicaciones: feed.js y config.js lo usan.
// Maneja likes/dislikes, comentarios con respuestas, likes de comentarios, repost, guardar y eliminar.
const svg = d => `<svg viewBox="0 0 24 24"><path d="${d}"/></svg>`;
const I = {
  up: svg("M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"),
  cm: svg("M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"),
  sv: svg("M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"),
  rt: svg("M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3")
};

const PostUI = {
  S: {}, C: {}, P: {}, O: {}, R: {}, open: new Set(), hooks: {},
  st(id) { return this.S[id] || { likes: 0, dislikes: 0, comments: 0, reposts: 0, mine: 0, saved: false, reposted: false }; },

  acts(id) {
    const s = this.st(id), on = c => (c ? "on" : "");
    return `<button class="act ${on(s.mine === 1)}" data-r="1" aria-pressed="${s.mine === 1}" aria-label="Me gusta">${I.up}${s.likes}</button>
      <button class="act dis ${on(s.mine === -1)}" data-r="-1" aria-pressed="${s.mine === -1}" aria-label="No me gusta">${I.up}${s.dislikes}</button>
      <button class="act ${on(this.open.has(id))}" data-c aria-expanded="${this.open.has(id)}" aria-label="Comentarios">${I.cm}${s.comments}</button>
      <button class="act rt ${on(s.reposted)}" data-rt aria-pressed="${s.reposted}" aria-label="Compartir">${I.rt}${s.reposts}</button>
      <button class="act sv ${on(s.saved)}" data-sv aria-pressed="${s.saved}" aria-label="Guardar">${I.sv}</button>`;
  },

  cItem(id, c, reply) {
    const mine = c.user?._id === Session.user.id, can = mine || this.O[id] === Session.user.id;
    const mention = reply && c.replyTo ? `<span class="mn">@${esc(c.replyTo.nick)}</span> ` : "";
    return `<div class="c ${reply ? "rep" : ""}" data-cid="${c._id}">${avatar(c.user, reply ? 26 : 32)}<div class="cb">
      <b>${esc(c.user?.name || "Usuario eliminado")}</b> <small>@${esc(c.user?.nick || "")} · ${ago(c.created_at)}</small>
      <p>${mention}${esc(c.text)}</p>
      <div class="ca"><button class="link ${c.liked ? "on" : ""}" data-cl>${c.liked ? "Te gusta" : "Me gusta"}${c.likes ? " · " + c.likes : ""}</button>
      <button class="link" data-rp>Responder</button>${can ? '<button class="link" data-dc>Eliminar</button>' : ""}</div></div></div>`;
  },
  cm(id) {
    if (!this.open.has(id)) return "";
    const list = this.C[id];
    if (!list) return '<div class="cm"><p class="sub">Cargando comentarios…</p></div>';
    const roots = list.filter(c => !c.parent);
    const body = roots.map(c => this.cItem(id, c, false) + list.filter(r => r.parent === c._id).map(r => this.cItem(id, r, true)).join("")).join("");
    return `<div class="cm">${body || '<p class="sub">Sé el primero en comentar.</p>'}
      <div class="cf"><div class="chipslot"></div><form data-cf><input maxlength="300" placeholder="Escribe un comentario" aria-label="Comentario" required><button class="btn">Enviar</button></form></div></div>`;
  },

  card(it) {
    const p = it.publication, u = p.user || {};
    this.P[p._id] = p; this.O[p._id] = u._id;
    const me = Session.user.id;
    const rp = it.type === "repost" ? `<small class="rp">${I.rt} ${it.by?._id === me ? "Compartiste" : esc(it.by?.name || "Alguien") + " compartió"}</small>` : "";
    return `<article class="box post" data-pub="${p._id}">${rp}
      <div class="ph">${avatar(u, 40)}<div><b>${esc(u.name || "Usuario eliminado")}</b><small>@${esc(u.nick || "anónimo")} · ${ago(p.created_at)}</small></div>
      ${u._id === me ? '<button class="link" data-del>Eliminar</button>' : ""}</div>
      <p>${esc(p.text)}</p>${mediaHTML(p.file)}
      <div class="acts">${this.acts(p._id)}</div><div class="cmwrap">${this.cm(p._id)}</div></article>`;
  },
  cards(items) { return items.map(i => this.card(i)).join(""); },

  els(id) { return document.querySelectorAll(`.post[data-pub="${id}"]`); },
  paintActs(id) { this.els(id).forEach(el => (el.querySelector(".acts").innerHTML = this.acts(id))); },
  paintCm(id) { this.els(id).forEach(el => (el.querySelector(".cmwrap").innerHTML = this.cm(id))); },
  drop(id) { this.els(id).forEach(el => { el.classList.add("gone"); setTimeout(() => el.remove(), 220); }); },

  async load(pubs) {
    const ids = [...new Set(pubs.map(p => p?._id).filter(Boolean))];
    if (!ids.length) return;
    try { const r = await api("/social/stats", { method: "POST", body: { ids } }); Object.assign(this.S, r.stats); ids.forEach(i => this.paintActs(i)); } catch {}
  },

  async react(id, v) {
    const prev = this.st(id), s = { ...prev };
    if (prev.mine === 1) s.likes--; if (prev.mine === -1) s.dislikes--;
    s.mine = prev.mine === v ? 0 : v; if (s.mine === 1) s.likes++; if (s.mine === -1) s.dislikes++;
    this.S[id] = s; this.paintActs(id);
    try { await api("/social/react", { method: "POST", body: { publication: id, value: v } }); }
    catch (e) { this.S[id] = prev; this.paintActs(id); toast(e.message, true); }
  },
  async save(id) {
    const prev = this.st(id); this.S[id] = { ...prev, saved: !prev.saved }; this.paintActs(id);
    try { await api("/social/save", { method: "POST", body: { publication: id } }); toast(this.S[id].saved ? "Guardado" : "Quitado de guardados"); if (!this.S[id].saved) this.hooks.unsaved?.(id); }
    catch (e) { this.S[id] = prev; this.paintActs(id); toast(e.message, true); }
  },
  async repost(id) {
    if (this.O[id] === Session.user.id) return toast("No puedes compartir tu propia publicación", true);
    const prev = this.st(id), on = !prev.reposted;
    this.S[id] = { ...prev, reposted: on, reposts: prev.reposts + (on ? 1 : -1) }; this.paintActs(id);
    try { await api("/social/repost", { method: "POST", body: { publication: id } }); toast(on ? "Compartido en tu perfil" : "Ya no lo compartes"); this.hooks.repost?.(this.P[id], on); }
    catch (e) { this.S[id] = prev; this.paintActs(id); toast(e.message, true); }
  },
  async toggleCm(id, el) {
    if (this.open.has(id)) this.open.delete(id); else this.open.add(id);
    if (this.open.has(id) && !this.C[id]) {
      this.paintCm(id);
      try { this.C[id] = (await api(`/social/comments/${id}`)).comments; } catch (e) { this.open.delete(id); this.paintCm(id); return toast(e.message, true); }
    }
    this.paintActs(id); this.paintCm(id);
    if (this.open.has(id)) el.querySelector(".cm input")?.focus();
  },
  async sendComment(id, el) {
    const inp = el.querySelector("[data-cf] input"), text = inp.value.trim(); if (!text) return;
    try {
      const r = await api("/social/comment", { method: "POST", body: { publication: id, text, parent: this.R[id]?.id } });
      (this.C[id] ||= []).push(r.comment); this.S[id] = { ...this.st(id), comments: this.st(id).comments + 1 }; delete this.R[id];
      this.paintActs(id); this.paintCm(id); el.querySelector("[data-cf] input")?.focus();
    } catch (e) { toast(e.message, true); }
  },
  replyTo(id, cid, el) {
    const c = this.C[id].find(x => x._id === cid); this.R[id] = { id: cid };
    el.querySelector(".chipslot").innerHTML = `<div class="chip">Respondiendo a @${esc(c.user?.nick || "")} <button type="button" data-cancel aria-label="Cancelar respuesta">✕</button></div>`;
    const inp = el.querySelector("[data-cf] input"); inp.focus();
  },
  async likeComment(id, cid) {
    const c = this.C[id].find(x => x._id === cid), prev = { liked: c.liked, likes: c.likes };
    c.liked = !c.liked; c.likes += c.liked ? 1 : -1; this.paintCm(id);
    try { await api("/social/comment-like", { method: "POST", body: { comment: cid } }); }
    catch (e) { Object.assign(c, prev); this.paintCm(id); toast(e.message, true); }
  },
  async delComment(id, cid) {
    try {
      const r = await api(`/social/comment/${cid}`, { method: "DELETE" });
      this.C[id] = this.C[id].filter(c => !r.removed.includes(c._id));
      this.S[id] = { ...this.st(id), comments: Math.max(0, this.st(id).comments - r.removed.length) };
      this.paintActs(id); this.paintCm(id);
    } catch (e) { toast(e.message, true); }
  },
  delPost(btn, id) {
    if (btn.dataset.sure !== "1") { btn.dataset.sure = "1"; btn.textContent = "¿Seguro?"; setTimeout(() => { btn.dataset.sure = ""; btn.textContent = "Eliminar"; }, 3000); return; }
    api(`/publication/delete/${id}`, { method: "DELETE" }).then(() => {
      this.drop(id); setTimeout(() => this.hooks.deleted?.(id), 230); toast("Publicación eliminada");
    }).catch(e => toast(e.message, true));
  },

  bind(root) {
    root.addEventListener("click", e => {
      const el = e.target.closest(".post"), id = el?.dataset.pub; if (!id) return;
      const q = s => e.target.closest(s);
      if (q("[data-r]")) return this.react(id, +q("[data-r]").dataset.r);
      if (q("[data-c]")) return this.toggleCm(id, el);
      if (q("[data-sv]")) return this.save(id);
      if (q("[data-rt]")) return this.repost(id);
      if (q("[data-del]")) return this.delPost(q("[data-del]"), id);
      if (q("[data-cancel]")) { delete this.R[id]; el.querySelector(".chipslot").innerHTML = ""; return; }
      const cid = q("[data-cid]")?.dataset.cid; if (!cid) return;
      if (q("[data-cl]")) return this.likeComment(id, cid);
      if (q("[data-rp]")) return this.replyTo(id, cid, el);
      if (q("[data-dc]")) return this.delComment(id, cid);
    });
    root.addEventListener("submit", e => {
      const el = e.target.closest(".post"); if (!el?.dataset.pub) return;
      e.preventDefault(); this.sendComment(el.dataset.pub, el);
    });
  }
};

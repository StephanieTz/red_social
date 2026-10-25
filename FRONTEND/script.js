if (Session.user) location.replace("feed.html"); // feed.html valida la sesión con el servidor
const $ = id => document.getElementById(id);
const tabs = document.querySelector(".tabs"), forms = { 0: $("loginForm"), 1: $("registerForm") };
function show(i) {
  tabs.dataset.t = i;
  $("tLogin").setAttribute("aria-selected", i === 0); $("tReg").setAttribute("aria-selected", i === 1);
  forms[i].hidden = false; forms[1 - i].hidden = true;
}
$("tLogin").onclick = () => show(0); $("tReg").onclick = () => show(1);

function submit(form, fn) {
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const btn = form.querySelector("button"), msg = form.querySelector(".err-msg"), label = btn.textContent;
    msg.textContent = ""; btn.disabled = true; btn.textContent = "Un momento…";
    try { await fn(); } catch (err) { msg.textContent = err.message; btn.disabled = false; btn.textContent = label; }
  });
}
async function login(email, password) {
  const r = await api("/user/login", { method: "POST", body: { email, password } }); // el servidor deja la sesión en una cookie httpOnly
  Session.save(r.user); location.href = "feed.html";
}
submit(forms[0], () => login($("loginEmail").value, $("loginPassword").value));
submit(forms[1], async () => {
  const email = $("regEmail").value, password = $("regPassword").value;
  await api("/user/register", { method: "POST", body: { name: $("regName").value.trim(), nick: $("regNick").value.trim(), email, password } });
  await login(email, password);
});

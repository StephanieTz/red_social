import { useRef, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { GoogleLogin } from "@react-oauth/google";
import { api } from "../api";

/** Página de bienvenida: iniciar sesión / crear cuenta, con reCAPTCHA e inicio de sesión con Google. */
export default function AuthPage({ cfg, onAuth }) {
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ name: "", nick: "", email: "", password: "" });
  const [captcha, setCaptcha] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const rc = useRef(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (cfg.recaptchaSiteKey && !captcha) return setErr("Confirma que no eres un robot.");
    setBusy(true);
    try {
      const body = mode === "login" ? { email: f.email, password: f.password, captcha } : { ...f, captcha };
      const r = await api(mode === "login" ? "/user/login" : "/user/register", { method: "POST", body });
      onAuth(r.user);
    } catch (ex) {
      setErr(ex.message);
      rc.current?.reset(); // el token de reCAPTCHA es de un solo uso
      setCaptcha(null);
    } finally { setBusy(false); }
  }

  async function google(res) {
    setErr("");
    try { onAuth((await api("/user/google", { method: "POST", body: { credential: res.credential } })).user); }
    catch (ex) { setErr(ex.message); }
  }

  return (
    <main className="auth">
      <section className="brand">
        <span className="logo">Mi Red Social</span>
        <h2>Guarda y comparte tus mejores fotos.</h2>
        <p>Cada foto se publica con miniatura y tres versiones: blanco y negro, sepia y ampliada.</p>
      </section>
      <section className="panel">
        <div className="card">
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={mode === "login"} onClick={() => { setMode("login"); setErr(""); }}>Iniciar sesión</button>
            <button role="tab" aria-selected={mode === "register"} onClick={() => { setMode("register"); setErr(""); }}>Crear cuenta</button>
          </div>
          <form onSubmit={submit}>
            <h1>{mode === "login" ? "Bienvenido de nuevo" : "Crea tu cuenta"}</h1>
            {mode === "register" && <>
              <label>Nombre<input value={f.name} onChange={set("name")} autoComplete="name" required maxLength={50} /></label>
              <label>Nick de usuario<input value={f.nick} onChange={set("nick")} autoComplete="username" required maxLength={20} pattern="[A-Za-z0-9_.]{3,20}" title="3 a 20 caracteres: letras, números, _ o ." /></label>
            </>}
            <label>Correo electrónico<input type="email" value={f.email} onChange={set("email")} autoComplete="email" required /></label>
            <label>Contraseña{mode === "register" && " (mínimo 8 caracteres)"}
              <input type="password" value={f.password} onChange={set("password")} required minLength={mode === "register" ? 8 : 1} maxLength={128} autoComplete={mode === "login" ? "current-password" : "new-password"} />
            </label>
            {cfg.recaptchaSiteKey && <div className="captcha"><ReCAPTCHA ref={rc} sitekey={cfg.recaptchaSiteKey} onChange={setCaptcha} onExpired={() => setCaptcha(null)} hl="es" /></div>}
            {err && <p className="err-msg" role="alert">{err}</p>}
            <button className="btn" disabled={busy}>{busy ? "Un momento…" : mode === "login" ? "Entrar" : "Crear cuenta"}</button>
          </form>
          {cfg.googleClientId && <>
            <div className="or"><span>o</span></div>
            <div className="google"><GoogleLogin onSuccess={google} onError={() => setErr("No se pudo iniciar sesión con Google")} text="continue_with" locale="es" /></div>
          </>}
        </div>
      </section>
    </main>
  );
}

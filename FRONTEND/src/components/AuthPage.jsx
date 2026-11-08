import { useRef, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { GoogleLogin } from "@react-oauth/google";
import { api } from "../api";

/** Bienvenida: iniciar sesión / crear cuenta, con reCAPTCHA e inicio de sesión con Google. */
export default function AuthPage({ cfg, onAuth }) {
  const [mode, setMode] = useState(0); // 0 = iniciar sesión · 1 = crear cuenta
  const [f, setF] = useState({ name: "", nick: "", email: "", password: "" });
  const [captcha, setCaptcha] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const rc = useRef(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const switchTo = (m) => { setMode(m); setErr(""); };

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (cfg.recaptchaSiteKey && !captcha) return setErr("Confirma que no eres un robot.");
    setBusy(true);
    try {
      const body = mode === 0 ? { email: f.email, password: f.password, captcha } : { ...f, captcha };
      onAuth((await api(mode === 0 ? "/user/login" : "/user/register", { method: "POST", body })).user);
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
        <span className="leaf" style={{ "--c": "#621D43", "--r": "20deg", right: -60, top: "12%" }} />
        <span className="leaf" style={{ "--c": "#374365", "--r": "110deg", right: 90, bottom: -90 }} />
        <span className="leaf" style={{ "--c": "#E6223A", "--r": "-20deg", right: -20, bottom: "30%", opacity: 0.35 }} />
        <span className="logo">Mi Red Social</span>
        <h2>Comparte lo que piensas.</h2>
      </section>
      <section className="panel">
        <div className="card">
          <div className="tabs" role="tablist" data-t={mode}>
            <i />
            <button role="tab" aria-selected={mode === 0} onClick={() => switchTo(0)}>Iniciar sesión</button>
            <button role="tab" aria-selected={mode === 1} onClick={() => switchTo(1)}>Crear cuenta</button>
          </div>
          <form onSubmit={submit} key={mode}>
            <h1>{mode === 0 ? "Bienvenido de nuevo" : "Crea tu cuenta"}</h1>
            <p className="sub">{mode === 0 ? "Entra para ver tu feed." : "Solo toma un minuto."}</p>
            {mode === 1 && <>
              <label>Nombre<input value={f.name} onChange={set("name")} autoComplete="name" maxLength={50} required /></label>
              <label>Nick de usuario<input value={f.nick} onChange={set("nick")} maxLength={20} pattern="[A-Za-z0-9_.]{3,20}" title="3 a 20 caracteres: letras, números, _ o ." autoComplete="username" autoCapitalize="none" autoCorrect="off" required /></label>
            </>}
            <label>Correo electrónico<input type="email" value={f.email} onChange={set("email")} autoComplete="email" autoCapitalize="none" required /></label>
            <label>Contraseña{mode === 1 && " (mínimo 8 caracteres)"}
              <input type="password" value={f.password} onChange={set("password")} autoComplete={mode === 0 ? "current-password" : "new-password"} minLength={mode === 1 ? 8 : undefined} maxLength={128} required />
            </label>
            {cfg.recaptchaSiteKey && <div className="captcha"><ReCAPTCHA ref={rc} sitekey={cfg.recaptchaSiteKey} onChange={setCaptcha} onExpired={() => setCaptcha(null)} hl="es" theme="dark" /></div>}
            <p className="err-msg" role="alert">{err}</p>
            <button className="btn" disabled={busy}>{busy ? "Un momento…" : mode === 0 ? "Entrar" : "Crear cuenta"}</button>
          </form>
          {cfg.googleClientId && <>
            <div className="or"><span>o</span></div>
            <div className="google"><GoogleLogin onSuccess={google} onError={() => setErr("No se pudo iniciar sesión con Google")} theme="filled_black" shape="pill" locale="es" /></div>
          </>}
        </div>
      </section>
    </main>
  );
}

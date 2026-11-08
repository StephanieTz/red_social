import { useRef, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { GoogleLogin } from "@react-oauth/google";
import { api } from "../api";
import Icon from "./Icon.jsx";
import Logo from "./Logo.jsx";
import Showcase from "./Showcase.jsx";

/**
 * Campo SIN autocompletado del navegador: nombre aleatorio, autocomplete="off", marcas para gestores de contraseñas
 * y "solo lectura" hasta que la persona entra al campo (los navegadores no rellenan campos de solo lectura).
 */
function Field({ label, icon, value, onChange, type = "text", ...rest }) {
  const [armed, setArmed] = useState(false);
  const name = useRef(`f_${Math.random().toString(36).slice(2, 10)}`);
  return (
    <label>{label}
      <span className="inp">
        <input name={name.current} type={type} value={value} onChange={onChange} placeholder={label} autoComplete="off" readOnly={!armed} onFocus={() => setArmed(true)}
          data-lpignore="true" data-1p-ignore="true" data-form-type="other" {...rest} />
        {icon && <Icon name={icon} />}
      </span>
    </label>
  );
}

/** Bienvenida: iniciar sesión / crear cuenta, con reCAPTCHA e inicio de sesión con Google. */
export default function AuthPage({ cfg, onAuth }) {
  const [mode, setMode] = useState(0); // 0 = iniciar sesión · 1 = crear cuenta
  const [f, setF] = useState({ name: "", nick: "", email: "", password: "" });
  const [captcha, setCaptcha] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const rc = useRef(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const switchTo = (m) => { setMode(m); setErr(""); setF({ name: "", nick: "", email: "", password: "" }); };

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
        <div className="brand-top">
          <Logo />
          <h2>Comparte lo que piensas.</h2>
        </div>
        <Showcase />
      </section>
      <section className="panel">
        <img className="wm" src="/brand/CLIPZY.jpg" alt="" aria-hidden="true" onError={(e) => e.currentTarget.remove()} />
        <div className="card">
          <div className="tabs" role="tablist" data-t={mode}>
            <i />
            <button role="tab" aria-selected={mode === 0} onClick={() => switchTo(0)}>Iniciar sesión</button>
            <button role="tab" aria-selected={mode === 1} onClick={() => switchTo(1)}>Crear cuenta</button>
          </div>
          <form onSubmit={submit} key={mode} autoComplete="off">
            <h1>{mode === 0 ? "Bienvenido de nuevo" : "Crea tu cuenta"}</h1>
            <p className="sub">{mode === 0 ? "Entra para ver tu feed." : "Solo toma un minuto."}</p>
            {mode === 1 && <>
              <Field label="Nombre" value={f.name} onChange={set("name")} maxLength={50} required />
              <Field label="Nick de usuario" value={f.nick} onChange={set("nick")} maxLength={20} pattern="[A-Za-z0-9_.]{3,20}" title="3 a 20 caracteres: letras, números, _ o ." autoCapitalize="none" autoCorrect="off" required />
            </>}
            <Field label="Correo electrónico" icon="mail" type="email" value={f.email} onChange={set("email")} autoCapitalize="none" required />
            <Field label="Contraseña" icon="key" type="password" value={f.password} onChange={set("password")} maxLength={128} minLength={mode === 1 ? 8 : undefined} required />
            {mode === 1 && <small className="sub">Mínimo 8 caracteres.</small>}
            {cfg.recaptchaSiteKey && <div className="captcha"><ReCAPTCHA ref={rc} sitekey={cfg.recaptchaSiteKey} onChange={setCaptcha} onExpired={() => setCaptcha(null)} hl="es" theme="dark" /></div>}
            <p className="err-msg" role="alert">{err}</p>
            <button className="btn grad" disabled={busy}>{busy ? "Un momento…" : mode === 0 ? "Entrar" : "Crear cuenta"}</button>
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

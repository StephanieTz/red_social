import { useEffect, useState } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { api } from "./api";
import AuthPage from "./components/AuthPage.jsx";
import Home from "./components/Home.jsx";

export default function App() {
  const [cfg, setCfg] = useState(null);      // claves públicas (reCAPTCHA / Google)
  const [user, setUser] = useState(undefined); // undefined = comprobando sesión · null = sin sesión

  useEffect(() => {
    (async () => {
      try { setCfg(await api("/config")); } catch { setCfg({}); }
      try { setUser((await api("/user/me")).user); } catch { setUser(null); }
    })();
  }, []);

  if (cfg === null || user === undefined) return <div className="center muted">Cargando…</div>;

  const view = user
    ? <Home user={user} setUser={setUser} onLogout={async () => { try { await api("/user/logout", { method: "POST" }); } catch { /* ya sin sesión */ } setUser(null); }} />
    : <AuthPage cfg={cfg} onAuth={setUser} />;

  return cfg.googleClientId ? <GoogleOAuthProvider clientId={cfg.googleClientId}>{view}</GoogleOAuthProvider> : view;
}

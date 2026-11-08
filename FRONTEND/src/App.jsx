import { useEffect, useState } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { api } from "./api";
import AuthPage from "./components/AuthPage.jsx";
import FeedPage from "./components/FeedPage.jsx";
import ProfilePage from "./components/ProfilePage.jsx";
import SettingsPage from "./components/SettingsPage.jsx";

/** Rutas por hash:  #/ → inicio · #/u/<nick> → perfil · #/config/perfil|guardado|actividad|seguridad → configuración */
function useRoute() {
  const read = () => location.hash.replace(/^#\/?/, "").split("/");
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => { setRoute(read()); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

export default function App() {
  const [cfg, setCfg] = useState(null);        // claves públicas (reCAPTCHA / Google)
  const [user, setUser] = useState(undefined); // undefined = comprobando sesión · null = sin sesión
  const route = useRoute();

  useEffect(() => {
    (async () => {
      try { setCfg(await api("/config")); } catch { setCfg({}); }
      try { setUser((await api("/user/me")).user); } catch { setUser(null); }
    })();
  }, []);

  const logout = async () => {
    try { await api("/user/logout", { method: "POST" }); } catch { /* ya sin sesión */ }
    location.hash = "#/";
    setUser(null);
  };

  if (cfg === null || user === undefined) return <div className="center sub">Cargando…</div>;

  const view = !user ? <AuthPage cfg={cfg} onAuth={setUser} />
    : route[0] === "u" && route[1] ? <ProfilePage me={user} onLogout={logout} nick={decodeURIComponent(route[1])} />
    : route[0] === "config" ? <SettingsPage user={user} setUser={setUser} onLogout={logout} tab={route[1]} />
    : <FeedPage user={user} setUser={setUser} onLogout={logout} />;

  return cfg.googleClientId ? <GoogleOAuthProvider clientId={cfg.googleClientId}>{view}</GoogleOAuthProvider> : view;
}

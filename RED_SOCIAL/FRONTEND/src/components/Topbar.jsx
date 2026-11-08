import Icon from "./Icon.jsx";

/** Barra superior. En pantallas pequeñas los botones muestran solo el ícono. */
export default function Topbar({ onLogout, search, me, back, hideSettings }) {
  return (
    <header className="top">
      <div>
        <a className="logo-link" href="#/">Clip<span>zy</span></a>
        {search || <span />}
        <nav className="navr">
          {back && <a className="btn ghost" href="#/" aria-label="Inicio"><Icon name="home" /><span className="lbl">Inicio</span></a>}
          {me && <a className="btn ghost" href={`#/u/${me.nick}`} aria-label="Mi perfil"><Icon name="user" /><span className="lbl">Perfil</span></a>}
          {!hideSettings && <a className="btn ghost" href="#/config/perfil" aria-label="Configuración"><Icon name="gear" /><span className="lbl">Configuración</span></a>}
          <button className="btn ghost" onClick={onLogout} aria-label="Cerrar sesión"><Icon name="out" /><span className="lbl">Cerrar sesión</span></button>
        </nav>
      </div>
    </header>
  );
}

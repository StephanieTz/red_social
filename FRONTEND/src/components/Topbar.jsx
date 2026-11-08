export default function Topbar({ onLogout, search, back }) {
  return (
    <header className="top">
      <div>
        <a className="logo-link" href="#/">Mi Red <span>Social</span></a>
        {search || <span />}
        <nav className="navr">
          {back ? <a className="btn ghost" href="#/">← Volver al inicio</a> : <a className="btn ghost" href="#/config/perfil">Configuración</a>}
          <button className="btn ghost" onClick={onLogout}>Cerrar sesión</button>
        </nav>
      </div>
    </header>
  );
}

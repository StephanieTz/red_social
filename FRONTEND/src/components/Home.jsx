import { useState } from "react";
import Avatar from "./Avatar.jsx";
import Gallery from "./Gallery.jsx";
import UploadModal from "./UploadModal.jsx";
import PhotoModal from "./PhotoModal.jsx";
import ProfileModal from "./ProfileModal.jsx";

/** Página de inicio (usuarios autenticados): cuadrícula de miniaturas + subida de fotos. */
export default function Home({ user, setUser, onLogout }) {
  const [scope, setScope] = useState("all");   // all = explorar · mine = mis fotos
  const [version, setVersion] = useState(0);   // sube para recargar la galería
  const [open, setOpen] = useState(null);      // { type: "upload" | "photo" | "profile", id? }
  const reload = () => setVersion((v) => v + 1);

  return (
    <>
      <header className="top">
        <div>
          <b className="brandname">Mi Red <span>Social</span></b>
          <nav>
            <button className="btn" onClick={() => setOpen({ type: "upload" })}>＋ Subir foto</button>
            <button className="icon-btn" onClick={() => setOpen({ type: "profile" })} aria-label="Mi perfil"><Avatar user={user} size={34} /></button>
            <button className="btn ghost" onClick={onLogout}>Salir</button>
          </nav>
        </div>
      </header>

      <main className="wrap">
        <div className="seg" role="tablist">
          <button role="tab" aria-selected={scope === "all"} onClick={() => setScope("all")}>Explorar</button>
          <button role="tab" aria-selected={scope === "mine"} onClick={() => setScope("mine")}>Mis fotos</button>
        </div>
        <Gallery scope={scope} version={version} onOpen={(id) => setOpen({ type: "photo", id })} />
      </main>

      {open?.type === "upload" && <UploadModal onClose={() => setOpen(null)} onDone={() => { setOpen(null); reload(); }} />}
      {open?.type === "photo" && <PhotoModal id={open.id} me={user} onClose={() => setOpen(null)} onDeleted={() => { setOpen(null); reload(); }} />}
      {open?.type === "profile" && <ProfileModal user={user} onClose={() => setOpen(null)} onSaved={setUser} />}
    </>
  );
}

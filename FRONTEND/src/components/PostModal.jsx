import Modal from "./Modal.jsx";
import PostList from "./PostList.jsx";

/** Abre una publicación (texto, foto o video) con todas sus interacciones, desde la cuadrícula del perfil. */
export default function PostModal({ publication, me, onClose, onDeleted, onOpenPhoto }) {
  return (
    <Modal title="Publicación" onClose={onClose}>
      <div className="list">
        <PostList items={[{ type: "post", publication }]} me={me} onDeleted={(id) => { onClose(); onDeleted?.(id); }} onOpenPhoto={onOpenPhoto} />
      </div>
    </Modal>
  );
}

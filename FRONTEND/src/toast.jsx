import { createContext, useCallback, useContext, useState } from "react";

const Ctx = createContext(() => {});
export const useToast = () => useContext(Ctx);

/** Avisos emergentes (abajo al centro). Uso: const toast = useToast(); toast("Listo") · toast("Error", true) */
export function ToastProvider({ children }) {
  const [list, setList] = useState([]);
  const toast = useCallback((msg, err = false) => {
    const id = Math.random();
    setList((l) => [...l, { id, msg, err }]);
    setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), 3500);
  }, []);
  return (
    <Ctx.Provider value={toast}>
      {children}
      <div className="toasts" aria-live="polite">{list.map((t) => <div key={t.id} className={"toast" + (t.err ? " err" : "")}>{t.msg}</div>)}</div>
    </Ctx.Provider>
  );
}

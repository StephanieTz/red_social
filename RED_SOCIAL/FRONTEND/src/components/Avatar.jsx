import { useState } from "react";

const COLORS = ["#E6223A", "#690722", "#621D43", "#644765", "#374365"];

/** Avatar con foto; si no hay foto (o falla al cargar) muestra las iniciales sobre un color fijo por usuario. */
export default function Avatar({ user, size = 44 }) {
  const [broken, setBroken] = useState(false);
  const name = (user?.name || user?.nick || "?").trim();
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const color = COLORS[[...(user?.nick || name)].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
  const src = user?.imageUrl || user?.avatarUrl;
  return (
    <span className="avatar" style={{ "--av": color, "--s": size + "px" }}>
      {initials}
      {src && !broken && <img src={src} alt="" onError={() => setBroken(true)} />}
    </span>
  );
}

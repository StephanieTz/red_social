import { useState } from "react";

const COLORS = ["#E6223A", "#690722", "#621D43", "#644765", "#374365"];

export default function Avatar({ user, size = 36 }) {
  const [broken, setBroken] = useState(false);
  const name = (user?.name || user?.nick || "?").trim();
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const color = COLORS[[...(user?.nick || name)].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
  const src = user?.imageUrl || user?.avatarUrl;
  return (
    <span className="avatar" style={{ width: size, height: size, background: color, fontSize: size * 0.4 }}>
      {initials}
      {src && !broken && <img src={src} alt="" onError={() => setBroken(true)} />}
    </span>
  );
}

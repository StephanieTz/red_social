// Uso: node scripts/make-admin.js correo@ejemplo.com   → convierte al usuario en administrador (puede ver /api/audit)
require("../BACKEND/config/env");
const prisma = require("../BACKEND/database/prisma");

(async () => {
  const email = (process.argv[2] || "").toLowerCase();
  if (!email) { console.error("Indica el correo: node scripts/make-admin.js correo@ejemplo.com"); process.exit(1); }
  const u = await prisma.user.update({ where: { email }, data: { role: "admin" } });
  console.log(`✅ ${u.nick} ahora es administrador`);
  await prisma.$disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });

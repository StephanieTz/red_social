/**
 * Vacía TODA la base de datos (cuentas, publicaciones, comentarios, reacciones, auditoría…) y, si usas
 * almacenamiento local, borra la carpeta ./storage. Las tablas y migraciones se conservan.
 *
 *   node scripts/reset-db.js          → solo muestra qué haría
 *   node scripts/reset-db.js --yes    → lo ejecuta
 *
 * Con S3 los archivos NO se borran desde aquí:  aws s3 rm s3://TU-BUCKET --recursive
 */
const fs = require("fs");
const cfg = require("../BACKEND/config/env");
const prisma = require("../BACKEND/database/prisma");

(async () => {
  const host = (process.env.DATABASE_URL || "").replace(/^.*@/, "").replace(/[/?].*$/, "");
  const tables = (await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name <> '_prisma_migrations'`).map((t) => t.table_name);

  console.log(`Base de datos: ${host}\nTablas a vaciar (${tables.length}): ${tables.join(", ")}`);
  if (cfg.storage.driver === "local") console.log(`Carpeta a borrar: ${cfg.storage.localDir}`);
  if (!process.argv.includes("--yes")) { console.log("\nNo se borró nada. Para ejecutarlo de verdad:  node scripts/reset-db.js --yes"); return prisma.$disconnect(); }

  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`);
  if (cfg.storage.driver === "local") fs.rmSync(cfg.storage.localDir, { recursive: true, force: true });
  console.log("\n✅ Base de datos vacía. Ya puedes crear los usuarios desde cero.");
  if (cfg.storage.driver === "s3") console.log(`⚠️  Los archivos de S3 siguen ahí: aws s3 rm s3://${cfg.storage.bucket} --recursive`);
  await prisma.$disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });

// BACKEND/database/connection.js
const prisma = require("./prisma");

const connection = async () => {
  try {
    // Prisma se conecta de forma perezosa, pero forzamos una consulta simple para verificar
    await prisma.$connect();
    console.log("✅ Conectado a PostgreSQL (Neon) correctamente con Prisma");
  } catch (error) {
    console.error("❌ Error al conectar a PostgreSQL:", error.message);
    process.exit(1);
  }
};

module.exports = connection;
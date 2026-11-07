const prisma = require("./prisma");

const connection = async () => {
  try {
    await prisma.$connect();
    console.log("✅ Conectado a PostgreSQL correctamente con Prisma");
  } catch (error) {
    console.error("❌ Error al conectar a PostgreSQL:", error.message);
    process.exit(1);
  }
};

module.exports = connection;

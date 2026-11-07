// BACKEND/database/prisma.js
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  log: ["error", "warn"], // Loguea errores y advertencias (útil en desarrollo)
});

module.exports = prisma;
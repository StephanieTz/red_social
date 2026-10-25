const mongoose = require("mongoose");

const connection = async () => {
  try {
    // Si estamos en Docker, usará process.env.MONGO_URI. 
    // Si estás en tu PC normal, usará el localhost de respaldo.
    const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/mi_blog_app";
    
    await mongoose.connect(uri);
    console.log("✅ Conectado a MongoDB correctamente");
  } catch (error) {
    console.error("✗ Error al conectar a MongoDB:", error.message);
    process.exit(1); // Detiene la aplicación si no hay base de datos
  }
};

module.exports = connection;
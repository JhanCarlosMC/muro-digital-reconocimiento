const mongoose = require('mongoose');

async function conectarDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes('<user>')) {
    console.warn('⚠️ MONGODB_URI no configurado o con valores de ejemplo. Usando almacenamiento en memoria para desarrollo local.');
    return false;
  }

  try {
    await mongoose.connect(uri);
    console.log(`✅ MongoDB Conectado: ${mongoose.connection.name}`);
    return true;
  } catch (error) {
    console.error('❌ Error de conexión en base de datos:', error.message);
    console.warn('⚠️ Continuando con almacenamiento en memoria temporal.');
    return false;
  }
}

module.exports = conectarDB;

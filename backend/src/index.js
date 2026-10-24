require('dotenv').config();
const express = require('express');
const cors = require('cors');
const conectarDB = require('./config/db');
const actividadRoutes = require('./routes/actividad.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'Online', service: 'API Reconocimientos Jóvenes creaTIvos' });
});

app.use('/api', actividadRoutes);

const PORT = process.env.PORT || 3000;

conectarDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en el puerto ${PORT}`);
  });
});

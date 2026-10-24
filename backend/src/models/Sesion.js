const mongoose = require('mongoose');

const SesionSchema = new mongoose.Schema(
  {
    clave: {
      type: String,
      default: 'principal',
      unique: true
    },
    gruposAbiertos: {
      type: Boolean,
      default: false
    },
    tamanoGrupo: {
      type: Number,
      default: 4
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

module.exports = mongoose.model('Sesion', SesionSchema);

const mongoose = require('mongoose');

const EstudianteSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true
    },
    sala: {
      type: String,
      default: 'General',
      trim: true
    },
    datoCurioso: {
      type: String,
      default: '',
      trim: true
    },
    pasatiempo: {
      type: String,
      default: '',
      trim: true
    },
    palabraCierre: {
      type: String,
      default: '',
      trim: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

module.exports = mongoose.model('Estudiante', EstudianteSchema);

const mongoose = require('mongoose');

const MensajeSchema = new mongoose.Schema(
  {
    para: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Estudiante',
      required: [true, 'El destinatario es obligatorio']
    },
    de: {
      type: String,
      default: 'Compañero de clase',
      trim: true
    },
    texto: {
      type: String,
      required: [true, 'El mensaje no puede estar vacío'],
      trim: true
    },
    tipo: {
      type: String,
      enum: ['cualidad', 'fortaleza', 'agradecimiento'],
      default: 'cualidad'
    },
    destacado: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

module.exports = mongoose.model('Mensaje', MensajeSchema);

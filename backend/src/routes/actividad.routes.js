const { Router } = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const Estudiante = require('../models/Estudiante');
const Mensaje = require('../models/Mensaje');
const Sesion = require('../models/Sesion');

const router = Router();

// Almacenamiento en memoria de respaldo cuando MONGODB_URI aún no está configurado
const memoria = {
  estudiantes: [],
  mensajes: [],
  sesion: {
    gruposAbiertos: false,
    tamanoGrupo: 4
  }
};

function usaMongo() {
  return mongoose.connection.readyState === 1;
}

function escaparRegex(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function mezclarAleatoriamente(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function obtenerPasswordProfesor() {
  return process.env.PROFESOR_PASSWORD || 'creativos2026';
}

async function obtenerEstadoSesion() {
  if (usaMongo()) {
    let sesion = await Sesion.findOne({ clave: 'principal' });
    if (!sesion) {
      sesion = await Sesion.create({ clave: 'principal', gruposAbiertos: false, tamanoGrupo: 4 });
    }
    return sesion;
  }
  return memoria.sesion;
}

async function actualizarEstadoSesion(campos) {
  if (usaMongo()) {
    const sesion = await Sesion.findOneAndUpdate(
      { clave: 'principal' },
      { $set: campos },
      { new: true, upsert: true }
    );
    return sesion;
  }
  Object.assign(memoria.sesion, campos);
  return memoria.sesion;
}

/**
 * Calcula la distribución equitativa de grupos para N estudiantes
 * buscando grupos de hasta `maxPorGrupo` (por defecto 4), de modo que
 * la diferencia entre cualquier par de grupos sea como máximo 1 persona.
 */
function calcularAsignacionEquitativa(estudiantes, maxPorGrupo = 4, remezclarTodo = false) {
  const total = estudiantes.length;
  if (total === 0) return [];

  const numGrupos = Math.max(1, Math.ceil(total / maxPorGrupo));
  const nombresGrupos = Array.from({ length: numGrupos }, (_, i) => `Grupo ${i + 1}`);

  if (remezclarTodo) {
    const mezclados = mezclarAleatoriamente(estudiantes);
    return mezclados.map((est, idx) => ({
      id: String(est._id),
      sala: nombresGrupos[idx % numGrupos]
    }));
  }

  const topePorGrupo = Math.ceil(total / numGrupos);
  const mapaGrupos = new Map(nombresGrupos.map((nombre) => [nombre, []]));
  const sinAsignar = [];

  for (const est of estudiantes) {
    if (est.sala && mapaGrupos.has(est.sala)) {
      mapaGrupos.get(est.sala).push(est);
    } else {
      sinAsignar.push(est);
    }
  }

  for (const nombre of nombresGrupos) {
    const integrantes = mapaGrupos.get(nombre);
    if (integrantes.length > topePorGrupo) {
      const mezclados = mezclarAleatoriamente(integrantes);
      mapaGrupos.set(nombre, mezclados.slice(0, topePorGrupo));
      sinAsignar.push(...mezclados.slice(topePorGrupo));
    }
  }

  for (const est of mezclarAleatoriamente(sinAsignar)) {
    let menorCantidad = Infinity;
    for (const nombre of nombresGrupos) {
      const cant = mapaGrupos.get(nombre).length;
      if (cant < menorCantidad) menorCantidad = cant;
    }

    const gruposCandidatos = nombresGrupos.filter(
      (nombre) =>
        mapaGrupos.get(nombre).length === menorCantidad &&
        mapaGrupos.get(nombre).length < topePorGrupo
    );

    const elegidos =
      gruposCandidatos.length > 0
        ? gruposCandidatos
        : nombresGrupos.filter((nombre) => mapaGrupos.get(nombre).length < topePorGrupo);

    const grupoDestino = elegidos[crypto.randomInt(0, elegidos.length)];
    mapaGrupos.get(grupoDestino).push(est);
  }

  const cambios = [];
  for (const [nombreGrupo, integrantes] of mapaGrupos.entries()) {
    for (const est of integrantes) {
      if (est.sala !== nombreGrupo) {
        cambios.push({ id: String(est._id), sala: nombreGrupo });
      }
    }
  }

  return cambios;
}

async function obtenerDestinatariosFirmadosPor(nombreEstudiante) {
  if (!nombreEstudiante) return [];
  const regex = new RegExp(`^${escaparRegex(nombreEstudiante.trim())}$`, 'i');
  if (usaMongo()) {
    const enviados = await Mensaje.find({ de: regex }).select('para');
    return [...new Set(enviados.map((m) => String(m.para)))];
  }
  const enviados = memoria.mensajes.filter(
    (m) => (m.de || '').toLowerCase() === nombreEstudiante.trim().toLowerCase()
  );
  return [...new Set(enviados.map((m) => String(m.para)))];
}

// POST /api/profesor/login (Validar contraseña de acceso al panel del profesor)
router.post('/profesor/login', (req, res) => {
  const { password } = req.body;
  const esperada = obtenerPasswordProfesor();

  if (!password || password.trim() !== esperada) {
    return res.status(401).json({ error: 'Contraseña de profesor incorrecta' });
  }

  res.json({ ok: true });
});

// GET /api/profesor/resumen (Métricas de notas enviadas y recibidas por participante)
router.get('/profesor/resumen', async (req, res) => {
  try {
    let mensajes = [];
    if (usaMongo()) {
      mensajes = await Mensaje.find().select('para de');
    } else {
      mensajes = memoria.mensajes;
    }

    const recibidosPorId = {};
    const enviadosPorNombre = {};

    for (const m of mensajes) {
      const paraId = String(m.para);
      recibidosPorId[paraId] = (recibidosPorId[paraId] || 0) + 1;

      const remitente = (m.de || '').trim().toLowerCase();
      if (remitente) {
        enviadosPorNombre[remitente] = (enviadosPorNombre[remitente] || 0) + 1;
      }
    }

    res.json({ recibidosPorId, enviadosPorNombre, totalMensajes: mensajes.length });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener resumen para el profesor' });
  }
});

// GET /api/sesion (Estado de la sala de espera y grupos)
router.get('/sesion', async (req, res) => {
  try {
    const sesion = await obtenerEstadoSesion();
    res.json({
      gruposAbiertos: Boolean(sesion.gruposAbiertos),
      tamanoGrupo: sesion.tamanoGrupo || 4
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar estado de la sesión' });
  }
});

// POST /api/sesion/estado (Profesor abre o cierra el paso de la sala de espera a las etapas)
router.post('/sesion/estado', async (req, res) => {
  try {
    const { gruposAbiertos, tamanoGrupo = 4 } = req.body;
    const abrir = Boolean(gruposAbiertos);

    if (usaMongo()) {
      const estudiantes = await Estudiante.find();
      if (abrir && estudiantes.length > 0) {
        const hayEnEspera = estudiantes.some(
          (e) => !e.sala || e.sala === 'Sala de espera' || e.sala === 'General'
        );
        if (hayEnEspera) {
          const asignaciones = calcularAsignacionEquitativa(estudiantes, tamanoGrupo, true);
          await Promise.all(
            asignaciones.map((a) =>
              Estudiante.findByIdAndUpdate(a.id, { $set: { sala: a.sala } })
            )
          );
        }
      } else if (!abrir && estudiantes.length > 0) {
        await Estudiante.updateMany({}, { $set: { sala: 'Sala de espera' } });
      }

      const sesion = await actualizarEstadoSesion({
        gruposAbiertos: abrir,
        tamanoGrupo: Number(tamanoGrupo) || 4
      });
      const actualizados = await Estudiante.find().sort({ nombre: 1 });
      return res.json({
        gruposAbiertos: sesion.gruposAbiertos,
        tamanoGrupo: sesion.tamanoGrupo,
        estudiantes: actualizados
      });
    }

    if (abrir && memoria.estudiantes.length > 0) {
      const hayEnEspera = memoria.estudiantes.some(
        (e) => !e.sala || e.sala === 'Sala de espera' || e.sala === 'General'
      );
      if (hayEnEspera) {
        const asignaciones = calcularAsignacionEquitativa(
          memoria.estudiantes,
          Number(tamanoGrupo) || 4,
          true
        );
        for (const a of asignaciones) {
          const est = memoria.estudiantes.find((e) => String(e._id) === a.id);
          if (est) est.sala = a.sala;
        }
      }
    } else if (!abrir) {
      memoria.estudiantes.forEach((e) => {
        e.sala = 'Sala de espera';
      });
    }

    const sesion = await actualizarEstadoSesion({
      gruposAbiertos: abrir,
      tamanoGrupo: Number(tamanoGrupo) || 4
    });

    const ordenados = [...memoria.estudiantes].sort((a, b) =>
      a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
    );

    res.json({
      gruposAbiertos: sesion.gruposAbiertos,
      tamanoGrupo: sesion.tamanoGrupo,
      estudiantes: ordenados
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar estado de la sesión', detalles: error.message });
  }
});

// DELETE /api/sesion/reiniciar (Finalizar la actividad y eliminar todos los datos)
router.delete('/sesion/reiniciar', async (req, res) => {
  try {
    if (usaMongo()) {
      await Promise.all([
        Estudiante.deleteMany({}),
        Mensaje.deleteMany({}),
        actualizarEstadoSesion({ gruposAbiertos: false, tamanoGrupo: 4 })
      ]);
      return res.json({
        ok: true,
        mensaje: 'Actividad finalizada y todos los datos fueron eliminados.'
      });
    }

    memoria.estudiantes = [];
    memoria.mensajes = [];
    memoria.sesion = { gruposAbiertos: false, tamanoGrupo: 4 };

    res.json({
      ok: true,
      mensaje: 'Actividad finalizada y todos los datos fueron eliminados.'
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al reiniciar la actividad', detalles: error.message });
  }
});

// GET /api/estudiantes
router.get('/estudiantes', async (req, res) => {
  try {
    if (usaMongo()) {
      const estudiantes = await Estudiante.find().sort({ nombre: 1 });
      return res.json(estudiantes);
    }
    const ordenados = [...memoria.estudiantes].sort((a, b) =>
      a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
    );
    res.json(ordenados);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener estudiantes' });
  }
});

// POST /api/estudiantes (Ingreso a Sala de Espera o recuperación de datos si ya existe)
router.post('/estudiantes', async (req, res) => {
  try {
    const { nombre, confirmarReingreso = false } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }

    const nombreLimpio = nombre.trim();
    const sesion = await obtenerEstadoSesion();

    if (usaMongo()) {
      const regex = new RegExp(`^${escaparRegex(nombreLimpio)}$`, 'i');
      let estudiante = await Estudiante.findOne({ nombre: regex });

      if (estudiante) {
        if (!confirmarReingreso) {
          return res.status(200).json({
            requiereConfirmacion: true,
            estudiante
          });
        }
        const firmados = await obtenerDestinatariosFirmadosPor(estudiante.nombre);
        return res.status(200).json({
          requiereConfirmacion: false,
          recuperado: true,
          estudiante,
          destinatariosFirmados: firmados
        });
      }

      estudiante = await Estudiante.create({
        nombre: nombreLimpio,
        sala: 'Sala de espera'
      });

      if (sesion.gruposAbiertos) {
        const todos = await Estudiante.find();
        const cambios = calcularAsignacionEquitativa(todos, sesion.tamanoGrupo || 4, false);
        await Promise.all(
          cambios.map((c) => Estudiante.findByIdAndUpdate(c.id, { $set: { sala: c.sala } }))
        );
        estudiante = await Estudiante.findById(estudiante._id);
      }

      return res.status(200).json({
        requiereConfirmacion: false,
        recuperado: false,
        estudiante,
        destinatariosFirmados: []
      });
    }

    let estudiante = memoria.estudiantes.find(
      (e) => e.nombre.toLowerCase() === nombreLimpio.toLowerCase()
    );

    if (estudiante) {
      if (!confirmarReingreso) {
        return res.status(200).json({
          requiereConfirmacion: true,
          estudiante
        });
      }
      const firmados = await obtenerDestinatariosFirmadosPor(estudiante.nombre);
      return res.status(200).json({
        requiereConfirmacion: false,
        recuperado: true,
        estudiante,
        destinatariosFirmados: firmados
      });
    }

    estudiante = {
      _id: crypto.randomBytes(12).toString('hex'),
      nombre: nombreLimpio,
      sala: 'Sala de espera',
      datoCurioso: '',
      pasatiempo: '',
      palabraCierre: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    memoria.estudiantes.push(estudiante);

    if (sesion.gruposAbiertos) {
      const cambios = calcularAsignacionEquitativa(
        memoria.estudiantes,
        sesion.tamanoGrupo || 4,
        false
      );
      for (const c of cambios) {
        const encontrado = memoria.estudiantes.find((e) => String(e._id) === c.id);
        if (encontrado) {
          encontrado.sala = c.sala;
          encontrado.updatedAt = new Date().toISOString();
        }
      }
    }

    res.status(200).json({
      requiereConfirmacion: false,
      recuperado: false,
      estudiante,
      destinatariosFirmados: []
    });
  } catch (error) {
    res.status(400).json({ error: 'Datos no válidos', detalles: error.message });
  }
});

// DELETE /api/estudiantes/:id (Profesor saca a un participante de la sesión)
router.delete('/estudiantes/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (usaMongo()) {
      const eliminado = await Estudiante.findByIdAndDelete(id);
      if (!eliminado) {
        return res.status(404).json({ error: 'Estudiante no encontrado' });
      }
      // Eliminar también mensajes asociados a ese participante
      await Mensaje.deleteMany({
        $or: [{ para: id }, { de: eliminado.nombre }]
      });
      const restantes = await Estudiante.find().sort({ nombre: 1 });
      return res.json({ ok: true, estudiantes: restantes });
    }

    const idx = memoria.estudiantes.findIndex((e) => String(e._id) === String(id));
    if (idx === -1) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }
    const [eliminado] = memoria.estudiantes.splice(idx, 1);
    memoria.mensajes = memoria.mensajes.filter(
      (m) =>
        String(m.para) !== String(id) &&
        (m.de || '').toLowerCase() !== eliminado.nombre.toLowerCase()
    );

    const ordenados = [...memoria.estudiantes].sort((a, b) =>
      a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
    );
    res.json({ ok: true, estudiantes: ordenados });
  } catch (error) {
    res.status(500).json({ error: 'Error al retirar al estudiante', detalles: error.message });
  }
});

// PATCH /api/estudiantes/:id (Actualizar sala, rompehielo o palabra de cierre)
router.patch('/estudiantes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { sala, datoCurioso, pasatiempo, palabraCierre } = req.body;

    const camposActualizables = {};
    if (typeof sala === 'string' && sala.trim()) camposActualizables.sala = sala.trim();
    if (typeof datoCurioso === 'string') camposActualizables.datoCurioso = datoCurioso.trim();
    if (typeof pasatiempo === 'string') camposActualizables.pasatiempo = pasatiempo.trim();
    if (typeof palabraCierre === 'string') camposActualizables.palabraCierre = palabraCierre.trim();

    if (usaMongo()) {
      const estudiante = await Estudiante.findByIdAndUpdate(
        id,
        { $set: camposActualizables },
        { new: true, runValidators: true }
      );
      if (!estudiante) {
        return res.status(404).json({ error: 'Estudiante no encontrado' });
      }
      return res.json(estudiante);
    }

    const estudiante = memoria.estudiantes.find((e) => e._id === id);
    if (!estudiante) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }
    Object.assign(estudiante, camposActualizables, { updatedAt: new Date().toISOString() });
    res.json(estudiante);
  } catch (error) {
    res.status(400).json({ error: 'Error al actualizar participante', detalles: error.message });
  }
});

// POST /api/estudiantes/organizar-grupos (Profesor sortea o nivela los grupos)
router.post('/estudiantes/organizar-grupos', async (req, res) => {
  try {
    const tamanoGrupo = Number(req.body?.tamanoGrupo) || 4;
    const abrirGrupos = req.body?.abrirGrupos;
    const remezclarTodo = req.body?.remezclarTodo !== false;

    if (typeof abrirGrupos === 'boolean') {
      await actualizarEstadoSesion({ gruposAbiertos: abrirGrupos, tamanoGrupo });
    } else {
      await actualizarEstadoSesion({ tamanoGrupo });
    }

    if (usaMongo()) {
      const estudiantes = await Estudiante.find();
      const asignaciones = calcularAsignacionEquitativa(
        estudiantes,
        tamanoGrupo,
        remezclarTodo
      );
      await Promise.all(
        asignaciones.map((a) =>
          Estudiante.findByIdAndUpdate(a.id, { $set: { sala: a.sala } })
        )
      );
      const actualizados = await Estudiante.find().sort({ nombre: 1 });
      return res.json(actualizados);
    }

    const asignaciones = calcularAsignacionEquitativa(
      memoria.estudiantes,
      tamanoGrupo,
      remezclarTodo
    );
    for (const a of asignaciones) {
      const est = memoria.estudiantes.find((e) => String(e._id) === a.id);
      if (est) {
        est.sala = a.sala;
        est.updatedAt = new Date().toISOString();
      }
    }

    const ordenados = [...memoria.estudiantes].sort((a, b) =>
      a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
    );
    res.json(ordenados);
  } catch (error) {
    res.status(500).json({ error: 'Error al organizar grupos', detalles: error.message });
  }
});

// GET /api/mensajes/destacados
router.get('/mensajes/destacados', async (req, res) => {
  try {
    if (usaMongo()) {
      const destacados = await Mensaje.find({ destacado: true })
        .populate('para', 'nombre sala')
        .sort({ updatedAt: -1 });
      return res.json(destacados);
    }

    const destacados = memoria.mensajes
      .filter((m) => m.destacado)
      .map((m) => {
        const destinatario = memoria.estudiantes.find((e) => e._id === m.para);
        return {
          ...m,
          para: destinatario
            ? { _id: destinatario._id, nombre: destinatario.nombre, sala: destinatario.sala }
            : { _id: m.para, nombre: 'Participante', sala: 'Grupo 1' }
        };
      })
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    res.json(destacados);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener mensajes destacados' });
  }
});

// POST /api/mensajes (Enviar nota)
router.post('/mensajes', async (req, res) => {
  try {
    const { para, de, texto, tipo } = req.body;
    if (!para || !texto || !texto.trim()) {
      return res.status(400).json({ error: 'El destinatario y el mensaje son obligatorios' });
    }

    if (usaMongo()) {
      const nuevoMensaje = await Mensaje.create({
        para,
        de: de?.trim() || 'Compañero de clase',
        texto: texto.trim(),
        tipo: tipo || 'cualidad'
      });
      return res.status(201).json(nuevoMensaje);
    }

    const nuevoMensaje = {
      _id: crypto.randomBytes(12).toString('hex'),
      para,
      de: de?.trim() || 'Compañero de clase',
      texto: texto.trim(),
      tipo: ['cualidad', 'fortaleza', 'agradecimiento'].includes(tipo) ? tipo : 'cualidad',
      destacado: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    memoria.mensajes.push(nuevoMensaje);
    res.status(201).json(nuevoMensaje);
  } catch (error) {
    res.status(400).json({ error: 'Error al enviar nota', detalles: error.message });
  }
});

// GET /api/mensajes/:estudianteId (Consultar buzón personal)
router.get('/mensajes/:estudianteId', async (req, res) => {
  try {
    if (usaMongo()) {
      const mensajes = await Mensaje.find({ para: req.params.estudianteId }).sort({ createdAt: -1 });
      return res.json(mensajes);
    }

    const mensajes = memoria.mensajes
      .filter((m) => String(m.para) === String(req.params.estudianteId))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(mensajes);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener mensajes' });
  }
});

// PATCH /api/mensajes/:id/destacar
router.patch('/mensajes/:id/destacar', async (req, res) => {
  try {
    const { id } = req.params;
    const { destacado } = req.body;

    if (usaMongo()) {
      const mensaje = await Mensaje.findById(id);
      if (!mensaje) {
        return res.status(404).json({ error: 'Mensaje no encontrado' });
      }
      mensaje.destacado = typeof destacado === 'boolean' ? destacado : !mensaje.destacado;
      await mensaje.save();
      return res.json(mensaje);
    }

    const mensaje = memoria.mensajes.find((m) => m._id === id);
    if (!mensaje) {
      return res.status(404).json({ error: 'Mensaje no encontrado' });
    }
    mensaje.destacado = typeof destacado === 'boolean' ? destacado : !mensaje.destacado;
    mensaje.updatedAt = new Date().toISOString();
    res.json(mensaje);
  } catch (error) {
    res.status(400).json({ error: 'Error al destacar mensaje', detalles: error.message });
  }
});

module.exports = router;

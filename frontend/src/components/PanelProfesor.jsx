import { useState } from 'react';

function PanelProfesor({
  estudiantes,
  sesion,
  resumenProfesor,
  mensajesDestacados,
  onSortearGrupos,
  onCambiarEstadoSesion,
  onSacarEstudiante,
  onReiniciarActividad,
  onRecargarTodo,
  onSalirProfesor
}) {
  const [tamanoIdeal, setTamanoIdeal] = useState(sesion.tamanoGrupo || 4);
  const [procesando, setProcesando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [confirmandoReinicio, setConfirmandoReinicio] = useState(false);
  const [idConfirmandoSacar, setIdConfirmandoSacar] = useState(null);

  // Agrupar estudiantes por sala
  const mapaGrupos = estudiantes.reduce((acc, est) => {
    const clave = est.sala || 'Sala de espera';
    if (!acc[clave]) acc[clave] = [];
    acc[clave].push(est);
    return acc;
  }, {});

  const nombresGrupos = Object.keys(mapaGrupos).sort((a, b) => {
    if (a === 'Sala de espera') return -1;
    if (b === 'Sala de espera') return 1;
    return a.localeCompare(b, 'es', { numeric: true });
  });

  function mostrarAvisoTemporal(texto) {
    setAviso(texto);
    setTimeout(() => setAviso(''), 4500);
  }

  async function handleSortear(remezclarTodo = true) {
    setProcesando(true);
    try {
      await onSortearGrupos(tamanoIdeal, remezclarTodo);
      mostrarAvisoTemporal(
        remezclarTodo
          ? '¡Grupos sorteados desde cero de forma aleatoria y equitativa! 🎲'
          : '¡Grupos nivelados equitativamente sin desarmar los equipos actuales! ⚖️'
      );
    } finally {
      setProcesando(false);
    }
  }

  async function handleToggleAbrirGrupos() {
    setProcesando(true);
    try {
      const nuevoEstado = !sesion.gruposAbiertos;
      await onCambiarEstadoSesion(nuevoEstado, tamanoIdeal);
      mostrarAvisoTemporal(
        nuevoEstado
          ? '🚀 ¡Grupos abiertos! Los estudiantes ya pasaron de la sala de espera a la actividad.'
          : '⏳ Actividad en pausa: los estudiantes volvieron a la sala de espera.'
      );
    } finally {
      setProcesando(false);
    }
  }

  async function handleConfirmarSacar(est) {
    setProcesando(true);
    try {
      await onSacarEstudiante(est._id);
      setIdConfirmandoSacar(null);
      mostrarAvisoTemporal(`Se retiró a ${est.nombre} de la sesión.`);
    } finally {
      setProcesando(false);
    }
  }

  async function handleConfirmarReinicioTotal() {
    setProcesando(true);
    try {
      await onReiniciarActividad();
      setConfirmandoReinicio(false);
      mostrarAvisoTemporal('🗑️ Actividad finalizada y todos los datos han sido eliminados.');
    } finally {
      setProcesando(false);
    }
  }

  const participantesConPalabra = estudiantes.filter(
    (e) => e.palabraCierre && e.palabraCierre.trim() !== ''
  );

  const recibidosPorId = resumenProfesor?.recibidosPorId || {};
  const enviadosPorNombre = resumenProfesor?.enviadosPorNombre || {};

  return (
    <main className="main-container">
      <header className="header card header-card">
        <div className="user-summary">
          <div className="title-row">
            <h2>👨‍🏫 Panel del Profesor</h2>
            <span className={`badge-estado-sesion ${sesion.gruposAbiertos ? 'abierto' : 'espera'}`}>
              {sesion.gruposAbiertos
                ? '🟢 Grupos abiertos (En actividad)'
                : '⏳ Estudiantes en Sala de Espera'}
            </span>
          </div>
          <p>
            Inscritos: <strong>{estudiantes.length} estudiantes</strong> · Notas enviadas:{' '}
            <strong>{resumenProfesor?.totalMensajes || 0}</strong>
          </p>
        </div>

        <div className="tab-buttons">
          <button type="button" className="btn-secondary" onClick={onRecargarTodo}>
            🔄 Actualizar panel
          </button>
          <button type="button" className="btn-tab" onClick={onSalirProfesor}>
            Cerrar sesión de profesor
          </button>
        </div>
      </header>

      <div className="stack-sections">
        <section className="card">
          <h3>🎲 Organización de Grupos y Control de la Actividad</h3>
          <p className="subtitle-sm">
            Mientras los estudiantes ingresan permanecen en la sala de espera. Puedes sortear los equipos al azar, nivelarlos si alguien entra tarde o se retira, y abrir la actividad.
          </p>

          <div className="profesor-controls-grid">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="tamano-grupo-select">Tamaño objetivo por grupo:</label>
              <select
                id="tamano-grupo-select"
                name="tamanoGrupo"
                value={tamanoIdeal}
                onChange={(e) => setTamanoIdeal(Number(e.target.value))}
              >
                <option value={3}>~3 estudiantes por grupo</option>
                <option value={4}>~4 estudiantes por grupo (Recomendado)</option>
                <option value={5}>~5 estudiantes por grupo</option>
              </select>
            </div>

            <div className="profesor-buttons-row">
              <button
                type="button"
                className="btn-secondary"
                disabled={procesando || estudiantes.length === 0}
                onClick={() => handleSortear(true)}
                title="Mezclar a todos los estudiantes al azar en grupos equitativos"
              >
                🎲 Sortear grupos al azar
              </button>

              <button
                type="button"
                className="btn-secondary"
                disabled={procesando || estudiantes.length === 0}
                onClick={() => handleSortear(false)}
                title="Reubicar pendientes o equilibrar tamaños sin desarmar los grupos ya creados"
              >
                ⚖️ Nivelar grupos actuales
              </button>

              <button
                type="button"
                className={`btn-primary ${sesion.gruposAbiertos ? 'btn-warning-state' : ''}`}
                disabled={procesando || estudiantes.length === 0}
                onClick={handleToggleAbrirGrupos}
              >
                {sesion.gruposAbiertos
                  ? '⏸️ Volver a Sala de Espera'
                  : '🚀 Abrir grupos e iniciar actividad'}
              </button>
            </div>
          </div>

          {aviso && (
            <div className="toast-success" role="status" aria-live="polite">
              {aviso}
            </div>
          )}
        </section>

        <section className="card">
          <div className="buzon-header">
            <div>
              <h3>👥 Grupos y Monitoreo de Participantes ({estudiantes.length})</h3>
              <p className="subtitle-sm">
                Indicadores por estudiante: <strong>🧊</strong> Rompehielo listo · <strong>✍️</strong> Notas escritas · <strong>📬</strong> Notas recibidas · <strong>✕</strong> Sacar de la sesión.
              </p>
            </div>
          </div>

          {estudiantes.length === 0 ? (
            <div className="empty-state">
              <p>Aún no se han conectado estudiantes.</p>
              <small>A medida que ingresen su nombre, aparecerán aquí en tiempo real.</small>
            </div>
          ) : (
            <div className="grid-rompehielo">
              {nombresGrupos.map((nombreGrupo) => {
                const lista = mapaGrupos[nombreGrupo];
                return (
                  <article key={nombreGrupo} className="rompehielo-card">
                    <div className="rompehielo-card-header">
                      <strong>{nombreGrupo}</strong>
                      <span className="badge-sala">
                        {lista.length} {lista.length === 1 ? 'estudiante' : 'estudiantes'}
                      </span>
                    </div>
                    <ul className="lista-integrantes-profesor">
                      {lista.map((est) => {
                        const tieneRompehielo = Boolean(est.datoCurioso || est.pasatiempo);
                        const cantEnviadas =
                          enviadosPorNombre[(est.nombre || '').trim().toLowerCase()] || 0;
                        const cantRecibidas = recibidosPorId[String(est._id)] || 0;
                        const pidiendoConfirmacion = idConfirmandoSacar === est._id;

                        return (
                          <li key={est._id} className="item-estudiante-profesor">
                            <div className="est-info-principal">
                              <span className="est-nombre">{est.nombre}</span>
                              <div className="est-metricas">
                                <span
                                  className={`mini-metrica ${tieneRompehielo ? 'ok' : ''}`}
                                  title={
                                    tieneRompehielo
                                      ? 'Completó el rompehielo'
                                      : 'Rompehielo pendiente'
                                  }
                                >
                                  🧊 {tieneRompehielo ? '✓' : '…'}
                                </span>
                                <span
                                  className="mini-metrica"
                                  title="Notas escritas a compañeros"
                                >
                                  ✍️ {cantEnviadas}
                                </span>
                                <span
                                  className={`mini-metrica ${
                                    cantRecibidas === 0 ? 'alerta' : 'ok'
                                  }`}
                                  title="Notas recibidas en su hoja"
                                >
                                  📬 {cantRecibidas}
                                </span>
                                {est.palabraCierre && (
                                  <span className="mini-tag-cierre">🌈 {est.palabraCierre}</span>
                                )}
                              </div>
                            </div>

                            <div className="est-acciones">
                              {pidiendoConfirmacion ? (
                                <div className="confirm-inline-group">
                                  <button
                                    type="button"
                                    className="btn-danger-xs"
                                    disabled={procesando}
                                    onClick={() => handleConfirmarSacar(est)}
                                  >
                                    Confirmar
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-cancel-xs"
                                    onClick={() => setIdConfirmandoSacar(null)}
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="btn-kick"
                                  title={`Sacar a ${est.nombre} de la actividad`}
                                  onClick={() => setIdConfirmandoSacar(est._id)}
                                >
                                  ✕ Sacar
                                </button>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="card">
          <h3>
            ✨ Seguimiento de Muro Grupal ({mensajesDestacados.length}) y Cierre ({participantesConPalabra.length})
          </h3>
          {participantesConPalabra.length > 0 && (
            <div className="nube-palabras" style={{ marginBottom: '1rem' }}>
              {participantesConPalabra.map((est) => (
                <div key={est._id} className="burbuja-palabra">
                  <span className="burbuja-texto">{est.palabraCierre}</span>
                  <span className="burbuja-autor">
                    {est.nombre} · {est.sala}
                  </span>
                </div>
              ))}
            </div>
          )}
          {mensajesDestacados.length === 0 ? (
            <p className="subtitle-sm" style={{ marginBottom: 0 }}>
              Cuando los estudiantes compartan voluntariamente mensajes de su hoja o su palabra de cierre, aparecerán aquí.
            </p>
          ) : (
            <div className="grid-notas">
              {mensajesDestacados.map((nota) => {
                const nombreDestinatario =
                  typeof nota.para === 'object' && nota.para !== null
                    ? nota.para.nombre
                    : 'Participante';
                return (
                  <article key={nota._id} className={`nota-card destacada ${nota.tipo}`}>
                    <span className="badge-tipo">
                      {nota.tipo} · Para <strong>{nombreDestinatario}</strong>
                    </span>
                    <p className="nota-texto">"{nota.texto}"</p>
                    <span className="nota-remitente">— Escrito por {nota.de}</span>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="card danger-zone-card">
          <div className="buzon-header">
            <div>
              <h3>🗑️ Finalizar Actividad y Limpiar Base de Datos</h3>
              <p className="subtitle-sm" style={{ marginBottom: 0 }}>
                Al terminar la sesión con el grupo, puedes borrar todos los participantes, notas y palabras de cierre para dejar la aplicación limpia.
              </p>
            </div>

            {!confirmandoReinicio ? (
              <button
                type="button"
                className="btn-danger"
                disabled={procesando}
                onClick={() => setConfirmandoReinicio(true)}
              >
                🗑️ Acabar actividad y borrar datos
              </button>
            ) : (
              <div className="confirm-reset-box">
                <span>¿Seguro que deseas eliminar TODOS los datos de la sesión?</span>
                <div className="profesor-buttons-row">
                  <button
                    type="button"
                    className="btn-danger"
                    disabled={procesando}
                    onClick={handleConfirmarReinicioTotal}
                  >
                    {procesando ? 'Borrando...' : 'Sí, eliminar todo y reiniciar'}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setConfirmandoReinicio(false)}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default PanelProfesor;

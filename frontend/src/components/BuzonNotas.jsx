import { useState } from 'react';

function BuzonNotas({
  usuarioActual,
  misMensajes,
  mensajesDestacados,
  cargandoInicial,
  onRecargarBuzon,
  onToggleDestacar
}) {
  const [actualizandoManual, setActualizandoManual] = useState(false);

  async function handleRefrescar() {
    setActualizandoManual(true);
    try {
      await onRecargarBuzon();
    } finally {
      setActualizandoManual(false);
    }
  }

  return (
    <div className="stack-sections">
      <section className="card">
        <div className="buzon-header">
          <div>
            <span className="phase-pill">Etapa 3 · Compartiendo lo positivo</span>
            <h3>📬 Tu Hoja de Reconocimiento ({misMensajes.length})</h3>
            <p className="subtitle-sm">
              Lee los mensajes que tus compañeros escribieron en tu hoja. Si alguno te gustó o te sorprendió, puedes compartirlo voluntariamente con toda la clase.
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary"
            disabled={actualizandoManual}
            onClick={handleRefrescar}
          >
            {actualizandoManual ? '⏳ Actualizando...' : '🔄 Actualizar hoja'}
          </button>
        </div>

        {cargandoInicial ? (
          <div className="empty-state">
            <p>Consultando notas en la base de datos...</p>
          </div>
        ) : misMensajes.length === 0 ? (
          <div className="empty-state">
            <p>Aún no tienes notas en tu hoja.</p>
            <small>Tus compañeros están redactando sus reconocimientos.</small>
          </div>
        ) : (
          <div className="grid-notas">
            {misMensajes.map((nota) => (
              <article key={nota._id} className={`nota-card ${nota.tipo}`}>
                <div className="nota-top-row">
                  <span className="badge-tipo">{nota.tipo}</span>
                  <button
                    type="button"
                    className={`btn-destacar ${nota.destacado ? 'activo' : ''}`}
                    aria-pressed={Boolean(nota.destacado)}
                    onClick={() => onToggleDestacar(nota._id, !nota.destacado)}
                  >
                    {nota.destacado
                      ? '🌟 Compartido con el grupo'
                      : '📣 Compartir voluntariamente'}
                  </button>
                </div>
                <p className="nota-texto">"{nota.texto}"</p>
                <span className="nota-remitente">— {nota.de}</span>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <div className="buzon-header">
          <div>
            <h3>✨ Mensajes que nos sorprendieron (Muro Grupal)</h3>
            <p className="subtitle-sm">
              Notas que los participantes han decidido compartir voluntariamente durante el espacio &ldquo;Compartiendo lo positivo&rdquo;.
            </p>
          </div>
          <span className="counter-badge">{mensajesDestacados.length} compartidos</span>
        </div>

        {mensajesDestacados.length === 0 ? (
          <div className="empty-state">
            <p>Todavía nadie ha destacado un mensaje en el muro grupal.</p>
            <small>
              Haz clic en &ldquo;📣 Compartir voluntariamente&rdquo; en cualquiera de tus notas recibidas para inaugurar el muro.
            </small>
          </div>
        ) : (
          <div className="grid-notas">
            {mensajesDestacados.map((nota) => {
              const nombreDestinatario =
                typeof nota.para === 'object' && nota.para !== null
                  ? nota.para.nombre
                  : usuarioActual.nombre;
              return (
                <article key={nota._id} className={`nota-card destacada ${nota.tipo}`}>
                  <div className="nota-top-row">
                    <span className="badge-tipo">
                      {nota.tipo} · Para <strong>{nombreDestinatario}</strong>
                    </span>
                  </div>
                  <p className="nota-texto">"{nota.texto}"</p>
                  <span className="nota-remitente">— Escrito por {nota.de}</span>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default BuzonNotas;

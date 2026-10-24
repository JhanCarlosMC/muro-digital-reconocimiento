import { useState, useEffect } from 'react';

function RompehieloGrupo({
  usuarioActual,
  estudiantes,
  onActualizarPerfil,
  onIrAEscribir
}) {
  const [datoCurioso, setDatoCurioso] = useState(usuarioActual.datoCurioso || '');
  const [pasatiempo, setPasatiempo] = useState(usuarioActual.pasatiempo || '');
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');
  const [soloMiGrupo, setSoloMiGrupo] = useState(true);

  useEffect(() => {
    setDatoCurioso(usuarioActual.datoCurioso || '');
    setPasatiempo(usuarioActual.pasatiempo || '');
  }, [usuarioActual._id]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!e.currentTarget.checkValidity()) return;

    setGuardando(true);
    try {
      await onActualizarPerfil({
        datoCurioso: datoCurioso.trim(),
        pasatiempo: pasatiempo.trim()
      });
      setMensajeExito('¡Tu presentación del rompehielo fue compartida con tu grupo! 🎉');
      setTimeout(() => setMensajeExito(''), 4000);
    } finally {
      setGuardando(false);
    }
  }

  const miGrupo = usuarioActual.sala || 'Grupo 1';
  const participantesFiltrados = soloMiGrupo
    ? estudiantes.filter((e) => (e.sala || 'Grupo 1') === miGrupo)
    : estudiantes;

  return (
    <div className="stack-sections">
      <section className="card">
        <div>
          <span className="phase-pill">Etapa 1 · Conociéndonos mejor</span>
          <h3>🧊 Rompehielo en {miGrupo}</h3>
          <p className="subtitle-sm">
            Comparte con tus compañeros de <strong>{miGrupo}</strong> algo que no sepan sobre ti y qué disfrutas hacer fuera del estudio o la programación.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="form-envio">
          <div className="form-group">
            <label htmlFor="dato-curioso-input">
              1. Algo que tus compañeros no saben sobre ti:
            </label>
            <span id="dato-curioso-hint" className="hint">
              Un talento oculto, una anécdota curiosa o un sueño que tengas.
            </span>
            <textarea
              id="dato-curioso-input"
              name="datoCurioso"
              rows="2"
              required
              minLength={4}
              maxLength={280}
              placeholder="Ej. Toco el ukelele desde los 12 años y me encanta la astronomía..."
              aria-describedby="dato-curioso-hint"
              aria-errormessage="dato-curioso-error"
              value={datoCurioso}
              onChange={(e) => setDatoCurioso(e.target.value)}
            />
            <div id="dato-curioso-error" className="error-msg" role="alert">
              <span aria-hidden="true">❌</span> Cuéntanos brevemente algo curioso sobre ti (mínimo 4 caracteres).
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="pasatiempo-input">
              2. ¿Qué te gusta hacer cuando no estás estudiando o programando?
            </label>
            <span id="pasatiempo-hint" className="hint">
              Deportes, música, videojuegos, lectura, cocina o cualquier pasatiempo favorito.
            </span>
            <textarea
              id="pasatiempo-input"
              name="pasatiempo"
              rows="2"
              required
              minLength={4}
              maxLength={280}
              placeholder="Ej. Salir en bicicleta por las tardes y preparar postres con mi familia..."
              aria-describedby="pasatiempo-hint"
              aria-errormessage="pasatiempo-error"
              value={pasatiempo}
              onChange={(e) => setPasatiempo(e.target.value)}
            />
            <div id="pasatiempo-error" className="error-msg" role="alert">
              <span aria-hidden="true">❌</span> Comparte qué te gusta hacer en tu tiempo libre (mínimo 4 caracteres).
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={guardando}>
            {guardando ? 'Guardando presentación...' : 'Guardar y compartir con mi grupo'}
          </button>

          {mensajeExito && (
            <div className="toast-success" role="status" aria-live="polite">
              {mensajeExito}
            </div>
          )}
        </form>
      </section>

      <section className="card">
        <div className="buzon-header">
          <div>
            <h3>👥 Compañeros de equipo ({participantesFiltrados.length})</h3>
            <p className="subtitle-sm">
              Lee lo que compartieron tus compañeros y pasa a dejarles una nota positiva en su hoja.
            </p>
          </div>
          <div className="filter-pills" role="group" aria-label="Filtrar participantes por grupo">
            <button
              type="button"
              className={`btn-pill ${soloMiGrupo ? 'active' : ''}`}
              onClick={() => setSoloMiGrupo(true)}
            >
              Mi grupo ({miGrupo})
            </button>
            <button
              type="button"
              className={`btn-pill ${!soloMiGrupo ? 'active' : ''}`}
              onClick={() => setSoloMiGrupo(false)}
            >
              Todos ({estudiantes.length})
            </button>
          </div>
        </div>

        {participantesFiltrados.length === 0 ? (
          <div className="empty-state">
            <p>Aún no hay compañeros en este grupo.</p>
          </div>
        ) : (
          <div className="grid-rompehielo">
            {participantesFiltrados.map((est) => {
              const esYo = est._id === usuarioActual._id;
              return (
                <article key={est._id} className={`rompehielo-card ${esYo ? 'es-yo' : ''}`}>
                  <div className="rompehielo-card-header">
                    <div>
                      <strong>{est.nombre}</strong> {esYo && <span className="tag-yo">(Tú)</span>}
                    </div>
                    <span className="badge-sala">{est.sala || 'Grupo 1'}</span>
                  </div>

                  {est.datoCurioso || est.pasatiempo ? (
                    <div className="rompehielo-body">
                      {est.datoCurioso && (
                        <p>
                          <strong>🔎 Lo que pocos saben:</strong> {est.datoCurioso}
                        </p>
                      )}
                      {est.pasatiempo && (
                        <p>
                          <strong>🎨 Fuera del código:</strong> {est.pasatiempo}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="rompehielo-pendiente">
                      Todavía está escribiendo su presentación del rompehielo...
                    </p>
                  )}

                  {!esYo && (
                    <button
                      type="button"
                      className="btn-link-action"
                      onClick={() => onIrAEscribir(est._id)}
                    >
                      ✍️ Escribirle en su hoja →
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default RompehieloGrupo;

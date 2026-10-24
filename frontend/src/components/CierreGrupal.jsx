import { useState, useEffect } from 'react';

const PALABRAS_SUGERIDAS = [
  'Agradecido/a',
  'Inspirado/a',
  'Motivado/a',
  'Conectado/a',
  'Valorado/a',
  'Feliz',
  'Entusiasmado/a',
  'Acompañado/a'
];

function CierreGrupal({ usuarioActual, estudiantes, onGuardarPalabra }) {
  const [palabra, setPalabra] = useState(usuarioActual.palabraCierre || '');
  const [guardando, setGuardando] = useState(false);
  const [confirmacion, setConfirmacion] = useState('');

  useEffect(() => {
    setPalabra(usuarioActual.palabraCierre || '');
  }, [usuarioActual]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!e.currentTarget.checkValidity()) return;
    if (!palabra.trim()) return;

    setGuardando(true);
    try {
      await onGuardarPalabra(palabra.trim());
      setConfirmacion('¡Gracias por compartir tu palabra de cierre! 🙌');
      setTimeout(() => setConfirmacion(''), 4000);
    } finally {
      setGuardando(false);
    }
  }

  const participantesConPalabra = estudiantes.filter(
    (e) => e.palabraCierre && e.palabraCierre.trim() !== ''
  );

  return (
    <div className="stack-sections">
      <section className="card">
        <span className="phase-pill">Etapa 4 · Cierre grupal</span>
        <h3>🌈 En una palabra: ¿Cómo te sentiste hoy?</h3>
        <p className="subtitle-sm">
          Te invitamos a expresar en <strong>una sola palabra</strong> cómo te sentiste durante la actividad de reconocimiento.
        </p>

        <form onSubmit={handleSubmit} className="form-envio">
          <div className="form-group">
            <label htmlFor="palabra-cierre-input">Tu palabra de cierre:</label>
            <span id="palabra-hint" className="hint">
              Escribe una sola palabra (sin espacios) o elige una de las sugerencias rápidas.
            </span>
            <input
              id="palabra-cierre-input"
              name="palabraCierre"
              type="text"
              required
              pattern="^\S+$"
              maxLength={30}
              placeholder="Ej. Inspirado"
              aria-describedby="palabra-hint"
              aria-errormessage="palabra-error"
              value={palabra}
              onChange={(e) => setPalabra(e.target.value)}
            />
            <div id="palabra-error" className="error-msg" role="alert">
              <span aria-hidden="true">❌</span> Por favor ingresa una sola palabra sin espacios (ej. Motivado).
            </div>
          </div>

          <div className="sugerencias-palabras" aria-label="Sugerencias rápidas de una palabra">
            {PALABRAS_SUGERIDAS.map((sug) => (
              <button
                key={sug}
                type="button"
                className={`chip-palabra ${palabra === sug ? 'activa' : ''}`}
                onClick={() => setPalabra(sug)}
              >
                {sug}
              </button>
            ))}
          </div>

          <button type="submit" className="btn-primary" disabled={guardando}>
            {guardando ? 'Publicando en el mural...' : 'Publicar mi palabra en el cierre'}
          </button>

          {confirmacion && (
            <div className="toast-success" role="status" aria-live="polite">
              {confirmacion}
            </div>
          )}
        </form>
      </section>

      <section className="card cierre-wall-card">
        <div className="buzon-header">
          <div>
            <h3>💬 Mural de Emociones del Grupo ({participantesConPalabra.length})</h3>
            <p className="subtitle-sm">
              Así nos sentimos hoy al reconocernos y compartir lo positivo en Jóvenes creaTIvos 2026.
            </p>
          </div>
        </div>

        {participantesConPalabra.length === 0 ? (
          <div className="empty-state">
            <p>Aún no hay palabras publicadas en el cierre grupal.</p>
            <small>¡Sé la primera persona en expresar cómo te sentiste hoy!</small>
          </div>
        ) : (
          <div className="nube-palabras">
            {participantesConPalabra.map((est) => (
              <div key={est._id} className="burbuja-palabra">
                <span className="burbuja-texto">{est.palabraCierre}</span>
                <span className="burbuja-autor">
                  {est.nombre} · {est.sala || 'General'}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="agradecimiento-banner">
          <h4>🙏 ¡Gracias por tu participación y disposición!</h4>
          <p>
            Cada mensaje positivo fortalece nuestra comunidad en <strong>Jóvenes creaTIvos 2026</strong>.
          </p>
        </div>
      </section>
    </div>
  );
}

export default CierreGrupal;

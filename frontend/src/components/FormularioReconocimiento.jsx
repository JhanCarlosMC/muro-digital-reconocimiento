import { useState, useEffect } from 'react';

const TIPOS_MENSAJE = [
  {
    valor: 'cualidad',
    etiqueta: '✨ Cualidad o virtud',
    descripcion: 'Actitud positiva, empatía, entusiasmo o carisma'
  },
  {
    valor: 'fortaleza',
    etiqueta: '💪 Fortaleza técnica o colaborativa',
    descripcion: 'Habilidad resolviendo problemas, trabajo en equipo o liderazgo'
  },
  {
    valor: 'agradecimiento',
    etiqueta: '🙏 Agradecimiento',
    descripcion: 'Gracias por su apoyo, escucha o compañerismo en las sesiones'
  }
];

function FormularioReconocimiento({
  estudiantes,
  usuarioActual,
  destinatarioPreseleccionado,
  destinatariosFirmados,
  onEnviarMensaje
}) {
  const [destinatarioId, setDestinatarioId] = useState(destinatarioPreseleccionado || '');
  const [tipoMensaje, setTipoMensaje] = useState('cualidad');
  const [textoMensaje, setTextoMensaje] = useState('');
  const [notificacion, setNotificacion] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [soloMiSala, setSoloMiSala] = useState(false);

  useEffect(() => {
    if (destinatarioPreseleccionado) {
      setDestinatarioId(destinatarioPreseleccionado);
    }
  }, [destinatarioPreseleccionado]);

  const companerosTotales = estudiantes.filter((e) => e._id !== usuarioActual._id);
  const companerosMiGrupo = companerosTotales.filter(
    (e) => (e.sala || 'General') === (usuarioActual.sala || 'General')
  );

  const listaParaSelect =
    soloMiSala && companerosMiGrupo.length > 0 ? companerosMiGrupo : companerosTotales;

  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) return;
    if (!destinatarioId || !textoMensaje.trim()) return;

    setEnviando(true);
    try {
      const ok = await onEnviarMensaje({
        para: destinatarioId,
        de: usuarioActual.nombre,
        texto: textoMensaje.trim(),
        tipo: tipoMensaje
      });

      if (ok) {
        setTextoMensaje('');
        form.reset();
        setDestinatarioId(destinatarioId);
        setTipoMensaje(tipoMensaje);
        setNotificacion('¡Mensaje entregado con éxito en su hoja! ✨');
        setTimeout(() => setNotificacion(''), 4000);
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="card">
      <span className="phase-pill">Etapa 2 · Reconociéndonos</span>
      <h3>✍️ Rotación de Hojas: Escribe una cualidad o fortaleza</h3>
      <p className="subtitle-sm">
        Las hojas rotan entre los integrantes del grupo. Selecciona la hoja de cada compañero y déjale un mensaje positivo.
      </p>

      {companerosMiGrupo.length > 0 && (
        <div className="rotacion-box" aria-label="Hojas de compañeros de tu grupo">
          <div className="rotacion-header">
            <strong>📄 Hojas de tu grupo ({usuarioActual.sala || 'General'}):</strong>
            <span className="rotacion-progreso">
              {companerosMiGrupo.filter((c) => destinatariosFirmados.includes(c._id)).length} de{' '}
              {companerosMiGrupo.length} firmadas
            </span>
          </div>
          <div className="rotacion-chips">
            {companerosMiGrupo.map((comp) => {
              const firmado = destinatariosFirmados.includes(comp._id);
              const activo = destinatarioId === comp._id;
              return (
                <button
                  key={comp._id}
                  type="button"
                  className={`chip-hoja ${activo ? 'seleccionado' : ''} ${firmado ? 'firmado' : ''}`}
                  onClick={() => setDestinatarioId(comp._id)}
                >
                  <span>{firmado ? '✅' : '📝'}</span>
                  <span>{comp.nombre}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-envio">
        <div className="form-group">
          <div className="label-row">
            <label htmlFor="destinatario-select">Compañero destino (dueño de la hoja):</label>
            {companerosMiGrupo.length > 0 && (
              <button
                type="button"
                className="btn-inline-filter"
                onClick={() => setSoloMiSala((prev) => !prev)}
              >
                {soloMiSala ? 'Ver todos los grupos' : `Filtrar solo ${usuarioActual.sala}`}
              </button>
            )}
          </div>
          <span id="destinatario-hint" className="hint">
            Elige el compañero en cuya hoja quieres escribir tu nota de reconocimiento.
          </span>
          <select
            id="destinatario-select"
            name="para"
            aria-describedby="destinatario-hint"
            aria-errormessage="destinatario-error"
            value={destinatarioId}
            onChange={(e) => setDestinatarioId(e.target.value)}
            required
          >
            <option value="">-- Selecciona un compañero --</option>
            {listaParaSelect.map((e) => {
              const yaFirmado = destinatariosFirmados.includes(e._id);
              return (
                <option key={e._id} value={e._id}>
                  {e.nombre} ({e.sala || 'General'}) {yaFirmado ? '✓ Ya le escribiste' : ''}
                </option>
              );
            })}
          </select>
          <div id="destinatario-error" className="error-msg" role="alert">
            <span aria-hidden="true">❌</span> Selecciona un compañero para entregar tu nota.
          </div>
        </div>

        <fieldset className="form-group fieldset-radios">
          <legend>Tipo de mensaje positivo:</legend>
          <span id="tipo-hint" className="hint">
            Selecciona el enfoque del reconocimiento que deseas destacar.
          </span>
          <div className="radio-cards" role="radiogroup" aria-describedby="tipo-hint">
            {TIPOS_MENSAJE.map((item) => (
              <label
                key={item.valor}
                htmlFor={`tipo-${item.valor}`}
                className={`radio-card ${tipoMensaje === item.valor ? 'checked' : ''}`}
              >
                <input
                  id={`tipo-${item.valor}`}
                  type="radio"
                  name="tipo"
                  value={item.valor}
                  checked={tipoMensaje === item.valor}
                  onChange={(e) => setTipoMensaje(e.target.value)}
                />
                <div className="radio-card-content">
                  <span className="radio-title">{item.etiqueta}</span>
                  <span className="radio-desc">{item.descripcion}</span>
                </div>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="form-group">
          <label htmlFor="texto-mensaje">Tu mensaje de reconocimiento:</label>
          <span id="texto-hint" className="hint">
            Escribe con sinceridad una cualidad, fortaleza o mensaje positivo para esta persona (mínimo 5 caracteres).
          </span>
          <textarea
            id="texto-mensaje"
            name="texto"
            rows="4"
            minLength={5}
            maxLength={500}
            placeholder="Escribe aquí tu mensaje de reconocimiento..."
            aria-describedby="texto-hint"
            aria-errormessage="texto-error"
            value={textoMensaje}
            onChange={(e) => setTextoMensaje(e.target.value)}
            required
          />
          <div id="texto-error" className="error-msg" role="alert">
            <span aria-hidden="true">❌</span> Escribe un mensaje de al menos 5 caracteres para tu compañero.
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={enviando}>
          {enviando ? 'Entregando nota en su hoja...' : 'Enviar nota a su hoja'}
        </button>

        {notificacion && (
          <div className="toast-success" role="status" aria-live="polite">
            {notificacion}
          </div>
        )}
      </form>
    </section>
  );
}

export default FormularioReconocimiento;

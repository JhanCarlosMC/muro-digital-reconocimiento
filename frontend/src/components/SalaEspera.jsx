function SalaEspera({ usuarioActual, estudiantes, onSalir }) {
  return (
    <main className="auth-container">
      <div className="card waiting-room-card">
        <div className="login-top-bar">
          <span className="badge-programa">⏳ Sala de Espera</span>
          <button type="button" className="btn-inline-filter" onClick={onSalir}>
            Cambiar de nombre
          </button>
        </div>

        <h2>¡Hola, {usuarioActual.nombre}! 👋</h2>
        <p className="subtitle">
          Estás en la sala de espera. En breve el profesor organizará los grupos de forma aleatoria y equitativa para dar inicio a las etapas de la actividad.
        </p>

        <div className="waiting-pulse-box" role="status" aria-live="polite">
          <span className="pulse-dot" aria-hidden="true" />
          <span>Esperando a que el profesor abra los grupos... (pasarás automáticamente)</span>
        </div>

        <div className="waiting-participants-box">
          <div className="rotacion-header">
            <strong>👥 Compañeros conectados ({estudiantes.length}):</strong>
          </div>
          <div className="rotacion-chips">
            {estudiantes.map((est) => {
              const esYo = est._id === usuarioActual._id;
              return (
                <span
                  key={est._id}
                  className={`chip-hoja ${esYo ? 'seleccionado' : ''}`}
                >
                  <span>{esYo ? '🙋' : '👤'}</span>
                  <span>
                    {est.nombre} {esYo ? '(Tú)' : ''}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}

export default SalaEspera;

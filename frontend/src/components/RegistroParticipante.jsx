import { useState, useRef } from 'react';

function RegistroParticipante({
  estudiantes,
  onLogin,
  onLoginProfesor,
  cargando
}) {
  const [nombreInput, setNombreInput] = useState('');
  const [participanteExistente, setParticipanteExistente] = useState(null);

  // Estado para acceso de profesor con contraseña
  const [mostrarLoginProfesor, setMostrarLoginProfesor] = useState(false);
  const [passwordProfesor, setPasswordProfesor] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [errorProfesor, setErrorProfesor] = useState('');
  const [validandoProfesor, setValidandoProfesor] = useState(false);

  const inputNombreRef = useRef(null);

  async function handleSubmitEstudiante(e) {
    e.preventDefault();
    if (!e.currentTarget.checkValidity()) return;
    if (!nombreInput.trim()) return;

    const resultado = await onLogin({
      nombre: nombreInput.trim(),
      confirmarReingreso: false
    });

    if (resultado?.requiereConfirmacion && resultado.estudiante) {
      setParticipanteExistente(resultado.estudiante);
    }
  }

  async function handleConfirmarSoyYo() {
    if (!participanteExistente) return;
    await onLogin({
      nombre: participanteExistente.nombre,
      confirmarReingreso: true
    });
    setParticipanteExistente(null);
  }

  function handleSoyOtraPersona() {
    setParticipanteExistente(null);
    setTimeout(() => {
      inputNombreRef.current?.focus();
    }, 50);
  }

  async function handleSubmitProfesor(e) {
    e.preventDefault();
    if (!passwordProfesor.trim()) return;
    setErrorProfesor('');
    setValidandoProfesor(true);
    try {
      const ok = await onLoginProfesor(passwordProfesor.trim());
      if (!ok) {
        setErrorProfesor('Contraseña incorrecta. Verifica la clave de profesor.');
      }
    } finally {
      setValidandoProfesor(false);
    }
  }

  if (mostrarLoginProfesor) {
    return (
      <main className="auth-container">
        <div className="card login-card">
          <div className="login-top-bar">
            <span className="badge-programa">👨‍🏫 Acceso Docente</span>
            <button
              type="button"
              className="btn-profesor-access"
              onClick={() => {
                setMostrarLoginProfesor(false);
                setErrorProfesor('');
                setPasswordProfesor('');
              }}
            >
              ← Volver a vista de estudiante
            </button>
          </div>

          <h1>Panel del Profesor</h1>
          <p className="subtitle">
            Ingresa la clave de facilitador para gestionar la sala de espera, sortear los grupos y supervisar la actividad.
          </p>

          <form onSubmit={handleSubmitProfesor} className="form-registro">
            <div className="form-group">
              <label htmlFor="password-profesor">Contraseña del profesor:</label>
              <span id="pass-profesor-hint" className="hint">
                Clave configurada para el facilitador de la sesión (por defecto: <code>jca2026</code>).
              </span>
              <div className="password-input-wrapper">
                <input
                  id="password-profesor"
                  name="password"
                  type={mostrarPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Ingresa la contraseña..."
                  required
                  aria-describedby="pass-profesor-hint"
                  value={passwordProfesor}
                  onChange={(e) => {
                    setPasswordProfesor(e.target.value);
                    if (errorProfesor) setErrorProfesor('');
                  }}
                />
                <button
                  type="button"
                  className="btn-toggle-pass"
                  aria-pressed={mostrarPassword}
                  aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  onClick={() => setMostrarPassword((prev) => !prev)}
                >
                  {mostrarPassword ? '🙈 Ocultar' : '👁️ Mostrar'}
                </button>
              </div>
              {errorProfesor && (
                <div className="error-msg-visible" role="alert">
                  <span aria-hidden="true">❌</span> {errorProfesor}
                </div>
              )}
            </div>

            <button type="submit" className="btn-primary" disabled={validandoProfesor}>
              {validandoProfesor ? 'Verificando clave...' : 'Entrar al Panel del Profesor'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-container">
      <div className="card login-card">
        <div className="login-top-bar">
          <span className="badge-programa">Jóvenes creaTIvos 2026 · Actividad Integradora</span>
          <button
            type="button"
            className="btn-profesor-access"
            onClick={() => setMostrarLoginProfesor(true)}
          >
            👨‍🏫 Ingresar como Profesor
          </button>
        </div>

        <h1>🌟 Muro Digital de Reconocimiento</h1>
        <p className="subtitle">
          Espacio para conocernos mejor, reconocer las cualidades de nuestros compañeros y fortalecer nuestro equipo.
        </p>

        {participanteExistente ? (
          <div className="reingreso-confirm-box" role="region" aria-label="Confirmar identidad del participante">
            <h3>⚠️ Ya existe un registro con el nombre &ldquo;{participanteExistente.nombre}&rdquo;</h3>
            <p>
              Este participante se encuentra en <strong>{participanteExistente.sala || 'Sala de espera'}</strong>.
              ¿Eres tú intentando volver a entrar para recuperar tus datos guardados, o eres otra persona con el mismo nombre?
            </p>
            <div className="reingreso-buttons">
              <button
                type="button"
                className="btn-primary"
                disabled={cargando}
                onClick={handleConfirmarSoyYo}
              >
                🔄 Sí, soy yo (Recuperar mis datos guardados)
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleSoyOtraPersona}
              >
                ✏️ Soy otra persona (Agregar mi segundo apellido o inicial)
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitEstudiante} className="form-registro">
            <div className="form-group">
              <label htmlFor="nombre-participante">Tu nombre completo (encabezado de tu hoja):</label>
              <span id="nombre-hint" className="hint">
                Escribe tu nombre y apellido. Si ya habías ingresado antes, escribe el mismo nombre para recuperar tu progreso.
              </span>
              <input
                ref={inputNombreRef}
                id="nombre-participante"
                name="nombre"
                type="text"
                placeholder="Ej. Camila Ruiz"
                autoComplete="name"
                enterKeyHint="done"
                minLength={2}
                maxLength={80}
                required
                aria-describedby="nombre-hint"
                aria-errormessage="nombre-error"
                value={nombreInput}
                onChange={(e) => setNombreInput(e.target.value)}
              />
              <div id="nombre-error" className="error-msg" role="alert">
                <span aria-hidden="true">❌</span> Por favor ingresa tu nombre (mínimo 2 caracteres).
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={cargando}>
              {cargando ? 'Verificando e ingresando...' : 'Entrar a la actividad'}
            </button>
          </form>
        )}

        <div className="waiting-count-footer">
          <span>
            👥 Participantes conectados actualmente: <strong>{estudiantes.length}</strong>
          </span>
        </div>
      </div>
    </main>
  );
}

export default RegistroParticipante;

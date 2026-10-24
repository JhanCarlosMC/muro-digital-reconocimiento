import { useState, useEffect, useCallback, useRef } from 'react';
import RegistroParticipante from './components/RegistroParticipante';
import SalaEspera from './components/SalaEspera';
import PanelProfesor from './components/PanelProfesor';
import RompehieloGrupo from './components/RompehieloGrupo';
import FormularioReconocimiento from './components/FormularioReconocimiento';
import BuzonNotas from './components/BuzonNotas';
import CierreGrupal from './components/CierreGrupal';
import './App.css';

const RAW_API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/+$/, '');
const API_BASE = RAW_API_URL.endsWith('/api') ? RAW_API_URL : `${RAW_API_URL}/api`;
const STORAGE_KEY_ESTUDIANTE = 'muro_reconocimiento_estudiante_id';
const STORAGE_KEY_PROFESOR = 'muro_reconocimiento_modo_profesor';

function App() {
  const [estudiantes, setEstudiantes] = useState([]);
  const [sesion, setSesion] = useState({ gruposAbiertos: false, tamanoGrupo: 4 });
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [modoProfesor, setModoProfesor] = useState(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY_PROFESOR) === 'true';
    } catch {
      return false;
    }
  });
  const [resumenProfesor, setResumenProfesor] = useState({
    recibidosPorId: {},
    enviadosPorNombre: {},
    totalMensajes: 0
  });
  const [cargandoLogin, setCargandoLogin] = useState(false);
  const [tabActiva, setTabActiva] = useState('rompehielo'); // 'rompehielo' | 'escribir' | 'buzon' | 'cierre'

  // Estados de reconocimiento y buzón
  const [destinatarioPreseleccionado, setDestinatarioPreseleccionado] = useState('');
  const [destinatariosFirmados, setDestinatariosFirmados] = useState([]);
  const [misMensajes, setMisMensajes] = useState([]);
  const [mensajesDestacados, setMensajesDestacados] = useState([]);
  const [cargandoInicialBuzon, setCargandoInicialBuzon] = useState(false);
  const buzonCargadoRef = useRef(false);
  const restauracionIntentadaRef = useRef(false);

  const usuarioId = usuarioActual?._id || null;

  // Sincronización de aria-invalid con :user-invalid y respaldo para navegadores antiguos
  useEffect(() => {
    const dirtyState = new WeakMap();
    const soportaUserInvalid =
      typeof CSS !== 'undefined' && CSS.supports && CSS.supports('selector(:user-invalid)');

    const syncAria = (el) => {
      if (!el || typeof el.matches !== 'function' || !el.checkValidity) return;
      if (soportaUserInvalid) {
        el.setAttribute('aria-invalid', el.matches(':user-invalid') ? 'true' : 'false');
      } else {
        const isValid = el.checkValidity();
        el.classList.toggle('user-invalid-fallback', !isValid);
        el.classList.toggle('user-valid-fallback', isValid);
        if (!isValid) {
          el.setAttribute('aria-invalid', 'true');
        } else {
          el.removeAttribute('aria-invalid');
        }
      }
    };

    const onBlur = (e) => {
      const target = e.target;
      if (!target || !target.checkValidity) return;
      const state = dirtyState.get(target) || { hasInteracted: false, hasBlurred: false };
      state.hasBlurred = true;
      dirtyState.set(target, state);
      if (soportaUserInvalid || state.hasInteracted) {
        syncAria(target);
      }
    };

    const onInput = (e) => {
      const target = e.target;
      if (!target || !target.checkValidity) return;
      const state = dirtyState.get(target) || { hasInteracted: false, hasBlurred: false };
      state.hasInteracted = true;
      dirtyState.set(target, state);
      if (target.hasAttribute('aria-invalid') || state.hasBlurred) {
        syncAria(target);
      }
    };

    document.addEventListener('blur', onBlur, true);
    document.addEventListener('input', onInput);
    document.addEventListener('change', onInput);

    return () => {
      document.removeEventListener('blur', onBlur, true);
      document.removeEventListener('input', onInput);
      document.removeEventListener('change', onInput);
    };
  }, []);

  const cerrarSesionEstudiante = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY_ESTUDIANTE);
    } catch {
      // Ignorar errores de almacenamiento
    }
    buzonCargadoRef.current = false;
    setUsuarioActual(null);
    setMisMensajes([]);
    setDestinatariosFirmados([]);
    setTabActiva('rompehielo');
  }, []);

  const sincronizarEstadoGeneral = useCallback(async () => {
    try {
      const [resEst, resSes] = await Promise.all([
        fetch(`${API_BASE}/estudiantes`),
        fetch(`${API_BASE}/sesion`)
      ]);

      if (resEst.ok) {
        const dataEst = await resEst.json();
        setEstudiantes(dataEst);

        // Si había una sesión guardada en localStorage al recargar la página, restaurarla
        if (!restauracionIntentadaRef.current) {
          restauracionIntentadaRef.current = true;
          try {
            const idGuardado = localStorage.getItem(STORAGE_KEY_ESTUDIANTE);
            if (idGuardado) {
              const encontrado = dataEst.find((e) => String(e._id) === String(idGuardado));
              if (encontrado) {
                // Recuperar también sus destinatarios firmados desde el backend
                fetch(`${API_BASE}/estudiantes`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    nombre: encontrado.nombre,
                    confirmarReingreso: true
                  })
                })
                  .then((r) => (r.ok ? r.json() : null))
                  .then((info) => {
                    if (info?.estudiante) {
                      setUsuarioActual(info.estudiante);
                      setDestinatariosFirmados(info.destinatariosFirmados || []);
                    }
                  })
                  .catch(() => {});
              } else {
                localStorage.removeItem(STORAGE_KEY_ESTUDIANTE);
              }
            }
          } catch {
            // Ignorar errores de localStorage
          }
        }

        setUsuarioActual((prev) => {
          if (!prev) return null;
          const enc = dataEst.find((e) => String(e._id) === String(prev._id));
          // Si el profesor sacó al estudiante o reinició la actividad, regresarlo al inicio
          if (!enc) {
            try {
              localStorage.removeItem(STORAGE_KEY_ESTUDIANTE);
            } catch {
              // Ignorar
            }
            return null;
          }
          if (
            enc.sala !== prev.sala ||
            enc.datoCurioso !== prev.datoCurioso ||
            enc.pasatiempo !== prev.pasatiempo ||
            enc.palabraCierre !== prev.palabraCierre
          ) {
            return enc;
          }
          return prev;
        });
      }

      if (resSes.ok) {
        const dataSes = await resSes.json();
        setSesion((prev) =>
          prev.gruposAbiertos !== dataSes.gruposAbiertos || prev.tamanoGrupo !== dataSes.tamanoGrupo
            ? dataSes
            : prev
        );
      }
    } catch (err) {
      console.error('Error al sincronizar estado:', err);
    }
  }, []);

  const cargarMiBuzon = useCallback(async () => {
    if (!usuarioId) return;
    if (!buzonCargadoRef.current) {
      setCargandoInicialBuzon(true);
    }
    try {
      const [resBuzon, resDestacados] = await Promise.all([
        fetch(`${API_BASE}/mensajes/${usuarioId}`),
        fetch(`${API_BASE}/mensajes/destacados`)
      ]);
      if (resBuzon.ok) {
        const dataBuzon = await resBuzon.json();
        setMisMensajes(dataBuzon);
      }
      if (resDestacados.ok) {
        const dataDestacados = await resDestacados.json();
        setMensajesDestacados(dataDestacados);
      }
      buzonCargadoRef.current = true;
    } catch (err) {
      console.error('Error al cargar buzón:', err);
    } finally {
      setCargandoInicialBuzon(false);
    }
  }, [usuarioId]);

  const cargarDatosProfesor = useCallback(async () => {
    try {
      const [resDestacados, resResumen] = await Promise.all([
        fetch(`${API_BASE}/mensajes/destacados`),
        fetch(`${API_BASE}/profesor/resumen`)
      ]);
      if (resDestacados.ok) {
        const data = await resDestacados.json();
        setMensajesDestacados(data);
      }
      if (resResumen.ok) {
        const dataRes = await resResumen.json();
        setResumenProfesor(dataRes);
      }
    } catch (err) {
      console.error('Error al cargar datos del profesor:', err);
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    sincronizarEstadoGeneral();
    if (modoProfesor) {
      cargarDatosProfesor();
    }
  }, [sincronizarEstadoGeneral, cargarDatosProfesor, modoProfesor]);

  // Al cambiar de pestaña dentro de la actividad del estudiante, actualizar sin bucle
  useEffect(() => {
    if (!usuarioId) return;
    cargarMiBuzon();
    sincronizarEstadoGeneral();
  }, [tabActiva, usuarioId, cargarMiBuzon, sincronizarEstadoGeneral]);

  // Sondeo automático para mantener sincronizado el estado (incluye detectar si el profesor sacó a alguien o reinició)
  useEffect(() => {
    const timer = setInterval(() => {
      sincronizarEstadoGeneral();
      if (modoProfesor) {
        cargarDatosProfesor();
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [modoProfesor, sincronizarEstadoGeneral, cargarDatosProfesor]);

  async function handleLogin({ nombre, confirmarReingreso = false }) {
    setCargandoLogin(true);
    try {
      const res = await fetch(`${API_BASE}/estudiantes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, confirmarReingreso })
      });
      if (!res.ok) throw new Error('Error al registrar');
      const data = await res.json();

      if (data.requiereConfirmacion) {
        return data;
      }

      const est = data.estudiante || data;
      buzonCargadoRef.current = false;
      setUsuarioActual(est);
      setDestinatariosFirmados(data.destinatariosFirmados || []);
      try {
        localStorage.setItem(STORAGE_KEY_ESTUDIANTE, est._id);
      } catch {
        // Ignorar
      }
      await sincronizarEstadoGeneral();
      return data;
    } catch (err) {
      alert('Error al ingresar a la sesión. Verifica que el backend esté en ejecución.');
      return null;
    } finally {
      setCargandoLogin(false);
    }
  }

  async function handleLoginProfesor(password) {
    try {
      const res = await fetch(`${API_BASE}/profesor/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      if (!res.ok) return false;
      try {
        sessionStorage.setItem(STORAGE_KEY_PROFESOR, 'true');
      } catch {
        // Ignorar
      }
      setModoProfesor(true);
      await Promise.all([sincronizarEstadoGeneral(), cargarDatosProfesor()]);
      return true;
    } catch (err) {
      alert('Error al conectar con el servidor');
      return false;
    }
  }

  function handleSalirProfesor() {
    try {
      sessionStorage.removeItem(STORAGE_KEY_PROFESOR);
    } catch {
      // Ignorar
    }
    setModoProfesor(false);
  }

  async function handleActualizarPerfil(campos) {
    if (!usuarioActual) return;
    try {
      const res = await fetch(`${API_BASE}/estudiantes/${usuarioActual._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campos)
      });
      if (res.ok) {
        const actualizado = await res.json();
        setUsuarioActual(actualizado);
        await sincronizarEstadoGeneral();
      }
    } catch (err) {
      alert('No se pudo actualizar tu información');
    }
  }

  async function handleSortearGrupos(tamanoGrupo = 4, remezclarTodo = true) {
    try {
      const res = await fetch(`${API_BASE}/estudiantes/organizar-grupos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tamanoGrupo, remezclarTodo })
      });
      if (res.ok) {
        const lista = await res.json();
        setEstudiantes(lista);
        await sincronizarEstadoGeneral();
      }
    } catch (err) {
      alert('No se pudieron organizar los grupos');
    }
  }

  async function handleCambiarEstadoSesion(gruposAbiertos, tamanoGrupo = 4) {
    try {
      const res = await fetch(`${API_BASE}/sesion/estado`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gruposAbiertos, tamanoGrupo })
      });
      if (res.ok) {
        const data = await res.json();
        setSesion({
          gruposAbiertos: Boolean(data.gruposAbiertos),
          tamanoGrupo: data.tamanoGrupo || 4
        });
        if (Array.isArray(data.estudiantes)) {
          setEstudiantes(data.estudiantes);
        }
      }
    } catch (err) {
      alert('No se pudo cambiar el estado de la sesión');
    }
  }

  async function handleSacarEstudiante(id) {
    try {
      const res = await fetch(`${API_BASE}/estudiantes/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await Promise.all([sincronizarEstadoGeneral(), cargarDatosProfesor()]);
      }
    } catch (err) {
      alert('No se pudo retirar al participante');
    }
  }

  async function handleReiniciarActividad() {
    try {
      const res = await fetch(`${API_BASE}/sesion/reiniciar`, {
        method: 'DELETE'
      });
      if (res.ok) {
        cerrarSesionEstudiante();
        setEstudiantes([]);
        setMensajesDestacados([]);
        setResumenProfesor({ recibidosPorId: {}, enviadosPorNombre: {}, totalMensajes: 0 });
        setSesion({ gruposAbiertos: false, tamanoGrupo: 4 });
      }
    } catch (err) {
      alert('No se pudo reiniciar la actividad');
    }
  }

  async function handleEnviarMensaje({ para, de, texto, tipo }) {
    try {
      const res = await fetch(`${API_BASE}/mensajes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ para, de, texto, tipo })
      });

      if (res.ok) {
        setDestinatariosFirmados((prev) => (prev.includes(para) ? prev : [...prev, para]));
        return true;
      }
      return false;
    } catch (err) {
      alert('No se pudo enviar la nota');
      return false;
    }
  }

  async function handleToggleDestacar(mensajeId, nuevoEstado) {
    try {
      const res = await fetch(`${API_BASE}/mensajes/${mensajeId}/destacar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destacado: nuevoEstado })
      });
      if (res.ok) {
        await cargarMiBuzon();
      }
    } catch (err) {
      console.error('Error al destacar nota:', err);
    }
  }

  function handleIrAEscribir(estudianteId) {
    setDestinatarioPreseleccionado(estudianteId);
    setTabActiva('escribir');
  }

  const enSalaEspera =
    Boolean(usuarioActual) &&
    (!sesion.gruposAbiertos || !usuarioActual.sala || usuarioActual.sala === 'Sala de espera');

  // Vista 1: Panel del Profesor
  if (modoProfesor) {
    return (
      <PanelProfesor
        estudiantes={estudiantes}
        sesion={sesion}
        resumenProfesor={resumenProfesor}
        mensajesDestacados={mensajesDestacados}
        onSortearGrupos={handleSortearGrupos}
        onCambiarEstadoSesion={handleCambiarEstadoSesion}
        onSacarEstudiante={handleSacarEstudiante}
        onReiniciarActividad={handleReiniciarActividad}
        onRecargarTodo={() => {
          sincronizarEstadoGeneral();
          cargarDatosProfesor();
        }}
        onSalirProfesor={handleSalirProfesor}
      />
    );
  }

  // Vista 2: Registro inicial del estudiante
  if (!usuarioActual) {
    return (
      <RegistroParticipante
        estudiantes={estudiantes}
        onLogin={handleLogin}
        onLoginProfesor={handleLoginProfesor}
        cargando={cargandoLogin}
      />
    );
  }

  // Vista 3: Sala de Espera mientras el profesor organiza y abre los grupos
  if (enSalaEspera) {
    return (
      <SalaEspera
        usuarioActual={usuarioActual}
        estudiantes={estudiantes}
        onSalir={cerrarSesionEstudiante}
      />
    );
  }

  // Vista 4: Etapas de la actividad con el grupo ya asignado
  return (
    <main className="main-container">
      <header className="header card header-card">
        <div className="user-summary">
          <div className="title-row">
            <h2>🌟 Reconociéndonos</h2>
            <span className="badge-sala-header">{usuarioActual.sala || 'Grupo 1'}</span>
          </div>
          <p>
            Participante: <strong>{usuarioActual.nombre}</strong>{' '}
            <button
              type="button"
              className="btn-inline-filter"
              style={{ marginLeft: '0.5rem' }}
              onClick={cerrarSesionEstudiante}
            >
              (Salir)
            </button>
          </p>
        </div>

        <nav className="tab-buttons" aria-label="Etapas de la actividad">
          <button
            type="button"
            className={`btn-tab ${tabActiva === 'rompehielo' ? 'active' : ''}`}
            onClick={() => setTabActiva('rompehielo')}
          >
            🧊 1. Rompehielo
          </button>
          <button
            type="button"
            className={`btn-tab ${tabActiva === 'escribir' ? 'active' : ''}`}
            onClick={() => setTabActiva('escribir')}
          >
            ✍️ 2. Reconociéndonos
          </button>
          <button
            type="button"
            className={`btn-tab ${tabActiva === 'buzon' ? 'active' : ''}`}
            onClick={() => setTabActiva('buzon')}
          >
            📬 3. Mi Hoja ({misMensajes.length})
          </button>
          <button
            type="button"
            className={`btn-tab ${tabActiva === 'cierre' ? 'active' : ''}`}
            onClick={() => setTabActiva('cierre')}
          >
            🌈 4. Cierre
          </button>
        </nav>
      </header>

      {tabActiva === 'rompehielo' && (
        <RompehieloGrupo
          usuarioActual={usuarioActual}
          estudiantes={estudiantes}
          onActualizarPerfil={handleActualizarPerfil}
          onIrAEscribir={handleIrAEscribir}
        />
      )}

      {tabActiva === 'escribir' && (
        <FormularioReconocimiento
          estudiantes={estudiantes}
          usuarioActual={usuarioActual}
          destinatarioPreseleccionado={destinatarioPreseleccionado}
          destinatariosFirmados={destinatariosFirmados}
          onEnviarMensaje={handleEnviarMensaje}
        />
      )}

      {tabActiva === 'buzon' && (
        <BuzonNotas
          usuarioActual={usuarioActual}
          misMensajes={misMensajes}
          mensajesDestacados={mensajesDestacados}
          cargandoInicial={cargandoInicialBuzon}
          onRecargarBuzon={cargarMiBuzon}
          onToggleDestacar={handleToggleDestacar}
        />
      )}

      {tabActiva === 'cierre' && (
        <CierreGrupal
          usuarioActual={usuarioActual}
          estudiantes={estudiantes}
          onGuardarPalabra={(palabraCierre) => handleActualizarPerfil({ palabraCierre })}
        />
      )}
    </main>
  );
}

export default App;

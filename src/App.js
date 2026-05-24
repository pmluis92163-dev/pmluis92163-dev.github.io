import React, { useState, useEffect } from 'react';
import { LogOut, ChevronLeft } from 'lucide-react';

const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/pmluis92163-dev/pmluis92163-dev.github.io/main';

export default function QuizApp() {
  const [modo, setModo] = useState('login');
  const [email, setEmail] = useState('');
  const [clave, setClaveInput] = useState('');
  const [estudianteAutenticado, setEstudianteAutenticado] = useState(null);
  const [colegios, setColegios] = useState([]);
  const [colegioSeleccionado, setColegioSeleccionado] = useState(null);
  const [nivelSeleccionado, setNivelSeleccionado] = useState(null);
  const [areaSeleccionada, setAreaSeleccionada] = useState(null);
  const [quizSeleccionado, setQuizSeleccionado] = useState(null);
  const [preguntasGeneradas, setPreguntasGeneradas] = useState([]);
  const [respuestasEstudiante, setRespuestasEstudiante] = useState({});
  const [respuestas, setRespuestas] = useState(() => {
    const saved = localStorage.getItem('respuestas');
    return saved ? JSON.parse(saved) : {};
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [credenciales, setCredenciales] = useState([]);

  // Cargar credenciales de GitHub
  useEffect(() => {
    const cargarCredenciales = async () => {
      try {
        const response = await fetch(`${GITHUB_RAW_URL}/credenciales.json`);
        if (!response.ok) throw new Error('No se pudo cargar credenciales');
        const data = await response.json();
        setCredenciales(data.estudiantes || []);
      } catch (err) {
        console.error('Error cargando credenciales:', err);
        setError('Error al cargar el sistema de autenticación');
      }
    };

    cargarCredenciales();
  }, []);

  // Cargar estructura de colegios
  useEffect(() => {
    const cargarColegios = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${GITHUB_RAW_URL}/quizes/index.json`);
        if (!response.ok) throw new Error('No se pudo cargar la estructura');
        const data = await response.json();
        setColegios(data.colegios || []);
      } catch (err) {
        console.error('Error cargando colegios:', err);
      } finally {
        setLoading(false);
      }
    };

    if (estudianteAutenticado) {
      cargarColegios();
    }
  }, [estudianteAutenticado]);

  // Guardar respuestas en localStorage
  useEffect(() => {
    localStorage.setItem('respuestas', JSON.stringify(respuestas));
  }, [respuestas]);

  // Validar login
  const validarLogin = () => {
    if (!email.trim()) {
      setError('Por favor ingresa tu email');
      return;
    }
    if (!clave.trim()) {
      setError('Por favor ingresa tu clave');
      return;
    }

    const estudiante = credenciales.find(
      est => est.email === email && est.clave === clave
    );

    if (!estudiante) {
      setError('Email o clave incorrectos');
      return;
    }

    setEstudianteAutenticado(estudiante);
    setError(null);
    setModo('inicio');
    setEmail('');
    setClaveInput('');
  };

  // Función para evaluar expresiones matemáticas
  const evaluarTemplate = (template, variables) => {
    let resultado = template;
    Object.keys(variables).forEach(key => {
      const value = variables[key];
      resultado = resultado.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    resultado = resultado.replace(/{{(.+?)}}/g, (match, expr) => {
      try {
        if (!/^[0-9+\-*/.() ]*$/.test(expr)) {
          return match;
        }
        // eslint-disable-next-line no-new-func
        const resul = new Function('return ' + expr)();
        return Math.round(resul * 100) / 100;
      } catch (e) {
        return match;
      }
    });

    return resultado;
  };

  // Generar variables aleatorias
  const generarVariables = (variables) => {
    const generadas = {};
    Object.keys(variables).forEach(key => {
      const config = variables[key];
      generadas[key] = Math.floor(Math.random() * (config.max - config.min + 1)) + config.min;
    });
    return generadas;
  };

  // Generar preguntas del quiz
  const generarPreguntasQuiz = (quiz) => {
    return quiz.preguntas.map((pregunta, idx) => {
      const variables = generarVariables(pregunta.variables || {});
      return {
        id: idx,
        pregunta: evaluarTemplate(pregunta.template, variables),
        opciones: pregunta.opciones.map(opt => evaluarTemplate(opt, variables)),
        respuesta_correcta: pregunta.respuesta_correcta,
        template: pregunta
      };
    });
  };

  // Cargar quices de un nivel
  const cargarQuicesNivel = async (colegio, nivel) => {
    try {
      setLoading(true);
      const archivo = nivel.archivo;
      const rutaArchivo = `${GITHUB_RAW_URL}/quizes/${colegio.carpeta}/${archivo}`;
      const response = await fetch(rutaArchivo);
      if (!response.ok) throw new Error('No se pudo cargar el nivel');
      const data = await response.json();
      return data.areas || [];
    } catch (err) {
      setError('Error al cargar quices: ' + err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // PANTALLA: Login
  if (modo === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-8 px-4">
            <div className="space-y-3">
              <h1 className="text-6xl font-bold">QuizMaster</h1>
              <p className="text-slate-400 text-lg">Ingresa tus credenciales para acceder</p>
            </div>

            <div className="bg-slate-800 rounded-lg shadow-xl p-8 max-w-md w-full space-y-6">
              {error && (
                <div className="bg-red-500 text-white p-4 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-left text-slate-300 font-semibold">Email</label>
                <input
                  type="email"
                  placeholder="tu.email@gmail.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && validarLogin()}
                  className="w-full px-4 py-3 border-2 border-slate-600 rounded-lg focus:border-emerald-600 focus:outline-none text-slate-900"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-left text-slate-300 font-semibold">Clave</label>
                <input
                  type="password"
                  placeholder="Tu clave"
                  value={clave}
                  onChange={(e) => {
                    setClaveInput(e.target.value);
                    setError(null);
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && validarLogin()}
                  className="w-full px-4 py-3 border-2 border-slate-600 rounded-lg focus:border-emerald-600 focus:outline-none text-slate-900"
                />
              </div>

              <button
                onClick={validarLogin}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition"
              >
                Ingresar
              </button>

              <p className="text-slate-400 text-sm">
                Si no tienes credenciales, contacta con tu profesor
              </p>
            </div>

            <div className="text-slate-500 text-sm">
              <p>✅ Acceso seguro • ✅ Quices dinámicos • ✅ Reportes en tiempo real</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PANTALLA: Inicio (después de autenticarse)
  if (modo === 'inicio' && estudianteAutenticado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <nav className="bg-slate-800 p-4 shadow-lg flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">QuizMaster</h1>
            <p className="text-sm text-slate-400">Bienvenido, {estudianteAutenticado.nombre}</p>
          </div>
          <button
            onClick={() => {
              setEstudianteAutenticado(null);
              setModo('login');
              setColegioSeleccionado(null);
              setNivelSeleccionado(null);
              setAreaSeleccionada(null);
              setQuizSeleccionado(null);
            }}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
          >
            <LogOut size={20} /> Salir
          </button>
        </nav>

        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center space-y-6 px-4">
            <p className="text-slate-300 text-lg">Selecciona un colegio para comenzar</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {colegios.map((colegio) => (
                <button
                  key={colegio.id}
                  onClick={() => {
                    setColegioSeleccionado(colegio);
                    setModo('seleccionar-nivel');
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 px-8 py-4 rounded-lg font-semibold text-lg transition transform hover:scale-105"
                >
                  {colegio.nombre}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PANTALLA: Seleccionar Nivel
  if (modo === 'seleccionar-nivel' && colegioSeleccionado && estudianteAutenticado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-slate-800">{colegioSeleccionado.nombre}</h1>
            <p className="text-slate-500">Selecciona tu Nivel</p>
          </div>

          {loading && <p className="text-center text-slate-600">Cargando...</p>}

          <div className="grid grid-cols-1 gap-3">
            {colegioSeleccionado.niveles.map((nivel) => (
              <button
                key={nivel.id}
                onClick={async () => {
                  setNivelSeleccionado(nivel);
                  const areas = await cargarQuicesNivel(colegioSeleccionado, nivel);
                  setAreaSeleccionada({ areas });
                  setModo('seleccionar-area');
                }}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-lg transition text-left px-6"
              >
                {nivel.nombre}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setColegioSeleccionado(null);
              setModo('inicio');
            }}
            className="w-full bg-slate-300 hover:bg-slate-400 text-slate-800 font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
          >
            <ChevronLeft size={20} /> Atrás
          </button>
        </div>
      </div>
    );
  }

  // PANTALLA: Seleccionar Área
  if (modo === 'seleccionar-area' && areaSeleccionada && nivelSeleccionado && estudianteAutenticado) {
    const areas = areaSeleccionada.areas;

    if (areas.length === 0) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full text-center space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">No hay quices disponibles</h1>
            <p className="text-slate-600">Vuelve más tarde, el profesor está agregando quices.</p>
            <button
              onClick={() => {
                setAreaSeleccionada(null);
                setModo('seleccionar-nivel');
              }}
              className="w-full bg-slate-300 hover:bg-slate-400 text-slate-800 font-bold py-3 rounded-lg transition"
            >
              Volver
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-slate-800">{nivelSeleccionado.nombre}</h1>
            <p className="text-slate-500">Selecciona el Área</p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {areas.map((area) => (
              <button
                key={area.id}
                onClick={() => {
                  setAreaSeleccionada(area);
                  if (area.quices && area.quices.length > 0) {
                    setModo('seleccionar-quiz');
                  }
                }}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-lg transition text-left px-6"
              >
                {area.nombre}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setNivelSeleccionado(null);
              setAreaSeleccionada(null);
              setModo('seleccionar-nivel');
            }}
            className="w-full bg-slate-300 hover:bg-slate-400 text-slate-800 font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
          >
            <ChevronLeft size={20} /> Atrás
          </button>
        </div>
      </div>
    );
  }

  // PANTALLA: Seleccionar Quiz
  if (modo === 'seleccionar-quiz' && areaSeleccionada && typeof areaSeleccionada === 'object' && areaSeleccionada.quices && estudianteAutenticado) {
    const quices = areaSeleccionada.quices;

    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-slate-800">{areaSeleccionada.nombre}</h1>
            <p className="text-slate-500">Selecciona un Quiz</p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {quices.map((quiz) => (
              <button
                key={quiz.id}
                onClick={() => {
                  setQuizSeleccionado(quiz);
                  const preguntasGen = generarPreguntasQuiz(quiz);
                  setPreguntasGeneradas(preguntasGen);
                  setRespuestasEstudiante({});
                  setModo('respondiendo');
                }}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-lg transition text-left px-6"
              >
                {quiz.titulo}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setAreaSeleccionada(null);
              setNivelSeleccionado(null);
              setModo('seleccionar-nivel');
            }}
            className="w-full bg-slate-300 hover:bg-slate-400 text-slate-800 font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
          >
            <ChevronLeft size={20} /> Atrás
          </button>
        </div>
      </div>
    );
  }

  // PANTALLA: Respondiendo Quiz
  if (modo === 'respondiendo' && quizSeleccionado && preguntasGeneradas.length > 0 && estudianteAutenticado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">{quizSeleccionado.titulo}</h1>
                <p className="text-sm text-slate-500">{areaSeleccionada.nombre} • {nivelSeleccionado.nombre}</p>
              </div>
              <button
                onClick={() => {
                  setModo('seleccionar-quiz');
                  setQuizSeleccionado(null);
                  setPreguntasGeneradas([]);
                }}
                className="text-slate-500 hover:text-slate-700 text-2xl"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {preguntasGeneradas.map((pregunta, idx) => (
              <div key={idx} className="bg-white rounded-lg shadow-md p-6 space-y-3">
                <p className="font-bold text-lg text-slate-800">
                  {idx + 1}. {pregunta.pregunta}
                </p>

                <div className="space-y-2">
                  {pregunta.opciones.map((opcion, opIdx) => (
                    <label key={opIdx} className="flex items-center gap-3 p-3 border-2 border-slate-200 rounded-lg hover:border-emerald-600 hover:bg-emerald-50 cursor-pointer transition">
                      <input
                        type="radio"
                        name={`pregunta_${idx}`}
                        value={opIdx}
                        checked={respuestasEstudiante[idx] === opIdx}
                        onChange={(e) => setRespuestasEstudiante({
                          ...respuestasEstudiante,
                          [idx]: parseInt(e.target.value)
                        })}
                        className="w-5 h-5 text-emerald-600"
                      />
                      <span className="text-slate-700">{opcion}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              const respuestasArray = preguntasGeneradas.map((_, idx) =>
                respuestasEstudiante[idx] !== undefined ? respuestasEstudiante[idx] : -1
              );

              if (respuestasArray.includes(-1)) {
                alert('❌ Debes responder todas las preguntas');
                return;
              }

              let correctas = 0;
              respuestasArray.forEach((resp, idx) => {
                if (resp === preguntasGeneradas[idx].respuesta_correcta) correctas++;
              });
              const porcentaje = Math.round((correctas / preguntasGeneradas.length) * 100);

              const clave = `${colegioSeleccionado.nombre} • ${nivelSeleccionado.nombre} • ${areaSeleccionada.nombre} • ${quizSeleccionado.titulo}`;
              const nuevasRespuestas = { ...respuestas };
              if (!nuevasRespuestas[clave]) {
                nuevasRespuestas[clave] = {};
              }
              nuevasRespuestas[clave][estudianteAutenticado.email] = {
                nombre: estudianteAutenticado.nombre,
                email: estudianteAutenticado.email,
                correctas,
                total: preguntasGeneradas.length,
                porcentaje,
                fecha: new Date().toLocaleString()
              };
              setRespuestas(nuevasRespuestas);

              setModo('resultado');
            }}
            className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-lg text-lg transition"
          >
            📤 Enviar Quiz
          </button>
        </div>
      </div>
    );
  }

  // PANTALLA: Resultado
  if (modo === 'resultado' && estudianteAutenticado) {
    const respuestasArray = Object.values(respuestasEstudiante);
    let correctas = 0;
    respuestasArray.forEach((resp, idx) => {
      if (resp === preguntasGeneradas[idx].respuesta_correcta) correctas++;
    });
    const porcentaje = Math.round((correctas / preguntasGeneradas.length) * 100);

    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-emerald-600 mb-2">¡Listo!</h1>
            <p className="text-slate-600">Tu quiz ha sido enviado correctamente</p>
          </div>

          <div className="bg-gradient-to-r from-emerald-100 to-blue-100 rounded-lg p-6">
            <p className="text-sm text-slate-600 mb-2">Tu calificación</p>
            <p className="text-5xl font-bold text-emerald-600">{porcentaje}%</p>
            <p className="text-slate-600 mt-2">{correctas} de {preguntasGeneradas.length} correctas</p>
          </div>

          <button
            onClick={() => {
              setModo('inicio');
              setColegioSeleccionado(null);
              setNivelSeleccionado(null);
              setAreaSeleccionada(null);
              setQuizSeleccionado(null);
              setPreguntasGeneradas([]);
              setRespuestasEstudiante({});
            }}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition"
          >
            ← Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  return null;
}

import React, { useState, useEffect } from 'react';
import { LogOut, ChevronLeft, Download, Eye, EyeOff } from 'lucide-react';

const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/pmluis92163-dev/pmluis92163-dev.github.io/main';
const CONTRASENA_PROFESOR = 'admin123'; // Cambiar esta contraseña

export default function QuizApp() {
  const [modo, setModo] = useState('seleccionar-rol');
  const [email, setEmail] = useState('');
  const [clave, setClaveInput] = useState('');
  const [contrasenaProfesor, setContrasenaProfesor] = useState('');
  const [estudianteAutenticado, setEstudianteAutenticado] = useState(null);
  const [profesorAutenticado, setProfesorAutenticado] = useState(false);
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
  const [credenciales, setCredenciales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mostrarContrasena, setMostrarContrasena] = useState(false);

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

    if (estudianteAutenticado || profesorAutenticado) {
      cargarColegios();
    }
  }, [estudianteAutenticado, profesorAutenticado]);

  // Guardar respuestas en localStorage
  useEffect(() => {
    localStorage.setItem('respuestas', JSON.stringify(respuestas));
  }, [respuestas]);

  // Validar login estudiante
  const validarLoginEstudiante = () => {
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

  // Validar login profesor
  const validarLoginProfesor = () => {
    if (!contrasenaProfesor.trim()) {
      setError('Por favor ingresa la contraseña');
      return;
    }

    if (contrasenaProfesor !== CONTRASENA_PROFESOR) {
      setError('Contraseña incorrecta');
      return;
    }

    setProfesorAutenticado(true);
    setError(null);
    setModo('dashboard-profesor');
    setContrasenaProfesor('');
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

  // Descargar CSV
  const descargarCSV = () => {
    let csv = 'Colegio,Nivel,Área,Quiz,Email,Nombre,Correctas,Total,Porcentaje,Fecha\n';

    Object.entries(respuestas).forEach(([quizInfo, estudiantes]) => {
      Object.entries(estudiantes).forEach(([email, datos]) => {
        csv += `"${quizInfo}","${email}","${datos.nombre}",${datos.correctas},${datos.total},"${datos.porcentaje}%","${datos.fecha}"\n`;
      });
    });

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', `resultados_quices_${new Date().toISOString().split('T')[0]}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // ============ PANTALLA: Seleccionar Rol ============
  if (modo === 'seleccionar-rol') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-8 px-4">
            <div className="space-y-3">
              <h1 className="text-6xl font-bold">QuizMaster</h1>
              <p className="text-slate-400 text-lg">¿Cuál es tu rol?</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              <button
                onClick={() => {
                  setModo('login-estudiante');
                  setError(null);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 px-8 py-4 rounded-lg font-semibold text-lg transition transform hover:scale-105"
              >
                👨‍🎓 Soy Estudiante
              </button>
              <button
                onClick={() => {
                  setModo('login-profesor');
                  setError(null);
                }}
                className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-lg font-semibold text-lg transition transform hover:scale-105"
              >
                👨‍🏫 Soy Profesor
              </button>
            </div>

            <div className="text-slate-500 text-sm">
              <p>✅ Sin instalación • ✅ Resultados automáticos • ✅ Ilimitado</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============ PANTALLA: Login Estudiante ============
  if (modo === 'login-estudiante') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-8 px-4">
            <div className="space-y-3">
              <h1 className="text-6xl font-bold">QuizMaster</h1>
              <p className="text-slate-400 text-lg">Ingresa tus credenciales</p>
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
                  onKeyPress={(e) => e.key === 'Enter' && validarLoginEstudiante()}
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
                  onKeyPress={(e) => e.key === 'Enter' && validarLoginEstudiante()}
                  className="w-full px-4 py-3 border-2 border-slate-600 rounded-lg focus:border-emerald-600 focus:outline-none text-slate-900"
                />
              </div>

              <button
                onClick={validarLoginEstudiante}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition"
              >
                Ingresar
              </button>

              <button
                onClick={() => {
                  setModo('seleccionar-rol');
                  setEmail('');
                  setClaveInput('');
                  setError(null);
                }}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg transition"
              >
                ← Atrás
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============ PANTALLA: Login Profesor ============
  if (modo === 'login-profesor') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-8 px-4">
            <div className="space-y-3">
              <h1 className="text-6xl font-bold">QuizMaster</h1>
              <p className="text-slate-400 text-lg">Panel de Profesor</p>
            </div>

            <div className="bg-slate-800 rounded-lg shadow-xl p-8 max-w-md w-full space-y-6">
              {error && (
                <div className="bg-red-500 text-white p-4 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-left text-slate-300 font-semibold">Contraseña</label>
                <div className="relative">
                  <input
                    type={mostrarContrasena ? 'text' : 'password'}
                    placeholder="Contraseña del profesor"
                    value={contrasenaProfesor}
                    onChange={(e) => {
                      setContrasenaProfesor(e.target.value);
                      setError(null);
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && validarLoginProfesor()}
                    className="w-full px-4 py-3 border-2 border-slate-600 rounded-lg focus:border-blue-600 focus:outline-none text-slate-900"
                  />
                  <button
                    onClick={() => setMostrarContrasena(!mostrarContrasena)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                  >
                    {mostrarContrasena ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                onClick={validarLoginProfesor}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition"
              >
                Ingresar
              </button>

              <button
                onClick={() => {
                  setModo('seleccionar-rol');
                  setContrasenaProfesor('');
                  setError(null);
                }}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg transition"
              >
                ← Atrás
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============ PANTALLA: Dashboard Profesor ============
  if (modo === 'dashboard-profesor' && profesorAutenticado) {
    const quicesUnicos = Object.keys(respuestas);
    const totalRespuestas = Object.values(respuestas).reduce((sum, quiz) => sum + Object.keys(quiz).length, 0);
    const promedio = totalRespuestas > 0 
      ? Math.round(
          Object.values(respuestas)
            .flatMap(quiz => Object.values(quiz))
            .reduce((sum, est) => sum + est.porcentaje, 0) / totalRespuestas
        )
      : 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
        <nav className="bg-blue-600 text-white p-4 shadow-lg flex justify-between items-center">
          <h1 className="text-2xl font-bold">📊 Panel de Profesor</h1>
          <button
            onClick={() => {
              setProfesorAutenticado(false);
              setModo('seleccionar-rol');
              setRespuestas({});
            }}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded"
          >
            <LogOut size={20} /> Salir
          </button>
        </nav>

        <div className="max-w-6xl mx-auto p-6 space-y-8">
          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-slate-600 text-sm">Quices Realizados</p>
              <p className="text-4xl font-bold text-blue-600">{quicesUnicos.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-slate-600 text-sm">Total Respuestas</p>
              <p className="text-4xl font-bold text-emerald-600">{totalRespuestas}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-slate-600 text-sm">Promedio General</p>
              <p className="text-4xl font-bold text-purple-600">{promedio}%</p>
            </div>
          </div>

          {/* Botón Descargar CSV */}
          <button
            onClick={descargarCSV}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-lg text-lg transition flex items-center justify-center gap-3"
          >
            <Download size={24} /> Descargar Todos los Resultados (CSV)
          </button>

          {/* Reportes por Quiz */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-800">Reportes Detallados</h2>

            {quicesUnicos.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center text-slate-500">
                <p>No hay datos aún. Los estudiantes comenzarán a responder quices.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {quicesUnicos.map((quizInfo, idx) => {
                  const resultadosQuiz = respuestas[quizInfo];
                  const estudiantes = Object.entries(resultadosQuiz);
                  const promedioQuiz = Math.round(
                    estudiantes.reduce((sum, [_, datos]) => sum + datos.porcentaje, 0) / estudiantes.length
                  );

                  return (
                    <div key={idx} className="bg-white rounded-lg shadow-md p-6 space-y-4">
                      <div className="border-b pb-4">
                        <h3 className="text-xl font-bold text-slate-800">{quizInfo}</h3>
                        <div className="flex gap-4 mt-2">
                          <span className="text-sm text-slate-600">
                            Respuestas: <span className="font-bold">{estudiantes.length}</span>
                          </span>
                          <span className="text-sm text-slate-600">
                            Promedio: <span className="font-bold text-emerald-600">{promedioQuiz}%</span>
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-100">
                              <th className="text-left p-2">Email</th>
                              <th className="text-left p-2">Nombre</th>
                              <th className="text-center p-2">Respuestas</th>
                              <th className="text-center p-2">Porcentaje</th>
                              <th className="text-left p-2">Fecha</th>
                            </tr>
                          </thead>
                          <tbody>
                            {estudiantes.map(([email, datos], eidx) => (
                              <tr key={eidx} className="border-b hover:bg-slate-50">
                                <td className="p-2 text-slate-700">{email}</td>
                                <td className="p-2 text-slate-700">{datos.nombre}</td>
                                <td className="p-2 text-center text-slate-700">
                                  {datos.correctas}/{datos.total}
                                </td>
                                <td className={`p-2 text-center font-bold ${
                                  datos.porcentaje >= 70 ? 'text-emerald-600' : 'text-orange-600'
                                }`}>
                                  {datos.porcentaje}%
                                </td>
                                <td className="p-2 text-slate-500 text-xs">{datos.fecha}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============ PANTALLA: Inicio Estudiante ============
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
              setModo('seleccionar-rol');
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

  // ============ PANTALLA: Seleccionar Nivel ============
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

  // ============ PANTALLA: Seleccionar Área ============
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

  // ============ PANTALLA: Seleccionar Quiz ============
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

  // ============ PANTALLA: Respondiendo Quiz ============
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

  // ============ PANTALLA: Resultado ============
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

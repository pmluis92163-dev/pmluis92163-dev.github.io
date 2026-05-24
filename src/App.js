import React, { useState, useEffect } from 'react';
import { LogOut, ChevronLeft, Download, Eye, EyeOff } from 'lucide-react';

const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/pmluis92163-dev/pmluis92163-dev.github.io/main';
const GITHUB_API_URL = 'https://api.github.com/repos/pmluis92163-dev/pmluis92163-dev.github.io/contents';
const CONTRASENA_PROFESOR = 'admin123';

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
  const [areas, setAreas] = useState([]);
  const [areaSeleccionada, setAreaSeleccionada] = useState(null);
  const [quices, setQuices] = useState([]);
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
  const [configColegio, setConfigColegio] = useState(null);

  // Cargar credenciales
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

  // Cargar colegios
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
        setError('Error al cargar colegios');
      } finally {
        setLoading(false);
      }
    };
    cargarColegios();
  }, []);

  // Guardar respuestas
  useEffect(() => {
    localStorage.setItem('respuestas', JSON.stringify(respuestas));
  }, [respuestas]);

  // Cargar config del colegio
  const cargarConfigColegio = async (colegio) => {
    try {
      const response = await fetch(`${GITHUB_RAW_URL}/quizes/${colegio.carpeta}/config.json`);
      if (!response.ok) throw new Error('No se pudo cargar config');
      const data = await response.json();
      setConfigColegio(data);
    } catch (err) {
      setConfigColegio({ max_intentos: 1 });
    }
  };

  // Leer carpetas de áreas dinámicamente
  const cargarAreas = async (colegio, nivel) => {
    try {
      setLoading(true);
      const rutaAreas = `${GITHUB_API_URL}/quizes/${colegio.carpeta}/${nivel.carpeta}`;
      const response = await fetch(rutaAreas);
      if (!response.ok) throw new Error('No se pudieron cargar áreas');
      const items = await response.json();
      
      const areasArray = items
        .filter(item => item.type === 'dir')
        .map(item => ({ nombre: item.name, carpeta: item.name }));
      
      setAreas(areasArray);
      return areasArray;
    } catch (err) {
      console.error('Error cargando áreas:', err);
      setAreas([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Leer quices dinámicamente
  const cargarQuices = async (colegio, nivel, area) => {
    try {
      setLoading(true);
      const rutaQuices = `${GITHUB_API_URL}/quizes/${colegio.carpeta}/${nivel.carpeta}/${area.carpeta}`;
      const response = await fetch(rutaQuices);
      if (!response.ok) throw new Error('No se pudieron cargar quices');
      const items = await response.json();
      
      const quicesArray = [];
      for (const item of items) {
        if (item.type === 'file' && item.name.endsWith('.json')) {
          try {
            const quizResponse = await fetch(item.download_url);
            const quizData = await quizResponse.json();
            quicesArray.push({
              ...quizData,
              archivo: item.name
            });
          } catch (e) {
            console.error('Error cargando quiz:', item.name, e);
          }
        }
      }
      
      setQuices(quicesArray);
      return quicesArray;
    } catch (err) {
      console.error('Error cargando quices:', err);
      setQuices([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Validar login
  const validarLoginEstudiante = () => {
    if (!email.trim() || !clave.trim()) {
      setError('Por favor completa todos los campos');
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

  // Evaluar template
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

  const generarVariables = (variables) => {
    const generadas = {};
    Object.keys(variables).forEach(key => {
      const config = variables[key];
      generadas[key] = Math.floor(Math.random() * (config.max - config.min + 1)) + config.min;
    });
    return generadas;
  };

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

  // Validar si quiz está habilitado
  const estaHabilitado = (quiz) => {
    if (quiz.habilitado === false) return false;
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    if (quiz.fecha_inicio) {
      const inicio = new Date(quiz.fecha_inicio);
      inicio.setHours(0, 0, 0, 0);
      if (hoy < inicio) return false;
    }
    
    if (quiz.fecha_fin) {
      const fin = new Date(quiz.fecha_fin);
      fin.setHours(23, 59, 59, 999);
      if (hoy > fin) return false;
    }
    
    return true;
  };

  // Descargar CSV
  const descargarCSV = () => {
    let csv = 'Colegio,Nivel,Área,Quiz,Email,Nombre,Correctas,Total,Porcentaje,Fecha\n';

    Object.entries(respuestas).forEach(([quizInfo, estudiantes]) => {
      Object.entries(estudiantes).forEach(([, datos]) => {
        csv += `"${quizInfo}","${datos.email}","${datos.nombre}",${datos.correctas},${datos.total},"${datos.porcentaje}%","${datos.fecha}"\n`;
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
              <h1 className="text-6xl font-bold">Quices de Prof Luis</h1>
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
              <h1 className="text-6xl font-bold">Quices Prof Luis</h1>
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
              <h1 className="text-6xl font-bold">Quices Prof Luis</h1>
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
            }}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded"
          >
            <LogOut size={20} /> Salir
          </button>
        </nav>

        <div className="max-w-6xl mx-auto p-6 space-y-8">
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

          <button
            onClick={descargarCSV}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-lg text-lg transition flex items-center justify-center gap-3"
          >
            <Download size={24} /> Descargar Todos los Resultados (CSV)
          </button>

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
                            {estudiantes.map(([, datos], eidx) => (
                              <tr key={eidx} className="border-b hover:bg-slate-50">
                                <td className="p-2 text-slate-700">{datos.email}</td>
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
            <h1 className="text-2xl font-bold">Quices Prof Luis</h1>
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
              setAreas([]);
              setQuices([]);
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
                  onClick={async () => {
                    setColegioSeleccionado(colegio);
                    await cargarConfigColegio(colegio);
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
                  await cargarAreas(colegioSeleccionado, nivel);
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
  if (modo === 'seleccionar-area' && nivelSeleccionado && estudianteAutenticado) {
    if (areas.length === 0) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full text-center space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">No hay áreas disponibles</h1>
            <p className="text-slate-600">El profesor está preparando los contenidos.</p>
            <button
              onClick={() => {
                setNivelSeleccionado(null);
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
            {areas.map((area, idx) => (
              <button
                key={idx}
                onClick={async () => {
                  setAreaSeleccionada(area);
                  await cargarQuices(colegioSeleccionado, nivelSeleccionado, area);
                  setModo('seleccionar-quiz');
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
  if (modo === 'seleccionar-quiz' && areaSeleccionada && estudianteAutenticado) {
    if (quices.length === 0) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full text-center space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">No hay quices en esta área</h1>
            <p className="text-slate-600">El profesor está agregando contenidos.</p>
            <button
              onClick={() => {
                setAreaSeleccionada(null);
                setModo('seleccionar-area');
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
            <h1 className="text-3xl font-bold text-slate-800">{areaSeleccionada.nombre}</h1>
            <p className="text-slate-500">Selecciona un Quiz</p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {quices.map((quiz, idx) => {
              const habilitado = estaHabilitado(quiz);
              const clave = `${colegioSeleccionado.nombre} • ${nivelSeleccionado.nombre} • ${areaSeleccionada.nombre} • ${quiz.titulo}`;
              const yaRespondioQuiz = respuestas[clave] && respuestas[clave][estudianteAutenticado.email];
              const debeBloquear = configColegio && configColegio.max_intentos === 1 && yaRespondioQuiz;

              return (
                <div key={idx} className="relative">
                  <button
                    disabled={!habilitado || debeBloquear}
                    onClick={() => {
                      if (!habilitado) {
                        setError('Este quiz no está disponible');
                        return;
                      }
                      if (debeBloquear) {
                        setError('Ya respondiste este quiz');
                        return;
                      }
                      setQuizSeleccionado(quiz);
                      const preguntasGen = generarPreguntasQuiz(quiz);
                      setPreguntasGeneradas(preguntasGen);
                      setRespuestasEstudiante({});
                      setModo('respondiendo');
                    }}
                    className={`w-full font-bold py-4 rounded-lg transition text-left px-6 ${
                      debeBloquear
                        ? 'bg-slate-400 cursor-not-allowed text-slate-600'
                        : !habilitado
                        ? 'bg-slate-400 cursor-not-allowed text-slate-600'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    }`}
                  >
                    {quiz.titulo}
                  </button>
                  {debeBloquear && (
                    <p className="text-xs text-slate-600 mt-1">✓ Ya respondiste (1/1 intento)</p>
                  )}
                  {!habilitado && !debeBloquear && (
                    <p className="text-xs text-slate-600 mt-1">❌ Quiz no disponible</p>
                  )}
                </div>
              );
            })}
          </div>

          {error && (
            <div className="bg-red-100 text-red-700 p-4 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            onClick={() => {
              setAreaSeleccionada(null);
              setModo('seleccionar-area');
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
              setAreas([]);
              setQuices([]);
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

import React, { useState, useEffect } from 'react';
import { LogOut, ChevronLeft, Download, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { InlineMath } from 'react-katex';
import 'katex/dist/katex.css';
import { db } from './firebase-config';
import { collection, doc, setDoc, getDocs } from 'firebase/firestore';

const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/pmluis92163-dev/pmluis92163-dev.github.io/main';
const GITHUB_API_URL = 'https://api.github.com/repos/pmluis92163-dev/pmluis92163-dev.github.io/contents';
const CONTRASENA_PROFESOR = 'admin123';

// Función para renderizar texto con LaTeX
const renderLatexText = (texto) => {
  if (!texto) return null;

  const partes = texto.split(/(\$.*?\$)/g);

  return partes.map((parte, idx) => {
    if (parte.startsWith('$') && parte.endsWith('$')) {
      return (
        <InlineMath
          key={idx}
          math={parte.slice(1, -1)}
        />
      );
    }

    return <span key={idx}>{parte}</span>;
  });
};

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
  const [respuestas, setRespuestas] = useState({});
  const [credenciales, setCredenciales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [configColegio, setConfigColegio] = useState(null);
  const [resultadoDetallado, setResultadoDetallado] = useState(null);

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

  // Cargar respuestas desde Firebase
  const cargarRespuestasFirebase = async () => {
    try {
      const respuestasRef = collection(db, 'respuestas');
      const querySnapshot = await getDocs(respuestasRef);
      const respuestasData = {};
      
      for (const docSnap of querySnapshot.docs) {
        const quizKey = docSnap.id;
        const estudiantesRef = collection(db, 'respuestas', quizKey, 'estudiantes');
        const estudiantesSnapshot = await getDocs(estudiantesRef);
        
        respuestasData[quizKey] = {};
        estudiantesSnapshot.forEach(estudianteDoc => {
          respuestasData[quizKey][estudianteDoc.id] = estudianteDoc.data();
        });
      }
      
      setRespuestas(respuestasData);
    } catch (err) {
      console.error('Error cargando respuestas de Firebase:', err);
    }
  };

  // Cargar respuestas al iniciar sesión como admin
  useEffect(() => {
    if (profesorAutenticado) {
      cargarRespuestasFirebase();
    }
  }, [profesorAutenticado]);

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

    // Reemplazar todas las expresiones {{...}} (simples y compuestas)
    resultado = resultado.replace(/{{(.+?)}}/g, (match, expr) => {
      // Sustituir cada variable dentro de la expresión por su valor
      let expresionEvaluada = expr;
      Object.keys(variables).forEach(key => {
        expresionEvaluada = expresionEvaluada.replace(
          new RegExp(`\\b${key}\\b`, 'g'), variables[key]
        );
      });
      try {
        // eslint-disable-next-line no-eval
        const result = eval(expresionEvaluada);
        return result;
      } catch {
        return match;
      }
    });

    return resultado;
};

  // Generar valores aleatorios
  const generarVariables = (variables) => {
    const resultado = {};
    Object.keys(variables).forEach(key => {
      const { min, max } = variables[key];
      resultado[key] = Math.floor(Math.random() * (max - min + 1)) + min;
    });
    return resultado;
  };

  // Generar preguntas del quiz
  const generarPreguntasQuiz = (quiz) => {
    return quiz.preguntas.map(pregunta => {
      const variables = generarVariables(pregunta.variables || {});
      const preguntaTexto = evaluarTemplate(pregunta.template, variables);
      const opciones = pregunta.opciones.map(opcion => evaluarTemplate(opcion, variables));

      return {
        pregunta: preguntaTexto,
        opciones,
        respuesta_correcta: pregunta.respuesta_correcta,
        imagen: pregunta.imagen || null // Soporte para imágenes
      };
    });
  };

  // Validar si el quiz está habilitado
  const estaHabilitado = (quiz) => {
    if (!quiz.habilitado) return false;
    const ahora = new Date();
    const inicio = new Date(quiz.fecha_inicio);
    const fin = new Date(quiz.fecha_fin);
    return ahora >= inicio && ahora <= fin;
  };

  // Guardar respuestas en Firebase
  const guardarRespuestaFirebase = async (clave, emailEstudiante, datosRespuesta) => {
    try {
      const respuestaRef = doc(db, 'respuestas', clave, 'estudiantes', emailEstudiante);
      await setDoc(respuestaRef, datosRespuesta);
      console.log('Respuesta guardada en Firebase');
    } catch (err) {
      console.error('Error guardando respuesta en Firebase:', err);
      alert('Error al guardar la respuesta. Intenta de nuevo.');
    }
  };

  // Cerrar sesión
  const cerrarSesion = () => {
    setEstudianteAutenticado(null);
    setProfesorAutenticado(false);
    setModo('seleccionar-rol');
    setColegioSeleccionado(null);
    setNivelSeleccionado(null);
    setAreaSeleccionada(null);
    setQuizSeleccionado(null);
    setPreguntasGeneradas([]);
    setRespuestasEstudiante({});
    setAreas([]);
    setQuices([]);
    setResultadoDetallado(null);
  };

  // Descargar CSV de resultados
  const descargarCSV = (clave) => {
    const datos = respuestas[clave];
    if (!datos) return;

    let csv = 'Nombre,Email,Correctas,Total,Porcentaje,Fecha\n';
    Object.values(datos).forEach(resp => {
      csv += `${resp.nombre},${resp.email},${resp.correctas},${resp.total},${resp.porcentaje}%,${resp.fecha}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resultados-${clave.replace(/\s+/g, '-')}.csv`;
    a.click();
  };

  // ============ PANTALLA: Seleccionar Rol ============
  if (modo === 'seleccionar-rol') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full space-y-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-slate-800 mb-2">Sistema de Quices</h1>
            <p className="text-slate-600">Selecciona cómo deseas continuar</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setModo('login-estudiante')}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-lg transition text-lg"
            >
              👨‍🎓 Soy Estudiante
            </button>

            <button
              onClick={() => setModo('login-profesor')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg transition text-lg"
            >
              👨‍🏫 Soy Profesor
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============ PANTALLA: Login Estudiante ============
  if (modo === 'login-estudiante') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Iniciar Sesión</h1>
            <p className="text-slate-600">Estudiante</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-emerald-500 focus:outline-none"
                placeholder="estudiante@ejemplo.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Clave</label>
              <div className="relative">
                <input
                  type={mostrarContrasena ? 'text' : 'password'}
                  value={clave}
                  onChange={(e) => setClaveInput(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-emerald-500 focus:outline-none pr-12"
                  placeholder="••••••"
                />
                <button
                  type="button"
                  onClick={() => setMostrarContrasena(!mostrarContrasena)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700"
                >
                  {mostrarContrasena ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-100 text-red-700 p-4 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            onClick={validarLoginEstudiante}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition"
          >
            Ingresar
          </button>

          <button
            onClick={() => {
              setModo('seleccionar-rol');
              setError(null);
            }}
            className="w-full bg-slate-300 hover:bg-slate-400 text-slate-800 font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
          >
            <ChevronLeft size={20} /> Atrás
          </button>
        </div>
      </div>
    );
  }

  // ============ PANTALLA: Login Profesor ============
  if (modo === 'login-profesor') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Iniciar Sesión</h1>
            <p className="text-slate-600">Profesor</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Contraseña de Administrador</label>
              <div className="relative">
                <input
                  type={mostrarContrasena ? 'text' : 'password'}
                  value={contrasenaProfesor}
                  onChange={(e) => setContrasenaProfesor(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none pr-12"
                  placeholder="••••••"
                />
                <button
                  type="button"
                  onClick={() => setMostrarContrasena(!mostrarContrasena)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700"
                >
                  {mostrarContrasena ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-100 text-red-700 p-4 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            onClick={validarLoginProfesor}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition"
          >
            Ingresar
          </button>

          <button
            onClick={() => {
              setModo('seleccionar-rol');
              setError(null);
            }}
            className="w-full bg-slate-300 hover:bg-slate-400 text-slate-800 font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
          >
            <ChevronLeft size={20} /> Atrás
          </button>
        </div>
      </div>
    );
  }

  // ============ PANTALLA: Dashboard Profesor ============
  if (modo === 'dashboard-profesor' && profesorAutenticado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-slate-800">Panel de Administración</h1>
                <p className="text-slate-500">Resultados de los quices</p>
              </div>
              <button
                onClick={cerrarSesion}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
              >
                <LogOut size={20} /> Cerrar Sesión
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-600">Cargando respuestas...</div>
          ) : Object.keys(respuestas).length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-slate-600">
              No hay respuestas registradas aún
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(respuestas).map(([clave, datos]) => (
                <div key={clave} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-slate-800">{clave}</h2>
                    <button
                      onClick={() => descargarCSV(clave)}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
                    >
                      <Download size={18} /> Descargar CSV
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Nombre</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Email</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Calificación</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Fecha</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {Object.values(datos).map((respuesta, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-3 text-sm text-slate-800">{respuesta.nombre}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{respuesta.email}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`font-bold ${respuesta.porcentaje >= 70 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {respuesta.porcentaje}%
                              </span>
                              <span className="text-slate-500 text-xs ml-2">
                                ({respuesta.correctas}/{respuesta.total})
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">{respuesta.fecha}</td>
                            <td className="px-4 py-3 text-sm">
                              {respuesta.respuestasDetalladas && (
                                <button
                                  onClick={() => {
                                    setResultadoDetallado({
                                      ...respuesta,
                                      quizKey: clave
                                    });
                                    setModo('ver-desglose-admin');
                                  }}
                                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs transition"
                                >
                                  Ver Desglose
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============ PANTALLA: Ver Desglose Admin ============
  if (modo === 'ver-desglose-admin' && resultadoDetallado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">{resultadoDetallado.nombre}</h1>
                <p className="text-slate-600">{resultadoDetallado.email}</p>
                <p className="text-sm text-slate-500 mt-1">{resultadoDetallado.quizKey}</p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold text-emerald-600">{resultadoDetallado.porcentaje}%</p>
                <p className="text-sm text-slate-600">{resultadoDetallado.correctas}/{resultadoDetallado.total} correctas</p>
                <p className="text-xs text-slate-500 mt-1">{resultadoDetallado.fecha}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {resultadoDetallado.respuestasDetalladas.map((item, idx) => (
              <div key={idx} className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
                item.correcta ? 'border-emerald-500' : 'border-red-500'
              }`}>
                <div className="flex items-start gap-3 mb-3">
                  {item.correcta ? (
                    <CheckCircle className="text-emerald-500 flex-shrink-0 mt-1" size={24} />
                  ) : (
                    <XCircle className="text-red-500 flex-shrink-0 mt-1" size={24} />
                  )}
                  <div className="flex-1">
                    <p className="font-bold text-lg text-slate-800 leading-relaxed">
                      {idx + 1}. {renderLatexText(item.pregunta)}
                    </p>
                  </div>
                </div>

                {item.imagen && (
                  <img 
                    src={`${GITHUB_RAW_URL}${item.imagen}`} 
                    alt="Imagen de la pregunta"
                    className="my-4 max-w-full h-auto rounded-lg shadow-sm"
                  />
                )}

                <div className="space-y-2 ml-9">
                  {item.opciones.map((opcion, opIdx) => {
                    const esRespuestaUsuario = item.respuestaUsuario === opIdx;
                    const esRespuestaCorrecta = item.respuestaCorrecta === opIdx;

                    return (
                      <div key={opIdx} className={`p-3 rounded-lg border-2 ${
                        esRespuestaCorrecta 
                          ? 'bg-emerald-50 border-emerald-500' 
                          : esRespuestaUsuario 
                          ? 'bg-red-50 border-red-500' 
                          : 'border-slate-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          {esRespuestaCorrecta && <CheckCircle size={18} className="text-emerald-600" />}
                          {esRespuestaUsuario && !esRespuestaCorrecta && <XCircle size={18} className="text-red-600" />}
                          <span className={`${
                            esRespuestaCorrecta 
                              ? 'text-emerald-800 font-medium' 
                              : esRespuestaUsuario 
                              ? 'text-red-800 font-medium' 
                              : 'text-slate-700'
                          }`}>
                            {renderLatexText(opcion)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!item.correcta && (
                  <div className="mt-3 ml-9 bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-800">
                      <strong>Respuesta del estudiante:</strong> {renderLatexText(item.opciones[item.respuestaUsuario])}
                    </p>
                    <p className="text-sm text-emerald-800 mt-1">
                      <strong>Respuesta correcta:</strong> {renderLatexText(item.opciones[item.respuestaCorrecta])}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              setModo('dashboard-profesor');
              setResultadoDetallado(null);
            }}
            className="w-full mt-6 bg-slate-300 hover:bg-slate-400 text-slate-800 font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
          >
            <ChevronLeft size={20} /> Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ============ PANTALLA: Inicio (Estudiante) ============
  if (modo === 'inicio' && estudianteAutenticado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">¡Hola, {estudianteAutenticado.nombre}!</h1>
            <p className="text-slate-600">Selecciona una opción</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setModo('seleccionar-colegio')}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-lg transition text-lg"
            >
              📝 Realizar Quiz
            </button>

            <button
              onClick={async () => {
                await cargarRespuestasFirebase();
                setModo('ver-mis-resultados');
              }}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 rounded-lg transition text-lg"
            >
              📊 Ver Mis Resultados
            </button>
          </div>

          <button
            onClick={cerrarSesion}
            className="w-full bg-slate-300 hover:bg-slate-400 text-slate-800 font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
          >
            <LogOut size={20} /> Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  // ============ PANTALLA: Ver Mis Resultados ============
  if (modo === 'ver-mis-resultados' && estudianteAutenticado) {
    const misRespuestas = Object.entries(respuestas)
      .filter(([clave, datos]) => datos[estudianteAutenticado.email])
      .map(([clave, datos]) => ({
        quiz: clave,
        datos: datos[estudianteAutenticado.email]
      }));

    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Mis Resultados</h1>
            <p className="text-slate-600">{estudianteAutenticado.nombre}</p>
          </div>

          {misRespuestas.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-slate-600">
              No has realizado ningún quiz aún
            </div>
          ) : (
            <div className="space-y-4">
              {misRespuestas.map((item, idx) => (
                <div key={idx} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">{item.quiz}</h2>
                      <p className="text-sm text-slate-500">{item.datos.fecha}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-3xl font-bold ${item.datos.porcentaje >= 70 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {item.datos.porcentaje}%
                      </p>
                      <p className="text-sm text-slate-600">
                        {item.datos.correctas}/{item.datos.total} correctas
                      </p>
                    </div>
                  </div>

                  {item.datos.respuestasDetalladas && (
                    <button
                      onClick={() => {
                        setResultadoDetallado({
                          ...item.datos,
                          quizKey: item.quiz
                        });
                        setModo('ver-desglose-estudiante');
                      }}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded-lg transition"
                    >
                      Ver Desglose Completo
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => setModo('inicio')}
            className="w-full mt-6 bg-slate-300 hover:bg-slate-400 text-slate-800 font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
          >
            <ChevronLeft size={20} /> Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  // ============ PANTALLA: Ver Desglose Estudiante ============
  if (modo === 'ver-desglose-estudiante' && resultadoDetallado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Desglose de Respuestas</h1>
                <p className="text-sm text-slate-500 mt-1">{resultadoDetallado.quizKey}</p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold text-emerald-600">{resultadoDetallado.porcentaje}%</p>
                <p className="text-sm text-slate-600">{resultadoDetallado.correctas}/{resultadoDetallado.total} correctas</p>
                <p className="text-xs text-slate-500 mt-1">{resultadoDetallado.fecha}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {resultadoDetallado.respuestasDetalladas.map((item, idx) => (
              <div key={idx} className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
                item.correcta ? 'border-emerald-500' : 'border-red-500'
              }`}>
                <div className="flex items-start gap-3 mb-3">
                  {item.correcta ? (
                    <CheckCircle className="text-emerald-500 flex-shrink-0 mt-1" size={24} />
                  ) : (
                    <XCircle className="text-red-500 flex-shrink-0 mt-1" size={24} />
                  )}
                  <div className="flex-1">
                    <p className="font-bold text-lg text-slate-800 leading-relaxed">
                      {idx + 1}. {renderLatexText(item.pregunta)}
                    </p>
                  </div>
                </div>

                {item.imagen && (
                  <img 
                    src={`${GITHUB_RAW_URL}${item.imagen}`} 
                    alt="Imagen de la pregunta"
                    className="my-4 max-w-full h-auto rounded-lg shadow-sm"
                  />
                )}

                <div className="space-y-2 ml-9">
                  {item.opciones.map((opcion, opIdx) => {
                    const esRespuestaUsuario = item.respuestaUsuario === opIdx;
                    const esRespuestaCorrecta = item.respuestaCorrecta === opIdx;

                    return (
                      <div key={opIdx} className={`p-3 rounded-lg border-2 ${
                        esRespuestaCorrecta 
                          ? 'bg-emerald-50 border-emerald-500' 
                          : esRespuestaUsuario 
                          ? 'bg-red-50 border-red-500' 
                          : 'border-slate-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          {esRespuestaCorrecta && <CheckCircle size={18} className="text-emerald-600" />}
                          {esRespuestaUsuario && !esRespuestaCorrecta && <XCircle size={18} className="text-red-600" />}
                          <span className={`${
                            esRespuestaCorrecta 
                              ? 'text-emerald-800 font-medium' 
                              : esRespuestaUsuario 
                              ? 'text-red-800 font-medium' 
                              : 'text-slate-700'
                          }`}>
                            {renderLatexText(opcion)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!item.correcta && (
                  <div className="mt-3 ml-9 bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-800">
                      <strong>Tu respuesta:</strong> {renderLatexText(item.opciones[item.respuestaUsuario])}
                    </p>
                    <p className="text-sm text-emerald-800 mt-1">
                      <strong>Respuesta correcta:</strong> {renderLatexText(item.opciones[item.respuestaCorrecta])}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              setModo('ver-mis-resultados');
              setResultadoDetallado(null);
            }}
            className="w-full mt-6 bg-slate-300 hover:bg-slate-400 text-slate-800 font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
          >
            <ChevronLeft size={20} /> Volver a Mis Resultados
          </button>
        </div>
      </div>
    );
  }

  // ============ PANTALLA: Seleccionar Colegio ============
  if (modo === 'seleccionar-colegio' && estudianteAutenticado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h1 className="text-3xl font-bold text-slate-800">Selecciona tu Colegio</h1>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-600">Cargando...</div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {colegios.map((colegio, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setColegioSeleccionado(colegio);
                    cargarConfigColegio(colegio);
                    setModo('seleccionar-nivel');
                  }}
                  className="bg-white hover:bg-emerald-50 border-2 border-slate-200 hover:border-emerald-500 font-bold py-4 rounded-lg transition text-left px-6"
                >
                  {colegio.nombre}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => setModo('inicio')}
            className="w-full mt-6 bg-slate-300 hover:bg-slate-400 text-slate-800 font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
          >
            <ChevronLeft size={20} /> Atrás
          </button>
        </div>
      </div>
    );
  }

  // ============ PANTALLA: Seleccionar Nivel ============
  if (modo === 'seleccionar-nivel' && colegioSeleccionado && estudianteAutenticado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h1 className="text-3xl font-bold text-slate-800">{colegioSeleccionado.nombre}</h1>
            <p className="text-slate-500">Selecciona tu Nivel</p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {colegioSeleccionado.niveles.map((nivel, idx) => (
              <button
                key={idx}
                onClick={async () => {
                  setNivelSeleccionado(nivel);
                  await cargarAreas(colegioSeleccionado, nivel);
                  setModo('seleccionar-area');
                }}
                className="bg-white hover:bg-emerald-50 border-2 border-slate-200 hover:border-emerald-500 font-bold py-4 rounded-lg transition text-left px-6"
              >
                {nivel.nombre}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setColegioSeleccionado(null);
              setModo('seleccionar-colegio');
            }}
            className="w-full mt-6 bg-slate-300 hover:bg-slate-400 text-slate-800 font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
          >
            <ChevronLeft size={20} /> Atrás
          </button>
        </div>
      </div>
    );
  }

  // ============ PANTALLA: Seleccionar Área ============
  if (modo === 'seleccionar-area' && nivelSeleccionado && estudianteAutenticado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h1 className="text-3xl font-bold text-slate-800">{nivelSeleccionado.nombre}</h1>
            <p className="text-slate-500">Selecciona un Área</p>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-600">Cargando áreas...</div>
          ) : areas.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-slate-600">
              No hay áreas disponibles para este nivel
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {areas.map((area, idx) => (
                <button
                  key={idx}
                  onClick={async () => {
                    setAreaSeleccionada(area);
                    await cargarQuices(colegioSeleccionado, nivelSeleccionado, area);
                    setModo('seleccionar-quiz');
                  }}
                  className="bg-white hover:bg-emerald-50 border-2 border-slate-200 hover:border-emerald-500 font-bold py-4 rounded-lg transition text-left px-6"
                >
                  {area.nombre}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => {
              setNivelSeleccionado(null);
              setModo('seleccionar-nivel');
            }}
            className="w-full mt-6 bg-slate-300 hover:bg-slate-400 text-slate-800 font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
          >
            <ChevronLeft size={20} /> Atrás
          </button>
        </div>
      </div>
    );
  }

  // ============ PANTALLA: Seleccionar Quiz ============
  if (modo === 'seleccionar-quiz' && areaSeleccionada && estudianteAutenticado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
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
            <div className="bg-red-100 text-red-700 p-4 rounded-lg text-sm mt-4">
              {error}
            </div>
          )}

          <button
            onClick={() => {
              setAreaSeleccionada(null);
              setModo('seleccionar-area');
            }}
            className="w-full mt-6 bg-slate-300 hover:bg-slate-400 text-slate-800 font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
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
                <p className="font-bold text-lg text-slate-800 leading-relaxed">
                  {idx + 1}. {renderLatexText(pregunta.pregunta)}
                </p>

                {pregunta.imagen && (
                  <img 
                    src={`${GITHUB_RAW_URL}${pregunta.imagen}`} 
                    alt="Imagen de la pregunta"
                    className="my-4 max-w-full h-auto rounded-lg shadow-sm"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      console.error('Error cargando imagen:', pregunta.imagen);
                    }}
                  />
                )}

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
                      <span className="text-slate-700 text-base leading-relaxed">
                        {renderLatexText(opcion)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={async () => {
              const respuestasArray = preguntasGeneradas.map((_, idx) =>
                respuestasEstudiante[idx] !== undefined ? respuestasEstudiante[idx] : -1
              );

              if (respuestasArray.includes(-1)) {
                alert('❌ Debes responder todas las preguntas');
                return;
              }

              let correctas = 0;
              const respuestasDetalladas = preguntasGeneradas.map((pregunta, idx) => {
                const respuestaUsuario = respuestasArray[idx];
                const correcta = respuestaUsuario === pregunta.respuesta_correcta;
                if (correcta) correctas++;

                return {
                  pregunta: pregunta.pregunta,
                  opciones: pregunta.opciones,
                  respuestaUsuario: respuestaUsuario,
                  respuestaCorrecta: pregunta.respuesta_correcta,
                  correcta: correcta,
                  imagen: pregunta.imagen
                };
              });

              const porcentaje = Math.round((correctas / preguntasGeneradas.length) * 100);

              const clave = `${colegioSeleccionado.nombre} • ${nivelSeleccionado.nombre} • ${areaSeleccionada.nombre} • ${quizSeleccionado.titulo}`;
              
              const datosRespuesta = {
                nombre: estudianteAutenticado.nombre,
                email: estudianteAutenticado.email,
                correctas,
                total: preguntasGeneradas.length,
                porcentaje,
                fecha: new Date().toLocaleString(),
                respuestasDetalladas: respuestasDetalladas
              };

              // Guardar en Firebase
              await guardarRespuestaFirebase(clave, estudianteAutenticado.email, datosRespuesta);

              // Actualizar estado local
              const nuevasRespuestas = { ...respuestas };
              if (!nuevasRespuestas[clave]) {
                nuevasRespuestas[clave] = {};
              }
              nuevasRespuestas[clave][estudianteAutenticado.email] = datosRespuesta;
              setRespuestas(nuevasRespuestas);

              setResultadoDetallado(datosRespuesta);
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
  if (modo === 'resultado' && estudianteAutenticado && resultadoDetallado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-emerald-600 mb-2">¡Listo!</h1>
            <p className="text-slate-600">Tu quiz ha sido enviado correctamente</p>
          </div>

          <div className="bg-gradient-to-r from-emerald-100 to-blue-100 rounded-lg p-6">
            <p className="text-sm text-slate-600 mb-2">Tu calificación</p>
            <p className="text-5xl font-bold text-emerald-600">{resultadoDetallado.porcentaje}%</p>
            <p className="text-slate-600 mt-2">{resultadoDetallado.correctas} de {resultadoDetallado.total} correctas</p>
          </div>

          <button
            onClick={() => {
              setModo('ver-desglose-estudiante');
            }}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition"
          >
            📊 Ver Desglose Completo
          </button>

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
              setResultadoDetallado(null);
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

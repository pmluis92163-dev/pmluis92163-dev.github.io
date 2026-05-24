import React, { useState, useEffect } from 'react';
import { LogOut, Plus, Trash2, Download, ChevronLeft } from 'lucide-react';

const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/pmluis92163-dev/pmluis92163-dev.github.io/main';

export default function QuizApp() {
  const [modo, setModo] = useState('inicio');
  const [colegios, setColegios] = useState([]);
  const [colegioSeleccionado, setColegioSeleccionado] = useState(null);
  const [nivelSeleccionado, setNivelSeleccionado] = useState(null);
  const [areaSeleccionada, setAreaSeleccionada] = useState(null);
  const [quizSeleccionado, setQuizSeleccionado] = useState(null);
  const [quizActual, setQuizActual] = useState(null);
  const [preguntasGeneradas, setPreguntasGeneradas] = useState([]);
  const [respuestasEstudiante, setRespuestasEstudiante] = useState({});
  const [nombreEstudiante, setNombreEstudiante] = useState('');
  const [respuestas, setRespuestas] = useState(() => {
    const saved = localStorage.getItem('respuestas');
    return saved ? JSON.parse(saved) : {};
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cargar estructura de colegios
  useEffect(() => {
    const cargarColegios = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${GITHUB_RAW_URL}/quizes/index.json`);
        if (!response.ok) throw new Error('No se pudo cargar la estructura');
        const data = await response.json();
        setColegios(data.colegios || []);
        setError(null);
      } catch (err) {
        setError('Error al cargar colegios: ' + err.message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    cargarColegios();
  }, []);

  // Guardar respuestas en localStorage
  useEffect(() => {
    localStorage.setItem('respuestas', JSON.stringify(respuestas));
  }, [respuestas]);

  // Función para evaluar variables en preguntas (ej: {{a+b}})
  const evaluarTemplate = (template, variables) => {
    let resultado = template;
    Object.keys(variables).forEach(key => {
      const value = variables[key];
      // Reemplazar {{variable}} con valor
      resultado = resultado.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    // Evaluar expresiones matemáticas (ej: {{a+b}} → {{5+3}})
    resultado = resultado.replace(/{{(.+?)}}/g, (match, expr) => {
      try {
        return eval(expr);
      } catch (e) {
        return match;
      }
    });

    return resultado;
  };

  // Generar variables aleatorias para una pregunta
  const generarVariables = (variables) => {
    const generadas = {};
    Object.keys(variables).forEach(key => {
      const config = variables[key];
      generadas[key] = Math.floor(Math.random() * (config.max - config.min + 1)) + config.min;
    });
    return generadas;
  };

  // Generar todas las preguntas de un quiz con variables aleatorias
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

  // PANTALLA: Inicio
  if (modo === 'inicio') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-8 px-4">
            <div className="space-y-3">
              <h1 className="text-6xl font-bold">QuizMaster</h1>
              <p className="text-slate-400 text-lg">Crea, comparte y evalúa quices en segundos</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              <button
                onClick={() => setModo('profesor')}
                className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-lg font-semibold text-lg transition transform hover:scale-105"
              >
                👨‍🏫 Soy Profesor
              </button>
              <button
                onClick={() => setModo('estudiante')}
                className="bg-emerald-600 hover:bg-emerald-700 px-8 py-4 rounded-lg font-semibold text-lg transition transform hover:scale-105"
              >
                👨‍🎓 Soy Estudiante
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

  // PANTALLA: Panel Profesor
  if (modo === 'profesor') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
        <nav className="bg-blue-600 text-white p-4 shadow-lg flex justify-between items-center">
          <h1 className="text-2xl font-bold">Panel Profesor</h1>
          <button
            onClick={() => setModo('inicio')}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded"
          >
            <LogOut size={20} /> Salir
          </button>
        </nav>

        <div className="max-w-6xl mx-auto p-6 space-y-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">📊 Reportes de Respuestas</h2>
            
            {Object.keys(respuestas).length === 0 ? (
              <div className="text-center text-slate-500 py-8">
                <p>No hay respuestas aún. Los estudiantes responderán sus quices aquí.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(respuestas).map(([key, respuestasQuiz], idx) => (
                  <div key={idx} className="bg-slate-50 p-4 rounded-lg border-l-4 border-blue-600">
                    <p className="font-bold text-slate-800">{key}</p>
                    <div className="mt-2 space-y-2">
                      {Object.entries(respuestasQuiz).map(([estudiante, datos], sidx) => (
                        <div key={sidx} className="flex justify-between text-sm">
                          <span className="text-slate-700">{estudiante}</span>
                          <span className="text-slate-600">{datos.correctas}/{datos.total} ({datos.porcentaje}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // PANTALLA: Seleccionar Colegio (Estudiante)
  if (modo === 'estudiante' && !colegioSeleccionado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-slate-800">Selecciona tu Colegio</h1>
            <p className="text-slate-500">Elige el colegio al que perteneces</p>
          </div>

          {loading && <p className="text-center text-slate-600">Cargando colegios...</p>}
          {error && <p className="text-center text-red-600">{error}</p>}

          <div className="grid grid-cols-1 gap-3">
            {colegios.map((colegio) => (
              <button
                key={colegio.id}
                onClick={() => {
                  setColegioSeleccionado(colegio);
                  setNivelSeleccionado(null);
                  setAreaSeleccionada(null);
                }}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-lg transition text-left px-6"
              >
                {colegio.nombre}
              </button>
            ))}
          </div>

          <button
            onClick={() => setModo('inicio')}
            className="w-full bg-slate-300 hover:bg-slate-400 text-slate-800 font-bold py-3 rounded-lg transition"
          >
            Atrás
          </button>
        </div>
      </div>
    );
  }

  // PANTALLA: Seleccionar Nivel
  if (modo === 'estudiante' && colegioSeleccionado && !nivelSeleccionado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-slate-800">{colegioSeleccionado.nombre}</h1>
            <p className="text-slate-500">Selecciona tu Nivel</p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {colegioSeleccionado.niveles.map((nivel) => (
              <button
                key={nivel.id}
                onClick={async () => {
                  setNivelSeleccionado(nivel);
                  const areas = await cargarQuicesNivel(colegioSeleccionado, nivel);
                  setAreaSeleccionada({ areas });
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
              setNivelSeleccionado(null);
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
  if (modo === 'estudiante' && colegioSeleccionado && nivelSeleccionado && areaSeleccionada && !quizSeleccionado) {
    const areas = areaSeleccionada.areas;

    if (areas.length === 0) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full text-center space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">No hay quices disponibles</h1>
            <p className="text-slate-600">Vuelve más tarde, el profesor está agregando quices.</p>
            <button
              onClick={() => {
                setColegioSeleccionado(null);
                setNivelSeleccionado(null);
                setAreaSeleccionada(null);
                setModo('inicio');
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
                    setQuizSeleccionado(area.quices[0]);
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
  if (modo === 'estudiante' && colegioSeleccionado && nivelSeleccionado && areaSeleccionada && typeof areaSeleccionada === 'object' && areaSeleccionada.quices && !quizSeleccionado) {
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
                  setNombreEstudiante('');
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
  if (modo === 'respondiendo' && quizSeleccionado && preguntasGeneradas.length > 0) {
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
                  setModo('estudiante');
                  setQuizSeleccionado(null);
                  setAreaSeleccionada(null);
                  setPreguntasGeneradas([]);
                }}
                className="text-slate-500 hover:text-slate-700 text-2xl"
              >
                ✕
              </button>
            </div>
            <input
              type="text"
              placeholder="Tu nombre completo"
              value={nombreEstudiante}
              onChange={(e) => setNombreEstudiante(e.target.value)}
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-emerald-600 focus:outline-none mb-4"
            />
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
              if (!nombreEstudiante.trim()) {
                alert('Por favor ingresa tu nombre');
                return;
              }

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
              nuevasRespuestas[clave][nombreEstudiante] = {
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
  if (modo === 'resultado') {
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
              setNombreEstudiante('');
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

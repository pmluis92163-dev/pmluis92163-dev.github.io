import React, { useState, useEffect } from 'react';
import { BarChart3, LogOut, Plus, Trash2, Eye, Download } from 'lucide-react';

export default function QuizApp() {
  const [modo, setModo] = useState('inicio');
  const [quices, setQuices] = useState(() => {
    const saved = localStorage.getItem('quices');
    return saved ? JSON.parse(saved) : [];
  });
  const [respuestas, setRespuestas] = useState(() => {
    const saved = localStorage.getItem('respuestas');
    return saved ? JSON.parse(saved) : {};
  });
  const [quizActual, setQuizActual] = useState(null);
  const [codigoEstudiante, setCodigoEstudiante] = useState('');
  const [respuestasEstudiante, setRespuestasEstudiante] = useState({});
  const [jsonInput, setJsonInput] = useState('');

  useEffect(() => {
    localStorage.setItem('quices', JSON.stringify(quices));
  }, [quices]);

  useEffect(() => {
    localStorage.setItem('respuestas', JSON.stringify(respuestas));
  }, [respuestas]);

  const agregarQuiz = () => {
    try {
      const quiz = JSON.parse(jsonInput);
      if (!quiz.id || !quiz.titulo || !quiz.preguntas) {
        alert('El JSON debe tener: id, titulo, preguntas');
        return;
      }
      setQuices([...quices, { ...quiz, id: Date.now() }]);
      setJsonInput('');
      alert('✅ Quiz agregado correctamente');
    } catch (e) {
      alert('❌ Error en JSON: ' + e.message);
    }
  };

  const verResultados = (quizId) => {
    const respuestasQuiz = respuestas[quizId] || {};
    const quiz = quices.find(q => q.id === quizId);
    
    const resultados = Object.entries(respuestasQuiz).map(([estudiante, respuestasEst]) => {
      let correctas = 0;
      respuestasEst.forEach((resp, idx) => {
        if (resp === quiz.preguntas[idx].respuesta_correcta) correctas++;
      });
      const porcentaje = Math.round((correctas / quiz.preguntas.length) * 100);
      return { estudiante, correctas, total: quiz.preguntas.length, porcentaje };
    });

    return resultados;
  };

  const descargarCSV = (quizId) => {
    const resultados = verResultados(quizId);
    const quiz = quices.find(q => q.id === quizId);
    
    let csv = 'Estudiante,Correctas,Total,Porcentaje\n';
    resultados.forEach(r => {
      csv += `${r.estudiante},${r.correctas},${r.total},${r.porcentaje}%\n`;
    });

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', `${quiz.titulo}_resultados.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const entrarQuiz = (codigo) => {
    const quiz = quices.find(q => q.id == codigo);
    if (!quiz) {
      alert('❌ Código de quiz no encontrado');
      return;
    }
    setQuizActual(quiz);
    setRespuestasEstudiante({});
    setCodigoEstudiante(codigo);
    setModo('respondiendo');
  };

  const enviarRespuestas = (nombre) => {
    if (!nombre.trim()) {
      alert('Por favor ingresa tu nombre');
      return;
    }

    const respuestasArray = quizActual.preguntas.map((_, idx) => 
      respuestasEstudiante[idx] !== undefined ? respuestasEstudiante[idx] : -1
    );

    if (respuestasArray.includes(-1)) {
      alert('❌ Debes responder todas las preguntas');
      return;
    }

    let correctas = 0;
    respuestasArray.forEach((resp, idx) => {
      if (resp === quizActual.preguntas[idx].respuesta_correcta) correctas++;
    });
    const porcentaje = Math.round((correctas / quizActual.preguntas.length) * 100);

    const nuevasRespuestas = { ...respuestas };
    if (!nuevasRespuestas[codigoEstudiante]) {
      nuevasRespuestas[codigoEstudiante] = {};
    }
    nuevasRespuestas[codigoEstudiante][nombre] = respuestasArray;
    setRespuestas(nuevasRespuestas);

    setModo('resultado');
  };

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

  if (modo === 'profesor') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
        <nav className="bg-blue-600 text-white p-4 shadow-lg flex justify-between items-center">
          <h1 className="text-2xl font-bold">Panel Profesor</h1>
          <button
            onClick={() => { setModo('inicio'); setQuizActual(null); }}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded"
          >
            <LogOut size={20} /> Salir
          </button>
        </nav>

        <div className="max-w-6xl mx-auto p-6 space-y-8">
          <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Plus size={28} /> Agregar Quiz desde JSON
            </h2>
            
            <div className="bg-slate-50 p-4 rounded border-l-4 border-blue-600">
              <p className="text-sm text-slate-700 mb-3 font-mono">Ejemplo JSON:</p>
              <pre className="text-xs bg-white p-3 rounded overflow-x-auto text-slate-700">
{`{
  "id": 1,
  "titulo": "Quiz Matemática",
  "preguntas": [
    {
      "pregunta": "¿Cuál es 2+2?",
      "opciones": ["3", "4", "5", "6"],
      "respuesta_correcta": 1
    }
  ]
}`}
              </pre>
            </div>

            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="Pega tu JSON aquí..."
              className="w-full h-32 p-4 border-2 border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none font-mono text-sm"
            />

            <button
              onClick={agregarQuiz}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition"
            >
              ➕ Agregar Quiz
            </button>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-800">Tus Quices ({quices.length})</h2>
            
            {quices.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center text-slate-500">
                <p>No hay quices aún. ¡Crea uno arriba!</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {quices.map((quiz) => {
                  const resultados = verResultados(quiz.id);
                  return (
                    <div key={quiz.id} className="bg-white rounded-lg shadow-md p-6 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-bold text-slate-800">{quiz.titulo}</h3>
                          <p className="text-sm text-slate-500">
                            ID: <span className="font-mono bg-slate-100 px-2 py-1 rounded">{quiz.id}</span>
                            • {quiz.preguntas.length} preguntas
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            const newQuices = quices.filter(q => q.id !== quiz.id);
                            setQuices(newQuices);
                            const newRespuestas = { ...respuestas };
                            delete newRespuestas[quiz.id];
                            setRespuestas(newRespuestas);
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={24} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-3 rounded">
                          <p className="text-sm text-blue-600">Respuestas enviadas</p>
                          <p className="text-2xl font-bold text-blue-700">{resultados.length}</p>
                        </div>
                        <div className="bg-emerald-50 p-3 rounded">
                          <p className="text-sm text-emerald-600">Promedio</p>
                          <p className="text-2xl font-bold text-emerald-700">
                            {resultados.length > 0 
                              ? Math.round(resultados.reduce((sum, r) => sum + r.porcentaje, 0) / resultados.length)
                              : '-'}%
                          </p>
                        </div>
                      </div>

                      {resultados.length > 0 && (
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {resultados.map((r, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-slate-50 p-2 rounded text-sm">
                              <span className="font-medium text-slate-700">{r.estudiante}</span>
                              <span className="text-slate-600">{r.correctas}/{r.total} ({r.porcentaje}%)</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2 pt-2 border-t">
                        <button
                          onClick={() => descargarCSV(quiz.id)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded font-medium flex items-center justify-center gap-2"
                        >
                          <Download size={18} /> Descargar CSV
                        </button>
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

  if (modo === 'estudiante') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-slate-800">Responder Quiz</h1>
            <p className="text-slate-500">Ingresa el código que te proporcionó tu profesor</p>
          </div>

          <input
            type="text"
            placeholder="Código del quiz (ej: 1234567890)"
            value={codigoEstudiante}
            onChange={(e) => setCodigoEstudiante(e.target.value)}
            className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-emerald-600 focus:outline-none text-lg"
          />

          <div className="flex gap-3">
            <button
              onClick={() => entrarQuiz(codigoEstudiante)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition"
            >
              Entrar al Quiz
            </button>
            <button
              onClick={() => setModo('inicio')}
              className="flex-1 bg-slate-300 hover:bg-slate-400 text-slate-800 font-bold py-3 rounded-lg transition"
            >
              Atrás
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (modo === 'respondiendo' && quizActual) {
    const [nombre, setNombre] = useState('');

    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold text-slate-800">{quizActual.titulo}</h1>
              <button
                onClick={() => {
                  setModo('estudiante');
                  setQuizActual(null);
                }}
                className="text-slate-500 hover:text-slate-700"
              >
                ✕ Cerrar
              </button>
            </div>
            <input
              type="text"
              placeholder="Tu nombre completo"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-emerald-600 focus:outline-none mb-4"
            />
          </div>

          <div className="space-y-4">
            {quizActual.preguntas.map((pregunta, idx) => (
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
            onClick={() => enviarRespuestas(nombre)}
            className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-lg text-lg transition"
          >
            📤 Enviar Quiz
          </button>
        </div>
      </div>
    );
  }

  if (modo === 'resultado') {
    const respuestasArray = Object.values(respuestasEstudiante);
    let correctas = 0;
    respuestasArray.forEach((resp, idx) => {
      if (resp === quizActual.preguntas[idx].respuesta_correcta) correctas++;
    });
    const porcentaje = Math.round((correctas / quizActual.preguntas.length) * 100);

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
            <p className="text-slate-600 mt-2">{correctas} de {quizActual.preguntas.length} correctas</p>
          </div>

          <button
            onClick={() => {
              setModo('estudiante');
              setQuizActual(null);
            }}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition"
          >
            ← Volver
          </button>
        </div>
      </div>
    );
  }
}

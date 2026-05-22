#!/usr/bin/env python3
"""
Conversor LaTeX → JSON para QuizMaster
Convierte tus preguntas en LaTeX a formato JSON listo para copiar/pegar

USAGE:
    python3 latex_to_json.py

El script lee un archivo LaTeX y genera un JSON
"""

import re
import json
import sys

def convert_latex_to_json(latex_content):
    """
    Convierte contenido LaTeX a JSON de QuizMaster
    
    Formato esperado en LaTeX:
    \begin{quiz}{1}{Título del Quiz}
    
    \question{¿Pregunta aquí?}
    \option{Opción A}
    \option{Opción B}
    \option{Opción C}
    \option{Opción D}
    \correct{1}
    
    \question{¿Otra pregunta?}
    ...
    
    \end{quiz}
    """
    
    quizes = []
    
    # Buscar bloques de quiz
    quiz_pattern = r'\\begin\{quiz\}\{(\d+)\}\{([^}]+)\}(.*?)\\end\{quiz\}'
    quiz_matches = re.findall(quiz_pattern, latex_content, re.DOTALL)
    
    for quiz_id, quiz_title, quiz_content in quiz_matches:
        preguntas = []
        
        # Buscar preguntas individuales
        # Pattern: \question{texto} seguido de \option{} y \correct{}
        question_pattern = r'\\question\{([^}]+)\}'
        option_pattern = r'\\option\{([^}]+)\}'
        correct_pattern = r'\\correct\{(\d+)\}'
        
        # Encontrar todas las preguntas
        questions = re.finditer(question_pattern, quiz_content)
        
        pos = 0
        for q_match in re.finditer(question_pattern, quiz_content):
            pregunta_texto = q_match.group(1)
            start_pos = q_match.end()
            
            # Encontrar el siguiente \question o final
            next_question = re.search(question_pattern, quiz_content[start_pos:])
            if next_question:
                section = quiz_content[start_pos:start_pos + next_question.start()]
            else:
                section = quiz_content[start_pos:]
            
            # Extraer opciones para esta pregunta
            opciones = re.findall(option_pattern, section)
            
            # Extraer respuesta correcta
            correct_match = re.search(correct_pattern, section)
            respuesta_correcta = int(correct_match.group(1)) if correct_match else 0
            
            if opciones:
                preguntas.append({
                    "pregunta": pregunta_texto.strip(),
                    "opciones": [op.strip() for op in opciones],
                    "respuesta_correcta": respuesta_correcta
                })
        
        if preguntas:
            quiz_obj = {
                "id": int(quiz_id),
                "titulo": quiz_title.strip(),
                "preguntas": preguntas
            }
            quizes.append(quiz_obj)
    
    return quizes


def create_latex_template():
    """Crea un template de ejemplo"""
    return r"""
% ============================================
% EJEMPLO: Cómo escribir tus preguntas
% ============================================

\begin{quiz}{1}{Quiz Matemática Básica}

\question{¿Cuánto es 2 + 2?}
\option{3}
\option{4}
\option{5}
\option{6}
\correct{1}

\question{¿Cuál es la raíz cuadrada de 16?}
\option{2}
\option{3}
\option{4}
\option{5}
\correct{2}

\question{¿Cuánto es 5 × 6?}
\option{25}
\option{30}
\option{35}
\option{40}
\correct{1}

\end{quiz}

\begin{quiz}{2}{Quiz Historia}

\question{¿En qué año cayó el Muro de Berlín?}
\option{1987}
\option{1988}
\option{1989}
\option{1990}
\correct{2}

\question{¿Quién fue el primer presidente de EE.UU.?}
\option{Thomas Jefferson}
\option{George Washington}
\option{Benjamin Franklin}
\option{John Adams}
\correct{1}

\end{quiz}
"""


def main():
    print("=" * 60)
    print("CONVERSOR LATEX → JSON para QuizMaster")
    print("=" * 60)
    print()
    
    # Crear archivo de ejemplo si no existe
    try:
        with open('quiz_template.tex', 'r', encoding='utf-8') as f:
            latex_content = f.read()
            print("✓ Leyendo: quiz_template.tex")
    except FileNotFoundError:
        print("⚠ No encontré 'quiz_template.tex'")
        print("\nCreando template de ejemplo...")
        
        template = create_latex_template()
        with open('quiz_template.tex', 'w', encoding='utf-8') as f:
            f.write(template)
        
        print("✓ Archivo 'quiz_template.tex' creado")
        print("\nEdita este archivo con tus preguntas y vuelve a ejecutar el script")
        print("(Abre: quiz_template.tex)")
        return
    
    # Convertir
    print("\nConvirtiendo LaTeX → JSON...")
    quizes = convert_latex_to_json(latex_content)
    
    if not quizes:
        print("❌ No se encontraron quices en el formato correcto")
        print("\nAsegúrate de usar este formato:")
        print(create_latex_template())
        return
    
    print(f"✓ {len(quizes)} quiz(zes) encontrado(s)")
    
    # Mostrar preguntas encontradas
    for quiz in quizes:
        print(f"\n📋 Quiz ID {quiz['id']}: {quiz['titulo']}")
        print(f"   Preguntas: {len(quiz['preguntas'])}")
    
    # Guardar como JSON
    output_filename = 'quizes.json'
    with open(output_filename, 'w', encoding='utf-8') as f:
        json.dump(quizes, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ JSON guardado en: {output_filename}")
    
    # Mostrar un ejemplo
    print("\n" + "=" * 60)
    print("PRÓXIMO PASO: Copia esto a QuizMaster")
    print("=" * 60)
    print("\nPara cada quiz, copia uno de estos JSONs:")
    
    for i, quiz in enumerate(quizes[:1]):  # Mostrar solo el primero
        print(f"\n{json.dumps(quiz, ensure_ascii=False, indent=2)}")
    
    if len(quizes) > 1:
        print(f"\n... y {len(quizes)-1} más en {output_filename}")
    
    print("\n" + "=" * 60)
    print("INSTRUCCIONES FINALES")
    print("=" * 60)
    print("""
1. Abre el archivo quizes.json
2. Copia UNO DE LOS QUIZES (el JSON completo entre { })
3. Ve a QuizMaster → Soy Profesor
4. Pega el JSON en el campo "JSON"
5. Click en "Agregar Quiz"
6. ¡Repite para cada quiz!

O mejor aún: Abre quizes.json en un editor y copia todos los quizes
de una vez si tienes múltiples quices.
""")


if __name__ == '__main__':
    main()

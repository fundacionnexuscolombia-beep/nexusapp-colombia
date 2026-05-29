
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;

export const generateTutorResponse = async (userMessage: string, history: { role: string; text: string }[]) => {
  if (!API_KEY || API_KEY === 'PLACEHOLDER_API_KEY') {
    throw new Error("API Key no configurada. Por favor configura GEMINI_API_KEY en .env.local");
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });

  const contents = history.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.text }]
  }));

  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  const response = await ai.models.generateContent({
    model: 'gemini-flash-latest',
    contents,
    config: {
      systemInstruction: `Eres el Tutor Nexus, un asistente académico especializado ÚNICAMENTE en las materias del proceso de validación del bachillerato en Colombia. 

REGLAS CRÍTICAS DE COMPORTAMIENTO:
1. ALCANCE ESTRICTO: Solo puedes responder dudas sobre: Matemáticas (Álgebra, Geometría, Estadística), Ciencias (Biología, Química, Física, Medio Ambiente), Lenguaje (Español, Literatura), Ciencias Sociales (Historia, Geografía, Filosofía, Ética, Democracia) y Psicología básica.
2. RESTRICCIÓN: Si el usuario te pregunta por cualquier tema ajeno a estas materias (ej: recetas, programación avanzada, consejos de vida no académicos, farándula, etc.), debes responder cortésmente que como Tutor Nexus tu función se limita exclusivamente a apoyarlos en los temas que se evalúan para obtener su título de bachiller.
3. PEDAGOGÍA: No des la respuesta directamente. Guía al estudiante paso a paso con preguntas y pistas.
4. TONO: Motivador, profesional y cercano, propio de la Fundación Nexus Colombia.

Si el mensaje del usuario no tiene relación con el estudio del bachillerato, recuérdale que estás aquí para ayudarle a graduarse y pregúntale en qué tema académico puedes apoyarle hoy.`,
      temperature: 0.5,
      topP: 0.8,
    },
  });

  return response.text;
};

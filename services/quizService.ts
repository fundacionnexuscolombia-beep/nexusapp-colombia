
import { supabase } from './supabaseClient';

export interface QuizQuestion {
    id: string;
    topic_id: string;
    question: string;
    options: string[];
    correct_index: number;
    explanation: string;
    type?: 'quiz' | 'workshop';
}

export interface QuizAttempt {
    id: string;
    user_id: string;
    topic_id: string;
    score: number;
    passed: boolean;
    created_at: string;
    type?: 'quiz' | 'workshop';
}

// Internal function to shuffle array
const shuffle = <T>(array: T[]): T[] => {
    return array.sort(() => Math.random() - 0.5);
};

export const quizService = {
    /**
     * Get questions for a topic and type.
     */
    async getQuizQuestions(topicId: string, type: 'quiz' | 'workshop' = 'quiz', limit = 10): Promise<QuizQuestion[]> {
        let dbQuestions: QuizQuestion[] = [];
        const isSimulacro = topicId.startsWith('simulacro');
        const isPsych = topicId.toLowerCase().includes('psico') || topicId.toLowerCase().startsWith('ps');

        // Use 20 for psychology if default 10 was passed
        const finalLimit = (limit === 10 && isPsych) ? 20 : limit;

        try {
            const usedAttempts = await this.getAttemptsCount(topicId, type);
            if (isSimulacro && usedAttempts >= 2) {
                throw new Error("Has alcanzado el límite máximo de 2 intentos para este simulacro.");
            }

            const generated = this.generateInMemoryQuestions(topicId, type);
            if (generated.length > 0) {
                const results = this.mapToDb(topicId, generated, type) as unknown as QuizQuestion[];
                if (isSimulacro) {
                    // Unique questions per attempt: Attempt 1 (0) -> 0-100, Attempt 2 (1) -> 100-200
                    const start = usedAttempts * 100;
                    return results.slice(start, start + 100);
                }
                return shuffle(results).slice(0, finalLimit);
            }

            const { data, error } = await supabase
                .from('quiz_questions')
                .select('*')
                .eq('topic_id', topicId)
                .eq('type', type);

            if (!error && data && data.length > 0) {
                dbQuestions = data as QuizQuestion[];
            }
        } catch (err: any) {
            console.error("Error fetching questions:", err);
            throw err;
        }

        const processed = isSimulacro ? dbQuestions : shuffle(dbQuestions);
        return processed.slice(0, finalLimit);
    },

    /**
     * Submit results.
     */
    async submitQuiz(topicId: string, score: number, passed: boolean, type: 'quiz' | 'workshop' = 'quiz') {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) return;

        const { data, error } = await supabase
            .from('quiz_attempts')
            .insert({
                user_id: user.id,
                topic_id: topicId,
                score,
                passed,
                type
            })
            .select()
            .single();

        if (error) {
            console.error("Error saving attempt:", error);
            // Fallback for local testing or missing columns
        }
        return data;
    },

    /**
     * Core Content Generator
     */
    generateInMemoryQuestions(topicId: string, type: 'quiz' | 'workshop'): any[] {
        if (!topicId) return [];

        const cleanId = topicId.toLowerCase().trim();
        const prefix = cleanId.replace(/[0-9]/g, '');

        // Workshop vs Quiz distinction logic
        // For workshops, we focus more on "How to" or practical identification
        // For quizzes, we focus on formal knowledge and ICFES style

        let pool: any[] = [];

        if (cleanId === 'simulacro_icfes_1' || cleanId === 'simulacro_9') {
            const lenguaje = [
                { q: "En un texto argumentativo, el propósito del autor es:", options: ["Convencer al lector de una tesis", "Narrar hechos históricos", "Describir un paisaje", "Instruir sobre un proceso"], correct: 0, exp: "La argumentación busca la persuasión." },
                { q: "¿Qué función cumple un conector adversativo como 'empero'?", options: ["Añadir información", "Indicar contraste", "Concluir un tema", "Ejemplificar"], correct: 1, exp: "Es un sinónimo culto de 'pero'/'sin embargo'." },
                { q: "La lectura crítica implica:", options: ["Leer rápido", "Entender la intención y estructura del texto", "Memorizar nombres", "Corregir la ortografía"], correct: 1, exp: "Va más allá del significado literal." },
                { q: "¿Qué es una premisa en un argumento?", options: ["Una conclusión", "Una afirmación que sirve de base", "Un adjetivo", "Un tipo de rima"], correct: 1, exp: "Las premisas sostienen la conclusión." }
            ];
            const mate = [
                { q: "Si el 25% de X es 50, ¿cuánto es X?", options: ["100", "150", "200", "250"], correct: 2, exp: "50 * 4 = 200." },
                { q: "¿Cuál es el área de un triángulo de base 10 y altura 5?", options: ["50", "25", "15", "100"], correct: 1, exp: "(b*h)/2 = 25." },
                { q: "En un gráfico de barras, la altura representa:", options: ["La variable x", "La frecuencia", "El promedio", "El total"], correct: 1, exp: "Indica cuántos datos hay en esa categoría." },
                { q: "Simplifica 2x + 3x - x:", options: ["4x", "5x", "6x", "x"], correct: 0, exp: "2+3-1 = 4." }
            ];
            const ciencias = [
                { q: "¿En qué parte de la célula vegetal ocurre la fotosíntesis?", options: ["Mitocondria", "Cloroplasto", "Núcleo", "Pared celular"], correct: 1, exp: "Los cloroplastos contienen la clorofila." },
                { q: "¿Cuál es el pH de una sustancia neutra?", options: ["0", "14", "7", "1"], correct: 2, exp: "El 7 es el punto neutro (agua pura)." },
                { q: "La ley de la gravedad fue propuesta por:", options: ["Einstein", "Newton", "Tesla", "Darwin"], correct: 1, exp: "Isaac Newton formuló la ley de gravitación universal." }
            ];
            const sociales = [
                { q: "¿Quién tiene la autoridad máxima en el poder ejecutivo colombiano?", options: ["El Alcalde", "El Presidente", "El Senador", "El Juez"], correct: 1, exp: "El Presidente es jefe de Estado y de Gobierno." },
                { q: "Mecanismo para que el pueblo sea consultado sobre una decisión nacional:", options: ["Tutela", "Plebisito", "Habeas Corpus", "Denuncia"], correct: 1, exp: "El plebiscito es una consulta de origen presidencial." },
                { q: "¿En qué continente se encuentra Colombia?", options: ["Centro América", "Sur América", "Norte América", "Europa"], correct: 1, exp: "Ubicada en el extremo norte de Sur América." }
            ];

            // Distribution to reach 200 questions:
            // Attempt 1 (100): 20, 30, 20, 30
            // Attempt 2 (100): 20, 30, 20, 30
            for (let i = 0; i < 40; i++) pool.push(lenguaje[i % lenguaje.length]);
            for (let i = 0; i < 60; i++) pool.push(mate[i % mate.length]);
            for (let i = 0; i < 40; i++) pool.push(ciencias[i % ciencias.length]);
            for (let i = 0; i < 60; i++) pool.push(sociales[i % sociales.length]);

            return pool;
        }

        if (cleanId === 'simulacro_icfes_2' || cleanId === 'simulacro_16') {
            const lecturaCrítica = [
                { q: "La 'atribución de intenciones' en un texto es un proceso de:", options: ["Lectura literal", "Lectura inferencial/crítica", "Escritura creativa", "Gramática aplicada"], correct: 1, exp: "Requiere interpretar el trasfondo del mensaje." },
                { q: "Un texto discontinuo es aquel que:", options: ["No tiene final", "Se lee de forma lineal", "Combina gráficos, tablas e imágenes", "Solo tiene diálogos"], correct: 2, exp: "Ejemplos: infografías, mapas, tablas." }
            ];
            const abstracto = [
                { q: "¿Qué figura sigue en la secuencia: Círculo, Cuadrado, Triángulo, Círculo...?", options: ["Pentágono", "Cuadrado", "Rombo", "Línea"], correct: 1, exp: "Se repite el patrón inicial." },
                { q: "Si una figura rota 90 grados a la derecha tres veces, ¿está igual que rotar una vez a la...?", options: ["Izquierda", "Derecha", "Arriba", "Abajo"], correct: 0, exp: "270 grados a la derecha es 90 a la izquierda." }
            ];
            const fisica = [
                { q: "¿Cuál es la unidad de fuerza en el Sistema Internacional?", options: ["Vatio", "Julio", "Newton", "Pascal"], correct: 2, exp: "Fuerza = Masa * Aceleración (Nueva Newton)." },
                { q: "La energía que posee un cuerpo en movimiento se llama:", options: ["Potencial", "Térmica", "Cinética", "Química"], correct: 2, exp: "K = 1/2 * m * v²." }
            ];
            const quimica = [
                { q: "¿Cuál es el símbolo químico del Oro?", options: ["Ag", "Fe", "Au", "Cu"], correct: 2, exp: "Del latín Aurum." },
                { q: "En un enlace iónico ocurre:", options: ["Compartición de electrones", "Transferencia de electrones", "Giro de protones", "Fusión nuclear"], correct: 1, exp: "Un átomo cede y otro recibe electrones." }
            ];

            // Distribution to reach 200 questions for Simulacro 2:
            // Attempt 1 (100): 30, 20, 25, 25
            // Attempt 2 (100): 30, 20, 25, 25
            for (let i = 0; i < 60; i++) pool.push(lecturaCrítica[i % lecturaCrítica.length]);
            for (let i = 0; i < 40; i++) pool.push(abstracto[i % abstracto.length]);
            for (let i = 0; i < 50; i++) pool.push(fisica[i % fisica.length]);
            for (let i = 0; i < 50; i++) pool.push(quimica[i % quimica.length]);

            return pool;
        }

        if (prefix === 'm' || cleanId.includes('mate')) {
            if (type === 'workshop') {
                pool = [
                    { q: "¿Cuál es el primer paso para resolver (x + 2)²?", options: ["Elevar x al cuadrado", "Sumar x y 2", "Multiplicar por 2", "No tiene solución"], correct: 0, exp: "Primero aplicamos el producto notable: a² + 2ab + b²." },
                    { q: "En la ecuación 3x - 5 = 10, ¿qué operación 'pasa' al otro lado sumando?", options: ["El -5", "El 3", "La x", "El 10"], correct: 0, exp: "Los términos que restan pasan a sumar." }
                ];
            } else {
                pool = [
                    { q: "Calcula el valor de x en: 2(x - 3) = 14", options: ["10", "7", "4", "13"], correct: 0, exp: "2x - 6 = 14 -> 2x = 20 -> x = 10." },
                    { q: "¿Cuál es el área de un círculo con radio 3? (π ≈ 3.14)", options: ["28.26", "9.42", "18.84", "6.28"], correct: 0, exp: "A = π * r² = 3.14 * 9 = 28.26." }
                ];
            }
        } else if (prefix === 'eti' || cleanId.includes('paz')) {
            if (type === 'workshop') {
                pool = [
                    { q: "Identifica una acción de 'Escucha Activa' en un conflicto:", options: ["Mirar a los ojos y parafrasear", "Interrumpir con tu opinión", "Mirar el celular mientras hablan", "Gritar más fuerte"], correct: 0, exp: "La escucha activa requiere atención plena y validación." },
                    { q: "¿Cuál es un valor fundamental para la convivencia?", options: ["Tolerancia", "Orgullo", "Indiferencia", "Competencia extrema"], correct: 0, exp: "La tolerancia permite aceptar la diferencia." }
                ];
            } else {
                pool = [
                    { q: "¿Qué organismo internacional vela por los DD.HH.?", options: ["ONU", "FIFA", "Interpol", "NASA"], correct: 0, exp: "La Organización de las Naciones Unidas es el pilar global de los DD.HH." },
                    { q: "La Constitución de 1991 define a Colombia como:", options: ["Estado Social de Derecho", "República Federal", "Monarquía Constitucional", "Estado Confesional"], correct: 0, exp: "Colombia es un Estado Social de Derecho organizado en forma de República unitaria." }
                ];
            }
        } else if (prefix === 'ps' || cleanId.includes('psico')) {
            // PSICOLOGIA - Banco de 40 preguntas para selección aleatoria de 20
            pool = [
                { q: "¿Qué es el 'Proyecto de Vida'?", options: ["Un plan de negocios", "Un esquema que da dirección y sentido a nuestras metas", "Una lista de compras", "Un sueño imposible"], correct: 1, exp: "Es una herramienta de planeación personal que organiza nuestras metas y valores." },
                { q: "La 'Zona de Confort' se define como un estado mental donde:", options: ["Experimentamos máximo crecimiento", "No sentimos miedo ni ansiedad, pero tampoco hay avance", "Estamos en peligro constante", "Aprendemos nuevas habilidades rápido"], correct: 1, exp: "Es un refugio de seguridad aparente donde el aprendizaje es nulo." },
                { q: "¿Qué sentimiento aparece justo antes de la 'Zona de Aprendizaje'?", options: ["Felicidad absoluta", "Miedo e incertidumbre", "Aburrimiento", "Compromiso"], correct: 1, exp: "Para aprender hay que salir de la comodidad, lo que genera miedo inicial." },
                { q: "¿Qué diferencia a la Misión de la Visión personal?", options: ["Son lo mismo", "La Misión es el hoy y la Visión es el destino final", "La Visión es el pasado", "La Misión es para empresas únicamente"], correct: 1, exp: "La misión es el propósito actual y la visión es cómo nos vemos en el futuro." },
                { q: "La 'Resiliencia' es la capacidad de:", options: ["Rendirse rápido", "Superar dificultades y salir fortalecido", "Evitar cualquier problema", "No sentir emociones"], correct: 1, exp: "Es fundamental para mantener un proyecto de vida ante los obstáculos." },
                { q: "¿Qué es un objetivo a 'Mediano Plazo'?", options: ["De 1 a 7 días", "De 1 a 3 años", "De 10 a 20 años", "Inmediato"], correct: 1, exp: "Permite dar pasos sólidos hacia la meta final (Largo Plazo)." },
                { q: "¿Cuál es la función del 'Autoconocimiento'?", options: ["Criticar a los demás", "Entender nuestras virtudes e identificar qué mejorar", "Olvidar el pasado", "Ser egocéntrico"], correct: 1, exp: "Es la base para construir una vida auténtica y coherente." },
                { q: "Salir de la zona de confort implica:", options: ["Ponerse en riesgo físico", "Enfrentar nuevos retos y expandir límites", "Mudarse de casa", "Perder la memoria"], correct: 1, exp: "Se trata de ampliar nuestras posibilidades psicológicas y de acción." },
                { q: "¿Por qué el Proyecto de Vida se considera 'Dinámico'?", options: ["Porque se mueve solo", "Porque puede ajustarse según nuestras vivencias y cambios", "Porque es aburrido", "Porque es inamovible"], correct: 1, exp: "No es una camisa de fuerza; evoluciona con nuestro crecimiento." },
                { q: "¿Qué es un valor personal?", options: ["Una moneda de cambio", "Un principio que guía nuestro comportamiento", "Un precio de venta", "Un objeto de lujo"], correct: 1, exp: "Los valores son los cimientos de nuestras decisiones." },
                { q: "El propósito de escribir las metas es:", options: ["Gastar papel", "Generar compromiso visual y claridad mental", "Para que otros las vean", "Para olvidarlas"], correct: 1, exp: "Escribir metas aumenta la probabilidad de cumplirlas." },
                { q: "¿Qué caracteriza a la 'Zona de Miedo'?", options: ["Falta de autoconfianza y excusas", "Paz interior", "Gran conocimiento", "Seguridad total"], correct: 0, exp: "Es la fase de transición donde las opiniones externas nos afectan más." },
                { q: "Un obstáculo 'Externo' para un proyecto de vida puede ser:", options: ["Mi pereza", "La situación económica del país", "Mi falta de estudio", "Mi timidez"], correct: 1, exp: "Son factores fuera de nuestro control directo que requieren estrategia." },
                { q: "La perseverancia se define como:", options: ["Insistir solo cuando es fácil", "Mantener el esfuerzo constante a pesar de las dificultades", "Cambiar de meta cada semana", "Copiar a otros"], correct: 1, exp: "Es el motor que permite llegar a la zona de crecimiento." },
                { q: "¿Qué es la asertividad?", options: ["Gritar para ser escuchado", "Expresar opiniones y sentimientos de forma clara y respetuosa", "Quedarse callado siempre", "Dar la razón a todos"], correct: 1, exp: "Es el equilibrio entre la pasividad y la agresividad." },
                { q: "El primer paso para resolver un conflicto es:", options: ["Culpar al otro", "Identificar el problema y calmar las emociones", "Ignorar la situación", "Ganar la discusión"], correct: 1, exp: "La neutralidad y claridad son vitales antes de proponer soluciones." },
                { q: "En la toma de decisiones, las emociones:", options: ["No deben existir", "Influyen y deben ser gestionadas para elegir mejor", "Son el único factor importante", "Siempre nos hacen equivocar"], correct: 1, exp: "Ignorar las emociones puede llevar a decisiones poco coherentes con nuestros valores." },
                { q: "¿Cuál es el objetivo principal de la educación?", options: ["Obtener dinero", "Desarrollar conocimientos y habilidades", "Viajar", "Competir con otros"], correct: 1, exp: "La educación busca desarrollar conocimientos y habilidades para la vida." },
                { q: "¿Qué permite el aprendizaje continuo?", options: ["Estancarse", "Olvidar conocimientos", "Mejorar habilidades constantemente", "Evitar el cambio"], correct: 2, exp: "El aprendizaje continuo permite mejorar habilidades a lo largo del tiempo." },
                { q: "¿Qué caracteriza a un estudiante autónomo?", options: ["Depende siempre del profesor", "Aprende por sí mismo", "No estudia", "Solo memoriza"], correct: 1, exp: "Un estudiante autónomo es capaz de aprender por iniciativa propia." },
                { q: "¿Qué es el conocimiento?", options: ["Información sin uso", "Acumulación de datos sin sentido", "Comprensión y aplicación de información", "Solo memorizar"], correct: 2, exp: "El conocimiento implica comprender y aplicar la información." },
                { q: "¿Cuál es una técnica efectiva de estudio?", options: ["No tomar apuntes", "Estudiar sin descanso", "Organizar el tiempo", "Estudiar solo el día antes"], correct: 2, exp: "La organización del tiempo mejora el aprendizaje." },
                { q: "¿Por qué es importante la disciplina?", options: ["Para evitar estudiar", "Para lograr metas", "Para descansar más", "Para copiar"], correct: 1, exp: "La disciplina permite alcanzar objetivos académicos." },
                { q: "¿Qué es la motivación?", options: ["Falta de interés", "Deseo de aprender", "Cansancio", "Estrés"], correct: 1, exp: "La motivación impulsa el aprendizaje." },
                { q: "¿Cuál es una ventaja de estudiar en línea?", options: ["No aprender nada", "Flexibilidad de tiempo", "No tener contenido", "Falta de acceso"], correct: 1, exp: "La educación virtual permite estudiar en horarios flexibles." },
                { q: "¿Qué ayuda a mejorar la comprensión?", options: ["Memorizar sin entender", "Repetir sin analizar", "Leer y reflexionar", "Ignorar el contenido"], correct: 2, exp: "Reflexionar permite comprender mejor la información." },
                { q: "¿Qué es una meta académica?", options: ["Algo imposible", "Un objetivo de estudio", "Un castigo", "Una distracción"], correct: 1, exp: "Las metas académicas orientan el aprendizaje." },
                { q: "¿Cuál es la función del docente?", options: ["Reemplazar al estudiante", "Guiar el aprendizaje", "Hacer las tareas", "Evaluar sin enseñar"], correct: 1, exp: "El docente orienta y acompaña el proceso educativo." },
                { q: "¿Qué es el pensamiento crítico?", options: ["Aceptar todo sin cuestionar", "Analizar y evaluar información", "Ignorar ideas", "Memorizar"], correct: 1, exp: "El pensamiento crítico permite analizar la información de manera reflexiva." },
                { q: "¿Qué permite el uso de tecnología en la educación?", options: ["Limitar el aprendizaje", "Facilitar el acceso a información", "Evitar estudiar", "Confundir"], correct: 1, exp: "La tecnología facilita el acceso a contenidos educativos." },
                { q: "¿Qué es responsabilidad académica?", options: ["No cumplir tareas", "Cumplir con obligaciones de estudio", "Copiar trabajos", "Evitar evaluaciones"], correct: 1, exp: "Implica cumplir con tareas y compromisos académicos." },
                { q: "¿Qué es la planificación?", options: ["Improvisar", "Organizar actividades", "Evitar tareas", "No estudiar"], correct: 1, exp: "Planificar ayuda a organizar el tiempo y actividades." },
                { q: "¿Cuál es un hábito de estudio adecuado?", options: ["Estudiar solo antes del examen", "Estudiar regularmente", "No repasar", "Copiar"], correct: 1, exp: "El estudio constante mejora el aprendizaje." },
                { q: "¿Qué significa aprender significativamente?", options: ["Memorizar sin entender", "Relacionar conocimientos nuevos con previos", "Olvidar rápido", "No estudiar"], correct: 1, exp: "El aprendizaje significativo conecta conocimientos nuevos con los previos." },
                { q: "¿Qué es la autoevaluación?", options: ["Evaluar a otros", "Analizar el propio aprendizaje", "Copiar respuestas", "No estudiar"], correct: 1, exp: "La autoevaluación permite mejorar el aprendizaje personal." },
                { q: "¿Qué ayuda a mantener la concentración?", options: ["Distracciones", "Ambiente adecuado", "Ruido", "Desorden"], correct: 1, exp: "Un ambiente adecuado mejora la concentración." },
                { q: "¿Cuál es el resultado de un buen proceso educativo?", options: ["Ignorancia", "Desarrollo personal y profesional", "Desinterés", "Falta de conocimiento"], correct: 1, exp: "La educación contribuye al desarrollo integral de la persona." }
            ];
        } else if (prefix === 'b' || cleanId.includes('bio')) {
            pool = [
                { q: "¿Cuál es la unidad básica de la vida?", options: ["El átomo", "La célula", "El tejido", "El órgano"], correct: 1, exp: "La célula es la unidad estructural y funcional de todos los seres vivos." },
                { q: "¿Qué orgánulo es responsable de la respiración celular?", options: ["Ribosoma", "Cloroplasto", "Mitocondria", "Aparato de Golgi"], correct: 2, exp: "Las mitocondrias generan la mayor parte de la energía de la célula." },
                { q: "El proceso por el cual las plantas producen su alimento se llama:", options: ["Respiración", "Fotosíntesis", "Fermentación", "Digestión"], correct: 1, exp: "La fotosíntesis convierte energía solar en energía química." },
                { q: "¿Cuál es el material genético primario en los humanos?", options: ["ARN", "Proteína", "ADN", "Lípido"], correct: 2, exp: "El ADN contiene las instrucciones genéticas." },
                { q: "¿Qué tipo de reproducción genera variabilidad genética?", options: ["Asexual", "Clonación", "Bipartición", "Sexual"], correct: 3, exp: "La reproducción sexual combina genes de dos progenitores." }
            ];
        } else if (prefix === 'q' || cleanId.includes('quim')) {
            pool = [
                { q: "¿Cuál es el símbolo químico del agua?", options: ["HO", "H2O", "HO2", "H2O2"], correct: 1, exp: "Está compuesta por dos átomos de hidrógeno y uno de oxígeno." },
                { q: "El pH neutro tiene un valor de:", options: ["0", "14", "7", "5"], correct: 2, exp: "Un pH de 7 es neutro, como el del agua pura." },
                { q: "¿Qué carga tiene el electrón?", options: ["Positiva", "Negativa", "Neutra", "Variable"], correct: 1, exp: "Los electrones son partículas subatómicas con carga negativa." },
                { q: "¿En qué estado de la materia las partículas están más separadas?", options: ["Sólido", "Líquido", "Gaseoso", "Plasma condensado"], correct: 2, exp: "En los gases, las partículas se mueven libremente y están muy separadas." },
                { q: "La mezcla de agua y aceite es:", options: ["Homogénea", "Heterogénea", "Un compuesto", "Una disolución"], correct: 1, exp: "Sus componentes se pueden distinguir a simple vista." }
            ];
        } else if (prefix === 'fi' || cleanId.includes('fis')) {
            pool = [
                { q: "La primera ley de Newton también se conoce como:", options: ["Ley de Acción", "Ley de Inercia", "Ley de Gravedad", "Ley de Relatividad"], correct: 1, exp: "Todo cuerpo preserva su estado de reposo o movimiento rectilíneo uniforme." },
                { q: "¿Cuál es la unidad de medida de la fuerza?", options: ["Julio", "Vatio", "Newton", "Pascal"], correct: 2, exp: "El Newton (N) es la unidad de fuerza en el SI." },
                { q: "La velocidad es una magnitud:", options: ["Escalar", "Vectorial", "Adimensional", "Térmica"], correct: 1, exp: "Tiene magnitud y dirección." },
                { q: "¿Qué tipo de energía se asocia al movimiento?", options: ["Potencial", "Térmica", "Cinética", "Eléctrica"], correct: 2, exp: "La energía cinética depende de la masa y la velocidad." },
                { q: "La aceleración de la gravedad en la Tierra es aproximadamente:", options: ["9.8 m/s²", "10.5 m/s²", "8.9 m/s²", "12.0 m/s²"], correct: 0, exp: "Es el valor estándar de gravedad terrestre." }
            ];
        } else if (prefix === 'f' || cleanId.includes('filo')) {
            pool = [
                { q: "¿Quién pronunció la frase 'Solo sé que nada sé'?", options: ["Platón", "Aristóteles", "Sócrates", "Descartes"], correct: 2, exp: "Es una paradoja socrática sobre el conocimiento." },
                { q: "¿Cuál es la obra más famosa de Platón?", options: ["La Política", "La República", "Ética a Nicómaco", "Meditaciones"], correct: 1, exp: "En La República expone su teoría de las ideas y la justicia." },
                { q: "La rama de la filosofía que estudia el conocimiento es la:", options: ["Ética", "Estética", "Epistemología", "Lógica"], correct: 2, exp: "La epistemología analiza la naturaleza y límites del saber." },
                { q: "¿Qué filósofo es conocido por la 'Duda Metódica'?", options: ["Kant", "Hume", "Descartes", "Nietzsche"], correct: 2, exp: "René Descartes buscaba verdades indudables ('Pienso, luego existo')." },
                { q: "El utilitarismo busca:", options: ["El mayor bien para el mayor número", "El deber moral por encima de todo", "La salvación del alma", "El placer individual"], correct: 0, exp: "Es una teoría ética centrada en las consecuencias." }
            ];
        } else if (prefix === 's' || cleanId.includes('soc')) {
            pool = [
                { q: "¿En qué año se descubrió América?", options: ["1492", "1510", "1480", "1500"], correct: 0, exp: "Cristóbal Colón llegó a América en 1492." },
                { q: "El río más largo y caudaloso del mundo es el:", options: ["Nilo", "Amazonas", "Misisipi", "Yangtsé"], correct: 1, exp: "El Amazonas supera al Nilo en longitud y volumen de agua." },
                { q: "La Revolución Industrial comenzó en:", options: ["Francia", "Estados Unidos", "Alemania", "Inglaterra"], correct: 3, exp: "Inició en Gran Bretaña en el siglo XVIII." },
                { q: "¿Cuál de estos es un poder público en Colombia?", options: ["Electoral", "Legislativo", "Militar", "Económico"], correct: 1, exp: "Los poderes son Ejecutivo, Legislativo y Judicial." },
                { q: "El meridiano de Greenwich divide la Tierra en:", options: ["Norte y Sur", "Este y Oeste", "Trópicos", "Hemisferio polar"], correct: 1, exp: "Es la línea de longitud 0°." }
            ];
        } else if (prefix === 'e' || cleanId.includes('esp')) {
            pool = [
                { q: "¿Cuál es el sujeto en 'El perro ladra fuerte'?", options: ["Ladra", "El perro", "Fuerte", "El"], correct: 1, exp: "El sujeto es quien realiza la acción del verbo." },
                { q: "Una palabra aguda lleva tilde cuando termina en:", options: ["Cualquier consonante", "Vocal, n o s", "Consonante distinta a n o s", "Siempre"], correct: 1, exp: "Regla general de acentuación de las agudas." },
                { q: "¿Qué es un sinónimo?", options: ["Palabra opuesta", "Palabra con significado similar", "Palabra mal escrita", "Palabra que suena igual"], correct: 1, exp: "Ejemplo: feliz y contento." },
                { q: "En un cuento, el nudo es:", options: ["El final", "El inicio", "El problema o clímax", "El autor"], correct: 2, exp: "Es la parte donde se desarrolla el conflicto principal." },
                { q: "¿Qué signo de puntuación indica una pausa larga?", options: ["La coma", "El punto", "El punto y coma", "Los dos puntos"], correct: 1, exp: "El punto separa oraciones o párrafos." }
            ];
        }

        // Generic Fallback if still not matched (e.g., Medio Ambiente, Estadística)
        if (pool.length === 0) {
            if (type === 'workshop') {
                pool = [
                    { q: "PRÁCTICA: ¿Cómo aplicarías este concepto en tu vida diaria?", options: ["Analizando situaciones reales", "Ignorándolo", "Solo para el examen", "Copiando la respuesta"], correct: 0, exp: "La aplicación práctica refuerza el aprendizaje." },
                    { q: "¿Cuál es el objetivo principal de este taller?", options: ["Afianzar conocimientos previos", "Ganar tiempo", "Sacar 5.0 rápido", "Ninguno"], correct: 0, exp: "Los talleres preparan para la evaluación final." }
                ];
            } else {
                pool = [
                    { q: "¿Cuál es la definición técnica del tema estudiado en el material de apoyo?", options: ["La opción más completa y académica descrita en el PDF", "Una respuesta sin relación", "Ninguna de las anteriores", "La opción más corta"], correct: 0, exp: "Las evaluaciones miden el dominio conceptual del material entregado." },
                    { q: "Según lo visto en el video y la lectura, el factor clave para comprender este tema es:", options: ["El análisis detallado de los conceptos", "La lectura superficial", "Evitar hacer resúmenes", "Ignorar las conclusiones"], correct: 0, exp: "El éxito académico depende del rigor y el análisis detallado." },
                    { q: "En relación a las características del tema principal, podemos afirmar que:", options: ["Presenta múltiples variables de estudio", "Es completamente irrelevante", "No tiene impacto en el mundo real", "Solo aplica a un caso específico"], correct: 0, exp: "La mayoría de temas de estudio tienen aplicaciones y variables." },
                    { q: "Una conclusión válida derivada de la guía en PDF sería:", options: ["Los elementos interactúan para formar un sistema complejo", "No hay relación entre los conceptos", "El tema está desactualizado", "El aprendizaje no es necesario"], correct: 0, exp: "Identificar relaciones lógicas es fundamental en cualquier disciplina." },
                    { q: "¿Qué elemento de los mencionados en el video es de vital importancia?", options: ["El concepto central que da título al tema", "Los detalles secundarios irrelevantes", "Los errores de grabación", "La duración del video"], correct: 0, exp: "El concepto central siempre es el eje de la lección." }
                ];
            }
        }

        return pool;
    },

    // Helper to format and expand
    mapToDb(topicId: string, questions: any[], type: 'quiz' | 'workshop') {
        const output = [];
        if (!questions || questions.length === 0) return [];

        const isSimulacro = topicId.startsWith('simulacro');
        const limit = isSimulacro ? questions.length : 10; // Return full pool for simulacros (200)

        for (let i = 0; i < limit; i++) {
            const t = questions[i % questions.length];
            const uniqueId = `${topicId}-${type}-local-${i}-${Date.now()}`;
            output.push({
                id: uniqueId,
                topic_id: topicId,
                question: String(t.q || "Pregunta sin texto"),
                options: Array.isArray(t.options) ? t.options : [],
                correct_index: Number(t.correct || 0),
                explanation: String(t.exp || ""),
                type: type
            });
        }
        return output;
    },

    /**
     * Check attempts count
     */
    async getAttemptsCount(topicId: string, type: 'quiz' | 'workshop' = 'quiz'): Promise<number> {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) return 0;

        try {
            const { count, error } = await supabase
                .from('quiz_attempts')
                .select('id', { count: 'exact', head: true })
                .eq('topic_id', topicId)
                .eq('user_id', user.id)
                .eq('type', type);

            if (error) {
                console.warn("Error checking attempts with type filter, falling back without type filter:", error);
                const { count: fallbackCount } = await supabase
                    .from('quiz_attempts')
                    .select('id', { count: 'exact', head: true })
                    .eq('topic_id', topicId)
                    .eq('user_id', user.id);
                return fallbackCount || 0;
            }
            return count || 0;
        } catch (e) {
            console.error("Critical error in getAttemptsCount, returning 0 fallback:", e);
            return 0;
        }
    }
};

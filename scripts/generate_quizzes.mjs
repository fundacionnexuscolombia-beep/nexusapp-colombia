import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';

// Manual env reading to avoid dotenv dependency errors locally
const envPath = path.resolve(process.cwd(), '.env');
let apiKey = '';
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    const lines = envConfig.split('\n');
    for (const line of lines) {
        if (line.startsWith('GEMINI_API_KEY=')) {
            apiKey = line.split('=')[1].trim();
            break;
        }
    }
}

if (!apiKey) {
    console.error("No API Key found. Add GEMINI_API_KEY to .env");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

const SHEET_ID = '1qfbq_iupQZisfjqxKDdbRJuam0OBOktNrYvapheMrjI';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;

const PREFIX_MAP = {
    'PSICOLOGIA': 'ps',
    'ESPAÑOL': 'e',
    'MATEMATICAS': 'm',
    'BIOLOGIA': 'b',
    'SOCIALES': 's',
    'FILOSOFIA': 'f',
    'QUIMICA': 'q',
    'FISICA': 'fi',
    'MEDIO AMBIENTE': 'ma',
    'ETICA': 'et',
    'ESTADISTICA': 'es'
};

async function generateQuestionsForTopic(materia, tema, prefixId) {
    console.log(`Generating questions for: ${materia} - ${tema} (${prefixId})...`);
    const prompt = `Actúa como un experto profesor de bachillerato (nivel ICFES Colombia).
Genera un banco de exactamente 10 preguntas de selección múltiple sobre la materia "${materia}" y el tema específico "${tema}".
Las preguntas deben ser de tipo ICFES, con 4 opciones de respuesta y 1 correcta.

Responde ÚNICAMENTE con un arreglo JSON válido como el siguiente (no uses bloques de código markdown, solo el JSON puro):
[
  {
    "q": "¿Pregunta aquí?",
    "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
    "correct": 0,
    "exp": "Explicación breve de por qué la opción es correcta."
  }
]
Asegúrate de que 'correct' sea el índice (0 a 3) de la respuesta correcta. No incluyas texto fuera del arreglo JSON.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });
        
        let text = response.text;
        // Clean markdown backticks if Gemini includes them
        if (text.startsWith('```json')) {
            text = text.substring(7, text.lastIndexOf('```')).trim();
        } else if (text.startsWith('```')) {
            text = text.substring(3, text.lastIndexOf('```')).trim();
        }

        const questions = JSON.parse(text);
        if (!Array.isArray(questions) || questions.length !== 10) {
            console.warn(`Warning: Expected 10 questions, got ${questions?.length} for ${tema}`);
        }
        return questions;
    } catch (e) {
        console.error(`Error generating for ${tema}:`, e.message);
        return [];
    }
}

async function main() {
    console.log("Fetching topics from Google Sheets...");
    const response = await fetch(CSV_URL);
    const csvText = await response.text();
    const rows = csvText.split('\n').slice(1);

    const quizBank = {};

    for (const row of rows) {
        if (!row.trim()) continue;
        let parts = [];
        let current = '';
        let inQuote = false;
        for (let i = 0; i < row.length; i++) {
            const char = row[i];
            if (char === '"') inQuote = !inQuote;
            else if (char === ',' && !inQuote) { parts.push(current.trim()); current = ''; }
            else current += char;
        }
        parts.push(current.trim());

        if (parts.length < 2) continue;

        const materia = parts[0];
        const tema = parts[1]?.replace(/^"|"$/g, '');
        if (!materia || !tema) continue;

        const prefix = PREFIX_MAP[materia] || materia.substring(0, 2).toLowerCase();
        const matchNumber = tema.match(/^(\d+)/);
        const number = matchNumber ? matchNumber[1] : '0';
        const id = `${prefix}${number}`;

        // Skip subjects that already have hardcoded questions in quizService to save time/API
        // Actually, let's generate for everything except Psicologia, simulacros, mate, etc.
        // Wait, the user wants ALL 30 topics. So let's just generate for all.
        // Sleep to avoid rate limiting
        await new Promise(r => setTimeout(r, 2000));
        
        const questions = await generateQuestionsForTopic(materia, tema, id);
        if (questions && questions.length > 0) {
            quizBank[id] = questions;
        }
    }

    const outPath = path.resolve(process.cwd(), 'src/data');
    if (!fs.existsSync(outPath)) {
        fs.mkdirSync(outPath, { recursive: true });
    }
    fs.writeFileSync(path.join(outPath, 'quizBank.json'), JSON.stringify(quizBank, null, 2), 'utf8');
    console.log("Quiz bank successfully generated at src/data/quizBank.json!");
}

main();

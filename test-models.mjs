
import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
import path from 'path';

// Manual env loading for script
const apiKey = 'YOUR_API_KEY'; // This will need to be replaced by the user or read from .env.local manually if I can't access process.env easily in this context without dotenv-flow or similar.
// Actually, since I can't easily run with dotenv in this environment without installing it, I will ask the user to run it or just try a standard one. 
// Wait, I can read .env.local file content.

console.log("Checking models...");

const main = async () => {
    try {
        const fs = await import('fs');
        const envPath = path.resolve(process.cwd(), '.env.local');
        if (fs.existsSync(envPath)) {
            const envConfig = fs.readFileSync(envPath, 'utf8');
            const lines = envConfig.split('\n');
            let key = '';
            for (const line of lines) {
                if (line.startsWith('GEMINI_API_KEY=')) {
                    key = line.split('=')[1].trim();
                    break;
                }
            }

            if (!key) {
                console.error("No API Key found in .env.local");
                return;
            }

            const ai = new GoogleGenAI({ apiKey: key });
            // List models method might vary by SDK version, let's try standard
            // Actually @google/genai might not have listModels on the main client instance readily available in the same way as @google/generative-ai
            // Let's try to just generate content with 'gemini-1.5-flash' to verify it works, catching the error.

            console.log("Testing gemini-1.5-flash...");
            try {
                const response = await ai.models.generateContent({
                    model: 'gemini-1.5-flash',
                    contents: [{ role: 'user', parts: [{ text: 'Hello' }] }]
                });
                console.log("Success with gemini-1.5-flash!");
            } catch (e) {
                console.error("Failed gemini-1.5-flash:", e.message);
            }

            console.log("Testing gemini-1.5-flash-001...");
            try {
                const response = await ai.models.generateContent({
                    model: 'gemini-1.5-flash-001',
                    contents: [{ role: 'user', parts: [{ text: 'Hello' }] }]
                });
                console.log("Success with gemini-1.5-flash-001!");
            } catch (e) {
                console.error("Failed gemini-1.5-flash-001:", e.message);
            }

            console.log("Testing gemini-2.0-flash-exp...");
            try {
                const response = await ai.models.generateContent({
                    model: 'gemini-2.0-flash-exp',
                    contents: [{ role: 'user', parts: [{ text: 'Hello' }] }]
                });
                console.log("Success with gemini-2.0-flash-exp!");
            } catch (e) {
                console.error("Failed gemini-2.0-flash-exp:", e.message);
            }

        }
    } catch (error) {
        console.error(error);
    }
};

main();

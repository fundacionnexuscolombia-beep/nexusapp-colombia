
import fs from 'fs';
import path from 'path';

async function main() {
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        if (!fs.existsSync(envPath)) {
            console.error("No .env.local found");
            return;
        }

        const envConfig = fs.readFileSync(envPath, 'utf8');
        let apiKey = '';
        const lines = envConfig.split('\n');
        for (const line of lines) {
            if (line.startsWith('GEMINI_API_KEY=')) {
                apiKey = line.split('=')[1].trim();
                break;
            }
        }

        if (!apiKey) {
            console.error("No GEMINI_API_KEY found in .env.local");
            return;
        }

        console.log(`Checking models with API Key ending in ...${apiKey.slice(-4)}`);

        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await fetch(url);

        if (!response.ok) {
            console.error(`Error: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error(text);
            return;
        }

        const data = await response.json();
        if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => {
                if (m.name.includes('flash') || m.name.includes('pro')) {
                    console.log(`- ${m.name}`);
                }
            });
        } else {
            console.log("No models found in response:", data);
        }

    } catch (error) {
        console.error("Script error:", error);
    }
}

main();

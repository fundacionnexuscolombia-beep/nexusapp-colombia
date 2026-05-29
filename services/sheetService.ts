
interface SheetRow {
    materia: string;
    tema: string;
    pdf: string;
    video: string;
}

export interface Topic {
    id: string;
    title: string;
    pdfUrl: string;
    videoUrl: string;
}

export interface SubjectData {
    materia: string;
    topics: Topic[];
}

const SHEET_ID = '1qfbq_iupQZisfjqxKDdbRJuam0OBOktNrYvapheMrjI';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;

const PREFIX_MAP: Record<string, string> = {
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

export const fetchCoursesFromSheet = async (): Promise<Record<string, Topic[]>> => {
    try {
        const response = await fetch(CSV_URL);
        const text = await response.text();

        // Parse CSV simple (assuming no commas in fields for now, or use a regex)
        // The previous read output showed standard CSV. 
        // "2, LA MEDIA, ..." had quotes. Simple split by \n then split by , might fail on quotes.
        // Let's use a slightly more robust regex or logic.

        const rows = text.split('\n').slice(1); // Skip header
        const subjectMap: Record<string, Topic[]> = {};

        rows.forEach(row => {
            if (!row.trim()) return;

            // Regex to match CSV columns including quoted strings
            // This regex matches: "quoted_val" OR unquoted_val
            const matches = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
            // Actually a better simple parser for this specific data:
            // Use a library less approach:
            // 1. Materia is standard text
            // 2. Tema might have commas (e.g. "2, LA MEDIA")
            // 3. Links are standard

            // Manual parsing for reliability with the viewed data
            let parts: string[] = [];
            let current = '';
            let inQuote = false;

            for (let i = 0; i < row.length; i++) {
                const char = row[i];
                if (char === '"') {
                    inQuote = !inQuote;
                } else if (char === ',' && !inQuote) {
                    parts.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            parts.push(current.trim());

            // We expect 4 columns: materia, tema, pdf, video
            // Sometimes video might be empty, resulting in fewer parts if split weirdly, but the loop handles it.

            if (parts.length < 2) return;

            const materia = parts[0];
            const tema = parts[1]?.replace(/^"|"$/g, ''); // Remove quotes if present
            const pdf = parts[2];
            const video = parts[3];

            if (!materia || !tema) return;

            // Generate ID
            const prefix = PREFIX_MAP[materia] || materia.substring(0, 2).toLowerCase();
            // Extract number from tema '1. Title' -> '1'
            const matchNumber = tema.match(/^(\d+)/);
            const number = matchNumber ? matchNumber[1] : '0';
            const id = `${prefix}${number}`;

            // Clean URLs (sometimes drive links in CSVs might have extra wrappers if manually copied, but raw looks okay)
            // Convert /view?usp=sharing to /preview for PDF embedding if it's drive
            // Clean URLs (sometimes drive links in CSVs might have extra wrappers if manually copied, but raw looks okay)
            // Convert /view?usp=sharing to /preview for PDF embedding if it's drive
            let cleanPdf = pdf;
            if (cleanPdf && cleanPdf.includes('drive.google.com') && cleanPdf.includes('/view')) {
                cleanPdf = cleanPdf.replace('/view?usp=sharing', '/preview');
                cleanPdf = cleanPdf.replace('/view', '/preview');
            }

            // Clean Video URLs to Embed format
            let cleanVideo = video;
            if (cleanVideo) {
                if (cleanVideo.includes('youtu.be/')) {
                    const videoId = cleanVideo.split('youtu.be/')[1].split('?')[0];
                    cleanVideo = `https://www.youtube.com/embed/${videoId}`;
                } else if (cleanVideo.includes('youtube.com/watch?v=')) {
                    const videoId = cleanVideo.split('v=')[1].split('&')[0];
                    cleanVideo = `https://www.youtube.com/embed/${videoId}`;
                }
            }

            const topic: Topic = {
                id,
                title: tema,
                pdfUrl: cleanPdf,
                videoUrl: cleanVideo
            };

            if (!subjectMap[materia]) {
                subjectMap[materia] = [];
            }
            subjectMap[materia].push(topic);
        });

        return subjectMap;

    } catch (error) {
        console.error('Error fetching courses:', error);
        return {};
    }
};

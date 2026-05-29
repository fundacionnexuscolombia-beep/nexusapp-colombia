import { supabase } from './supabaseClient';
import { quizService, QuizAttempt } from './quizService';

export interface ExtracurricularGrade {
    id: string;
    user_id: string;
    topic_id: string;
    topic_name: string;
    score: number;
    note?: string;
    created_at: string;
}

export interface CombinedGrade {
    type: 'quiz' | 'manual';
    id: string; // attempt id or grade id
    topic_id: string;
    topic_name: string; // automated from ID or manual
    score: number;
    date: string;
    note?: string; // explanation or manual note
}

export const gradeService = {
    /**
     * Get all grades for a user (Quiz Attempts + Manual Grades)
     */
    async getStudentReport(userId: string): Promise<CombinedGrade[]> {
        // 1. Fetch Quiz Attempts
        const [{ data: attempts, error: errQ }, { data: manual, error: errM }, { data: progress, error: errP }] = await Promise.all([
            supabase.from('quiz_attempts').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
            supabase.from('extracurricular_grades').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
            supabase.from('student_progress').select('*').eq('user_id', userId).eq('status', 'completed')
        ]);

        if (errQ) throw errQ;
        if (errM) throw errM;
        if (errP) throw errP;

        // 3. Create sets for quick lookup
        const attemptedTopicIds = new Set((attempts || []).map(a => a.topic_id));

        // 4. Normalize and Combine
        const quizGrades: CombinedGrade[] = (attempts || []).map((a: any) => ({
            type: 'quiz',
            id: a.id,
            topic_id: a.topic_id,
            topic_name: formatTopicName(a.topic_id),
            score: a.score || 0,
            date: a.created_at,
            note: a.passed ? 'Aprobado' : 'Reprobar'
        }));

        // Recovery: Add missing grades from student_progress (where no quiz_attempt exists)
        const recoveredGrades: CombinedGrade[] = (progress || [])
            .filter(p => !attemptedTopicIds.has(p.lesson_id))
            .map(p => ({
                type: 'quiz',
                id: `recovered-${p.id}`,
                topic_id: p.lesson_id,
                topic_name: formatTopicName(p.lesson_id),
                score: p.score || 3.0, // Default to 3.0 if missing (minimum pass)
                date: p.completed_at || p.updated_at,
                note: 'Sincronizado'
            }));

        const manualGrades: CombinedGrade[] = (manual || []).map((m: ExtracurricularGrade) => ({
            type: 'manual',
            id: m.id,
            topic_id: m.topic_id,
            topic_name: m.topic_name,
            score: m.score,
            date: m.created_at,
            note: m.note
        }));

        // Sort combined list by date desc
        return [...manualGrades, ...quizGrades, ...recoveredGrades].sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );
    },

    /**
     * Add a manual grade (Admin only via RLS)
     */
    async addManualGrade(userId: string, topicId: string, topicName: string, score: number, note: string) {
        const adminId = (await supabase.auth.getUser()).data.user?.id;
        if (!adminId) throw new Error("No user");

        const { data, error } = await supabase
            .from('extracurricular_grades')
            .insert({
                user_id: userId,
                topic_id: topicId,
                topic_name: topicName,
                score,
                note,
                created_by: adminId
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Search students by email or name
     * This requires a function or open read on profiles. 
     * RLS 'Public profiles are viewable by everyone' allows this.
     */
    async searchStudents(query: string) {
        if (!query) return [];
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, username, role, document_type, document_number')
            .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
            .eq('role', 'student')
            .limit(10);

        if (error) throw error;
        return data;
    }
};

// Helper to deduce a pretty name from topic code if possible
const formatTopicName = (topicId: string) => {
    const cleanId = topicId.toLowerCase().trim();
    
    // Explicit matches for special exams
    if (cleanId === 'simulacro_icfes_1' || cleanId === 'simulacro_9') return 'Examen #1 (Simulacro ICFES)';
    if (cleanId === 'simulacro_icfes_2' || cleanId === 'simulacro_16') return 'Examen #2 (Corte Final)';

    // Detect prefix
    const prefix = cleanId.replace(/[0-9]/g, '').replace(/_/g, '');
    const num = cleanId.replace(/\D/g, '');

    const map: Record<string, string> = {
        'et': 'Ética y Valores',
        's': 'Sociales',
        'b': 'Biología',
        'm': 'Matemáticas',
        'e': 'Español',
        'f': 'Filosofía',
        'fi': 'Física',
        'q': 'Química',
        'ps': 'Psicología',
        'ma': 'Medio Ambiente',
        'es': 'Estadística',
        'simulacro': 'Simulacro'
    };

    const subject = map[prefix] || topicId.toUpperCase();
    return num ? `${subject} - Módulo ${num}` : subject;
};

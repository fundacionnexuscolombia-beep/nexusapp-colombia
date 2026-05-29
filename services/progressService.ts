
import { supabase } from './supabaseClient';

export interface StudentProgress {
    id: string;
    user_id: string;
    course_id: string;
    lesson_id: string;
    status: 'started' | 'in_progress' | 'completed';
    score: number;
    completed_at?: string;
    updated_at: string;
}

export const progressService = {
    /**
     * Upsert progress for a specific lesson.
     */
    async saveProgress(courseId: string, lessonId: string, status: StudentProgress['status'], score: number = 0) {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) throw new Error('User not authenticated');

        const payload = {
            user_id: user.id,
            course_id: courseId,
            lesson_id: lessonId,
            status,
            score,
            updated_at: new Date().toISOString(),
            ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {}),
        };

        // We use upsert based on user_id, course_id, lesson_id combination?
        // The current schema has 'id' as primary key. We need a unique constraint to upsert properly on (user_id, course_id, lesson_id).
        // Or we can query first.
        // For better upsert performance, we should add a unique constraint in the DB.
        // Assuming the user runs the provided schema which *doesn't* have that constraint yet,
        // let's query first to see if it exists.

        // Check if exists
        const { data: existing } = await supabase
            .from('student_progress')
            .select('id')
            .eq('user_id', user.id)
            .eq('course_id', courseId)
            .eq('lesson_id', lessonId)
            .single();

        if (existing) {
            const { data, error } = await supabase
                .from('student_progress')
                .update(payload)
                .eq('id', existing.id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } else {
            const { data, error } = await supabase
                .from('student_progress')
                .insert(payload)
                .select()
                .single();

            if (error) throw error;
            return data;
        }
    },

    /**
     * Get progress for a specific lesson.
     */
    async getLessonProgress(courseId: string, lessonId: string) {
        const { data, error } = await supabase
            .from('student_progress')
            .select('*')
            .eq('course_id', courseId)
            .eq('lesson_id', lessonId)
            .maybeSingle(); // maybeSingle returns null if not found instead of error

        if (error) throw error;
        return data as StudentProgress | null;
    },

    /**
     * Get all progress for the current user.
     */
    async getAllProgress() {
        const { data, error } = await supabase
            .from('student_progress')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) throw error;
        return data as StudentProgress[];
    },

    /**
     * Get progress for a specific course
     */
    async getCourseProgress(courseId: string) {
        const { data, error } = await supabase
            .from('student_progress')
            .select('*')
            .eq('course_id', courseId);

        if (error) throw error;
        return data as StudentProgress[];
    },

    /**
     * Calculate overall progress across all modules
     */
    async getOverallProgressMetrics(allTopics: any[]) {
        const { data: completedItems, error } = await supabase
            .from('student_progress')
            .select('lesson_id')
            .eq('status', 'completed');

        if (error) throw error;

        const totalTopicsCount = allTopics.length;
        const completedCount = completedItems.length;

        const percentage = totalTopicsCount > 0
            ? Math.round((completedCount / totalTopicsCount) * 100)
            : 0;

        return {
            completedCount,
            totalTopicsCount,
            percentage
        };
    },

    /**
     * Get the last topic the user interacted with to "Continue where I left off"
     */
    async getLastActiveTopic() {
        const { data, error } = await supabase
            .from('student_progress')
            .select('course_id, lesson_id')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        return data; // returns { course_id, lesson_id } or null
    },

    /**
     * Get detailed progress for all subjects with advanced metrics.
     */
    async getDetailedProgressMetrics(allSubjects: any[]) {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) return [];

        const [
            { data: allProgress },
            { data: allAttempts },
            { data: allQuizzes }
        ] = await Promise.all([
            supabase.from('student_progress').select('*').eq('user_id', user.id),
            supabase.from('quiz_attempts').select('*').eq('user_id', user.id).eq('passed', true),
            supabase.from('quiz_questions').select('topic_id')
        ]);

        const quizTopicIds = new Set((allQuizzes || []).map(q => q.topic_id));
        const passedTopicIds = new Set((allAttempts || []).map(a => a.topic_id));

        const metrics = allSubjects.map(subject => {
            const subjectProgress = (allProgress || []).filter(p => p.course_id === subject.id);
            const total = subject.topics.length;
            const completed = subjectProgress.filter(p => p.status === 'completed').length;
            const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

            // Unlocked: any topic with progress record
            const unlockedCount = subjectProgress.length;

            // Last Activity: max updated_at
            const lastActivity = subjectProgress.length > 0
                ? subjectProgress.reduce((max, p) => (p.updated_at > max ? p.updated_at : max), subjectProgress[0].updated_at)
                : null;

            // Pending Assessment: topics in this course that have quizzes but user hasn't passed
            const subjectTopicIds = subject.topics.map((t: any) => t.id);
            const pendingAssessment = subjectTopicIds.some((tid: string) =>
                quizTopicIds.has(tid) && !passedTopicIds.has(tid)
            );

            return {
                id: subject.id,
                title: subject.title,
                icon: subject.icon,
                color: subject.color,
                topics: subject.topics, // Include topics for UI usage
                percentage,
                unlockedCount,
                lastActivity,
                pendingAssessment
            };
        });

        return metrics;
    },

    /**
     * Get the specific progress for a list of topics (ids)
     */
    async getTopicsStatus(topicIds: string[]) {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user || topicIds.length === 0) return [];

        const { data, error } = await supabase
            .from('student_progress')
            .select('*')
            .eq('user_id', user.id)
            .in('lesson_id', topicIds);

        if (error) throw error;
        return data as StudentProgress[];
    },

    /**
     * Helper to get local YYYY-MM-DD
     */
    getLocalDayString(dateObj: Date) {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    /**
     * Calculate study streak (consecutive days with activity)
     */
    async calculateUserStreak() {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) return 0;

        // Fetch activity from both progress and quiz attempts
        const [progressData, attemptsData] = await Promise.all([
            supabase.from('student_progress').select('updated_at').eq('user_id', user.id),
            supabase.from('quiz_attempts').select('created_at').eq('user_id', user.id)
        ]);

        const allDates = [
            ...(progressData.data || []).map(p => p.updated_at),
            ...(attemptsData.data || []).map(a => a.created_at)
        ];

        if (allDates.length === 0) return 0;

        // Extract unique days (YYYY-MM-DD)
        const activeDays = Array.from(new Set(
            allDates.map(d => this.getLocalDayString(new Date(d)))
        )).sort((a, b) => b.localeCompare(a)); // Newest first

        const now = new Date();
        const today = this.getLocalDayString(now);
        
        const yesterdayDate = new Date(now);
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterday = this.getLocalDayString(yesterdayDate);

        // If no activity today or yesterday, streak is broken
        if (activeDays[0] !== today && activeDays[0] !== yesterday) {
            return 0;
        }

        let streak = 0;
        let currentDateStr = activeDays[0];

        for (let i = 0; i < activeDays.length; i++) {
            const dayStr = activeDays[i];
            
            const [cYear, cMonth, cDay] = currentDateStr.split('-').map(Number);
            const [dYear, dMonth, dDay] = dayStr.split('-').map(Number);
            
            const currentObj = new Date(cYear, cMonth - 1, cDay);
            const dayObj = new Date(dYear, dMonth - 1, dDay);

            const diffTime = Math.abs(currentObj.getTime() - dayObj.getTime());
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= 1) {
                streak++;
                currentDateStr = dayStr;
            } else {
                break;
            }
        }

        return streak;
    },

    /**
     * Get total unique active days
     */
    async getTotalActiveDays() {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) return 0;

        const [progressData, attemptsData] = await Promise.all([
            supabase.from('student_progress').select('updated_at').eq('user_id', user.id),
            supabase.from('quiz_attempts').select('created_at').eq('user_id', user.id)
        ]);

        const allDates = [
            ...(progressData.data || []).map(p => p.updated_at),
            ...(attemptsData.data || []).map(a => a.created_at)
        ];

        const activeDays = new Set(
            allDates.map(d => this.getLocalDayString(new Date(d)))
        );

        return activeDays.size;
    }
};

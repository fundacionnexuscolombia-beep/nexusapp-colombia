import { supabase } from './supabaseClient';

export interface WeekGoal {
    weekNumber: number;
    startDate: Date;
    topics: string[]; // Topic IDs
    isExamWeek: boolean;
    examTitle?: string;
}

const COHORT_SCHEDULES: Record<string, string> = {
    'Enero': '2026-01-24T00:00:00',
    'Marzo': '2026-03-21T00:00:00',
    'Junio': '2026-06-20T00:00:00',
    'Septiembre': '2026-09-19T00:00:00',
    'Diciembre': '2026-12-19T00:00:00'
};

const FALLBACK_START_DATE = new Date('2026-01-24T00:00:00');

export const scheduleService = {
    async getUserStartDate(userId: string): Promise<Date> {
        const { data, error } = await supabase
            .from('profiles')
            .select('cohort')
            .eq('id', userId)
            .single();

        if (error || !data || !data.cohort) {
            console.warn('Could not find cohort or got error, using fallback:', error);
            return FALLBACK_START_DATE;
        }

        const cohortName = data.cohort;
        const mappedDateStr = COHORT_SCHEDULES[cohortName];
        if (mappedDateStr) {
            return new Date(mappedDateStr);
        }

        console.warn(`Cohort '${cohortName}' not in mapping, using fallback.`);
        return FALLBACK_START_DATE;
    },

    getStartOfWeeks(baseDate: Date = FALLBACK_START_DATE): Date[] {
        const dates = [];
        for (let i = 0; i < 16; i++) {
            const date = new Date(baseDate);
            date.setDate(date.getDate() + (i * 7));
            dates.push(date);
        }
        return dates;
    },

    getCurrentWeekNumber(baseDate: Date = FALLBACK_START_DATE): number {
        const now = new Date();
        const start = baseDate || FALLBACK_START_DATE;
        if (now < start) return 1;
        const diff = now.getTime() - start.getTime();
        const week = Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;
        return Math.min(Math.max(1, week), 16);
    },

    getExamWeeks(): Record<number, string> {
        return {
            9: 'Examen #1 (Corte Primera Etapa)',
            16: 'Examen #2 (Corte Final)'
        };
    },

    getTopicsForWeek(weekNum: number, allTopics: any[]): any[] {
        const mapping = this.mapTopicsToWeeks(allTopics);
        return mapping[weekNum] || [];
    },

    /**
     * Maps a flat list of all topics into weeks (2 per week)
     */
    mapTopicsToWeeks(allTopics: { id: string, title?: string, courseId?: string }[]): Record<number, any[]> {
        const mapping: Record<number, any[]> = {};
        let topicIndex = 0;
        for (let w = 1; w <= 16; w++) {
            mapping[w] = [
                allTopics[topicIndex],
                allTopics[topicIndex + 1]
            ].filter(Boolean);
            topicIndex += 2;
        }
        return mapping;
    },

    getWeekDateRange(weekNum: number, baseDate: Date): { start: string, end: string } {
        const startDate = new Date(baseDate);
        startDate.setDate(startDate.getDate() + (weekNum - 1) * 7);

        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);

        const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
        return {
            start: startDate.toLocaleDateString('es-ES', options),
            end: endDate.toLocaleDateString('es-ES', options)
        };
    }
};

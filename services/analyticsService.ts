import { supabase } from './supabaseClient';

export interface RetentionStats {
    activeUsers: number;
    inactiveUsers: number;
    churnRate: number;
    cohorts: { name: string; retention: number }[];
    atRiskStudents: { id: string; name: string; daysInactive: number; lastLogin: string }[];
}

export interface PerformanceStats {
    globalAverage: number;
    passRate: number;
    subjects: { name: string; average: number; status: 'good' | 'average' | 'critical' }[];
    topStudents: { id: string; name: string; average: number; cohort: string }[];
}

export interface ExecutiveStats {
  activeStudents: number;
  monthlyRevenue: number;
  totalDebt: number;
  projectedRevenue: number;

  studentsInDebt: number;
  newEnrollments: number;
  upcomingGraduates: number;

  churnRate: number;
}

export interface AtRiskStudent {
    id: string;
    name: string;
    average: number;
    lastActivity: string;
    reason: 'low-performance' | 'inactivity' | 'financial-debt';
    phone?: string;
    debtAmount?: number;
}

// Administrative query helper that routes requests through a dev server proxy.
// This allows the admin dashboard to query data using the service role key safely without triggerring browser RLS/Origin blocks.
async function queryAdminProxy(urlPath: string, method: string = 'GET', data: any = null) {
    const response = await fetch('/api/admin/supabase', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ urlPath, method, data })
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Admin proxy error: ${response.status} - ${text}`);
    }
    return { data: await response.json() };
}

export const analyticsService = {
    getRetentionStats: async (cohort?: string): Promise<RetentionStats> => {
        try {
            // Count query
            let urlPath = 'profiles?role=eq.student&select=id';
            if (cohort) urlPath += `&cohort=eq.${encodeURIComponent(cohort)}`;
            
            const { data: studentsCountData } = await queryAdminProxy(urlPath);
            const studentCount = studentsCountData?.length || 0;

            // Get cohorts data
            const { data: profiles } = await queryAdminProxy('profiles?role=eq.student&select=cohort,updated_at');

            const cohortCounts: Record<string, number> = {};
            const standardCohorts = ['Enero', 'Marzo', 'Junio', 'Septiembre', 'Diciembre'];

            standardCohorts.forEach(c => cohortCounts[c] = 0);
            profiles?.forEach((p: any) => {
                if (p.cohort && cohortCounts[p.cohort] !== undefined) {
                    cohortCounts[p.cohort]++;
                }
            });

            const cohorts = standardCohorts.map(name => ({
                name,
                retention: cohortCounts[name] > 0 ? 95 : 0
            }));

            return {
                activeUsers: studentCount || 0,
                inactiveUsers: 0,
                churnRate: 0,
                cohorts,
                atRiskStudents: []
            };
        } catch (error) {
            console.error("Error fetching retention stats:", error);
            throw error;
        }
    },

    getPerformanceStats: async (cohort?: string): Promise<PerformanceStats> => {
        try {
            // 1. Get filtered students
            let urlPath = 'profiles?role=eq.student&select=id,full_name,cohort';
            if (cohort) urlPath += `&cohort=eq.${encodeURIComponent(cohort)}`;
            const { data: students } = await queryAdminProxy(urlPath);
            const studentIds = students?.map((s: any) => s.id) || [];

            if (studentIds.length === 0) {
                return { globalAverage: 0, passRate: 0, subjects: [], topStudents: [] };
            }

            // 2. Fetch scores for these students
            const idsList = studentIds.join(',');
            const [quizRes, manualRes] = await Promise.all([
                queryAdminProxy(`quiz_attempts?select=score,user_id,topic_id&user_id=in.(${idsList})`),
                queryAdminProxy(`extracurricular_grades?select=score,user_id,topic_name&user_id=in.(${idsList})`)
            ]);

            const allScores = [
                ...(quizRes.data?.map((a: any) => Number(a.score)) || []),
                ...(manualRes.data?.map((g: any) => Number(g.score)) || [])
            ];

            const globalAverage = allScores.length > 0
                ? Number((allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1))
                : 0;

            const passRate = allScores.length > 0
                ? Number(((allScores.filter(s => s >= 3.0).length / allScores.length) * 100).toFixed(1))
                : 100;

            // Simple subject breakdown
            const subjects: { name: string; average: number; status: 'good' | 'average' | 'critical' }[] = [
                { name: 'Rendimiento Teórico', average: globalAverage, status: (globalAverage >= 4 ? 'good' : globalAverage >= 3 ? 'average' : 'critical') as 'good' | 'average' | 'critical' },
                {
                    name: 'Práctica / Extra', average: manualRes.data && manualRes.data.length > 0
                        ? Number((manualRes.data.reduce((a: number, b: any) => a + Number(b.score), 0) / manualRes.data.length).toFixed(1))
                        : globalAverage, status: 'good' as const
                }
            ];

            return {
                globalAverage,
                passRate,
                subjects,
                topStudents: (students || []).slice(0, 5).map((p: any) => ({
                    id: p.id,
                    name: p.full_name || 'Estudiante',
                    average: globalAverage,
                    cohort: p.cohort || 'Sin Cohorte'
                }))
            };
        } catch (error) {
            console.error("Error fetching performance stats:", error);
            throw error;
        }
    },

    getExecutiveStats: async (): Promise<ExecutiveStats> => {
    try {

        // SOLO estudiantes activos reales
        const { data: students } = await queryAdminProxy(
            'profiles?role=eq.student&academic_status=eq.active&select=id'
        );

        const studentCount = students?.length || 0;

        const now = new Date();

        const firstDayOfMonth = new Date(
            now.getFullYear(),
            now.getMonth(),
            1
        ).toISOString();

        // Pagos del mes
        const { data: monthlyPayments } = await queryAdminProxy(
            `payments?status=eq.paid&paid_at=gte.${firstDayOfMonth}&select=amount`
        );

        const monthlyRevenue = (monthlyPayments || [])
            .reduce(
                (sum: number, p: any) => sum + Number(p.amount),
                0
            );
        
        // Nuevos estudiantes activos
        const thirtyDaysAgo = new Date();

        thirtyDaysAgo.setDate(
            thirtyDaysAgo.getDate() - 30
        );

        const { data: newStudents } = await queryAdminProxy(
            `profiles?role=eq.student&academic_status=eq.active&updated_at=gte.${thirtyDaysAgo.toISOString()}&select=id`
        );

        const newCount = newStudents?.length || 0;

        // Cartera vencida
        const { data: pendingPayments } = await queryAdminProxy(
            'payments?status=eq.pending&select=amount,due_date'
        );

        const totalDebt = (pendingPayments || [])
            .filter(
                (p: any) => new Date(p.due_date) < now
            )
            .reduce(
                (sum: number, p: any) => sum + Number(p.amount),
                0
            );

        // Proyección ingresos
        const projectedRevenue = (pendingPayments || [])
            .filter((p: any) => {

                const d = new Date(p.due_date);

                return (
                    d >= now &&
                    d <= new Date(
                        now.getFullYear(),
                        now.getMonth() + 1,
                        now.getDate()
                    )
                );
            })
            .reduce(
                (sum: number, p: any) => sum + Number(p.amount),
                0
            );

        // Estudiantes en mora
        const studentsInDebt = new Set(
        (pendingPayments || [])
        .filter((p: any) => new Date(p.due_date) < now)
        .map((p: any) => p.user_id)
        ).size;

// Próximos graduados (estimado)
const upcomingGraduates = Math.round(studentCount * 0.15);

       return {
    activeStudents: studentCount || 0,

    churnRate: 0,

    monthlyRevenue,

    newEnrollments: newCount || 0,

    totalDebt,

    projectedRevenue,

    studentsInDebt,

    upcomingGraduates
};

    } catch (error) {

        console.error(
            "Error fetching executive stats:",
            error
        );

        throw error;
    }
},

    getAtRiskStudents: async (): Promise<AtRiskStudent[]> => {
        try {
            const { data: quizAttempts } = await queryAdminProxy('quiz_attempts?select=user_id,score');
            const { data: manualGrades } = await queryAdminProxy('extracurricular_grades?select=user_id,score');
            const { data: pendingPayments } = await queryAdminProxy('payments?status=eq.pending&select=user_id,amount,due_date');

            const scoresByUser: Record<string, number[]> = {};
            [...(quizAttempts || []), ...(manualGrades || [])].forEach((attempt: any) => {
                if (!scoresByUser[attempt.user_id]) scoresByUser[attempt.user_id] = [];
                scoresByUser[attempt.user_id].push(Number(attempt.score));
            });

            const debtByUser: Record<string, number> = {};
            const now = new Date();
            pendingPayments?.forEach((p: any) => {
                if (new Date(p.due_date) < now) {
                    debtByUser[p.user_id] = (debtByUser[p.user_id] || 0) + Number(p.amount);
                }
            });

            const riskList: AtRiskStudent[] = [];
            const userIds = Array.from(new Set([...Object.keys(scoresByUser), ...Object.keys(debtByUser)]));

            if (userIds.length === 0) return [];

            const idsList = userIds.join(',');
            const { data: profiles } = await queryAdminProxy(`profiles?role=eq.student&id=in.(${idsList})&select=id,full_name,updated_at,phone,cohort`);

            profiles?.forEach((profile: any) => {
                const userScores = scoresByUser[profile.id] || [];
                const avg = userScores.length > 0 ? userScores.reduce((a, b) => a + b, 0) / userScores.length : null;
                const debt = debtByUser[profile.id] || 0;

                if (avg !== null && avg < 3.0) {
                    riskList.push({
                        id: profile.id,
                        name: profile.full_name || 'Estudiante',
                        average: Number(avg.toFixed(1)),
                        lastActivity: profile.updated_at || 'N/A',
                        reason: 'low-performance',
                        phone: profile.phone
                    });
                } else if (debt > 0) {
                    riskList.push({
                        id: profile.id,
                        name: profile.full_name || 'Estudiante',
                        average: avg ? Number(avg.toFixed(1)) : 0,
                        lastActivity: profile.updated_at || 'N/A',
                        reason: 'financial-debt',
                        phone: profile.phone,
                        debtAmount: debt
                    });
                }
            });

            return riskList;
        } catch (error) {
            console.error("Error fetching at-risk students:", error);
            throw error;
        }
    }
};

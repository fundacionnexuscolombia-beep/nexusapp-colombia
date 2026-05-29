import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { scheduleService } from '../services/scheduleService';
import { progressService, StudentProgress } from '../services/progressService';
import { fetchCoursesFromSheet } from '../services/sheetService';
import { useAuth } from '../components/AuthProvider';

const AgendaDetail: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [allTopics, setAllTopics] = useState<any[]>([]);
    const [userProgress, setUserProgress] = useState<StudentProgress[]>([]);
    const [currentWeek, setCurrentWeek] = useState(1);
    const [streak, setStreak] = useState(0);
    const [baseDate, setBaseDate] = useState<Date>(new Date());

    useEffect(() => {
        const loadData = async () => {
            try {
                const courses = await fetchCoursesFromSheet();
                const flattened = Object.values(courses).flat();
                
                let userBaseDate = new Date();
                if (user?.id) {
                    userBaseDate = await scheduleService.getUserStartDate(user.id);
                }
                
                const progress = await progressService.getAllProgress();
                const week = scheduleService.getCurrentWeekNumber(userBaseDate);
                const userStreak = await progressService.calculateUserStreak();

                setAllTopics(flattened);
                setUserProgress(progress);
                setBaseDate(userBaseDate);
                setCurrentWeek(week);
                setStreak(userStreak);
            } catch (error) {
                console.error("Error loading agenda details:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const weekMapping = scheduleService.mapTopicsToWeeks(allTopics);
    const examWeeks = scheduleService.getExamWeeks();
    const startDates = scheduleService.getStartOfWeeks(baseDate);

    // Calculate Achievements (Logros)
    const completedCount = userProgress.filter(p => p.status === 'completed').length;
    const badges = [
        { id: 'start', title: 'Primer Paso', icon: 'rocket_launch', condition: completedCount >= 1, color: 'blue' },
        { id: 'constant', title: 'Perseverante', icon: 'workspace_premium', condition: completedCount >= 5, color: 'orange' },
        { id: 'expert', title: 'Experto', icon: 'military_tech', condition: completedCount >= 15, color: 'purple' },
        { id: 'master', title: 'Maestro Nexus', icon: 'stars', condition: completedCount >= 30, color: 'green' },
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-background-light dark:bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background-light dark:bg-slate-950 pb-32">
            {/* Header */}
            <header className="p-6 flex items-center gap-4 bg-white dark:bg-surface-dark/50 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100 dark:border-white/5">
                <button
                    onClick={() => navigate(-1)}
                    className="size-10 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center active:scale-90 transition-all"
                >
                    <span className="material-symbols-outlined text-gray-500">arrow_back</span>
                </button>
                <div>
                    <h1 className="text-xl font-black dark:text-white">Mi Agenda Nexus</h1>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cronograma y Logros</p>
                </div>
            </header>

            <main className="p-4 space-y-8">
                {/* Racha y Logros */}
                <section>
                    <div className="flex items-center justify-between px-2 mb-4">
                        <h3 className="text-lg font-black dark:text-white">Tus Logros</h3>
                        {streak > 0 && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-600 animate-in fade-in zoom-in duration-500">
                                <span className="material-symbols-outlined text-[18px] fill-1 animate-pulse">local_fire_department</span>
                                <span className="text-[10px] font-black uppercase tracking-tight">{streak} Días de Racha</span>
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-4 gap-3 px-1">
                        {badges.map(badge => (
                            <div key={badge.id} className={`flex flex-col items-center gap-2 ${badge.condition ? 'opacity-100' : 'opacity-20 grayscale'}`}>
                                <div className={`size-14 rounded-2xl bg-nexus-${badge.color}/10 border border-nexus-${badge.color}/20 flex items-center justify-center text-nexus-${badge.color} shadow-lg shadow-nexus-${badge.color}/5`}>
                                    <span className="material-symbols-outlined text-3xl fill-1">{badge.icon}</span>
                                </div>
                                <span className="text-[8px] font-black text-center dark:text-gray-300 uppercase tracking-tight">{badge.title}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Timeline (Plazos) */}
                <section>
                    <h3 className="text-lg font-black dark:text-white px-2 mb-4">Cronograma de 16 Semanas</h3>
                    <div className="space-y-4 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-100 dark:before:bg-white/5">
                        {Array.from({ length: 16 }).map((_, i) => {
                            const weekNum = i + 1;
                            const topics = weekMapping[weekNum] || [];
                            const examTitle = examWeeks[weekNum];
                            const isCurrent = weekNum === currentWeek;
                            const isPast = weekNum < currentWeek;
                            const startDate = startDates[i];

                            return (
                                <div key={weekNum} className={`flex gap-6 relative animate-in fade-in slide-in-from-right duration-500`} style={{ animationDelay: `${i * 100}ms` }}>
                                    {/* Indicator Dot */}
                                    <div className={`size-10 rounded-full flex items-center justify-center shrink-0 z-10 ${isCurrent ? 'bg-nexus-blue shadow-lg shadow-nexus-blue/40 ring-4 ring-nexus-blue/20 animate-pulse' :
                                        isPast ? 'bg-nexus-green shadow-md shadow-nexus-green/20' :
                                            'bg-white dark:bg-surface-dark border-2 border-gray-100 dark:border-white/10'
                                        }`}>
                                        <span className={`text-sm font-black ${isCurrent || isPast ? 'text-white' : 'text-gray-400'}`}>
                                            {isPast ? <span className="material-symbols-outlined text-[18px]">check</span> : weekNum}
                                        </span>
                                    </div>

                                    {/* Card */}
                                    <div className={`flex-1 p-5 rounded-[2rem] border transition-all ${isCurrent ? 'bg-white dark:bg-surface-dark border-nexus-blue/30 shadow-xl' :
                                        'bg-white/50 dark:bg-surface-dark/40 border-gray-50 dark:border-white/5'
                                        }`}>
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <p className="text-[10px] font-black text-nexus-blue uppercase tracking-widest leading-none mb-1">Semana {weekNum}</p>
                                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    Inicia: {startDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                                </h4>
                                            </div>
                                            {examTitle && (
                                                <div className="px-2 py-1 bg-nexus-red/10 border border-nexus-red/20 rounded-lg text-nexus-red flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[12px] fill-1">warning</span>
                                                    <span className="text-[8px] font-black uppercase">Examen</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            {examTitle && (
                                                <div className="p-3 bg-nexus-red/5 border border-nexus-red/10 rounded-2xl flex items-center gap-3">
                                                    <span className="material-symbols-outlined text-nexus-red text-[20px]">assignment_turned_in</span>
                                                    <span className="text-xs font-bold dark:text-white">{examTitle}</span>
                                                </div>
                                            )}
                                            {topics.map(tId => {
                                                const topicObj = allTopics.find(t => t.id === tId);
                                                const progress = userProgress.find(p => p.lesson_id === tId);
                                                const isDone = progress?.status === 'completed';

                                                return (
                                                    <div key={tId} className="flex justify-between items-center p-3 bg-gray-100/50 dark:bg-white/5 rounded-2xl group">
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <span className={`material-symbols-outlined text-[18px] ${isDone ? 'text-nexus-green' : 'text-gray-300'}`}>
                                                                {isDone ? 'check_circle' : 'radio_button_unchecked'}
                                                            </span>
                                                            <span className="text-xs font-bold dark:text-gray-200 truncate">{topicObj?.title || tId}</span>
                                                        </div>
                                                        {isDone && <span className="text-[10px] font-black text-nexus-green uppercase tracking-tighter">OK</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </main>
        </div>
    );
};

export default AgendaDetail;

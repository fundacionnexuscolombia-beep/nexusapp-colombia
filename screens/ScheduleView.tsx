import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { scheduleService } from '../services/scheduleService';
import { fetchCoursesFromSheet, Topic } from '../services/sheetService';

const ScheduleView: React.FC = () => {
  const [weeksArray, setWeeksArray] = useState<{ week: number, date: Date, topics: any[], isExam: boolean, examTitle?: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date>(new Date('2026-01-24T00:00:00'));
  const [cohortName, setCohortName] = useState<string>('Cargando...');

  useEffect(() => {
    const loadScheduleData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get user cohort/start date
        const [fetchedStartDate, { data: profile }] = await Promise.all([
          scheduleService.getUserStartDate(user.id),
          supabase.from('profiles').select('cohort').eq('id', user.id).single()
        ]);

        setStartDate(fetchedStartDate);
        setCohortName(profile?.cohort || 'Enero 2026');

        // Fetch topics
        const coursesData = await fetchCoursesFromSheet();
        const allTopicsList = Object.values(coursesData).flat();
        const weekMapping = scheduleService.mapTopicsToWeeks(allTopicsList);
        const examWeeks = scheduleService.getExamWeeks();

        const generatedWeeks = [];
        for (let w = 1; w <= 16; w++) {
          const weekDate = new Date(fetchedStartDate);
          weekDate.setDate(weekDate.getDate() + (w - 1) * 7);
          
          generatedWeeks.push({
            week: w,
            date: weekDate,
            topics: weekMapping[w] || [],
            isExam: !!examWeeks[w],
            examTitle: examWeeks[w]
          });
        }

        setWeeksArray(generatedWeeks);
      } catch (err) {
        console.error("Error loading schedule", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadScheduleData();
  }, []);

  const now = new Date();
  const currentWeek = scheduleService.getCurrentWeekNumber(startDate);
  const currentActiveIndex = currentWeek - 1;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 pb-24 bg-gray-50 dark:bg-slate-950">
      <header className="sticky top-0 z-20 bg-primary/95 backdrop-blur-md border-b border-primary/20 shadow-sm">
        <div className="flex items-center p-4">
          <div className="size-10 flex items-center justify-center bg-white/20 rounded-full cursor-pointer" onClick={() => window.history.back()}>
            <span className="material-symbols-outlined text-white">arrow_back</span>
          </div>
          <div className="flex-1 ml-4 shadow-sm">
            <h1 className="text-white text-lg font-bold leading-tight">Tu Cronograma Académico</h1>
            <p className="text-white/80 text-xs font-medium bg-primary-dark/30 inline-block px-2 py-0.5 mt-1 rounded-full uppercase tracking-wider">
              Grupo: {cohortName}
            </p>
          </div>
        </div>
      </header>

      <div className="px-5 pt-6 pb-2">
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50 flex gap-3 items-start shadow-sm">
          <div className="bg-indigo-100 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-300 p-2 rounded-lg mt-0.5">
            <span className="material-symbols-outlined text-[20px]">school</span>
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">Progreso Semanal (2 Temas x Semana)</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Plan de estudios optimizado con dos temáticas semanales para garantizar cobertura completa del syllabus.
            </p>
          </div>
        </div>
      </div>

      <main className="flex-1 p-5">
        <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 mt-2 space-y-10 py-2">
          {weeksArray.map((item, i) => {
            const isPast = i < currentActiveIndex;
            const isCurrent = i === currentActiveIndex;
            const isFuture = i > currentActiveIndex;

            const day = String(item.date.getDate()).padStart(2, '0');
            const month = String(item.date.getMonth() + 1).padStart(2, '0');
            const year = item.date.getFullYear();
            const formattedDate = `${day}/${month}/${year}`;

            let circleColors = "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-400";
            if (isCurrent) circleColors = "bg-primary border-primary text-white shadow-md shadow-primary/30 ring-4 ring-primary/20";
            if (isPast) circleColors = "bg-green-500 border-green-500 text-white";

            return (
              <div key={i} className={`relative flex items-start pl-8 group transition-opacity duration-300 ${isFuture ? 'opacity-50' : 'opacity-100'}`}>
                <div className={`absolute -left-[17px] top-0.5 size-8 rounded-full border-2 flex items-center justify-center font-bold text-xs ${circleColors} transition-all`}>
                  {isPast ? <span className="material-symbols-outlined text-[16px] font-bold">check</span> : item.week}
                </div>

                <div className={`w-full bg-white dark:bg-slate-900 p-5 rounded-[2rem] border ${isCurrent ? 'border-primary/50 ring-1 ring-primary/10 shadow-md' : 'border-slate-100 dark:border-slate-800 shadow-sm'} transition-all`}>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      Semana {item.week}
                    </span>
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full ${isCurrent ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                      {formattedDate}
                    </span>
                  </div>
                  
                  <div className="space-y-4">
                    {item.isExam && (
                      <div className="bg-nexus-orange/10 border border-nexus-orange/20 p-3 rounded-2xl flex items-center gap-3">
                        <span className="material-symbols-outlined text-nexus-orange text-xl">assignment_turned_in</span>
                        <span className="text-xs font-black text-nexus-orange uppercase tracking-tight">{item.examTitle}</span>
                      </div>
                    )}

                    {item.topics.length > 0 ? item.topics.map((topic, idx) => (
                      <div key={idx} className="flex items-center gap-3 group/topic">
                        <div className="size-8 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-[10px] font-black text-primary border border-gray-100 dark:border-white/10">
                          {idx + 1}
                        </div>
                        <h3 className={`font-bold leading-tight ${isCurrent ? 'text-slate-800 dark:text-white text-sm' : 'text-slate-600 dark:text-slate-400 text-xs'}`}>
                          {topic.title}
                        </h3>
                      </div>
                    )) : !item.isExam && (
                      <p className="text-xs text-slate-400 italic font-medium">No hay temáticas asignadas para esta semana</p>
                    )}
                  </div>
                  
                  {isCurrent && (
                    <div className="mt-4 py-1.5 px-3 bg-green-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full animate-pulse flex items-center gap-1.5 w-max">
                      <span className="size-1.5 bg-white rounded-full"></span> Semana en curso
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default ScheduleView;

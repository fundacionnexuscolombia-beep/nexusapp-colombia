
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { checkTermsStatus, acceptTerms } from '../services/authService';
import { paymentService } from '../services/paymentService';
import { fetchCoursesFromSheet } from '../services/sheetService';
import { progressService } from '../services/progressService';
import { quoteService } from '../services/quoteService';
import { notificationService } from '../services/notificationService';
import LegalContractModal from '../components/LegalContractModal';
import QuizRunner from './QuizRunner';
import { scheduleService } from '../services/scheduleService';
import { supabase } from '../services/supabaseClient';
import { quizService } from '../services/quizService';
import { newsService, NewsEntry } from '../services/newsService';
import GuidedTour from '../components/GuidedTour';
import SegmentedProgressRing from '../components/SegmentedProgressRing';

interface HomeProps {
  toggleTheme: () => void;
  isDarkMode: boolean;
}

const Home: React.FC<HomeProps> = ({ toggleTheme, isDarkMode }) => {
  const navigate = useNavigate();
  const { user, role, avatarUrl, loading: authLoading, signOut, accessEnabled, isOverdue, isDemo } = useAuth();
  const [showContract, setShowContract] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progressMetrics, setProgressMetrics] = useState({ completedCount: 0, totalTopicsCount: 1, percentage: 0 });
  const [detailedMetrics, setDetailedMetrics] = useState<any[]>([]);
  const [lastTopic, setLastTopic] = useState<{ course_id: string, lesson_id: string } | null>(null);
  const [hasUnreadNotices, setHasUnreadNotices] = useState(false);
  const [weeklyAgenda, setWeeklyAgenda] = useState<any[]>([]);
  const [streak, setStreak] = useState(0);
  const [activeDaysCount, setActiveDaysCount] = useState(0);
  const [activeQuiz, setActiveQuiz] = useState<{ topicId: string, topicTitle: string, courseId: string, type: 'quiz' | 'workshop' } | null>(null);
  const [toast, setToast] = useState<{ show: boolean, message: string } | null>(null);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [newsList, setNewsList] = useState<NewsEntry[]>([]);
  const [startDate, setStartDate] = useState<Date>(new Date('2026-01-24T00:00:00'));

  // Metadata for subjects (icons, codes)
  const subjectMetadata: Record<string, { icon: string, color: string }> = {
    'PSICOLOGIA': { icon: 'self_improvement', color: 'pink' },
    'ESPAÑOL': { icon: 'history_edu', color: 'orange' },
    'MATEMATICAS': { icon: 'calculate', color: 'blue' },
    'BIOLOGIA': { icon: 'biotech', color: 'green' },
    'SOCIALES': { icon: 'public', color: 'orange' },
    'FILOSOFIA': { icon: 'psychology', color: 'purple' },
    'QUIMICA': { icon: 'science', color: 'blue' },
    'FISICA': { icon: 'architecture', color: 'blue' },
    'MEDIO AMBIENTE': { icon: 'forest', color: 'green' },
    'ETICA': { icon: 'verified_user', color: 'purple' },
    'ESTADISTICA': { icon: 'bar_chart', color: 'blue' }
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      if (user) {
        try {
          // 1. Check terms
          const accepted = await checkTermsStatus(user.id);
          if (!accepted) {
            navigate('/onboarding', { replace: true });
            return;
          }

          // 1. Fetch data for metrics
          console.log("Fetching courses from sheet...");
          const coursesData = await fetchCoursesFromSheet().catch(e => { console.error("Sheet error:", e); return {}; });
          const allTopicsList = Object.values(coursesData).flat();

          // Initialize active notification services
          try {
            await notificationService.initPush();
          } catch (e) {
            console.warn("Push initialization failed (non-critical):", e);
          }

          try {
            await notificationService.checkCriticalAlerts();
          } catch (e) {
            console.warn("Critical alerts check failed (non-critical):", e);
          }

          console.log("Loading metrics and other data...");
          const [overall, detailed, last, notificationsList, cohortDate, newsData] = await Promise.all([
            progressService.getOverallProgressMetrics(allTopicsList).catch(e => ({ completedCount: 0, totalTopicsCount: 1, percentage: 0 })),
            progressService.getDetailedProgressMetrics(Object.keys(subjectMetadata).map(key => ({
              id: key.toLowerCase().replace(/ /g, ''),
              title: key,
              topics: coursesData[key] || [],
              ...subjectMetadata[key]
            }))).catch(e => []),
            progressService.getLastActiveTopic().catch(e => null),
            notificationService.getForUser(user.id).catch(e => []),
            scheduleService.getUserStartDate(user.id).catch(e => new Date('2026-01-24T00:00:00')),
            newsService.getAll().catch(e => [])
          ]);

          console.log("Setting metrics state...");
          setStartDate(cohortDate || new Date('2026-01-24T00:00:00'));

          const currentWeek = scheduleService.getCurrentWeekNumber(cohortDate || new Date('2026-01-24T00:00:00'));
          const weekMapping = scheduleService.mapTopicsToWeeks(allTopicsList);
          const currentWeekTopics = weekMapping[currentWeek] || [];
          const currentWeekTopicIds = currentWeekTopics.map((t: any) => t.id);
          const topicsProgress = await progressService.getTopicsStatus(currentWeekTopicIds).catch(e => []);

          const finalAgenda = currentWeekTopics.map((topic: any, idx: number) => {
            const progress = topicsProgress.find(p => p.lesson_id === topic.id);
            const dayOfWeek = new Date().getDay(); 

            let statusLabel = '🟢 En curso';
            let priority = false;

            if (dayOfWeek >= 5) { 
              statusLabel = '⚠️ Vence hoy';
              priority = true;
            } else if (dayOfWeek >= 4 && idx === 0) { 
              statusLabel = '🟡 Vence mañana';
            }

            const topicId = topic.id.toLowerCase();
            let courseName = 'MÓDULO';

            for (const [subject, meta] of Object.entries(subjectMetadata)) {
              const prefix = subject === 'MEDIO AMBIENTE' ? 'ma' :
                subject === 'ETICA' ? 'et' :
                  subject === 'ESTADISTICA' ? 'es' :
                    subject === 'FISICA' ? 'fi' :
                      subject.substring(0, 1).toLowerCase();

              if (topicId.startsWith(prefix)) {
                courseName = subject;
                break;
              }
            }

            return {
              id: topic.id,
              title: topic.title || 'Tema sin título',
              progress: progress?.status === 'completed' ? 100 : (progress?.status === 'started' ? 50 : 0),
              statusLabel,
              priority,
              icon: idx === 0 ? 'history_edu' : 'functions',
              course: courseName
            };
          });

          // Add exam if it's exam week
          const examWeeks = scheduleService.getExamWeeks();
          if (examWeeks[currentWeek]) {
            finalAgenda.unshift({
              id: `simulacro_${currentWeek}`,
              title: examWeeks[currentWeek],
              progress: 0,
              statusLabel: '⚠️ Vence hoy',
              priority: true,
              icon: 'assignment_turned_in',
              course: 'SIMULACRO CRÍTICO'
            });
          }

          setWeeklyAgenda(finalAgenda);
          setProgressMetrics(overall);
          setDetailedMetrics(detailed);
          setLastTopic(last);
          setHasUnreadNotices(notificationsList.some((n: any) => !n.is_read));

          const [userStreak, totalActive] = await Promise.all([
            progressService.calculateUserStreak().catch(e => 0),
            progressService.getTotalActiveDays().catch(e => 0)
          ]);
          setStreak(userStreak);
          setActiveDaysCount(totalActive);
          setSelectedWeek(currentWeek);
          setNewsList(newsData.filter((n: any) => n.is_active !== false).slice(0, 5));

        } catch (error) {
          console.error("Dashboard error:", error);
        } finally {
          console.log("Loading finished.");
          setLoading(false);
        }
      }
    };
    loadDashboardData();
  }, [user, navigate]);

  const showNotification = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => setToast(null), 5000);
  };

  const handleSimulacroClick = (id: string, title: string) => {
    // Simulacros correspond to week 9 and 16
    const examWeeks = scheduleService.getExamWeeks();
    const isExam = Object.values(examWeeks).includes(title) || id.startsWith('sim');

    if (isExam || id.startsWith('sim')) {
      const topicId = (id === 'sim1' || title.includes('#1')) ? 'simulacro_icfes_1' : 'simulacro_icfes_2';
      showNotification(`¡${title} está disponible! Iniciando...`);
      setActiveQuiz({
        topicId,
        topicTitle: title,
        courseId: 'SIMULACROS',
        type: 'quiz'
      });
    } else {
      showNotification("Este simulacro no está habilitado actualmente.");
    }
  };

  const daysToGraduation = () => {
    const target = new Date('2026-11-30');
    const now = new Date();
    const diff = target.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const badges = [
    { id: 1, title: '7 Días de Racha', icon: 'local_fire_department', color: 'orange', condition: streak >= 7 },
    { id: 2, title: 'Primer Paso', icon: 'star', color: 'yellow', condition: progressMetrics.completedCount > 0 },
    { id: 3, title: 'Explorador', icon: 'explore', color: 'blue', condition: detailedMetrics.length > 5 },
    { id: 4, title: 'Estudiante Elite', icon: 'workspace_premium', color: 'purple', condition: progressMetrics.percentage > 50 },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <main className="flex-1 w-full px-4 lg:px-12 space-y-8 pt-4 pb-32">
      <GuidedTour />

      {/* Mobile Welcome (Visible only on small screens) */}
      <div className="lg:hidden text-slate-800 dark:text-white">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              id="tour-profile-menu"
              onClick={() => navigate('/profile')}
              className="w-14 h-14 rounded-2xl bg-white dark:bg-surface-dark p-1 shadow-lg shadow-black/5 cursor-pointer active:scale-95 transition-all"
            >
              <div className="w-full h-full rounded-xl overflow-hidden bg-primary/10 flex items-center justify-center">
                <img
                  src={user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'nexus'}`}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      const initials = document.createElement('span');
                      initials.className = 'text-primary font-black text-sm uppercase';
                      initials.innerText = user?.user_metadata?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'NX';
                      parent.appendChild(initials);
                    }
                  }}
                />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-black leading-tight">
                Hola, <span className="text-nexus-blue">{user?.user_metadata?.full_name?.split(' ')[0] || 'Estudiante'}</span>
              </h2>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">Membresía Premium</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {streak > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-2xl">
                <span className="material-symbols-outlined text-orange-500 fill-1 text-[24px]">local_fire_department</span>
                <span className="text-xs font-black text-orange-600">{streak}</span>
              </div>
            )}
            <button
              onClick={() => navigate('/notifications')}
              className="size-12 rounded-2xl bg-white dark:bg-surface-dark shadow-lg shadow-black/5 flex items-center justify-center text-primary relative border border-gray-100 dark:border-white/5 active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-[28px]">notifications</span>
              {hasUnreadNotices && (
                <span className="absolute top-3 right-3 size-2.5 bg-nexus-red rounded-full border-2 border-white dark:border-surface-dark animate-pulse"></span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Header (Visible only on lg) */}
      <header className="hidden lg:flex items-center justify-between mb-2 animate-in fade-in slide-in-from-top-4 duration-700">
        <div>
          <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tight">Dashboard Académico</h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold mt-2 uppercase tracking-[0.2em] flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">calendar_month</span>
            Panel de Control • {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className={`group px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 hover:scale-105 cursor-help relative ${isOverdue ? 'bg-nexus-red/10 text-nexus-red border border-nexus-red/20' : 'bg-nexus-green/10 text-nexus-green border border-nexus-green/20'}`}>
            <span className="flex items-center gap-2">
              <span className={`size-2 rounded-full animate-pulse ${isOverdue ? 'bg-nexus-red' : 'bg-nexus-green'}`}></span>
              Estado: {isOverdue ? 'Pago Pendiente' : 'Al día'}
            </span>
            {/* Custom Tooltip */}
            <div className="absolute top-full right-0 mt-2 w-56 p-4 bg-slate-900 text-white rounded-2xl text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl text-center border border-white/10">
              {isOverdue ? 'Tu suscripción requiere atención para mantener el acceso.' : '¡Todo listo! Tienes acceso total a la plataforma.'}
            </div>
          </div>
          <button
            onClick={() => navigate('/notifications')}
            className="size-14 rounded-[1.5rem] bg-white dark:bg-surface-dark shadow-xl hover:shadow-2xl hover:scale-105 transition-all flex items-center justify-center text-primary relative border border-gray-100 dark:border-white/5 active:scale-95"
          >
            <span className="material-symbols-outlined text-3xl">notifications</span>
            {hasUnreadNotices && (
              <span className="absolute top-4 right-4 size-3 bg-nexus-red rounded-full border-2 border-white dark:border-surface-dark animate-pulse"></span>
            )}
          </button>
        </div>
      </header>

      {/* Responsive Grid System */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Column Left (Progress & Resume) */}
        <div id="tour-progress-section" className="lg:col-span-12 xl:col-span-5 space-y-8 animate-in fade-in slide-in-from-left-4 duration-700 delay-100">
          <section className="bg-white dark:bg-surface-dark rounded-[3rem] p-8 lg:p-12 border border-gray-100 dark:border-white/5 shadow-xl flex flex-col items-center group hover:shadow-2xl transition-all duration-500">
            <div className="flex flex-col items-center mb-8 w-full">
              <div className="flex items-center justify-between w-full mb-6 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">
                <span>Logro Semanal</span>
                <span>Visión General</span>
              </div>
              <div className="relative flex items-center justify-center w-full min-h-[320px] cursor-pointer group-hover:scale-105 transition-transform duration-700">
                <SegmentedProgressRing 
                  percentage={progressMetrics.percentage} 
                  size={window.innerWidth < 1024 ? 280 : 320}
                  segments={72}
                  subtitle={`${progressMetrics.completedCount} / ${progressMetrics.totalTopicsCount} Temas dominados`}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 w-full">
              <div className="bg-nexus-green/5 p-4 rounded-3xl border border-nexus-green/10 flex flex-col items-center hover:bg-nexus-green/10 transition-colors group/stat cursor-help relative">
                <span className="text-lg font-black text-nexus-green">{progressMetrics.completedCount}</span>
                <p className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">Listos</p>
                <div className="absolute bottom-full mb-2 bg-slate-900 text-white p-2.5 rounded-xl text-[11px] font-bold opacity-0 group-hover/stat:opacity-100 transition-opacity w-32 text-center pointer-events-none shadow-2xl z-50">Temas completados con éxito</div>
              </div>
              <div className="bg-nexus-blue/5 p-4 rounded-3xl border border-nexus-blue/10 flex flex-col items-center hover:bg-nexus-blue/10 transition-colors group/stat cursor-help relative">
                <span className="text-lg font-black text-nexus-blue">{daysToGraduation()}</span>
                <p className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">Días</p>
                <div className="absolute bottom-full mb-2 bg-slate-900 text-white p-2.5 rounded-xl text-[11px] font-bold opacity-0 group-hover/stat:opacity-100 transition-opacity w-32 text-center pointer-events-none shadow-2xl z-50">Para tu meta final</div>
              </div>
              <div className="bg-nexus-orange/5 p-4 rounded-3xl border border-nexus-orange/10 flex flex-col items-center hover:bg-nexus-orange/10 transition-colors group/stat cursor-help relative">
                <span className="text-lg font-black text-nexus-orange">{activeDaysCount}</span>
                <p className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">Activo</p>
                <div className="absolute bottom-full mb-2 bg-slate-900 text-white p-2.5 rounded-xl text-[11px] font-bold opacity-0 group-hover/stat:opacity-100 transition-opacity w-32 text-center pointer-events-none shadow-2xl z-50">Días con actividad en plataforma</div>
              </div>
            </div>
          </section>

          {lastTopic && accessEnabled && (
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
              <button
                onClick={() => navigate('/courses', { state: { autoSelectCourseId: lastTopic.course_id } })}
                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-8 rounded-[2.5rem] flex items-center justify-between group active:scale-[0.98] transition-all shadow-2xl hover:shadow-primary/20 animate-pulse-premium"
              >
                <div className="flex items-center gap-6">
                  <div className="bg-white/20 dark:bg-slate-900/20 w-16 h-16 rounded-2xl flex items-center justify-center text-white dark:text-slate-900 group-hover:rotate-12 transition-transform">
                    <span className="material-symbols-outlined text-4xl fill-1">play_arrow</span>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">Continúa aprendiendo</p>
                    <h3 className="text-xl font-black">{lastTopic.course_id.toUpperCase()}</h3>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Reanudar</span>
                  <span className="material-symbols-outlined text-4xl group-hover:translate-x-2 transition-transform">arrow_forward</span>
                </div>
              </button>
            </section>
          )}

          {/* Novedades & Noticias - Relocated to use empty space */}
          {newsList.length > 0 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200 mt-8">
              <div className="flex items-center justify-between px-2">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Novedades & Avisos</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-[9px] font-bold uppercase tracking-[0.2em] mt-1 text-primary">Comunidad Nexus</p>
                </div>
                <button 
                  onClick={() => navigate('/news')}
                  className="text-[10px] font-black uppercase text-primary hover:underline transition-all"
                >
                  Ver todo
                </button>
              </div>
              
              <div className="space-y-4">
                {newsList.map((news) => (
                  <div 
                    key={news.id} 
                    onClick={() => navigate('/news')}
                    className="flex gap-4 bg-white dark:bg-surface-dark p-4 rounded-[1.5rem] border border-gray-100 dark:border-white/5 shadow-sm group hover:shadow-lg transition-all cursor-pointer active:scale-[0.98]"
                  >
                    <div className="size-16 rounded-xl overflow-hidden shrink-0 bg-primary/5">
                      <img 
                        src={news.image || 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=200'}
                        alt={news.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    </div>
                    <div className="flex flex-col justify-center min-w-0">
                      <span className="text-[7px] font-black text-primary uppercase tracking-[0.2em] mb-1">
                        {news.category}
                      </span>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white truncate leading-tight mb-1">
                        {news.title}
                      </h4>
                      <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1">
                        {news.summary}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Column Right (Agenda, Stats, Badges) */}
        <div className="lg:col-span-12 xl:col-span-7 space-y-8 animate-in fade-in slide-in-from-right-4 duration-700 delay-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Streak & Badges Section */}
            <section className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Racha & Logros</h3>
                <span className="material-symbols-outlined text-gray-300 dark:text-white/20">workspace_premium</span>
              </div>
              <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] p-6 border border-gray-100 dark:border-white/5 shadow-lg space-y-6 group hover:shadow-2xl transition-all">
                <div className="flex items-center gap-4 bg-gradient-to-br from-nexus-orange/10 to-nexus-orange/5 p-5 rounded-3xl border border-nexus-orange/10 transition-transform group-hover:scale-[1.02]">
                  <span className="material-symbols-outlined text-4xl text-nexus-orange fill-1 animate-pulse">local_fire_department</span>
                  <div>
                    <h4 className="text-2xl font-black text-nexus-orange tracking-tight">{streak} Días de Racha</h4>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">¡Llevas {activeDaysCount} días activos en total!</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4 px-2">
                  {badges.map(badge => (
                    <div key={badge.id} className={`group/badge flex flex-col items-center gap-2 relative ${badge.condition ? 'opacity-100' : 'opacity-20 grayscale'}`} title={badge.title}>
                      <div className={`size-12 rounded-2xl bg-nexus-${badge.color}/10 border border-nexus-${badge.color}/20 flex items-center justify-center text-nexus-${badge.color} transition-all duration-300 group-hover/badge:scale-110 group-hover/badge:bg-nexus-${badge.color} group-hover/badge:text-white cursor-help shadow-sm`}>
                        <span className="material-symbols-outlined text-2xl fill-1">{badge.icon}</span>
                      </div>
                      <div className="absolute top-full mt-2 w-max max-w-[150px] bg-slate-900 text-white p-2.5 rounded-xl text-[11px] font-bold opacity-0 group-hover/badge:opacity-100 transition-opacity z-50 text-center pointer-events-none shadow-2xl border border-white/10">
                        {badge.title}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => navigate('/achievements')}
                  className="w-full py-4 text-[10px] font-black uppercase tracking-[0.2em] bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl hover:bg-primary hover:text-white transition-all duration-300 shadow-sm"
                >
                  Ver Álbum de Insignias
                </button>
              </div>
            </section>

            {/* Weekly Goal Section */}
            {(() => {
              const currentWeek = scheduleService.getCurrentWeekNumber(startDate);
              const examWeeks = scheduleService.getExamWeeks();
              const isExamWeek = !!examWeeks[selectedWeek];

              // Filter all topics across all subjects to find this week's topics
              const allTopicsFlat = detailedMetrics.flatMap(m =>
                (m.topics || []).map((t: any) => ({ ...t, courseId: m.id, courseTitle: m.title }))
              );
              const weeklyTopics = scheduleService.getTopicsForWeek(selectedWeek, allTopicsFlat);
              const weekDates = scheduleService.getWeekDateRange(selectedWeek, startDate);

              if (!accessEnabled && role === 'student') {
                return (
                  <section className="space-y-6">
                    <h3 className="text-xl font-black dark:text-white px-2 uppercase tracking-tighter">Acceso Pendiente</h3>
                    <div className="bg-gradient-to-br from-nexus-blue to-indigo-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden group/card h-full min-h-[260px]">
                      <div className="absolute top-0 right-0 p-8 opacity-10 group-hover/card:scale-110 transition-transform duration-700">
                        <span className="material-symbols-outlined text-9xl">rocket_launch</span>
                      </div>
                      <div className="relative z-10 flex flex-col h-full gap-4">
                        <div className="size-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                          <span className="material-symbols-outlined text-3xl">school</span>
                        </div>
                        <h4 className="text-2xl font-black leading-tight uppercase tracking-tight">¡Bienvenido a Nexus!</h4>
                        <p className="text-sm text-white/80 font-medium leading-relaxed">
                          Estamos preparando todo para tu inicio académico. Podrás acceder a las materias y cronogramas inmediatamente después de nuestra <b>primera clase en vivo</b>.
                        </p>
                        <div className="mt-auto flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] bg-white/10 px-4 py-2 rounded-xl w-fit">
                          <span className="size-2 bg-nexus-green rounded-full animate-pulse"></span>
                          Matrícula Verificada
                        </div>
                      </div>
                    </div>
                  </section>
                );
              }

              return (
                <section className="space-y-6">
                  <h3 className="text-xl font-black dark:text-white px-2 uppercase tracking-tighter">Cronograma Semanal</h3>

                  <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] p-6 border border-gray-100 dark:border-white/5 shadow-lg relative overflow-hidden h-full min-h-[260px] group/card hover:shadow-2xl transition-all">
                    {/* Background Icon Decor */}
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover/card:scale-110 transition-transform duration-700 pointer-events-none">
                      <span className="material-symbols-outlined text-9xl">calendar_today</span>
                    </div>

                    <div className="relative z-10 flex flex-col h-full">
                      {/* Card Header - Responsive Layout */}
                      <div className="flex flex-col gap-6 mb-8">
                        {/* Top Utility Row */}
                        <div className="flex items-center justify-between">
                          <div className={`size-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-md ${selectedWeek === currentWeek ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                            <span className="material-symbols-outlined text-2xl">{selectedWeek === currentWeek ? 'event_available' : 'event_repeat'}</span>
                          </div>

                          <div className="flex flex-col items-end">
                            {selectedWeek === currentWeek ? (
                              <span className="px-3 py-1 bg-nexus-green text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg shadow-nexus-green/20 animate-pulse">Semana Actual</span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 text-[8px] font-black uppercase tracking-[0.2em] rounded-full border ${selectedWeek < currentWeek ? 'bg-primary/10 text-primary border-primary/20' : 'bg-gray-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-gray-200 dark:border-white/10'}`}>
                                  {selectedWeek < currentWeek ? 'Completada' : 'Próxima'}
                                </span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setSelectedWeek(currentWeek); }}
                                  className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all"
                                  title="Volver a hoy"
                                >
                                  <span className="material-symbols-outlined text-sm rotate-180">restart_alt</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Main Navigation Row - Centered and Guaranteed Space */}
                        <div className="flex items-center justify-between bg-gray-50 dark:bg-white/5 p-2 rounded-[2rem] border border-gray-100 dark:border-white/10">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedWeek(prev => Math.max(1, prev - 1)); }}
                            disabled={selectedWeek === 1}
                            className="size-12 rounded-[1.5rem] bg-white dark:bg-white/10 flex items-center justify-center hover:bg-primary/10 disabled:opacity-20 transition-all shadow-sm active:scale-95 text-slate-700 dark:text-white"
                          >
                            <span className="material-symbols-outlined text-2xl">chevron_left</span>
                          </button>

                          <div className="text-center group/dates cursor-default">
                            <h4 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Semana {selectedWeek}</h4>
                            <div className="flex flex-col mt-0.5">
                              <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-[0.2em]">{scheduleService.getWeekDateRange(selectedWeek, startDate).start} — {scheduleService.getWeekDateRange(selectedWeek, startDate).end}</span>
                              <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none mt-1">Plan de Estudios 2026</p>
                            </div>
                          </div>

                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedWeek(prev => Math.min(16, prev + 1)); }}
                            disabled={selectedWeek === 16}
                            className="size-12 rounded-[1.5rem] bg-white dark:bg-white/10 flex items-center justify-center hover:bg-primary/10 disabled:opacity-20 transition-all shadow-sm active:scale-95 text-slate-700 dark:text-white"
                          >
                            <span className="material-symbols-outlined text-2xl">chevron_right</span>
                          </button>
                        </div>
                      </div>

                      {isExamWeek && (() => {
                        const isExamLocked = false; // Los simulacros diagnósticos están desbloqueados siempre
                        return (
                          <div 
                            onClick={isExamLocked ? undefined : () => handleSimulacroClick(selectedWeek === 9 ? 'sim1' : 'sim2', examWeeks[selectedWeek])}
                            className={`bg-gradient-to-br from-nexus-orange/20 to-nexus-orange/5 border border-nexus-orange/30 rounded-3xl p-6 shadow-[0_0_20px_rgba(249,115,22,0.15)] mb-6 relative overflow-hidden transition-all duration-300 ${isExamLocked ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02] active:scale-[0.98] hover:border-nexus-orange/50 hover:shadow-[0_0_30px_rgba(249,115,22,0.25)]'}`}
                          >
                            <div className="absolute top-0 left-0 w-full h-1 bg-nexus-orange animate-pulse"></div>
                            <div className="flex items-center gap-4 mb-4">
                              <div className="relative">
                                <span className="material-symbols-outlined text-nexus-orange text-5xl relative z-10 animate-pulse drop-shadow-[0_0_10px_rgba(249,115,22,0.8)]">
                                  {isExamLocked ? 'lock' : 'warning'}
                                </span>
                                <div className="absolute inset-0 bg-nexus-orange/30 blur-xl animate-pulse rounded-full size-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
                              </div>
                              <p className="text-nexus-orange text-sm font-black uppercase tracking-[0.2em] leading-tight">
                                {isExamLocked ? 'Evaluación Bloqueada' : 'Fase de Evaluación'}<br/>Crítica
                              </p>
                            </div>
                            <p className="text-slate-900 dark:text-white text-2xl font-black leading-tight uppercase tracking-tight drop-shadow-sm">{examWeeks[selectedWeek]}</p>
                            
                            <div className="flex justify-between items-center mt-6 pt-4 border-t border-nexus-orange/15">
                              <span className="text-[10px] text-nexus-orange/80 font-bold uppercase tracking-wider">
                                {isExamLocked ? 'Disponible al llegar a esta semana' : 'Haz clic aquí para presentar el examen'}
                              </span>
                              {!isExamLocked && (
                                <button className="bg-nexus-orange text-white px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-nexus-orange/30 flex items-center gap-1.5 transform active:scale-95 transition-all">
                                  Comenzar
                                  <span className="material-symbols-outlined text-sm">play_arrow</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                          <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[9px]">Temáticas Programadas:</p>
                          {selectedWeek < currentWeek && (
                            <span className="text-[8px] font-black text-primary/60 uppercase tracking-widest flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">history</span> Repaso
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {weeklyTopics.length > 0 ? weeklyTopics.map((topic, i) => (
                            <div
                              key={i}
                              onClick={() => navigate('/courses', { state: { autoSelectCourseId: topic.courseId } })}
                              className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-[1.8rem] border border-gray-100 dark:border-white/10 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer group/item relative overflow-hidden"
                            >
                              <div className="absolute top-0 right-0 p-2 opacity-0 group-hover/item:opacity-10 transition-opacity">
                                <span className="material-symbols-outlined text-5xl">arrow_forward</span>
                              </div>
                              <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-xs font-black group-hover/item:bg-primary group-hover/item:text-white transition-colors shrink-0">
                                {i + 1}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs text-slate-800 dark:text-white font-black truncate leading-tight uppercase tracking-tight">{topic.title}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[8px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-[0.15em]">{topic.courseTitle}</span>
                                  <div className="size-1 rounded-full bg-gray-300 dark:bg-white/20" />
                                  <span className="text-[8px] text-primary/60 font-black uppercase">Módulo {i + 1}</span>
                                </div>
                              </div>
                            </div>
                          )) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center bg-gray-50/50 dark:bg-white/2 rounded-3xl border border-dashed border-gray-200 dark:border-white/5">
                              <span className="material-symbols-outlined text-gray-300 dark:text-white/10 text-4xl mb-2">assignment_turned_in</span>
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">No hay temas asignados para esta semana</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-auto pt-8">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Progreso de la Semana</span>
                          <span className="text-[8px] font-black text-primary uppercase tracking-widest">Etapa {Math.ceil(selectedWeek / 4)} / 4</span>
                        </div>
                        <div className="flex gap-1.5">
                          {[1, 2, 3, 4, 5, 6, 7].map(d => (
                            <div key={d} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${selectedWeek < currentWeek
                              ? 'bg-primary/30'
                              : (selectedWeek === currentWeek && d <= (new Date().getDay() || 7))
                                ? 'bg-primary shadow-[0_0_8px_rgba(37,99,235,0.4)]'
                                : 'bg-gray-100 dark:bg-white/10'
                              }`} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              );
            })()}
          </div>

          {/* Agenda Section */}
          {accessEnabled && (
            <section id="tour-agenda-section" className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">Agenda Estratégica</h3>
                <button
                  onClick={() => navigate('/agenda')}
                  className="px-4 py-2 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-primary hover:text-white transition-all shadow-sm"
                >
                  Cronograma Completo
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {weeklyAgenda.slice(0, 4).map((item, idx) => (
                  <div key={item.id} className="bg-white dark:bg-surface-dark p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm flex flex-col gap-4 group hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer" onClick={() => {
                    if (item.id.startsWith('simulacro')) {
                      handleSimulacroClick(item.id, item.title);
                    } else {
                      navigate('/courses');
                    }
                  }}>
                    <div className="flex items-center gap-4">
                      <div className={`size-12 rounded-2xl ${item.priority ? 'bg-nexus-red/10 animate-pulse' : 'bg-nexus-blue/10'} flex items-center justify-center transition-transform group-hover:rotate-6`}>
                        <span className="material-symbols-outlined text-2xl">{item.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs text-slate-800 dark:text-white truncate uppercase tracking-tight">{item.title}</h4>
                        <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{item.course}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest">
                        <span className={item.priority ? 'text-nexus-red' : 'text-primary'}>{item.statusLabel}</span>
                        <span className="text-slate-500 dark:text-slate-400">{item.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-50 dark:bg-white/5 h-2 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-1000 ${item.priority ? 'bg-nexus-red shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-primary shadow-[0_0_8px_rgba(37,99,235,0.5)]'}`} style={{ width: `${item.progress}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Separator Section */}
      <div className="py-12 flex items-center gap-6">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 dark:via-white/10 to-transparent" />
        <span className="material-symbols-outlined text-gray-300 dark:text-white/10">auto_awesome</span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 dark:via-white/10 to-transparent" />
      </div>

      {/* Subjects Broad Grid */}
      {accessEnabled && (
        <section id="tour-subjects-section" className="space-y-8 animate-in fade-in slide-in-from-bottom-12 duration-1000">
          <div className="flex items-center justify-between px-2">
            <div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Materias de Estudio</h3>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">Domina todas las competencias académicas para tu examen</p>
            </div>
            <button
              onClick={() => navigate('/courses')}
              className="group px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl shadow-xl hover:scale-105 transition-all flex items-center gap-3"
            >
              Ver Catálogo
              <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-6">
            {detailedMetrics.slice(0, isDemo ? 2 : 8).map((m, idx) => (
              <div
                key={m.id}
                onClick={() => navigate('/courses')}
                className={`bg-white dark:bg-surface-dark p-8 rounded-[3rem] border border-gray-100 dark:border-white/5 shadow-sm premium-card flex flex-col items-center text-center gap-5 group cursor-pointer hover:border-nexus-${m.color}/30 transition-all hover:shadow-2xl hover:shadow-nexus-${m.color}/5 duration-500 animate-in fade-in zoom-in-95`}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className={`size-24 rounded-[2.5rem] bg-nexus-${m.color}/10 text-nexus-${m.color} flex items-center justify-center transition-all duration-700 group-hover:scale-110 group-hover:rotate-3 shadow-xl shadow-nexus-${m.color}/5 relative`}>
                  <span className="material-symbols-outlined text-5xl font-normal fill-1">{m.icon}</span>
                  {m.percentage === 100 && (
                    <div className="absolute -top-2 -right-2 size-8 bg-nexus-green rounded-full border-4 border-white dark:border-surface-dark flex items-center justify-center text-white">
                      <span className="material-symbols-outlined text-sm">verified</span>
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider mb-2">{m.title}</h4>
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center justify-center gap-3 w-full">
                      <div className="flex-1 max-w-[120px] bg-gray-100 dark:bg-white/5 h-2 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full bg-nexus-${m.color} transition-all duration-1000`} style={{ width: `${m.percentage}%` }} />
                      </div>
                      <span className={`text-sm font-black text-nexus-${m.color}`}>{m.percentage}%</span>
                    </div>
                    <p className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{m.topics?.length || 0} Temas en total</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Bottom Quick Actions (Expanded) */}
      <section id="tour-tools-section" className="pb-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-8 px-2 uppercase tracking-tighter">Herramientas & Simulacros</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { id: 'sim1', title: 'Simulacro #1', icon: 'assignment_turned_in', color: 'orange', desc: 'Evalúa tus conocimientos básicos', action: () => handleSimulacroClick('sim1', 'Simulacro #1'), restricted: true },
            { id: 'sim2', title: 'Simulacro #2', icon: 'assignment_turned_in', color: 'purple', desc: 'Desafío de nivel intermedio', action: () => handleSimulacroClick('sim2', 'Simulacro #2'), restricted: true },
            { id: 'tutor', title: 'Tutor Nexus IA', icon: 'smart_toy', color: 'blue', desc: 'Resuelve dudas al instante', action: () => navigate('/tutor'), restricted: false },
            { id: 'pagos', title: 'Finanzas', icon: 'payments', color: 'green', desc: 'Gestiona tu membresía', action: () => navigate('/finance'), restricted: false },
          ].map((tool) => {
            const isToolLocked = tool.restricted && !accessEnabled && role === 'student';
            return (
              <div
                key={tool.id}
                onClick={isToolLocked ? undefined : tool.action}
                className={`bg-white dark:bg-surface-dark p-8 rounded-[2.5rem] border border-gray-100 dark:border-white/5 flex flex-col items-center text-center gap-4 cursor-pointer active:scale-95 hover:border-nexus-${tool.color}/30 transition-all shadow-sm group hover:shadow-2xl hover:shadow-nexus-${tool.color}/5 duration-500 ${isToolLocked ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
              >
                <div className={`size-16 rounded-[1.5rem] bg-nexus-${tool.color}/10 shadow-sm flex items-center justify-center ${isToolLocked ? '' : `group-hover:bg-nexus-${tool.color}`} transition-all duration-500`}>
                  <span className={`material-symbols-outlined text-nexus-${tool.color} ${isToolLocked ? '' : 'group-hover:text-white'} text-4xl transition-colors`}>{isToolLocked ? 'lock' : tool.icon}</span>
                </div>
                <div>
                  <span className={`text-xs font-black text-slate-800 dark:text-white uppercase tracking-[0.2em]`}>{tool.title}</span>
                  <p className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    {isToolLocked ? 'Acceso bloqueado temporalmente' : tool.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Quiz Runner for Home Screen */}
      {activeQuiz && (
        <QuizRunner
          topicId={activeQuiz.topicId}
          topicTitle={activeQuiz.topicTitle}
          courseId={activeQuiz.courseId}
          type={activeQuiz.type}
          onClose={() => setActiveQuiz(null)}
          onComplete={(score) => {
            console.log("Simulacro completed with score:", score);
            // Auto close after a short delay to show results
            setTimeout(() => {
              setActiveQuiz(null);
              window.location.reload(); // Refresh to update progress metrics
            }, 2000);
          }}
        />
      )}

      {/* Premium Toast Notification */}
      {toast?.show && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-8 duration-500">
          <div className="bg-slate-900/90 dark:bg-white/90 backdrop-blur-xl border border-white/20 dark:border-black/10 px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-4 min-w-[320px]">
            <div className="size-10 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined fill-1">info</span>
            </div>
            <p className="text-white dark:text-slate-900 font-bold text-sm tracking-tight">{toast.message}</p>
          </div>
        </div>
      )}
    </main>
  );
};

export default Home;


import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PdfViewer from '../components/PdfViewer';
import { progressService, StudentProgress } from '../services/progressService';
import { fetchCoursesFromSheet } from '../services/sheetService';
import { useAuth } from '../components/AuthProvider';
import QuizRunner from './QuizRunner';
import { scheduleService } from '../services/scheduleService';

interface Topic {
  id: string;
  title: string;
  pdfUrl: string;
  videoUrl: string;
}

interface Subject {
  id: string;
  title: string;
  category: 'Ciencias' | 'Humanidades' | 'Sociales' | 'Idiomas' | 'General';
  icon: string;
  color: string;
  topics: Topic[];
}


const Courses: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  const [viewerState, setViewerState] = useState<{ type: 'pdf' | 'video', url: string, title: string } | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<{ topicId: string, topicTitle: string, courseId: string, type: 'quiz' | 'workshop' } | null>(null);

  const [progressMap, setProgressMap] = useState<Record<string, StudentProgress>>({});
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [topicWeekMap, setTopicWeekMap] = useState<Record<string, number>>({});

  const { user, accessEnabled, role, isDemo } = useAuth();

  useEffect(() => {
    // Security check: if student access is not enabled, redirect to home
    if (role === 'student' && !accessEnabled) {
      navigate('/home');
      return;
    }

    // This useEffect now handles initial data loading based on user authentication and access status
    const loadInitialData = async () => {
      if (user) {
        setLoadingCourses(true);
        const data = await fetchCoursesFromSheet();
        const newSubjects: Subject[] = Object.keys(data).map(key => {
          const meta = subjectMetadata[key] || { category: 'General', icon: 'class', color: 'gray' };
          const id = key.toLowerCase().replace(/ /g, ''); // Generates 'medioambiente' from 'MEDIO AMBIENTE'
          return {
            id: id,
            title: key,
            ...meta,
            topics: data[key]
          };
        });

        const orderedKeys = Object.keys(subjectMetadata);
        const sortedSubjects = newSubjects.sort((a, b) => {
          return orderedKeys.indexOf(a.title) - orderedKeys.indexOf(b.title);
        });

        setSubjects(sortedSubjects);

        const allTopics = sortedSubjects.flatMap(s => s.topics);
        const weekMap: Record<string, number> = {};
        allTopics.forEach((t, i) => {
          weekMap[t.id] = Math.floor(i / 2) + 1;
        });
        setTopicWeekMap(weekMap);
        setLoadingCourses(false);

        // Load general progress for all courses if user is available
        setLoadingProgress(true);
        try {
          const allProgress = await progressService.getAllProgress();
          const map: Record<string, StudentProgress> = {};
          allProgress.forEach(p => {
            map[p.lesson_id] = p;
          });
          setProgressMap(map);
        } catch (error) {
          console.warn('Could not load all progress', error);
        } finally {
          setLoadingProgress(false);
        }
      }
    };

    loadInitialData();
  }, [user, accessEnabled, role, navigate]); // Added navigate to dependencies as it's used inside

  // Track interactions: topicId -> { pdfClicked: boolean, videoClicked: boolean }
  const [interactions, setInteractions] = useState<Record<string, { pdfClicked: boolean, videoClicked: boolean }>>({});

  // Metadata for subjects (colors, icons, categories)
  const subjectMetadata: Record<string, Omit<Subject, 'topics' | 'id' | 'title'>> = {
    'PSICOLOGIA': { category: 'Humanidades', icon: 'favorite', color: 'pink' },
    'ESPAÑOL': { category: 'Humanidades', icon: 'history_edu', color: 'orange' },
    'MATEMATICAS': { category: 'Ciencias', icon: 'calculate', color: 'blue' },
    'BIOLOGIA': { category: 'Ciencias', icon: 'biotech', color: 'green' },
    'SOCIALES': { category: 'Sociales', icon: 'globe_asia', color: 'orange' },
    'FILOSOFIA': { category: 'Humanidades', icon: 'psychology_alt', color: 'purple' },
    'QUIMICA': { category: 'Ciencias', icon: 'science', color: 'blue' },
    'FISICA': { category: 'Ciencias', icon: 'architecture', color: 'blue' },
    'MEDIO AMBIENTE': { category: 'Ciencias', icon: 'energy_savings_leaf', color: 'green' },
    'ETICA': { category: 'Sociales', icon: 'gavel', color: 'purple' },
    'ESTADISTICA': { category: 'Ciencias', icon: 'monitoring', color: 'blue' }
  };

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  useEffect(() => {
    const loadCourses = async () => {
      setLoadingCourses(true);
      const data = await fetchCoursesFromSheet();
      const newSubjects: Subject[] = Object.keys(data).map(key => {
        const meta = subjectMetadata[key] || { category: 'General', icon: 'class', color: 'gray' };
        const id = key.toLowerCase().replace(/ /g, ''); // Generates 'medioambiente' from 'MEDIO AMBIENTE'
        return {
          id: id,
          title: key,
          ...meta,
          topics: data[key]
        };
      });

      // Manual sort to keep order if necessary, or just let it be.
      // The original had a specific order. Let's try to preserve it by mapping keys of metadata.
      const orderedKeys = Object.keys(subjectMetadata);
      const sortedSubjects = newSubjects.sort((a, b) => {
        return orderedKeys.indexOf(a.title) - orderedKeys.indexOf(b.title);
      });

      setSubjects(sortedSubjects);

      // Calculate topic-to-week mapping
      const allTopics = sortedSubjects.flatMap(s => s.topics);
      const weekMap: Record<string, number> = {};
      allTopics.forEach((t, i) => {
        weekMap[t.id] = Math.floor(i / 2) + 1;
      });
      setTopicWeekMap(weekMap);

      setLoadingCourses(false);
    };
    loadCourses();
  }, []);

  // Handle auto-selection from Home "Continue where I left off"
  useEffect(() => {
    const state = location.state as { autoSelectCourseId?: string } | null;
    if (state?.autoSelectCourseId && subjects.length > 0) {
      const subject = subjects.find(s => s.id === state.autoSelectCourseId);
      if (subject) {
        setSelectedSubject(subject);
        // Clear state to avoid re-selection on back navigation
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, subjects]);

  const filteredSubjects = useMemo(() => {
    return subjects.filter(s =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, subjects]);

  useEffect(() => {
    if (selectedSubject) {
      loadProgress(selectedSubject.id);
    }
  }, [selectedSubject]);

  const loadProgress = async (courseId: string) => {
    setLoadingProgress(true);
    try {
      const progress = await progressService.getCourseProgress(courseId);
      const map: Record<string, StudentProgress> = {};
      progress.forEach(p => {
        map[p.lesson_id] = p;
      });
      setProgressMap(map);
    } catch (error) {
      // Fail silently or log
      console.warn('Could not load specific progress', error);
    } finally {
      setLoadingProgress(false);
    }
  };

  const handleTopicClick = async (topic: Topic, type: 'pdf' | 'video') => {
    // Record interaction
    setInteractions(prev => ({
      ...prev,
      [topic.id]: {
        ...prev[topic.id],
        [type === 'pdf' ? 'pdfClicked' : 'videoClicked']: true
      }
    }));

    const url = type === 'pdf' ? topic.pdfUrl : topic.videoUrl;
    if (url) {
      setViewerState({ type, url, title: topic.title });
    }

    // Guardar progreso como "in_progress" para mantener la racha activa
    if (!isDemo && selectedSubject) {
      try {
        const currentProgress = progressMap[topic.id];
        const statusToSave = currentProgress?.status === 'completed' ? 'completed' : 'in_progress';
        const scoreToSave = currentProgress?.score || 0;
        await progressService.saveProgress(selectedSubject.id, topic.id, statusToSave, scoreToSave);
      } catch (error) {
        console.warn('Could not save interaction progress', error);
      }
    }
  };

  const markAsCompleted = async (subject: Subject, topic: Topic) => {
    if (isDemo) return; // Prevent saving progress in demo mode
    try {
      // Optimistic update
      const newProgress = {
        id: 'temp',
        user_id: 'temp',
        course_id: subject.id,
        lesson_id: topic.id,
        status: 'completed' as const,
        score: 100,
        updated_at: new Date().toISOString()
      };

      setProgressMap(prev => ({ ...prev, [topic.id]: newProgress }));

      await progressService.saveProgress(subject.id, topic.id, 'completed', 100);
    } catch (error) {
      console.error('Error saving progress:', error);
      alert('Error al guardar el progreso');
    }
  };

  return (
    <div className="flex flex-col flex-1 pb-24 bg-background-light dark:bg-background-dark min-h-screen relative">

      {/* Visualizador de Multimedia (PDF) */}
      {viewerState && viewerState.type === 'pdf' && (
        <PdfViewer
          url={viewerState.url}
          title={viewerState.title}
          onClose={() => setViewerState(null)}
        />
      )}
      {activeQuiz && (
        <QuizRunner
          topicId={activeQuiz.topicId}
          topicTitle={activeQuiz.topicTitle}
          courseId={activeQuiz.courseId}
          type={activeQuiz.type}
          onClose={() => setActiveQuiz(null)}
          onComplete={(score) => {
            console.log("Activity completed with score:", score);
            if (!isDemo && selectedSubject) {
              // Reload progress now that activity is finished
              markAsCompleted(selectedSubject, selectedSubject.topics.find(t => t.id === activeQuiz.topicId)!);
              loadProgress(selectedSubject.id);
            }
            // Auto close after a short delay to show results
            setTimeout(() => setActiveQuiz(null), 1500);
          }}
        />
      )}

      {/* Visualizador de Multimedia (Video) */}
      {viewerState && viewerState.type === 'video' && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col animate-in fade-in zoom-in duration-300 backdrop-blur-md">
          <header className="flex items-center justify-between p-4 bg-background-dark border-b border-white/10">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-nexus-blue fill-1">smart_display</span>
              <div className="flex flex-col">
                <p className="text-white text-[10px] font-black uppercase tracking-widest leading-none mb-1">Clase Digital Nexus</p>
                <p className="text-white/60 text-[9px] font-bold truncate max-w-[200px] leading-none uppercase">{viewerState.title}</p>
              </div>
            </div>
            <button
              onClick={() => setViewerState(null)}
              className="size-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-nexus-red transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </header>
          <div className="flex-1 w-full bg-black flex items-center justify-center p-4">
            <div className="w-full max-w-4xl aspect-video rounded-3xl overflow-hidden shadow-2xl bg-slate-900/50 flex items-center justify-center">
              <iframe
                src={viewerState.url}
                className="w-full h-full border-none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                title="Nexus Video Player"
              />
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-50 bg-white/90 dark:bg-background-dark/90 backdrop-blur-md p-4 border-b border-gray-100 dark:border-white/5 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => selectedSubject ? setSelectedSubject(null) : navigate(-1)}
            className="size-10 flex items-center justify-center rounded-full bg-gray-50 dark:bg-white/5 hover:bg-primary/10 transition-colors"
          >
            <span className="material-symbols-outlined dark:text-white">
              {selectedSubject ? 'arrow_back' : 'arrow_back_ios'}
            </span>
          </button>

          <div className="flex-1">
            <h1 className="text-lg font-bold dark:text-white leading-tight">
              {selectedSubject ? selectedSubject.title : 'Malla Curricular'}
            </h1>
            <p className="text-[10px] font-bold text-primary uppercase tracking-[0.1em]">
              {selectedSubject ? `${selectedSubject.topics.length} temas integrados` : 'Fundación Nexus Colombia'}
            </p>
          </div>
        </div>

        {!selectedSubject && (
          <div className="relative mt-5">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary opacity-40">search</span>
            <input
              type="text"
              placeholder="¿Qué quieres estudiar hoy?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-surface-dark border border-gray-100 dark:border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-primary shadow-sm transition-all dark:text-white outline-none"
            />
          </div>
        )}
      </header>

      <main className="p-4">
        {loadingCourses ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Cargando malla curricular...</p>
          </div>
        ) : !selectedSubject ? (
          <div className="grid grid-cols-1 gap-4 animate-in fade-in duration-500">
            {filteredSubjects.slice(0, isDemo ? 2 : undefined).map((subject) => (
              <button
                key={subject.id}
                onClick={() => setSelectedSubject(subject)}
                className="bg-white dark:bg-surface-dark p-6 rounded-[2.5rem] border border-gray-100 dark:border-white/5 flex items-center gap-5 shadow-sm active:scale-[0.98] transition-all group min-h-[100px]"
              >
                <div className={`size-16 rounded-[1.8rem] bg-nexus-${subject.color}/10 border border-nexus-${subject.color}/20 flex items-center justify-center text-nexus-${subject.color} group-hover:bg-nexus-${subject.color} group-hover:text-white transition-all duration-500 shrink-0 shadow-lg shadow-nexus-${subject.color}/10 group-hover:shadow-nexus-${subject.color}/40 overflow-hidden`}>
                  <span className="material-symbols-outlined text-3xl font-normal fill-1 transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110 drop-shadow-md select-none">
                    {subject.icon}
                  </span>
                </div>
                <div className="flex-1 text-left min-w-0">
                  <span className={`text-[10px] font-black text-nexus-${subject.color} uppercase tracking-[0.2em] block mb-1 opacity-80`}>{subject.category}</span>
                  <h3 className="text-xl font-black dark:text-white text-slate-900 leading-tight truncate group-hover:text-primary transition-colors">{subject.title}</h3>
                </div>
                <div className="size-10 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-all">
                  <span className="material-symbols-outlined text-gray-300 transition-colors">chevron_right</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Header section with Demo Banner */}
            <div className="relative z-10">
              {isDemo && (
                <div className="mx-4 mt-4 p-3 bg-nexus-blue/20 border border-nexus-blue/30 rounded-2xl flex items-center gap-3 animate-pulse">
                  <span className="material-symbols-outlined text-nexus-blue">info</span>
                  <p className="text-xs font-medium text-nexus-blue-light">
                    <span className="font-bold">Modo Demo:</span> Solo puedes ver los 2 primeros temas de cada materia.
                  </p>
                </div>
              )}

              <div className="px-1 flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Listado de Temas</span>
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{selectedSubject.category}</span>
              </div>
            </div>
            {selectedSubject.topics.slice(0, isDemo ? 2 : undefined).map((topic, index) => {
              const prevTopic = index > 0 ? selectedSubject.topics[index - 1] : null;
              const isPrevCompleted = !prevTopic || progressMap[prevTopic.id]?.status === 'completed';
              const isCurrentCompleted = progressMap[topic.id]?.status === 'completed';

              const isLocked = !isPrevCompleted && !isCurrentCompleted;
              const showCheckmark = isCurrentCompleted;

              return (
                <div key={topic.id} className={`bg-white dark:bg-surface-dark rounded-[2.5rem] p-6 border transition-all ${isLocked ? 'opacity-50 grayscale pointer-events-none' :
                  showCheckmark ? 'border-green-500/40 ring-1 ring-green-500/10' : 'border-gray-100 dark:border-white/5'
                  } shadow-md flex flex-col gap-5`}>

                  <div className="flex items-start gap-4">
                    <div className={`size-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-sm transition-colors ${isLocked ? 'bg-gray-200 text-gray-400' :
                      showCheckmark ? 'bg-green-100 dark:bg-green-900/30 text-green-600' :
                        `bg-nexus-${selectedSubject.color}/10 text-nexus-${selectedSubject.color}`
                      }`}>
                      {isLocked ? <span className="material-symbols-outlined text-lg">lock</span> :
                        showCheckmark ? <span className="material-symbols-outlined text-xl">check</span> : index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 dark:text-white text-base leading-snug">{topic.title}</h4>
                        {isLocked && <span className="text-[8px] font-black bg-gray-100 px-2 py-0.5 rounded-full text-gray-400 uppercase tracking-tighter">Bloqueado</span>}
                        {!isLocked && topicWeekMap[topic.id] && (
                          <span className="text-[8px] font-black bg-primary/10 px-2 py-0.5 rounded-full text-primary uppercase tracking-tighter">Semana {topicWeekMap[topic.id]}</span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-wider">Módulo Académico {index + 1}</p>
                    </div>
                  </div>

                  {!isLocked ? (
                    <div className="grid grid-cols-2 gap-3">
                      {/* Pillar 1: Video */}
                      <button
                        onClick={() => handleTopicClick(topic, 'video')}
                        className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 border transition-all active:scale-95 ${topic.videoUrl ? 'bg-nexus-blue/5 border-nexus-blue/20 text-nexus-blue hover:bg-nexus-blue/10' : 'bg-gray-50 border-gray-100 text-gray-300 opacity-50 cursor-not-allowed'
                          }`}
                      >
                        <span className="material-symbols-outlined text-2xl fill-1">smart_display</span>
                        <span className="text-[9px] font-black uppercase tracking-tighter">Ver Video</span>
                      </button>

                      {/* Pillar 2: PDF */}
                      <button
                        onClick={() => handleTopicClick(topic, 'pdf')}
                        className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 border transition-all active:scale-95 ${topic.pdfUrl ? 'bg-nexus-red/5 border-nexus-red/20 text-nexus-red hover:bg-nexus-red/10' : 'bg-gray-50 border-gray-100 text-gray-300 opacity-50 cursor-not-allowed'
                          }`}
                      >
                        <span className="material-symbols-outlined text-2xl fill-1">picture_as_pdf</span>
                        <span className="text-[9px] font-black uppercase tracking-tighter">Guía PDF</span>
                      </button>

                      {/* Pillar 3: Assessment (Promoted to span 2 columns for symmetry) */}
                      <button
                        onClick={() => {
                          setActiveQuiz({ topicId: topic.id, topicTitle: topic.title, courseId: selectedSubject.id, type: 'quiz' });
                        }}
                        className={`col-span-2 p-5 rounded-2xl flex flex-col items-center justify-center gap-2 border transition-all active:scale-95 ${showCheckmark ? 'bg-green-500 text-white border-green-600 shadow-lg shadow-green-500/20' : 'bg-nexus-purple text-white border-nexus-purple shadow-lg shadow-nexus-purple/20'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-2xl">task_alt</span>
                          <span className="text-xs font-black uppercase tracking-widest font-sans">Evaluación Final</span>
                        </div>
                      </button>
                    </div>
                  ) : (
                    <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4 flex items-center justify-center gap-3 border border-dashed border-gray-200 dark:border-white/10">
                      <span className="material-symbols-outlined text-gray-300">lock_open</span>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center">
                        Completa el {prevTopic?.title || 'tema anterior'} para desbloquear
                      </p>
                    </div>
                  )}

                  {showCheckmark && (
                    <div className="text-center py-1">
                      <span className="text-[9px] font-black text-green-500 uppercase tracking-[0.2em] flex items-center justify-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">stars</span>
                        CONTENIDO SUPERADO
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            <button
              onClick={() => setSelectedSubject(null)}
              className="w-full py-8 text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-sm">grid_view</span>
              Volver al catálogo completo
            </button>
          </div>
        )}
      </main>

      <footer className="px-6 py-4 mb-4">
        <div className="p-6 bg-primary/5 dark:bg-surface-dark rounded-[2.5rem] border border-dashed border-primary/20 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary fill-1">verified_user</span>
            <p className="text-[11px] text-primary font-black uppercase tracking-wider">Recursos Verificados 2026</p>
          </div>
          <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
            Hemos actualizado la base de datos completa con los 32 temas del bachillerato. Todos los enlaces han sido probados para garantizar su funcionamiento.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Courses;

import React, { useState, useEffect } from 'react';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { progressService, StudentProgress } from '../services/progressService';
import { fetchCoursesFromSheet, Topic } from '../services/sheetService';

import { gradeService, CombinedGrade } from '../services/gradeService';
import { paymentService } from '../services/paymentService';
import { supabase } from '../services/supabaseClient';
import { notificationService } from '../services/notificationService';

// Subcomponent for report
import AcademicReportCard from '../components/AcademicReportCard';

const AcademicReportWrapper = ({ isOverdue }: { isOverdue: boolean }) => {
  const navigate = useNavigate();
  const [report, setReport] = useState<CombinedGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, documentNumber } = useAuth();
  const [showFullReport, setShowFullReport] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user || isOverdue) {
        setLoading(false);
        return;
      }
      try {
        const data = await gradeService.getStudentReport(user.id);
        setReport(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, isOverdue]);

  if (isOverdue) {
    return (
      <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] p-10 border border-gray-100 dark:border-white/5 shadow-xl text-center flex flex-col items-center justify-center space-y-6 animate-in fade-in zoom-in duration-500">
        <div className="size-20 bg-nexus-red/10 text-nexus-red rounded-3xl flex items-center justify-center shadow-lg shadow-nexus-red/5">
          <span className="material-symbols-outlined text-4xl">lock</span>
        </div>
        <div className="space-y-2">
          <h3 className="font-black dark:text-white text-2xl tracking-tight">Acceso Restringido</h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest leading-relaxed">
            Tu boletín oficial 2026-1 está bloqueado<br />por cuotas pendientes.
          </p>
        </div>
        <div className="w-full pt-4">
          <button
            onClick={() => navigate('/finance')}
            className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl"
          >
            Ver mis pagos
          </button>
        </div>
        <p className="text-[10px] text-gray-500 italic">"Mantente al día para disfrutar de todos los servicios Nexus."</p>
      </div>
    );
  }

  if (loading) return <div className="text-center text-xs text-gray-500">Generando boletín...</div>;

  if (showFullReport) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm overflow-y-auto p-4 flex items-start justify-center">
        <div className="relative w-full max-w-2xl my-8">
          <button
            onClick={() => setShowFullReport(false)}
            className="absolute -top-12 right-0 text-white flex items-center gap-2 font-bold hover:text-nexus-purple transition-colors"
          >
            CERRAR VISTA PREVIA
            <span className="material-symbols-outlined bg-white/10 rounded-full p-1">close</span>
          </button>
          <AcademicReportCard
            studentName={user?.user_metadata?.full_name || "Estudiante"}
            studentId={documentNumber || "Cargando..."}
            cohort="Grado 11 • Validación"
            grades={report}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-surface-dark rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-sm text-center space-y-4">
      <div className="size-16 bg-nexus-purple/10 text-nexus-purple rounded-full flex items-center justify-center mx-auto">
        <span className="material-symbols-outlined text-3xl">school</span>
      </div>
      <div>
        <h3 className="font-bold dark:text-white text-lg">Boletín 2026-1</h3>
        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Disponible para descarga oficial.</p>
      </div>
      <button
        onClick={() => setShowFullReport(true)}
        className="w-full bg-nexus-purple text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-nexus-purple/90 transition-colors shadow-lg shadow-nexus-purple/20"
      >
        Ver Documento Oficial
      </button>
    </div>
  );
};

interface ProfileProps {
  toggleTheme: () => void;
  isDarkMode: boolean;
}

const Profile: React.FC<ProfileProps> = ({ toggleTheme, isDarkMode }) => {
  const navigate = useNavigate();
  const { user, role, signOut, isDemo, avatarUrl, documentNumber, refreshProfile, isOverdue } = useAuth();
  const [uploading, setUploading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ completedCount: 0, totalTopicsCount: 0, percentage: 0, average: '0.0' });
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch real progress for the profile stats
        const courses = await fetchCoursesFromSheet();
        const allTopicsList = Object.values(courses).flat();
        const m = await progressService.getOverallProgressMetrics(allTopicsList);

        // Fetch and calculate real average
        let average = '0.0';
        if (user) {
          const reportData = await gradeService.getStudentReport(user.id);
          if (reportData.length > 0) {
            const sum = reportData.reduce((acc, g) => acc + g.score, 0);
            average = (sum / reportData.length).toFixed(1);
          }
        }

        setMetrics({
          completedCount: m.completedCount,
          totalTopicsCount: m.totalTopicsCount,
          percentage: m.percentage,
          average
        });

        if (user) {
          const notifs = await notificationService.getForUser(user.id);
          setUnreadCount(notifs.filter(n => !n.is_read).length);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isDemo) {
      alert('La edición de perfil no está disponible en el Modo Demo.');
      return;
    }
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Debes seleccionar una imagen.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 3. Update Profile table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      // 4. Refresh global state
      await refreshProfile();
      alert('¡Foto de perfil actualizada con éxito!');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  const achievements = [
    { name: 'Pionero AI', icon: 'smart_toy', color: 'from-nexus-orange to-orange-600' },
    { name: 'Cálculo', icon: 'functions', color: 'from-gray-200 to-gray-400', locked: true },
    { name: 'Lectura', icon: 'auto_stories', color: 'from-nexus-green to-emerald-700' },
  ];

  return (
    <div className="flex flex-col flex-1 pb-24 bg-background-light dark:bg-background-dark min-h-screen">
      {/* Header - Visible only on mobile */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md flex lg:hidden items-center p-4 justify-between border-b border-gray-200 dark:border-white/5">
        <button onClick={() => navigate(-1)} className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
          <span className="material-symbols-outlined">arrow_back_ios</span>
        </button>
        <h1 className="text-[#0d121b] dark:text-white text-lg font-bold leading-tight flex-1 text-center">Mi Perfil Nexus</h1>
        <div className="size-10" />
      </header>

      {/* Desktop Header - Visible only on lg */}
      <div className="hidden lg:flex px-12 pt-12 pb-6 animate-in fade-in slide-in-from-top-4 duration-700">
        <div>
          <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tight">Mi Perfil</h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold mt-2 uppercase tracking-[0.2em] flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">person</span>
            Centro de Gestión de Usuario
          </p>
        </div>
      </div>

      <main className="flex-1 w-full lg:px-12">
        {/* Responsive Grid System */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

          {/* Column Left (User Info & Stats) */}
          <div className="lg:col-span-12 xl:col-span-4 space-y-8 animate-in fade-in slide-in-from-left-4 duration-700">
            {/* Profile Card */}
            <section className="bg-white dark:bg-surface-dark rounded-[3rem] p-8 border border-gray-100 dark:border-white/5 shadow-xl flex flex-col items-center group hover:shadow-2xl transition-all duration-500">
              {isDemo && (
                <div className="bg-nexus-orange/10 border border-nexus-orange/30 rounded-2xl p-3 mb-6 flex items-center gap-2 animate-pulse w-full justify-center">
                  <span className="material-symbols-outlined text-nexus-orange text-sm">construction</span>
                  <p className="text-[10px] font-bold text-nexus-orange uppercase">Modo Demo</p>
                </div>
              )}

              <div className="relative group/avatar cursor-pointer mb-6" onClick={() => !isDemo && document.getElementById('avatar-upload')?.click()}>
                <div
                  className={`bg-center bg-no-repeat aspect-square bg-cover rounded-full size-40 border-8 border-white dark:border-surface-dark shadow-2xl flex items-center justify-center bg-gray-100 dark:bg-white/5 transition-transform duration-500 group-hover/avatar:scale-105 ${isDemo ? 'cursor-not-allowed opacity-80' : ''}`}
                  style={{ backgroundImage: avatarUrl ? `url(${avatarUrl})` : `url(https://picsum.photos/seed/${user?.id}/300/300)` }}
                >
                  {uploading && (
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-[2px]">
                      <span className="material-symbols-outlined animate-spin text-white text-4xl">progress_activity</span>
                    </div>
                  )}
                </div>

                {!isDemo && (
                  <div className="absolute bottom-1 right-1 bg-primary text-white p-3 rounded-full border-4 border-white dark:border-surface-dark shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[20px]">{uploading ? 'hourglass_top' : 'photo_camera'}</span>
                  </div>
                )}

                <input
                  type="file"
                  id="avatar-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
              </div>

              <div className="text-center mb-8">
                <h2 className="text-slate-900 dark:text-white text-3xl font-black tracking-tight">{user?.user_metadata?.full_name || "Estudiante"}</h2>
                <p className="text-primary text-xs font-black tracking-[0.2em] uppercase mt-2">ID: {documentNumber || "Cargando..."}</p>
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-white/5 rounded-full border border-gray-100 dark:border-white/10">
                  <span className={`size-2 rounded-full ${role === 'admin' ? 'bg-nexus-red animate-pulse' : 'bg-nexus-green'}`} />
                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{role || 'Usuario Nexus'}</span>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-3 w-full">
                {[
                  { label: 'Cursos', val: metrics.totalTopicsCount > 0 ? `${metrics.completedCount}/${metrics.totalTopicsCount}` : '...', icon: 'book', color: 'nexus-blue' },
                  { label: 'Promedio', val: metrics.average, icon: 'grade', color: 'nexus-purple' },
                  { label: 'Progreso', val: `${metrics.percentage}%`, icon: 'schedule', color: 'nexus-green' }
                ].map((stat, i) => (
                  <div key={i} className={`bg-${stat.color}/5 p-4 rounded-3xl border border-${stat.color}/10 flex flex-col items-center hover:bg-${stat.color}/10 transition-colors group/stat cursor-help relative`}>
                    <span className={`material-symbols-outlined text-${stat.color} text-xl mb-1`}>{stat.icon}</span>
                    <span className="text-sm font-black dark:text-white">{stat.val}</span>
                    <p className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Theme Settings - Quick Access on Left */}
            <section className="bg-white dark:bg-surface-dark rounded-[2.5rem] p-6 border border-gray-100 dark:border-white/5 shadow-lg group hover:shadow-2xl transition-all duration-500">
              <h3 className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mb-4 px-2">Preferencias</h3>
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:rotate-12 transition-transform">
                    <span className="material-symbols-outlined">{isDarkMode ? 'dark_mode' : 'light_mode'}</span>
                  </div>
                  <div>
                    <p className="text-sm font-black dark:text-white">Modo Oscuro</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Optimiza tu vista</p>
                  </div>
                </div>
                <button
                  onClick={toggleTheme}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${isDarkMode ? 'bg-primary' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </section>
          </div>

          {/* Column Right (Badges, Report, Menus) */}
          <div className="lg:col-span-12 xl:col-span-8 space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">

            {/* Badges Section */}
            <section className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Insignias Logradas</h3>
                <button
                  onClick={() => navigate('/achievements')}
                  className="px-6 py-2 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-primary hover:text-white transition-all shadow-sm"
                >
                  Cátalogo Completo
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: 'Racha de Fuego', icon: 'local_fire_department', gradient: 'from-orange-500 via-red-500 to-orange-600', shadow: 'shadow-orange-500/20', desc: '7 días seguidos', locked: false },
                  { name: 'Cerebro de Oro', icon: 'psychology', gradient: 'from-yellow-400 via-amber-500 to-yellow-600', shadow: 'shadow-yellow-500/20', desc: 'Promedio > 4.5', locked: false },
                  { name: 'Libros & Saber', icon: 'menu_book', gradient: 'from-emerald-400 via-nexus-green to-teal-600', shadow: 'shadow-nexus-green/20', desc: '50 lecturas', locked: false },
                  { name: 'Tarea Impecable', icon: 'verified', gradient: 'from-blue-400 via-nexus-blue to-indigo-600', shadow: 'shadow-nexus-blue/20', desc: '10 notas de 5.0', locked: true },
                  { name: 'Madrugador', icon: 'wb_sunny', gradient: 'from-amber-400 via-orange-400 to-yellow-500', shadow: 'shadow-amber-500/20', desc: 'Estudio antes 6AM', locked: true },
                  { name: 'Noctámbulo', icon: 'dark_mode', gradient: 'from-indigo-500 via-purple-600 to-blue-700', shadow: 'shadow-indigo-500/20', desc: 'Estudio post 10PM', locked: true }
                ].map((badge, i) => (
                  <div
                    key={i}
                    className={`group/badge relative flex flex-col items-center text-center p-6 rounded-[2.5rem] border border-gray-100 dark:border-white/5 transition-all hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] ${badge.locked ? 'bg-gray-50 dark:bg-white/5 opacity-40 grayscale' : 'bg-white dark:bg-surface-dark shadow-xl'}`}
                  >
                    <div className={`size-16 shrink-0 rounded-2xl flex items-center justify-center text-white mb-4 transition-all duration-500 group-hover/badge:rotate-12 group-hover/badge:scale-110 ${badge.locked ? 'bg-gray-300' : `bg-gradient-to-br ${badge.gradient} ${badge.shadow} shadow-lg`}`}>
                      <span className="material-symbols-outlined text-3xl fill-1">{badge.icon}</span>
                    </div>
                    <div className="w-full">
                      <h4 className={`text-sm font-black tracking-tight leading-tight ${badge.locked ? 'text-slate-500 dark:text-slate-500' : 'text-slate-800 dark:text-white'}`}>{badge.name}</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-2">{badge.desc}</p>
                    </div>
                    {badge.locked && (
                      <div className="absolute top-4 right-4 text-gray-300">
                        <span className="material-symbols-outlined text-sm">lock</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Navigation Menus */}
              <section className="space-y-6">
                <h3 className="text-xl font-black dark:text-white px-2 uppercase tracking-tighter">Accesos Rápidos</h3>
                <div className="space-y-3">
                  {[
                    { path: '/courses', label: 'Mis Módulos', icon: 'auto_stories', color: 'nexus-blue' },
                    { path: '/finance', label: 'Finanzas & Pagos', icon: 'payments', color: 'nexus-green' },
                    { path: '/notifications', label: 'Centro de Avisos', icon: 'notifications', color: 'nexus-pink', sub: unreadCount > 0 ? `${unreadCount} ${unreadCount === 1 ? 'por revisar' : 'por revisar'}` : 'Sin avisos nuevos' }
                  ].map((menu, i) => (
                    <button key={i} onClick={() => navigate(menu.path)} className="w-full flex items-center justify-between p-5 bg-white dark:bg-surface-dark rounded-3xl border border-gray-100 dark:border-white/5 hover:shadow-lg hover:scale-[1.01] active:scale-[0.98] transition-all group">
                      <div className="flex items-center gap-4">
                        <div className={`size-10 rounded-2xl bg-${menu.color}/10 flex items-center justify-center text-${menu.color} transition-all duration-300 group-hover:scale-110`}>
                          <span className="material-symbols-outlined">{menu.icon}</span>
                        </div>
                        <div className="text-left">
                          <p className="font-black text-sm text-slate-800 dark:text-white">{menu.label}</p>
                          {menu.sub && <span className="text-[10px] text-nexus-pink font-black uppercase tracking-widest">{menu.sub}</span>}
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-gray-300 group-hover:translate-x-1 transition-transform">chevron_right</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Academic Report Section */}
              <section className="space-y-6">
                <h3 className="text-xl font-black dark:text-white px-2 uppercase tracking-tighter">Estado Académico</h3>
                <div className="h-full min-h-[220px]">
                  {isDemo ? (
                    <div className="bg-slate-100 dark:bg-white/5 border border-dashed border-gray-200 dark:border-white/10 rounded-[2.5rem] p-8 text-center flex flex-col items-center justify-center h-full">
                      <span className="material-symbols-outlined text-gray-300 text-4xl mb-3">visibility_off</span>
                      <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest leading-relaxed">Reportes oficiales bloqueados en modo demo</p>
                    </div>
                  ) : (
                    <AcademicReportWrapper isOverdue={isOverdue} />
                  )}
                </div>
              </section>
            </div>

            {/* Logout / System Info */}
            <div className="pt-8 border-t border-gray-100 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
              <button
                onClick={handleSignOut}
                className="w-full md:w-auto px-10 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black uppercase tracking-[0.2em] rounded-3xl shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-4 group"
              >
                <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">logout</span>
                Cerrar Sesión Segura
              </button>
              <div className="text-center md:text-right">
                <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em]">NexusApp v2.5.0</p>
                <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest mt-1">Plataforma Educativa Integral</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
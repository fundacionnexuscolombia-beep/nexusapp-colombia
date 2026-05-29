
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

// Create a temporary client for admin actions to avoid logging out the current user
// Note: In a real production app, user creation should be done via Edge Functions
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const tempClient = (supabaseUrl && supabaseAnonKey && supabaseUrl !== 'YOUR_SUPABASE_URL')
  ? createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } })
  : null;

import { useAuth } from '../components/AuthProvider';
import { supabase } from '../services/supabaseClient';
import { analyticsService, ExecutiveStats, AtRiskStudent } from '../services/analyticsService';
import GradeManager from '../components/GradeManager';
import PaymentManager from '../components/PaymentManager';
import NewsManager from '../components/NewsManager';
import StudentAccessManager from '../components/StudentAccessManager';
import AdminAccountManager from '../components/AdminAccountManager';



const CreateUserForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempClient) {
      setMsg({ type: 'error', text: 'Supabase no configurado.' });
      return;
    }
    setLoading(true);
    setMsg(null);

    // 1. Create user in auth
    const { data, error } = await tempClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    });

    if (error) {
      setMsg({ type: 'error', text: error.message });
      setLoading(false);
      return;
    }

    if (data.user) {
      // 2. Update profile with role and cohort
      // This uses the current user's privileges through the main client if possible, 
      // but tempClient with persistSession: false doesn't have the session.
      // We should use the main supabase client for the update if we want admin policies to apply.
      const { supabase } = await import('../services/supabaseClient');

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', data.user.id);

      if (profileError) {
        console.warn('Profile update error:', profileError);
      }

      setMsg({ type: 'success', text: `Administrador ${fullName} creado exitosamente.` });

      setEmail('');
      setPassword('');
      setFullName('');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleCreateUser} className="space-y-4">
      <h3 className="font-bold dark:text-white text-sm">Crear Nuevo Administrador</h3>
      <div className="space-y-3">
        <input
          required
          type="text"
          placeholder="Nombre Completo"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-primary outline-none dark:text-white"
        />
        <input
          required
          type="email"
          placeholder="Correo Electrónico"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-primary outline-none dark:text-white"
        />
        <input
          required
          type="password"
          placeholder="Contraseña Temporal"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-primary outline-none dark:text-white"
        />
      </div>

      {msg && (
        <div className={`p-3 rounded-xl text-xs text-center ${msg.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {msg.text}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary text-white py-3 rounded-xl text-xs font-bold hover:bg-nexus-purple transition-colors disabled:opacity-50"
      >
        {loading ? 'Creando...' : 'Crear Administrador'}
      </button>
    </form>
  );
};

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, avatarUrl, refreshProfile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [execStats, setExecStats] = useState<ExecutiveStats | null>(null);
  const [atRiskStudents, setAtRiskStudents] = useState<AtRiskStudent[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [statsData, riskData] = await Promise.all([
          analyticsService.getExecutiveStats(),
          analyticsService.getAtRiskStudents()
        ]);
        setExecStats(statsData);
        setAtRiskStudents(riskData);

        if (user) {
          const { count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false);
          setUnreadCount(count || 0);
        }
      } catch (e) {
        console.error("Dashboard data error:", e);
      }
    };
    fetchInitialData();

    if (user) {
      const channel = supabase
        .channel(`admin-notifs-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          async () => {
            // Re-fetch count when any notification changes for this user
            const { count } = await supabase
              .from('notifications')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('is_read', false);
            setUnreadCount(count || 0);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  // Smooth scroll effect based on URL hash (e.g. #materias, #pagos, #cronograma)
  useEffect(() => {
    if (location.hash) {
      const targetId = location.hash.replace('#', '');
      const element = document.getElementById(targetId);
      if (element) {
        // Delay slightly to ensure layout rendering has settled
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
      }
    }
  }, [location.hash]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

      // 4. Refresh Auth Context
      await refreshProfile();
      alert('¡Foto de perfil actualizada!');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  const stats = [
  {
    icon: 'school',
    label: 'Estudiantes Activos',
    value: execStats?.activeStudents.toLocaleString() || '...',
    trend: '',
    color: 'green'
  },
  {
    icon: 'warning',
    label: 'Cartera Morosa',
    value: `$${((execStats?.totalDebt || 0) / 1000000).toFixed(1)}M`,
    trend: 'Hoy',
    color: 'orange'
  },
  {
    icon: 'payments',
    label: 'Recaudo del Mes',
    value: `$${((execStats?.monthlyRevenue || 0) / 1000000).toFixed(1)}M`,
    trend: 'Real',
    color: 'blue'
  },
  {
    icon: 'trending_up',
    label: 'Ingresos Proyectados',
    value: `$${((execStats?.projectedRevenue || 0) / 1000000).toFixed(1)}M`,
    trend: '30 días',
    color: 'purple'
  },
  {
    icon: 'report',
    label: 'Estudiantes en Mora',
    value: execStats?.studentsInDebt?.toString() || '0',
    trend: 'Crítico',
    color: 'red'
  },
  {
    icon: 'person_add',
    label: 'Nuevas Matrículas',
    value: execStats?.newEnrollments?.toString() || '0',
    trend: 'Mes',
    color: 'green'
  },
  {
    icon: 'workspace_premium',
    label: 'Próximos Grados',
    value: execStats?.upcomingGraduates?.toString() || '0',
    trend: 'Julio',
    color: 'blue'
  }
];

  return (
    <div className="flex flex-col flex-1 pb-24 bg-background-light dark:bg-background-dark min-h-screen">
      <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-surface-dark/80 backdrop-blur-md p-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between transition-colors">
        <div className="flex items-center gap-3">
          <div
            className="size-10 rounded-full border-2 border-primary/20 p-0.5 overflow-hidden shadow-sm relative group cursor-pointer active:scale-95 transition-transform"
            onClick={() => document.getElementById('admin-avatar-upload')?.click()}
          >
            <img
              src={avatarUrl || `https://picsum.photos/seed/${user?.id}/100/100`}
              alt="Admin"
              className="w-full h-full rounded-full object-cover"
            />
            {uploading ? (
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-[1px]">
                <div className="size-3 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
              </div>
            ) : (
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 rounded-full flex items-center justify-center transition-opacity">
                <span className="material-symbols-outlined text-white text-[14px]">photo_camera</span>
              </div>
            )}
            <input
              type="file"
              id="admin-avatar-upload"
              className="hidden"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploading}
            />
          </div>
          <div onClick={() => navigate('/profile')} className="cursor-pointer">
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest leading-none block mb-0.5">NexusApp Admin</span>
            <h1 className="text-lg font-bold leading-none dark:text-white text-slate-900">{user?.user_metadata?.full_name || "Panel de Control"}</h1>
          </div>
        </div>
        <button
          onClick={() => navigate('/notifications')}
          className="size-10 rounded-full bg-white dark:bg-surface-dark shadow-sm flex items-center justify-center text-primary relative border border-gray-100 dark:border-white/5 active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined">notifications</span>
          {unreadCount > 0 && (
            <span className="absolute top-2.5 right-2.5 size-2 bg-nexus-red rounded-full border border-white dark:border-surface-dark animate-pulse"></span>
          )}
        </button>
      </header>

      <main className="p-4 space-y-6">

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
         {stats.map((stat, i) => (
  <div
    key={i}
    className="bg-white dark:bg-surface-dark rounded-[1.5rem] p-5 border border-primary/5 shadow-sm"
  >

    <div className="mb-3">
      <span className="material-symbols-outlined text-primary">
        {stat.icon}
      </span>
    </div>

    <p className="text-gray-400 text-[10px] font-bold uppercase mb-2 tracking-tight">
      {stat.label}
    </p>

    <div className="flex items-end gap-2">
      <span className="text-2xl font-bold dark:text-white leading-none">
        {stat.value}
      </span>

      <span
        className={`text-${
          stat.color === 'green'
            ? 'emerald'
            : stat.color === 'orange'
            ? 'amber'
            : stat.color === 'blue'
            ? 'nexus-blue'
            : 'nexus-purple'
        }-600 text-[10px] font-bold mb-1`}
      >
        {stat.trend}
      </span>
    </div>

  </div>
          ))}
        </div>
        
        {/* Executive Summary */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

  {/* Alertas */}
  <div className="bg-white dark:bg-surface-dark rounded-[1.5rem] p-6 border border-primary/5 shadow-sm">
    <div className="flex items-center gap-3 mb-4">
      <span className="material-symbols-outlined text-red-500">
        warning
      </span>
      <h3 className="font-bold text-slate-900 dark:text-white">
        Alertas Críticas
      </h3>
    </div>

    <div className="space-y-3">

      <div className="flex justify-between items-center">
        <span className="text-sm text-slate-500">
          Estudiantes en Mora
        </span>
        <span className="font-bold text-red-500">
          {execStats?.studentsInDebt || 0}
        </span>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-sm text-slate-500">
          Próximos Graduados
        </span>
        <span className="font-bold text-blue-500">
          {execStats?.upcomingGraduates || 0}
        </span>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-sm text-slate-500">
          Nuevas Matrículas
        </span>
        <span className="font-bold text-green-500">
          {execStats?.newEnrollments || 0}
        </span>
      </div>

    </div>
  </div>

  {/* Resumen Financiero */}
  <div className="bg-white dark:bg-surface-dark rounded-[1.5rem] p-6 border border-primary/5 shadow-sm">

    <div className="flex items-center gap-3 mb-4">
      <span className="material-symbols-outlined text-emerald-500">
        monitoring
      </span>
      <h3 className="font-bold text-slate-900 dark:text-white">
        Resumen Financiero
      </h3>
    </div>

    <div className="space-y-3">

      <div className="flex justify-between items-center">
        <span className="text-sm text-slate-500">
          Recaudo del Mes
        </span>
        <span className="font-bold text-emerald-500">
          ${((execStats?.monthlyRevenue || 0) / 1000000).toFixed(1)}M
        </span>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-sm text-slate-500">
          Cartera Morosa
        </span>
        <span className="font-bold text-red-500">
          ${((execStats?.totalDebt || 0) / 1000000).toFixed(1)}M
        </span>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-sm text-slate-500">
          Ingresos Proyectados
        </span>
        <span className="font-bold text-blue-500">
          ${((execStats?.projectedRevenue || 0) / 1000000).toFixed(1)}M
        </span>
      </div>

    </div>

  </div>

</div>

        {/* Grade Management Section */}
        <div className="space-y-4 pt-4" id="materias">
          <h2 className="text-[#0d121b] dark:text-white text-base font-bold px-1">Control de Notas Académicas</h2>
          <GradeManager />
        </div>



        {/* Financial Management */}
        <div className="space-y-4 pt-4" id="pagos">
          <h2 className="text-[#0d121b] dark:text-white text-base font-bold px-1">Gestión Financiera & Recaudos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-white to-gray-50 dark:from-surface-dark dark:to-surface-dark p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm">
              <p className="text-[10px] font-bold text-nexus-blue uppercase tracking-widest mb-1"> Carteras Pendientes </p>
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black dark:text-white text-slate-900"> ${((execStats?.totalDebt || 0) / 1000000).toFixed(2)}M </h3>
                <span className="material-symbols-outlined text-nexus-blue"> account_balance_wallet </span>
              </div>
              <p className="text-[10px] text-gray-400 mt-2"> Valor total de cuotas vencidas a la fecha. </p>
            </div>
            <div className="bg-gradient-to-br from-white to-gray-50 dark:from-surface-dark dark:to-surface-dark p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm">
              <p className="text-[10px] font-bold text-nexus-purple uppercase tracking-widest mb-1"> Proyección Próximo Mes </p>
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black dark:text-white text-slate-900"> ${((execStats?.projectedRevenue || 0) / 1000000).toFixed(2)}M </h3>
                <span className="material-symbols-outlined text-nexus-purple"> payments </span>
              </div>
              <p className="text-[10px] text-gray-400 mt-2"> Ingresos estimados según cuotas por vencer. </p>
            </div>
          </div>
          <PaymentManager />
        </div>

        {/* Academic Alerts Section */}
        {
          atRiskStudents.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-[#0d121b] dark:text-white text-base font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-nexus-red">warning</span>
                  Alertas Académicas
                </h2>
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{atRiskStudents.length}</span>
              </div>
              <div className="bg-white dark:bg-surface-dark rounded-[2rem] shadow-sm border border-red-100 dark:border-red-900/20 overflow-hidden">
                {atRiskStudents.map((student, i) => (
                  <div key={i} className="p-4 flex items-center justify-between border-t first:border-t-0 border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-nexus-red font-bold text-xs uppercase">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm dark:text-white">{student.name}</h4>
                        <p className="text-[10px] text-nexus-red font-bold">Promedio: {student.average}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const rawPhone = student.phone || '3000000000';
                        const cleanPhone = rawPhone.replace(/\D/g, '');
                        const fullPhone = cleanPhone.length === 10 ? `57${cleanPhone}` : cleanPhone;
                        window.open(`https://wa.me/${fullPhone}?text=Hola ${student.name}, nos comunicamos de NexusApp para conversar sobre tu progreso académico...`, '_blank');
                      }}
                      className="flex items-center gap-2 bg-nexus-green/10 text-nexus-green px-3 py-1.5 rounded-xl text-[10px] font-bold hover:bg-nexus-green hover:text-white transition-all"
                    >
                      <span className="material-symbols-outlined text-base">chat</span>
                      CONTACTAR
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )
        }

        <div className="space-y-4 mb-8">
          <h2 className="text-[#0d121b] dark:text-white text-base font-bold px-1">Control de Acceso (Habilitar Materias)</h2>
          <div className="bg-white dark:bg-surface-dark p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm">
            <StudentAccessManager />
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <h2 className="text-[#0d121b] dark:text-white text-base font-bold px-1">Gestión de Administradores</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-surface-dark p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm">
              <h3 className="font-bold dark:text-white text-sm mb-4">Administradores Registrados</h3>
              <AdminAccountManager />
            </div>
            <div className="bg-white dark:bg-surface-dark p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm">
              <CreateUserForm />
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <h2 className="text-[#0d121b] dark:text-white text-base font-bold px-1">Reportes Operativos</h2>
          <div className="bg-gradient-to-br from-nexus-purple to-indigo-900 p-8 rounded-[2.5rem] text-white shadow-xl shadow-nexus-purple/20 flex items-center justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 size-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-white/10 transition-colors"></div>
            <div className="space-y-3 relative z-10">
              <h3 className="font-bold text-xl leading-tight">Retención & Rendimiento</h3>
              <p className="text-white/60 text-xs leading-relaxed max-w-[180px]">Consulta las métricas clave del semestre en curso.</p>
              <button onClick={() => navigate('/admin/reports')} className="bg-white text-nexus-purple text-xs font-bold px-6 py-2.5 rounded-xl shadow-md mt-2 active:scale-95 transition-transform">VER REPORTES COMPLETOS</button>
            </div>
            <div className="size-24 bg-white/10 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/10 relative z-10">
              <span className="material-symbols-outlined text-5xl opacity-80">trending_up</span>
            </div>
          </div>
        </div>
        {/* Audit Panel Shortcut */}
        <div className="space-y-4 mb-8">
          <h2 className="text-[#0d121b] dark:text-white text-base font-bold px-1">Auditoría & Salud del Sistema</h2>
          <div
            onClick={() => navigate('/admin/audit')}
            className="bg-gradient-to-br from-red-950 to-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl flex items-center justify-between relative overflow-hidden group cursor-pointer active:scale-95 transition-all"
          >
            <div className="absolute top-0 right-0 size-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-white/10 transition-colors"></div>
            <div className="space-y-3 relative z-10">
              <h3 className="font-bold text-xl leading-tight">Panel de Auditoría</h3>
              <p className="text-white/60 text-xs leading-relaxed max-w-[180px]">Monitorea errores, red y servicios en tiempo real.</p>
              <span className="inline-block bg-nexus-red text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-md mt-2">VER AUDITORÍA</span>
            </div>
            <div className="size-24 bg-white/10 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/10 relative z-10">
              <span className="material-symbols-outlined text-5xl opacity-80">monitor_heart</span>
            </div>
          </div>
        </div>
        <div className="space-y-4 mb-8 pt-4" id="cronograma">
          <h2 className="text-[#0d121b] dark:text-white text-base font-bold px-1">Gestión de Noticias & Comunicados</h2>
          <div className="bg-white dark:bg-surface-dark p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm">
            <NewsManager />
          </div>
        </div>

        {/* Enrollment Shortcut Update to 2026 */}
        <div className="space-y-4 mb-12">
          <h2 className="text-[#0d121b] dark:text-white text-base font-bold px-1">Atajos Administrativos</h2>
          <div
            onClick={() => navigate('/register-student')}
            className="bg-white dark:bg-surface-dark p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 flex items-center gap-5 cursor-pointer active:bg-gray-50 dark:active:bg-white/5 transition-all"
          >
            <div className="bg-primary/10 w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-primary">
              <span className="material-symbols-outlined fill-1">person_add</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-[#0d121b] dark:text-white text-sm">Admisiones 2026</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 leading-snug">Gestionar cupos y procesos por cohortes de inicio.</p>
            </div>
            <span className="material-symbols-outlined text-gray-300">chevron_right</span>
          </div>
        </div>
      </main >
    </div >
  );
};

export default AdminDashboard;

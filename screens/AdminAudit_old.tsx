import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { auditService, AuditLog, HealthCheck } from '../services/auditService';
import { supabase } from '../services/supabaseClient';

const levelConfig = {
  error: { color: 'text-nexus-red', bg: 'bg-red-50 dark:bg-red-900/10', border: 'border-red-200 dark:border-red-900/30', icon: 'error', dot: 'bg-nexus-red' },
  warning: { color: 'text-nexus-orange', bg: 'bg-orange-50 dark:bg-orange-900/10', border: 'border-orange-200 dark:border-orange-900/30', icon: 'warning', dot: 'bg-nexus-orange' },
  info: { color: 'text-nexus-blue', bg: 'bg-blue-50 dark:bg-blue-900/10', border: 'border-blue-200 dark:border-blue-900/30', icon: 'info', dot: 'bg-nexus-blue' },
  success: { color: 'text-nexus-green', bg: 'bg-green-50 dark:bg-green-900/10', border: 'border-green-200 dark:border-green-900/30', icon: 'check_circle', dot: 'bg-nexus-green' },
};

const categoryLabels: Record<string, string> = {
  js_error: 'Error JS',
  network: 'Red',
  supabase: 'Supabase',
  health: 'Sistema',
  manual: 'Manual',
};

const healthStatusConfig: Record<
  'ok' | 'warning' | 'error' | 'checking',
  {
    color: string;
    bg: string;
    icon: string;
    label: string;
  }
> = {
  ok: {
    color: 'text-nexus-green',
    bg: 'bg-green-100 dark:bg-green-900/20',
    icon: 'check_circle',
    label: 'OK',
  },
  warning: {
    color: 'text-yellow-500',
    bg: 'bg-yellow-100 dark:bg-yellow-900/20',
    icon: 'warning',
    label: 'ALERTA',
  },
  error: {
    color: 'text-nexus-red',
    bg: 'bg-red-100 dark:bg-red-900/20',
    icon: 'cancel',
    label: 'ERROR',
  },
  checking: {
    color: 'text-nexus-orange',
    bg: 'bg-orange-100 dark:bg-orange-900/20',
    icon: 'autorenew',
    label: 'VERIFICANDO',
  },
};

const AdminAudit: React.FC = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [isRunningHealth, setIsRunningHealth] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({
  activeStudents: 0,
  pendingPayments: 0,
  studentsWithoutCohort: 0,
  totalNews: 0,
  overduePayments: 0,
  blockedUsers: 0,
  totalUsers: 0,
});
  const [filterLevel, setFilterLevel] = useState<'all' | AuditLog['level']>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

 const loadLogs = useCallback(() => {
  const all = auditService.getLogs().reverse();
  setLogs(all);
}, []);

const loadDashboardStats = useCallback(async () => {
  try {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('role,status,cohort,is_demo');

    const { data: payments } = await supabase
      .from('payments')
      .select('status');

    const { data: news } = await supabase
      .from('news')
      .select('id');

    setDashboardStats({
      activeStudents:
        profiles?.filter(
          p =>
            p.role === 'student' &&
            p.status === 'active' &&
            !p.is_demo
        ).length || 0,

      pendingPayments:
        payments?.filter(
          p => p.status === 'pending'
        ).length || 0,

      studentsWithoutCohort:
        profiles?.filter(
          p =>
            p.role === 'student' &&
            !p.is_demo &&
            (!p.cohort || p.cohort.trim() === '')
        ).length || 0,

      totalNews:
        news?.length || 0,

      overduePayments: 0,
      blockedUsers: 0,
      totalUsers: profiles?.length || 0,
    });

  } catch (err) {
    console.error(err);
  }
}, []);

  const runHealth = useCallback(async () => {
    setIsRunningHealth(true);
    setHealthChecks(prev => prev.map(h => ({ ...h, status: 'checking' as const })));
    try {
      const results = await auditService.runHealthChecks();
      setHealthChecks(results);

      const hasErrors = results.some(r => r.status === 'error');
      const hasWarnings = results.some(r => r.status === 'warning');

      auditService.addLog({
        level: hasErrors ? 'error' : hasWarnings ? 'warning' : 'success',
        category: 'health',
        title: hasErrors
          ? 'Health Check: errores detectados'
          : hasWarnings
          ? 'Health Check: alertas detectadas'
          : 'Health Check: todos los sistemas OK',
        detail: results.map(r => `${r.name}: ${r.status}`).join(' | '),
      });

      loadLogs();
    } finally {
      setIsRunningHealth(false);
    }
  }, [loadLogs]);

  useEffect(() => {
    loadLogs();
    loadDashboardStats();
    runHealth();
  }, [loadLogs, loadDashboardStats, runHealth]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadLogs, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadLogs]);

  const filtered = filterLevel === 'all' ? logs : logs.filter(l => l.level === filterLevel);

  const counts = {
    error: healthChecks.filter(h => h.status === 'error').length,
    warning: healthChecks.filter(h => h.status === 'warning').length,
    info: logs.filter(l => l.level === 'info').length,
    success: healthChecks.filter(h => h.status === 'ok').length,
  };

  const handleClear = () => {
    if (confirm('¿Eliminar todos los registros de auditoría?')) {
      auditService.clearLogs();
      loadLogs();
    }
  };

  return (
    <div className="flex flex-col flex-1 pb-24 bg-background-light dark:bg-background-dark min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-surface-dark/90 backdrop-blur-md border-b border-gray-100 dark:border-white/5 p-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/admin')}
          className="size-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined dark:text-white">arrow_back_ios</span>
        </button>
        <div className="flex-1">
          <p className="text-[10px] font-black text-primary uppercase tracking-widest">Admin</p>
          <h1 className="text-lg font-black dark:text-white leading-tight">Panel de Auditoría</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${autoRefresh ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/50'}`}
          >
            {autoRefresh ? '● VIVO' : 'AUTO'}
          </button>
          <button
            onClick={loadLogs}
            className="size-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-white/10 transition-colors hover:bg-primary hover:text-white"
          >
            <span className="material-symbols-outlined text-sm dark:text-white">refresh</span>
          </button>
        </div>
      </header>

      <main className="p-4 space-y-5">

        {/* Dashboard Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">

          <div className="rounded-2xl p-4 bg-white dark:bg-surface-dark border border-gray-100 dark:border-white/5 text-center">
            <span className="material-symbols-outlined text-primary text-2xl">
              groups
            </span>
            <p className="text-2xl font-black mt-2 dark:text-white">
              {dashboardStats.totalUsers}
            </p>
            <p className="text-[10px] uppercase font-black text-gray-400">
              Usuarios
            </p>
          </div>

          <div className="rounded-2xl p-4 bg-white dark:bg-surface-dark border border-gray-100 dark:border-white/5 text-center">
            <span className="material-symbols-outlined text-green-500 text-2xl">
              school
            </span>
            <p className="text-2xl font-black mt-2 dark:text-white">
              {dashboardStats.activeStudents}
            </p>
            <p className="text-[10px] uppercase font-black text-gray-400">
              Estudiantes Activos
            </p>
          </div>

          <div className="rounded-2xl p-4 bg-white dark:bg-surface-dark border border-gray-100 dark:border-white/5 text-center">
            <span className="material-symbols-outlined text-amber-500 text-2xl">
              payments
            </span>
            <p className="text-2xl font-black mt-2 dark:text-white">
              {dashboardStats.pendingPayments}
            </p>
            <p className="text-[10px] uppercase font-black text-gray-400">
              Pagos Pendientes
            </p>
          </div>

          <div className="rounded-2xl p-4 bg-white dark:bg-surface-dark border border-gray-100 dark:border-white/5 text-center">
            <span className="material-symbols-outlined text-blue-500 text-2xl">
              article
            </span>
            <p className="text-2xl font-black mt-2 dark:text-white">
              {dashboardStats.totalNews}
            </p>
            <p className="text-[10px] uppercase font-black text-gray-400">
              Noticias
            </p>
          </div>

        </section>

        {/* Health Checks */}
        <section className="bg-white dark:bg-surface-dark rounded-3xl border border-gray-100 dark:border-white/5 overflow-hidden shadow-sm">

          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">
                monitor_heart
              </span>
              <h2 className="font-black text-sm dark:text-white uppercase tracking-wider">
                Estado del Sistema
              </h2>
            </div>

            <button
              onClick={runHealth}
              disabled={isRunningHealth}
              className="px-4 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-wider"
            >
              {isRunningHealth ? 'Verificando...' : 'Verificar'}
            </button>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {healthChecks.map((check) => (
              <div
                key={check.name}
                className="flex items-center justify-between p-4"
              >
                <div>
                  <h3 className="font-bold dark:text-white">
                    {check.name}
                  </h3>

                  <p className="text-xs text-gray-400">
                    {check.detail}
                  </p>
                </div>

                <div>
                  {check.status}
                </div>
              </div>
            ))}
          </div>

        </section>

        {/* Logs */}
        <section className="bg-white dark:bg-surface-dark rounded-3xl border border-gray-100 dark:border-white/5 overflow-hidden shadow-sm">
        {/* Logs */}
        <section className="bg-white dark:bg-surface-dark rounded-3xl border border-gray-100 dark:border-white/5 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">receipt_long</span>
              <h2 className="font-black text-sm dark:text-white uppercase tracking-wider">
                Registro de Eventos
                {filterLevel !== 'all' && <span className="ml-2 text-primary">({filterLevel})</span>}
              </h2>
            </div>
            <button
              onClick={handleClear}
              className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-nexus-red rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-nexus-red hover:text-white transition-all"
            >
              Limpiar
            </button>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-white/5 max-h-[500px] overflow-y-auto">
            {filtered.length === 0 && (
              <div className="p-10 text-center">
                <span className="material-symbols-outlined text-4xl text-gray-200 dark:text-white/10">task_alt</span>
                <p className="text-gray-400 text-xs font-bold mt-2">Sin registros</p>
                {filterLevel !== 'all' && (
                  <button onClick={() => setFilterLevel('all')} className="text-primary text-xs mt-1">Ver todos</button>
                )}
              </div>
            )}
            {filtered.map((log) => {
              const cfg = levelConfig[log.level];
              const date = new Date(log.timestamp);
              return (
                <button
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`size-2 rounded-full mt-1.5 shrink-0 ${cfg.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${cfg.bg} ${cfg.color}`}>
                          {categoryLabels[log.category]}
                        </span>
                        <span className="text-[9px] text-gray-400 shrink-0">
                          {date.toLocaleDateString('es-CO')} {date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs font-bold dark:text-white truncate">{log.title}</p>
                      {log.detail && <p className="text-[10px] text-gray-400 truncate mt-0.5">{log.detail}</p>}
                    </div>
                    <span className="material-symbols-outlined text-gray-300 text-sm shrink-0">chevron_right</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Quick Add Note */}
        <section className="bg-white dark:bg-surface-dark rounded-3xl border border-gray-100 dark:border-white/5 p-4 shadow-sm">
          <h2 className="font-black text-sm dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg">edit_note</span>
            Agregar Nota Manual
          </h2>
          <ManualLogForm onAdd={loadLogs} />
        </section>

      </main>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-end justify-center p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-white dark:bg-surface-dark rounded-3xl w-full max-w-lg p-6 space-y-4 animate-in slide-in-from-bottom-4 duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${levelConfig[selectedLog.level].bg} ${levelConfig[selectedLog.level].color}`}>
                {selectedLog.level.toUpperCase()} · {categoryLabels[selectedLog.category]}
              </span>
              <button onClick={() => setSelectedLog(null)} className="size-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10">
                <span className="material-symbols-outlined text-sm dark:text-white">close</span>
              </button>
            </div>
            <div>
              <p className="text-xs text-gray-400">{new Date(selectedLog.timestamp).toLocaleString('es-CO')}</p>
              <h3 className="font-black text-base dark:text-white mt-1">{selectedLog.title}</h3>
              {selectedLog.detail && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 break-all">{selectedLog.detail}</p>
              )}
            </div>
            {selectedLog.stack && (
              <div className="bg-gray-950 rounded-2xl p-4 overflow-x-auto">
                <pre className="text-[9px] text-green-400 font-mono leading-relaxed whitespace-pre-wrap break-all">{selectedLog.stack}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Subcomponent for manual log entries
const ManualLogForm: React.FC<{ onAdd: () => void }> = ({ onAdd }) => {
  const [text, setText] = useState('');
  const [level, setLevel] = useState<'info' | 'warning' | 'error'>('info');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    auditService.addLog({ level, category: 'manual', title: text.trim() });
    setText('');
    onAdd();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        {(['info', 'warning', 'error'] as const).map(l => (
          <button
            key={l}
            type="button"
            onClick={() => setLevel(l)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${level === l ? `${levelConfig[l].bg} ${levelConfig[l].color} ${levelConfig[l].border} border` : 'bg-gray-100 dark:bg-white/5 text-gray-400'}`}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Descripción del evento o nota..."
          className="flex-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-primary outline-none dark:text-white"
        />
        <button type="submit" className="bg-primary text-white px-4 py-2.5 rounded-xl text-xs font-black hover:bg-nexus-purple transition-colors">
          <span className="material-symbols-outlined text-sm">add</span>
        </button>
      </div>
    </form>
  );
};

export default AdminAudit;

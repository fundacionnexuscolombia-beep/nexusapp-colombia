import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsService, RetentionStats, PerformanceStats, AtRiskStudent } from '../services/analyticsService';
import { reportService } from '../services/reportService';

const AdminReports: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'retention' | 'performance' | 'finances'>('retention');
    const [loading, setLoading] = useState(true);
    const [retentionData, setRetentionData] = useState<RetentionStats | null>(null);
    const [performanceData, setPerformanceData] = useState<PerformanceStats | null>(null);
    const [atRiskStudents, setAtRiskStudents] = useState<AtRiskStudent[]>([]);
    const [isExporting, setIsExporting] = useState(false);
    const [selectedCohort, setSelectedCohort] = useState<string>('');

    const cohorts = ['Enero', 'Marzo', 'Junio', 'Septiembre', 'Diciembre'];

    useEffect(() => {
        loadData();
    }, [selectedCohort]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [ret, perf, risk] = await Promise.all([
                analyticsService.getRetentionStats(selectedCohort),
                analyticsService.getPerformanceStats(selectedCohort),
                analyticsService.getAtRiskStudents() // Risk is global for now but filters could be added
            ]);
            setRetentionData(ret);
            setPerformanceData(perf);
            setAtRiskStudents(risk);
        } catch (error) {
            console.error("Error loading reports", error);
        } finally {
            setLoading(false);
        }
    };

    const handleWhatsApp = (phone: string, name: string, reason: string) => {
        const message = reason === 'financial-debt'
            ? `Hola ${name}, te saludamos de Fundación Nexus. Notamos un saldo pendiente en tu plataforma. ¿Podemos ayudarte con algo?`
            : `Hola ${name}, te saludamos de Fundación Nexus. Notamos que no has ingresado a la plataforma recientemente. ¿Todo bien con tus clases?`;

        const cleanPhone = phone.replace(/\D/g, '');
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
    };

    if (loading && !retentionData) {
        return (
            <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nexus-purple"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark pb-24 font-sans">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-md p-4 border-b border-gray-100 dark:border-white/5 flex items-center gap-3">
                <button onClick={() => navigate('/admin')} className="text-gray-500 hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div>
                    <h1 className="text-lg font-bold dark:text-white leading-none">Inteligencia Administrativa</h1>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Métricas en Tiempo Real</p>
                </div>
                <div className="ml-auto">
                    <button
                        onClick={async () => {
                            setIsExporting(true);
                            try {
                                await reportService.downloadInstitutionReport(selectedCohort || undefined);
                            } catch (e) {
                                alert("Error al exportar reporte");
                            } finally {
                                setIsExporting(false);
                            }
                        }}
                        disabled={isExporting}
                        className="bg-nexus-green hover:bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-green-500/20 disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined text-[18px]">
                            {isExporting ? 'sync' : 'download_for_offline'}
                        </span>
                        {isExporting ? 'EXPORTANDO...' : 'EXCEL'}
                    </button>
                </div>
            </header>

            <main className="p-4 space-y-6">
                {/* Global Filter */}
                <div className="bg-white dark:bg-surface-dark p-4 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm flex items-center gap-3">
                    <span className="material-symbols-outlined text-nexus-purple opacity-50 pointer-events-none">filter_list</span>
                    <select
                        value={selectedCohort}
                        onChange={(e) => setSelectedCohort(e.target.value)}
                        className="bg-transparent flex-1 text-sm font-bold dark:text-white focus:outline-none appearance-none cursor-pointer"
                    >
                        <option value="" className="text-slate-900 bg-white">Todas las Cohortes (General)</option>
                        {cohorts.map(c => <option key={c} value={c} className="text-slate-900 bg-white">Cohorte {c}</option>)}
                    </select>
                    <span className="material-symbols-outlined text-gray-400 text-sm pointer-events-none">expand_more</span>
                </div>

                {/* Tabs */}
                <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-2xl overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('retention')}
                        className={`flex-1 min-w-[100px] py-2.5 rounded-xl text-[10px] font-bold transition-all ${activeTab === 'retention' ? 'bg-white dark:bg-white/10 text-primary shadow-sm' : 'text-gray-400'}`}
                    >
                        RETENCIÓN
                    </button>
                    <button
                        onClick={() => setActiveTab('performance')}
                        className={`flex-1 min-w-[100px] py-2.5 rounded-xl text-[10px] font-bold transition-all ${activeTab === 'performance' ? 'bg-white dark:bg-white/10 text-primary shadow-sm' : 'text-gray-400'}`}
                    >
                        RENDIMIENTO
                    </button>
                    <button
                        onClick={() => setActiveTab('finances')}
                        className={`flex-1 min-w-[100px] py-2.5 rounded-xl text-[10px] font-bold transition-all ${activeTab === 'finances' ? 'bg-white dark:bg-white/10 text-primary shadow-sm' : 'text-gray-400'}`}
                    >
                        FINANZAS
                    </button>
                </div>

                {/* RETENTION VIEW */}
                {activeTab === 'retention' && retentionData && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white dark:bg-surface-dark p-5 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm">
                                <h3 className="text-[10px] font-bold text-gray-400 uppercase mb-2">Estudiantes</h3>
                                <p className="text-3xl font-bold dark:text-white tracking-tighter">{retentionData.activeUsers}</p>
                                <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-green-500">
                                    <span className="material-symbols-outlined text-sm">trending_up</span>
                                    <span>ACTIVOS</span>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-surface-dark p-5 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm text-right">
                                <h3 className="text-[10px] font-bold text-gray-400 uppercase mb-2">Inactivos</h3>
                                <p className="text-3xl font-bold dark:text-white tracking-tighter">{atRiskStudents.filter(s => s.reason === 'low-performance').length}</p>
                                <div className="mt-2 flex items-center justify-end gap-1 text-[10px] font-bold text-nexus-orange">
                                    <span>ALERTA</span>
                                    <span className="material-symbols-outlined text-sm">priority_high</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-surface-dark p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm space-y-4">
                            <h3 className="font-bold dark:text-white text-sm">Distribución por Cohorte</h3>
                            <div className="space-y-4">
                                {retentionData.cohorts.map((cohort, i) => (
                                    <div key={i} className="space-y-1.5">
                                        <div className="flex justify-between text-[11px] font-bold text-gray-500 dark:text-gray-400">
                                            <span>Cohorte {cohort.name}</span>
                                            <span>{cohort.retention}% Ret.</span>
                                        </div>
                                        <div className="h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ${cohort.retention > 90 ? 'bg-nexus-green' : 'bg-nexus-blue'}`}
                                                style={{ width: `${cohort.retention}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* PERFORMANCE VIEW */}
                {activeTab === 'performance' && performanceData && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-gradient-to-br from-nexus-purple to-indigo-900 p-8 rounded-[2.5rem] text-white shadow-xl shadow-nexus-purple/30 text-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <h3 className="text-white/60 font-bold uppercase text-[10px] tracking-widest relative z-10">Promedio {selectedCohort ? `Cohorte ${selectedCohort}` : 'Global'}</h3>
                            <div className="text-7xl font-black mt-2 mb-1 tracking-tighter relative z-10">{performanceData.globalAverage || '0.0'}</div>
                            <p className="text-xs font-medium text-white/50 relative z-10">Escala de 0.0 a 5.0</p>
                        </div>

                        <div className="bg-white dark:bg-surface-dark p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm">
                            <h3 className="font-bold dark:text-white text-sm mb-4">Rendimiento por Materia</h3>
                            <div className="space-y-4">
                                {performanceData.subjects.map((sub, i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black ${sub.status === 'good' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                            {sub.average}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-bold dark:text-white">{sub.name}</p>
                                            <div className="w-full h-1 bg-gray-100 dark:bg-white/5 rounded-full mt-1.5 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${sub.status === 'good' ? 'bg-green-500' : 'bg-orange-500'}`}
                                                    style={{ width: `${(sub.average / 5) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* FINANCES VIEW */}
                {activeTab === 'finances' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-nexus-red/10 border border-nexus-red/20 p-6 rounded-[2rem] space-y-2">
                            <div className="flex items-center gap-2 text-nexus-red">
                                <span className="material-symbols-outlined">payments</span>
                                <h3 className="font-bold text-sm">Monitoreo de Morosos</h3>
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                Estudiantes con cuotas vencidas que requieren gestión de cobranza inmediata.
                            </p>
                        </div>

                        <div className="space-y-3">
                            {atRiskStudents.filter(s => s.reason === 'financial-debt').length > 0 ? (
                                atRiskStudents.filter(s => s.reason === 'financial-debt').map((student) => (
                                    <div key={student.id} className="bg-white dark:bg-surface-dark p-4 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-nexus-red/10 flex items-center justify-center text-nexus-red font-bold text-sm">
                                            $
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-xs dark:text-white truncate">{student.name}</p>
                                            <p className="text-[10px] text-nexus-red font-bold flex items-center gap-1">
                                                DEUDA: ${student.debtAmount?.toLocaleString()}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleWhatsApp(student.phone || '', student.name, 'financial-debt')}
                                            className="bg-[#25D366] text-white p-2 rounded-xl flex items-center justify-center hover:opacity-80 transition-opacity"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">chat</span>
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10 opacity-50 space-y-2">
                                    <span className="material-symbols-outlined text-4xl">check_circle</span>
                                    <p className="text-xs font-bold">¡Cartera al día!</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
};

export default AdminReports;

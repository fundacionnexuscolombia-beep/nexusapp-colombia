import React from 'react';
import { useNavigate } from 'react-router-dom';

const AchievementsAlbum: React.FC = () => {
    const navigate = useNavigate();

    const allBadges = [
        {
            category: 'Constancia',
            items: [
                { name: 'Racha de Fuego', icon: 'local_fire_department', color: 'bg-orange-500', shadow: 'shadow-[0_4px_0_rgb(194,65,12)]', desc: '7 días seguidos', locked: false },
                { name: 'Madrugador', icon: 'wb_sunny', color: 'bg-amber-500', shadow: 'shadow-[0_4px_0_rgb(217,119,6)]', desc: 'Estudio antes 6AM', locked: true },
                { name: 'Noctámbulo', icon: 'dark_mode', color: 'bg-indigo-500', shadow: 'shadow-[0_4px_0_rgb(67,56,202)]', desc: 'Estudio post 10PM', locked: true },
                { name: 'Fin de Semana', icon: 'weekend', color: 'bg-blue-400', shadow: 'shadow-[0_4px_0_rgb(96,165,250)]', desc: 'Estudio Sáb/Dom', locked: true },
            ]
        },
        {
            category: 'Excelencia',
            items: [
                { name: 'Cerebro de Oro', icon: 'psychology', color: 'bg-yellow-400', shadow: 'shadow-[0_4px_0_rgb(202,138,4)]', desc: 'Promedio > 4.5', locked: false },
                { name: 'Tarea Impecable', icon: 'verified', color: 'bg-blue-500', shadow: 'shadow-[0_4px_0_rgb(29,78,216)]', desc: '10 notas de 5.0', locked: true },
                { name: 'Examen Perfecto', icon: 'school', color: 'bg-purple-500', shadow: 'shadow-[0_4px_0_rgb(126,34,206)]', desc: '100% en Simulacro', locked: true },
            ]
        },
        {
            category: 'Exploración',
            items: [
                { name: 'Ratón de Biblioteca', icon: 'menu_book', color: 'bg-emerald-500', shadow: 'shadow-[0_4px_0_rgb(4,120,87)]', desc: '50 lecturas', locked: false },
                { name: 'Curioso Nativo', icon: 'search', color: 'bg-pink-500', shadow: 'shadow-[0_4px_0_rgb(190,24,93)]', desc: '100 preguntas al Tutor', locked: true },
                { name: 'Social Nexus', icon: 'forum', color: 'bg-cyan-500', shadow: 'shadow-[0_4px_0_rgb(14,116,144)]', desc: '10 aportes en foro', locked: true },
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-background-light dark:bg-slate-950 pb-32">
            {/* Mobile Header - Hidden on Desktop */}
            <header className="lg:hidden p-6 flex items-center gap-4 bg-white/80 dark:bg-surface-dark/50 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100 dark:border-white/5">
                <button
                    onClick={() => navigate(-1)}
                    className="size-10 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center active:scale-90 transition-all font-bold"
                >
                    <span className="material-symbols-outlined text-gray-500">arrow_back_ios</span>
                </button>
                <div>
                    <h1 className="text-xl font-black dark:text-white">Álbum de Insignias</h1>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tus logros coleccionables</p>
                </div>
            </header>

            <main className="p-6 lg:p-12 space-y-12 max-w-7xl mx-auto">
                {/* Desktop Title Section */}
                <div className="hidden lg:block mb-12 animate-in fade-in slide-in-from-top-6 duration-700">
                    <h1 className="text-5xl font-black dark:text-white mb-3">Álbum de Insignias</h1>
                    <p className="text-gray-500 dark:text-gray-400 font-bold text-lg">Celebra cada hito en tu camino al éxito</p>
                </div>

                {allBadges.map((category, idx) => (
                    <section key={idx} className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000" style={{ animationDelay: `${idx * 150}ms` }}>
                        <div className="flex items-center gap-4">
                            <h2 className="text-[11px] font-black text-primary dark:text-primary-light uppercase tracking-[0.4em] whitespace-nowrap">{category.category}</h2>
                            <div className="h-px flex-1 bg-gradient-to-r from-gray-200 dark:from-white/10 to-transparent" />
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {category.items.map((badge, bIdx) => (
                                <div
                                    key={bIdx}
                                    className={`
                    relative flex flex-col items-center p-8 rounded-[3rem] border-2 transition-all duration-500 group
                    ${badge.locked
                                            ? 'bg-gray-50/50 dark:bg-white/5 border-gray-100 dark:border-white/5 opacity-60 grayscale'
                                            : 'bg-white dark:bg-surface-dark border-transparent shadow-xl shadow-primary/5 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2'}
                  `}
                                >
                                    <div className={`
                    w-24 h-24 rounded-[2.5rem] flex items-center justify-center text-white mb-6 transition-transform duration-500 group-hover:rotate-6
                    ${badge.locked ? 'bg-gray-300 shadow-[0_8px_0_rgb(156,163,175)]' : `${badge.color} ${badge.shadow}`}
                  `}>
                                        <span className="material-symbols-outlined text-5xl fill-1">{badge.icon}</span>
                                    </div>

                                    <div className="text-center">
                                        <h3 className={`text-base font-black leading-tight mb-2 ${badge.locked ? 'text-gray-400' : 'text-slate-800 dark:text-white'}`}>
                                            {badge.name}
                                        </h3>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                            {badge.desc}
                                        </p>
                                    </div>

                                    {badge.locked && (
                                        <div className="absolute top-6 right-6 text-gray-300">
                                            <span className="material-symbols-outlined text-lg">lock</span>
                                        </div>
                                    )}

                                    {!badge.locked && (
                                        <div className="absolute -top-1 -right-1">
                                            <div className="size-8 bg-nexus-green rounded-full flex items-center justify-center border-4 border-white dark:border-surface-dark shadow-lg ring-4 ring-nexus-green/10">
                                                <span className="material-symbols-outlined text-white text-lg font-bold">check</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </main>

            {/* Footer Motivation */}
            <div className="p-12 text-center bg-gradient-to-t from-primary/5 to-transparent mt-16">
                <p className="text-gray-400 text-sm font-medium italic opacity-70">"Cada logro es un peldaño más hacia tu gran meta profesional."</p>
            </div>
        </div>
    );
};

export default AchievementsAlbum;

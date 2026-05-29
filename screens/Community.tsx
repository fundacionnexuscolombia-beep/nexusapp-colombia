import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { forumService, ForumTopic } from '../services/forumService';
import { useAuth } from '../components/AuthProvider';

const Community: React.FC = () => {
    const navigate = useNavigate();
    const { user, isDemo } = useAuth();
    const [topics, setTopics] = useState<ForumTopic[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [newCategory, setNewCategory] = useState('General');
    const [error, setError] = useState<string | null>(null);

    const categories = [
        'General', 'Matemáticas', 'Sociales', 'Filosofía', 'Biología',
        'Química', 'Física', 'Español', 'Inglés', 'Ética'
    ];

    useEffect(() => {
        loadTopics();
    }, [selectedCategory]);

    const loadTopics = async () => {
        setLoading(true);
        try {
            const data = await forumService.getTopics(selectedCategory || undefined);
            setTopics(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTopic = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            await forumService.createTopic(newCategory, newTitle, newContent);
            setShowCreateModal(false);
            setNewTitle('');
            setNewContent('');
            loadTopics();
        } catch (err: any) {
            if (err.message.includes('SECURITY_VIOLATION')) {
                setError('⚠️ Por seguridad, no permitimos compartir números telefónicos en la comunidad.');
            } else {
                setError(`⚠️ Error: ${err.message || 'Intenta de nuevo.'}`);
            }
        }
    };

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark pb-24 font-sans text-nexus-blue-dark dark:text-gray-100">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-md p-4 border-b border-gray-100 dark:border-white/5 flex items-center gap-3">
                <button onClick={() => navigate('/')} className="text-gray-500 hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div>
                    <h1 className="text-lg font-bold dark:text-white leading-none">Comunidad Nexus</h1>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Foro de Ayuda Mutua</p>
                </div>
            </header>

            <main className="p-4 space-y-6">
                {/* Categories Scroll */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                    <button
                        onClick={() => setSelectedCategory('')}
                        className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${!selectedCategory ? 'bg-nexus-purple text-white shadow-lg shadow-nexus-purple/20' : 'bg-white dark:bg-white/5 text-gray-400'}`}
                    >
                        TODOS
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-nexus-purple text-white shadow-lg shadow-nexus-purple/20' : 'bg-white dark:bg-white/5 text-gray-400'}`}
                        >
                            {cat.toUpperCase()}
                        </button>
                    ))}
                </div>

                {/* Search / Intro */}
                <div className="bg-gradient-to-r from-nexus-purple to-indigo-600 p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
                    <div className="relative z-10">
                        <h2 className="text-xl font-bold mb-1">
                            {isDemo ? 'Comunidad (Solo Lectura)' : '¿Tienes alguna duda?'}
                        </h2>
                        <p className="text-white/70 text-xs mb-4">
                            {isDemo
                                ? 'En el Modo Demo puedes explorar las dudas de otros estudiantes, pero no realizar publicaciones.'
                                : 'Pregunta a la comunidad y recibe respuestas de expertos y compañeros.'}
                        </p>
                        <button
                            onClick={() => {
                                if (isDemo) {
                                    alert('Esta función no está disponible en el Modo Demo.');
                                    return;
                                }
                                setShowCreateModal(true);
                            }}
                            className={`px-6 py-2.5 rounded-xl font-black text-xs shadow-lg transition-all ${isDemo ? 'bg-white/20 text-white/50 cursor-not-allowed' : 'bg-white text-nexus-purple hover:scale-105'}`}
                        >
                            {isDemo ? 'MODO DEMO ACTIVO' : 'NUEVA PREGUNTA'}
                        </button>
                    </div>
                    <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-9xl text-white/10 rotate-12">forum</span>
                </div>

                {/* Topics List */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="font-black text-sm flex items-center gap-2">
                            <span className="material-symbols-outlined text-nexus-purple text-xl">explore</span>
                            {selectedCategory ? `Preguntas de ${selectedCategory}` : 'Preguntas Recientes'}
                        </h3>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-nexus-purple"></div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sincronizando Comunidad...</p>
                        </div>
                    ) : topics.length > 0 ? (
                        topics.map(topic => (
                            <div
                                key={topic.id}
                                onClick={() => navigate(`/community/topic/${topic.id}`)}
                                className="bg-white dark:bg-surface-dark p-6 rounded-[2.5rem] border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all active:scale-[0.98] flex flex-col gap-4"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-nexus-purple/10 flex items-center justify-center text-nexus-purple text-sm font-black overflow-hidden border border-nexus-purple/20">
                                        {topic.profiles?.avatar_url ? (
                                            <img src={topic.profiles.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                                        ) : topic.profiles?.full_name?.charAt(0) || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-black text-gray-400 truncate uppercase tracking-tighter">
                                            {topic.profiles?.full_name} • {new Date(topic.created_at).toLocaleDateString()}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="px-2 py-0.5 bg-nexus-purple/10 text-nexus-purple text-[8px] font-black rounded uppercase tracking-tighter">
                                                {topic.category}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-black text-base mb-1.5 dark:text-white leading-tight">{topic.title}</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                                        {topic.content}
                                    </p>
                                </div>
                                <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-white/5">
                                    <div className="flex items-center gap-2 text-nexus-blue">
                                        <span className="material-symbols-outlined text-[20px] fill-1">chat_bubble</span>
                                        <span className="text-[10px] font-black uppercase">Responder duda</span>
                                    </div>
                                    <span className="material-symbols-outlined text-gray-300 text-[20px]">chevron_right</span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-20 opacity-30">
                            <span className="material-symbols-outlined text-5xl mb-2">inbox</span>
                            <p className="text-xs font-bold uppercase">No hay preguntas aún</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-surface-dark w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 shadow-2xl animate-slide-up space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold dark:text-white">Nueva Pregunta</h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-[11px] text-red-500 font-bold leading-relaxed">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleCreateTopic} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Materia</label>
                                <select
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-white/5 p-4 rounded-2xl text-sm font-bold dark:text-white border-0 focus:ring-2 focus:ring-nexus-purple outline-none appearance-none"
                                >
                                    {categories.map(cat => (
                                        <option key={cat} value={cat} className="text-slate-900 bg-white">
                                            {cat}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Título de la duda</label>
                                <input
                                    type="text"
                                    placeholder="Ej: ¿Cómo se resuelve una ecuación 2x2?"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    required
                                    className="w-full bg-gray-50 dark:bg-white/5 p-4 rounded-2xl text-sm font-bold dark:text-white border-0 focus:ring-2 focus:ring-nexus-purple outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Detalles (Opcional)</label>
                                <textarea
                                    placeholder="Explica un poco más para que podamos ayudarte mejor..."
                                    value={newContent}
                                    onChange={(e) => setNewContent(e.target.value)}
                                    rows={4}
                                    className="w-full bg-gray-50 dark:bg-white/5 p-4 rounded-3xl text-sm font-medium dark:text-white border-0 focus:ring-2 focus:ring-nexus-purple outline-none resize-none"
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-nexus-purple text-white p-4 rounded-2xl font-black text-sm shadow-xl shadow-nexus-purple/20 active:scale-95 transition-transform"
                            >
                                PUBLICAR PREGUNTA
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Community;

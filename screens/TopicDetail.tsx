import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { forumService, ForumTopic, ForumPost } from '../services/forumService';
import { useAuth } from '../components/AuthProvider';

const TopicDetail: React.FC = () => {
    const { topicId } = useParams<{ topicId: string }>();
    const navigate = useNavigate();
    const { user, role } = useAuth();
    const [topic, setTopic] = useState<ForumTopic | null>(null);
    const [posts, setPosts] = useState<ForumPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [newPostContent, setNewPostContent] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (topicId) loadTopicData();
    }, [topicId]);

    const loadTopicData = async () => {
        if (!topicId) return;
        setLoading(true);
        try {
            const data = await forumService.getTopicDetails(topicId);
            setTopic(data.topic);
            setPosts(data.posts);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topicId || !newPostContent.trim()) return;

        setError(null);
        setIsSubmitting(true);
        try {
            await forumService.createPost(topicId, newPostContent);
            setNewPostContent('');
            loadTopicData();
        } catch (err: any) {
            if (err.message.includes('SECURITY_VIOLATION')) {
                setError('⚠️ No puedes compartir números telefónicos por seguridad.');
            } else {
                setError('Error al publicar respuesta.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleHighlight = async (postId: string, currentStatus: boolean) => {
        if (role !== 'admin') return;
        try {
            await forumService.highlightPost(postId, !currentStatus);
            loadTopicData();
        } catch (err) {
            console.error(err);
        }
    };

    if (loading && !topic) {
        return (
            <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nexus-purple"></div>
            </div>
        );
    }

    if (!topic) return <div className="p-10 text-center">Tópico no encontrado</div>;

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark pb-32 font-sans overflow-x-hidden">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-md p-4 border-b border-gray-100 dark:border-white/5 flex items-center gap-3">
                <button onClick={() => navigate('/community')} className="text-gray-500 hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-sm font-bold dark:text-white truncate uppercase">{topic.category}</h1>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">HILO DE DISCUSIÓN</p>
                </div>
            </header>

            <main className="p-4 space-y-6">
                {/* Main Topic Question */}
                <div className="bg-white dark:bg-surface-dark p-6 rounded-[2.5rem] border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-nexus-purple/5 rounded-bl-[4rem]"></div>

                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-nexus-purple/10 flex items-center justify-center text-nexus-purple font-bold">
                            {topic.profiles?.full_name?.charAt(0)}
                        </div>
                        <div>
                            <p className="text-xs font-bold dark:text-white">{topic.profiles?.full_name}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Autor de la pregunta</p>
                        </div>
                    </div>

                    <h2 className="text-lg font-black dark:text-white mb-3 leading-tight">{topic.title}</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                        {topic.content}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-white/5 text-[10px] font-bold text-gray-400">
                        <span>{new Date(topic.created_at).toLocaleString()}</span>
                        <div className="flex gap-2">
                            <span className="px-2 py-1 bg-nexus-purple/10 text-nexus-purple rounded-lg">{posts.length} RESPUESTAS</span>
                        </div>
                    </div>
                </div>

                {/* Answers Section */}
                <div className="space-y-4">
                    <h3 className="font-bold text-sm px-1 flex items-center gap-2">
                        <span className="material-symbols-outlined text-nexus-blue">quick_phrases</span>
                        Respuestas de la Comunidad
                    </h3>

                    <div className="space-y-4">
                        {posts.map((post) => (
                            <div
                                key={post.id}
                                className={`p-6 rounded-[2rem] border transition-all ${post.is_highlighted
                                    ? 'bg-nexus-green/5 border-nexus-green/30 shadow-lg shadow-nexus-green/5 ring-1 ring-nexus-green/20'
                                    : 'bg-white dark:bg-surface-dark border-gray-100 dark:border-white/5 shadow-sm'}`}
                            >
                                {post.is_highlighted && (
                                    <div className="flex items-center gap-1.5 text-nexus-green text-[10px] font-black uppercase mb-4 tracking-widest">
                                        <span className="material-symbols-outlined text-base">stars</span>
                                        Respuesta Destacada
                                    </div>
                                )}

                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black ${post.profiles?.role === 'admin' ? 'bg-nexus-purple text-white' : 'bg-gray-100 text-gray-500'}`}>
                                        {post.profiles?.avatar_url ? (
                                            <img src={post.profiles.avatar_url} alt="avatar" className="w-full h-full object-cover rounded-2xl" />
                                        ) : post.profiles?.full_name?.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-xs font-black dark:text-white leading-none">{post.profiles?.full_name}</p>
                                            {post.profiles?.role === 'admin' && (
                                                <span className="bg-nexus-purple/10 text-nexus-purple text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">OFICIAL</span>
                                            )}
                                        </div>
                                        <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">{new Date(post.created_at).toLocaleDateString()}</p>
                                    </div>
                                    {role === 'admin' && (
                                        <button
                                            onClick={() => handleHighlight(post.id, post.is_highlighted)}
                                            className={`p-3 rounded-2xl transition-colors ${post.is_highlighted ? 'text-nexus-green bg-nexus-green/10' : 'text-gray-300 hover:text-nexus-green hover:bg-nexus-green/10'}`}
                                            title="Destacar respuesta"
                                        >
                                            <span className="material-symbols-outlined text-2xl">verified</span>
                                        </button>
                                    )}
                                </div>

                                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                                    {post.content}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Reply Input Sticky */}
            <div className="fixed bottom-0 left-0 right-0 p-5 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-xl border-t border-gray-100 dark:border-white/5 z-40">
                {error && (
                    <div className="bg-red-500/10 text-red-500 text-[10px] font-black p-3 rounded-2xl mb-4 border border-red-500/20 text-center animate-shake">
                        {error}
                    </div>
                )}
                <form onSubmit={handleCreatePost} className="flex items-end gap-3">
                    <div className="flex-1 bg-gray-50 dark:bg-white/5 rounded-[1.5rem] p-1.5 flex items-center border border-gray-100 dark:border-white/5">
                        <textarea
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                            placeholder="Aporta una respuesta segura..."
                            rows={1}
                            className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-3 px-4 dark:text-white resize-none max-h-32 font-medium"
                            onInput={(e: any) => {
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!newPostContent.trim() || isSubmitting}
                        className="w-14 h-14 bg-nexus-purple text-white rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-nexus-purple/20 active:scale-90 transition-all disabled:opacity-50 shrink-0"
                    >
                        <span className="material-symbols-outlined text-[28px]">{isSubmitting ? 'sync' : 'send'}</span>
                    </button>
                </form>
                <div className="flex items-center justify-center gap-1 mt-3 opacity-40">
                    <span className="material-symbols-outlined text-[10px]">lock</span>
                    <p className="text-[8px] text-gray-500 font-black uppercase tracking-[0.2em]">
                        Seguridad Activa NexGuard
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TopicDetail;

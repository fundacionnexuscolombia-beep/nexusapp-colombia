
import React, { useState, useEffect } from 'react';
import { newsService, NewsEntry } from '../services/newsService';
import { supabase } from '../services/supabaseClient';

const NewsManager: React.FC = () => {
    const [news, setNews] = useState<NewsEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        category: 'Académico',
        summary: '',
        content: '',
        date: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }),
        image: ''
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        loadNews();
    }, []);

    const loadNews = async () => {
        setLoading(true);
        try {
            const data = await newsService.getAll();
            setNews(data);
        } catch (error) {
            console.error('Error loading news:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (item: NewsEntry) => {
        setEditingId(item.id);
        setFormData({
            title: item.title,
            category: item.category,
            summary: item.summary,
            content: item.content,
            date: item.date,
            image: item.image
        });
        setIsFormOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta noticia?')) return;
        try {
            await newsService.delete(id);
            setNews(news.filter(n => n.id !== id));
        } catch (error) {
            alert('Error al borrar');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setImageFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true);
        try {
            let imageUrl = formData.image;

            // 1. Upload image if exists
            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `news-${Math.random()}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('news-images')
                    .upload(filePath, imageFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('news-images')
                    .getPublicUrl(filePath);

                imageUrl = publicUrl;
            }

            const dataToSave = { ...formData, image: imageUrl };

            if (editingId) {
                await newsService.update(editingId, dataToSave);
            } else {
                await newsService.create(dataToSave);
            }

            setIsFormOpen(false);
            setEditingId(null);
            setFormData({
                title: '',
                category: 'Académico',
                summary: '',
                content: '',
                date: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }),
                image: ''
            });
            setImageFile(null);
            loadNews();
            alert('¡Noticia guardada con éxito!');
        } catch (error) {
            console.error(error);
            alert('Error al guardar la noticia');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-bold dark:text-white text-sm">Listado de Noticias</h3>
                    <p className="text-[10px] text-gray-400">Total: {news.length} entradas</p>
                </div>
                <button
                    onClick={() => { setIsFormOpen(true); setEditingId(null); }}
                    className="bg-primary text-white px-4 py-2 rounded-xl text-[10px] font-bold flex items-center gap-1 shadow-lg shadow-primary/20"
                >
                    <span className="material-symbols-outlined text-sm">add</span>
                    NUEVA NOTICIA
                </button>
            </div>

            {isFormOpen && (
                <div className="bg-gray-50 dark:bg-black/20 p-5 rounded-2xl border border-primary/20 animate-in fade-in slide-in-from-top-2 duration-300">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Título</label>
                                <input
                                    required
                                    className="w-full p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 text-sm dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Categoría</label>
                                <select
                                    className="w-full p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 text-sm dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                >
                                    <option>Académico</option>
                                    <option>Evento</option>
                                    <option>Administrativo</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Fecha (Texto)</label>
                                <input
                                    required
                                    placeholder="Ej: 21 Oct 2023"
                                    className="w-full p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 text-sm dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Imagen de Portada</label>
                                <div className="flex items-center gap-3">
                                    {(imageFile || formData.image) && (
                                        <img
                                            src={imageFile ? URL.createObjectURL(imageFile) : formData.image}
                                            className="size-12 rounded-xl object-cover border border-gray-100 dark:border-white/10"
                                            alt="Preview"
                                        />
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="text-[10px] text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Resumen Corto</label>
                            <input
                                required
                                className="w-full p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 text-sm dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                                value={formData.summary}
                                onChange={e => setFormData({ ...formData, summary: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Contenido de la Noticia (Markdown soportado)</label>
                            <textarea
                                required
                                rows={6}
                                placeholder="Escribe aquí el detalle de la noticia..."
                                className="w-full p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 text-sm dark:text-white outline-none focus:ring-2 focus:ring-primary/20 font-sans"
                                value={formData.content}
                                onChange={e => setFormData({ ...formData, content: e.target.value })}
                            />
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button
                                type="submit"
                                disabled={uploading}
                                className="flex-1 bg-primary text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {uploading && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
                                {editingId ? 'Actualizar' : 'Publicar'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsFormOpen(false)}
                                className="px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-400 font-bold text-xs uppercase"
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="space-y-3">
                {news.map(item => (
                    <div key={item.id} className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <img src={item.image} className="size-12 rounded-xl object-cover" alt="" />
                            <div>
                                <h4 className="text-xs font-bold dark:text-white">{item.title}</h4>
                                <p className="text-[10px] text-gray-400">{item.category} • {item.date}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEdit(item)} className="p-2 text-primary hover:bg-primary/10 rounded-lg">
                                <span className="material-symbols-outlined text-sm">edit</span>
                            </button>
                            <button onClick={() => handleDelete(item.id)} className="p-2 text-nexus-red hover:bg-nexus-red/10 rounded-lg">
                                <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                        </div>
                    </div>
                ))}

                {news.length === 0 && !loading && (
                    <div className="text-center py-8">
                        <p className="text-xs text-gray-400">No hay noticias publicadas.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NewsManager;

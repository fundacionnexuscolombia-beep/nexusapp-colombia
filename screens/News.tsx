
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { NewsEntry, newsService } from '../services/newsService';

const News: React.FC = () => {
  const navigate = useNavigate();

  const [newsList, setNewsList] = React.useState<NewsEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState('Todo');

  React.useEffect(() => {
    const loadNews = async () => {
      try {
        const data = await newsService.getAll();
        setNewsList(data);
      } catch (error) {
        console.error('Error fetching news:', error);
      } finally {
        setLoading(false);
      }
    };
    loadNews();
  }, []);

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Académico': return 'bg-nexus-blue text-white';
      case 'Evento': return 'bg-nexus-purple text-white';
      case 'Administrativo': return 'bg-nexus-green text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  return (
    <div className="flex flex-col flex-1 pb-24 bg-background-light dark:bg-background-dark min-h-screen">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="size-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined">arrow_back_ios</span>
        </button>
        <h1 className="text-lg font-bold dark:text-white">Novedades Nexus</h1>
        <button className="size-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-slate-800">
          <span className="material-symbols-outlined">tune</span>
        </button>
      </header>

      <main className="p-4 space-y-6">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
          {['Todo', 'Académico', 'Evento', 'Administrativo'].map((cat, i) => (
            <button
              key={i}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${filter === cat ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-white dark:bg-slate-800 text-slate-500 border border-gray-100 dark:border-gray-700'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-20">
              <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400 text-sm">Cargando noticias...</p>
            </div>
          ) : newsList.filter(n => filter === 'Todo' || n.category === filter).map((item) => (
            <div key={item.id} className="bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 group active:scale-[0.98] transition-transform">
              <div className="h-48 relative overflow-hidden">
                <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getCategoryColor(item.category)}`}>
                  {item.category}
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2">
                  <span className="material-symbols-outlined text-xs">calendar_today</span>
                  {item.date}
                  <span className="mx-1">•</span>
                  <span>Nexus Editor</span>
                </div>
                <h3 className="text-xl font-bold dark:text-white mb-2 leading-tight">{item.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">{item.summary}</p>
                <div className="mt-4 flex items-center justify-between">
                  <button className="text-primary text-sm font-bold flex items-center gap-1 group/btn">
                    Leer más
                    <span className="material-symbols-outlined group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
                  </button>
                  <div className="flex items-center gap-3 text-gray-300">
                    <span className="material-symbols-outlined hover:text-primary transition-colors cursor-pointer">share</span>
                    <span className="material-symbols-outlined hover:text-nexus-red transition-colors cursor-pointer">favorite_border</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {!loading && newsList.length === 0 && (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[2rem] border border-dashed border-gray-200 dark:border-gray-800">
              <span className="material-symbols-outlined text-4xl text-gray-200 mb-2">newspaper</span>
              <p className="text-gray-400 text-sm italic">No hay noticias para mostrar.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default News;

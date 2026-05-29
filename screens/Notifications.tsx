import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { supabase } from '../services/supabaseClient';
import { notificationService, AppNotification } from '../services/notificationService';

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  const loadNotifications = async () => {
    if (!user) return;
    try {
      const data = await notificationService.getForUser(user.id);
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    
    // Initial Load
    loadNotifications();

    // Subscribe to new notifications
    const channel = notificationService.subscribeToNotifications(user.id, (payload) => {
      const newNotif = payload.new as AppNotification;
      setNotifications(prev => [newNotif, ...prev]);
      
      // If we are on the unread tab, the new one will show by default.
      // We could add a local sound or toast here if desired.
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleMarkAsRead = async (id: string, currentlyRead: boolean) => {
    if (currentlyRead) return;
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    try {
      await notificationService.markAllAsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const now = new Date();
    const past = new Date(dateStr);
    const diffInMs = now.getTime() - past.getTime();
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMins / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMins < 1) return 'Ahora';
    if (diffInMins < 60) return `${diffInMins}m`;
    if (diffInHours < 24) return `${diffInHours}h`;
    return `${diffInDays}d`;
  };

  const filteredNotices = activeTab === 'all'
    ? notifications
    : notifications.filter(n => !n.is_read);

  // Group notifications by date
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const groupedNotices = filteredNotices.reduce((acc, notice) => {
    const date = notice.created_at.split('T')[0];
    let label = 'Anteriormente';
    if (date === today) label = 'Hoy';
    else if (date === yesterday) label = 'Ayer';
    
    if (!acc[label]) acc[label] = [];
    acc[label].push(notice);
    return acc;
  }, {} as Record<string, AppNotification[]>);

  return (
    <div className="flex flex-col flex-1 bg-white dark:bg-slate-900 h-screen">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-slate-900 dark:text-white">
            <span className="material-symbols-outlined">arrow_back_ios</span>
          </button>
          <h2 className="text-lg font-bold dark:text-white">Notificaciones</h2>
        </div>
        <button
          onClick={handleMarkAllAsRead}
          className="text-primary p-2 flex items-center gap-1 hover:bg-primary/5 rounded-xl transition-colors"
          title="Marcar todo como leído"
        >
          <span className="text-[10px] font-bold uppercase">Marcar todo</span>
          <span className="material-symbols-outlined text-sm">done_all</span>
        </button>
      </header>

      <nav className="flex px-4 border-b border-gray-100 dark:border-gray-800">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-4 text-sm font-bold transition-all border-b-2 ${activeTab === 'all' ? 'border-primary text-primary' : 'border-transparent text-slate-400'}`}
        >
          Todas
        </button>
        <button
          onClick={() => setActiveTab('unread')}
          className={`px-4 py-4 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${activeTab === 'unread' ? 'border-primary text-primary' : 'border-transparent text-slate-400'}`}
        >
          No leídas
          <span className={`size-2 rounded-full ${activeTab === 'unread' ? 'bg-primary' : 'bg-slate-300'}`}></span>
        </button>
      </nav>

      <main className="flex-1 overflow-y-auto pb-20">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-4">
            <span className="material-symbols-outlined animate-spin text-slate-300 text-4xl">progress_activity</span>
            <p className="text-slate-400 text-sm">Cargando avisos...</p>
          </div>
        ) : filteredNotices.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <span className="material-symbols-outlined text-6xl text-slate-200">notifications_off</span>
            <p className="text-slate-400 font-medium">{activeTab === 'unread' ? '¡Todo al día! No tienes avisos pendientes.' : 'No hay notificaciones por el momento.'}</p>
          </div>
        ) : (
          Object.entries(groupedNotices).map(([label, notices]) => (
            <React.Fragment key={label}>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/30">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
              </div>
              {notices.map((notice) => (
                <div
                  key={notice.id}
                  onClick={() => handleMarkAsRead(notice.id, notice.is_read)}
                  className={`flex gap-4 p-4 border-b border-gray-50 dark:border-gray-800 relative cursor-pointer transition-colors active:bg-gray-100 dark:active:bg-white/5 ${!notice.is_read ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
                >
                  {!notice.is_read && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-primary rounded-r-full"></div>}

                  <div className={`size-12 rounded-2xl flex items-center justify-center shrink-0 ${notice.type === 'ai' ? 'bg-primary text-white shadow-sm' :
                    notice.type === 'payment' ? 'bg-nexus-red/10 text-nexus-red' :
                      notice.type === 'grade' ? 'bg-nexus-green/10 text-nexus-green' :
                        'bg-slate-100 dark:bg-slate-800 text-primary'
                    }`}>
                    <span className="material-symbols-outlined">
                      {notice.type === 'ai' ? 'smart_toy' :
                        notice.type === 'payment' ? 'payments' :
                          notice.type === 'grade' ? 'school' : 'notifications'}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className={`text-base truncate ${!notice.is_read ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-500 dark:text-slate-400'}`}>
                        {notice.title}
                      </h3>
                      {!notice.is_read && <span className="text-[10px] font-bold text-primary uppercase ml-2">Nueva</span>}
                    </div>
                    <p className={`text-sm leading-snug line-clamp-2 ${!notice.is_read ? 'text-slate-600 dark:text-gray-300' : 'text-slate-400 dark:text-slate-500 italic'}`}>
                      {notice.body}
                    </p>
                  </div>

                  <div className="shrink-0">
                    <p className="text-slate-400 text-[10px] font-medium">{getTimeAgo(notice.created_at)}</p>
                  </div>
                </div>
              ))}
            </React.Fragment>
          ))
        )}
      </main>
    </div>
  );
};

export default Notifications;

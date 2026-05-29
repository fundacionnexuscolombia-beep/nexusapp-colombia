import { supabase } from './supabaseClient';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Device } from '@capacitor/device';
import { paymentService } from './paymentService';
import { progressService } from './progressService';

export interface AppNotification {
    id: string;
    user_id: string;
    title: string;
    body: string;
    type: 'ai' | 'payment' | 'grade' | 'info' | 'reminder';
    is_read: boolean;
    created_at: string;
}

export const notificationService = {
    async getForUser(userId: string): Promise<AppNotification[]> {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    subscribeToNotifications(userId: string, callback: (payload: any) => void) {
        return supabase
            .channel(`notifs-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => callback(payload)
            )
            .subscribe();
    },

    async markAsRead(notificationId: string) {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId);

        if (error) throw error;
    },

    async markAllAsRead(userId: string) {
        const { error } = await supabase.rpc('mark_all_notifications_as_read', {
            target_user_id: userId
        });

        if (error) throw error;
    },

    async initPush() {
        // Hardcoded return to completely disable native push notification initialization and prevent crashes
        return;
        if (import.meta.env.VITE_ENABLE_PUSH_NOTIFICATIONS !== 'true') {
            console.log('Push notifications are disabled via configuration (VITE_ENABLE_PUSH_NOTIFICATIONS is not true)');
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        try {
            const info = await Device.getInfo();
            if (info.platform === 'web') return;

            let perm = await PushNotifications.checkPermissions();
            if (perm.receive !== 'granted') {
                perm = await PushNotifications.requestPermissions();
            }

            if (perm.receive === 'granted') {
                // Register with push services
                try {
                    await PushNotifications.register();
                } catch (registerError) {
                    console.warn('Native registration failed. This is expected if google-services.json or certificates are missing:', registerError);
                    return;
                }

                // Remove existing listeners before adding to prevent duplicates
                await PushNotifications.removeAllListeners();

                await PushNotifications.addListener('registration', async (token) => {
                    console.log('Push token successfully registered:', token.value);
                    try {
                        const { error } = await supabase.from('push_tokens').upsert({
                            user_id: user.id,
                            token: token.value,
                            platform: info.platform
                        });
                        if (error) console.error('Error saving push token to database:', error);
                    } catch (dbError) {
                        console.error('Failed to upsert push token in Supabase:', dbError);
                    }
                });

                await PushNotifications.addListener('registrationError', (err) => {
                    console.error('Push registration error:', err.error);
                });

                await PushNotifications.addListener('pushNotificationReceived', async (notification) => {
                    console.log('Push notification received in foreground:', notification);
                    // Dynamically add to notifications center and show local notify
                    await this.sendLocal(
                        notification.title || 'Nueva Actualización',
                        notification.body || '',
                        'info'
                    );
                });
            }
        } catch (e) {
            console.warn('Push init error (likely non-native, missing configurations, or development environment):', e);
        }
    },

    async sendLocal(title: string, body: string, type: AppNotification['type']) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Save to DB history
        await supabase.from('notifications').insert({
            user_id: user.id,
            title,
            body,
            type
        });

        // 2. Show local toast/notification
        try {
            await LocalNotifications.schedule({
                notifications: [{
                    title,
                    body,
                    id: Math.floor(Math.random() * 1000000),
                    schedule: { at: new Date(Date.now() + 1000) },
                    extra: { type }
                }]
            });
        } catch (e) {
            console.warn('Local notify error:', e);
        }
    },

    /**
     * Periodic Checkers
     */
    async checkCriticalAlerts() {
        const lastCheck = localStorage.getItem('nexus_last_notif_check');
        const now = Date.now();
        // Check once every 24 hours to avoid spamming
        if (lastCheck && now - parseInt(lastCheck) < 86400000) return;

        await this.checkUpcomingPayments();
        await this.checkPendingEvaluations();

        localStorage.setItem('nexus_last_notif_check', now.toString());
    },

    async checkUpcomingPayments() {
        try {
            const payments = await paymentService.getMyPayments();
            const soon = new Date();
            soon.setDate(soon.getDate() + 3);

            const upcoming = payments.find(p =>
                p.status !== 'paid' &&
                new Date(p.due_date) <= soon &&
                new Date(p.due_date) >= new Date()
            );

            if (upcoming) {
                await this.sendLocal(
                    'Próxima Cuota de Pago',
                    `Tienes una cuota de $${upcoming.amount} que vence el ${new Date(upcoming.due_date).toLocaleDateString()}.`,
                    'payment'
                );
            }
        } catch (e) { console.error(e); }
    },

    async checkPendingEvaluations() {
        try {
            const { fetchCoursesFromSheet } = await import('./sheetService');
            const data = await fetchCoursesFromSheet();
            const allSubjects = Object.keys(data).map(key => ({
                id: key.toLowerCase().replace(/ /g, ''),
                title: key,
                topics: data[key]
            }));

            const metrics = await progressService.getDetailedProgressMetrics(allSubjects);
            const subjectsWithPending = metrics.filter(m => m.percentage < 100).length;

            if (subjectsWithPending > 0) {
                await this.sendLocal(
                    'Evaluaciones Pendientes',
                    `Aún tienes temas por evaluar en ${subjectsWithPending} materias. ¡Sigue avanzando hacia tu grado!`,
                    'reminder'
                );
            }
        } catch (e) { console.error(e); }
    }
};

import { supabase } from './supabaseClient';
import { Payment } from '../types';
import { scheduleService } from './scheduleService';

export const paymentService = {
    async getMyPayments(): Promise<Payment[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user authenticated');

        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('user_id', user.id)
            .order('due_date', { ascending: true });

        if (error) throw error;
        return data as Payment[];
    },

    async checkOverdueStatus(): Promise<{ isOverdue: boolean, isStrictlyOverdue: boolean, overdueCount: number }> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { isOverdue: false, isStrictlyOverdue: false, overdueCount: 0 };

            const payments = await this.getMyPayments();
            const now = new Date();

            // 1. Soft Overdue: Any pending payment with an expired due_date
            const pendingPayments = payments.filter(p => p.status !== 'paid');
            
            if (pendingPayments.length === 0) {
                return { isOverdue: false, isStrictlyOverdue: false, overdueCount: 0 };
            }

            const overdueByDueDate = pendingPayments.filter(p => new Date(p.due_date) < now);

            // 2. Strict Overdue: 30 days grace period AFTER the due_date of any pending payment
            const strictlyOverduePayments = pendingPayments.filter(p => {
                // The grace period ends 30 days after this specific payment's due date
                const gracePeriodEnd = new Date(p.due_date);
                gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 30);
                return gracePeriodEnd < now;
            });

            const isStrictlyOverdue = strictlyOverduePayments.length > 0;
            const isSoftlyOverdue = overdueByDueDate.length > 0;

            // Restrict access ONLY if strictly overdue (30 days past due_date)
            return {
                isOverdue: isStrictlyOverdue, 
                isStrictlyOverdue: isStrictlyOverdue,
                overdueCount: pendingPayments.length
            };
        } catch (error) {
            console.error('Error checking payment status:', error);
            return { isOverdue: true, isStrictlyOverdue: false, overdueCount: 0 };
        }
    },



    /**
     * Set up a default payment plan for a new user based on their cohort start date.
     */
    async setupInitialPaymentPlan(userId: string, startDate: Date) {
        const plans = [
            { concept: 'Matrícula Oficial', daysOffset: 0, amount: 150000 },
            { concept: 'Cuota de Estudio #1', daysOffset: 30, amount: 120000 },
            { concept: 'Cuota de Estudio #2', daysOffset: 60, amount: 120000 },
            { concept: 'Cuota de Estudio #3', daysOffset: 90, amount: 120000 },
            { concept: 'Cuota de Estudio #4', daysOffset: 120, amount: 120000 },
        ];

        const payments = plans.map(plan => {
            const dueDate = new Date(startDate);
            dueDate.setDate(dueDate.getDate() + plan.daysOffset);

            return {
                user_id: userId,
                concept: plan.concept,
                amount: plan.amount,
                due_date: dueDate.toISOString(),
                status: 'pending'
            };
        });

        const { error } = await supabase
            .from('payments')
            .insert(payments);

        if (error) throw error;
    }
};

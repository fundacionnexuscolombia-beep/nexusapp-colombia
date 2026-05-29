
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Payment } from '../types';
import { generateReceipt } from '../services/receiptService';

interface Student {
    id: string;
    full_name: string;
    email: string;
    cohort?: string;
    is_blocked?: boolean;
    phone?: string;
    document_type?: string;
    document_number?: string;
    birth_date?: string;
    document_issue_date?: string;
    document_issue_place?: string;
    status?: 'active' | 'inactive';
    role?: string;
}

interface StudentFinancialSummary {
    student: Student;
    totalPaid: number;
    totalDebt: number;
    progress: number; // 0-100%
    status: 'up-to-date' | 'overdue' | 'completed';
    nextPaymentDate?: string;
}

// Cohort Schedules
const COHORT_SCHEDULES: Record<string, string> = {
    'Enero': '2026-01-24',
    'Marzo': '2026-03-21',
    'Junio': '2026-06-20',
    'Septiembre': '2026-09-19'
};

const PaymentManager: React.FC = () => {
    // Data
    const [students, setStudents] = useState<Student[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(false);

    // UI State
    const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'active' | 'inactive'>('active');
    const [showGenerator, setShowGenerator] = useState(false);

    // Payment Modal State
    const [showPayModal, setShowPayModal] = useState(false);
    const [paymentToProcess, setPaymentToProcess] = useState<Payment | null>(null);
    const [paymentMethod, setPaymentMethod] = useState('Bancolombia');
    const [transactionId, setTransactionId] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentAmount, setPaymentAmount] = useState<number | string>('');

    // Generator State
    const [genMode, setGenMode] = useState<'single' | 'cohort'>('single');
    const [genCohort, setGenCohort] = useState('Enero');
    const [genDate, setGenDate] = useState(COHORT_SCHEDULES['Enero']);

    // Manual Installment State
    const [showManualModal, setShowManualModal] = useState(false);
    const [manualData, setManualData] = useState({
        concept: '',
        amount: '',
        due_date: new Date().toISOString().split('T')[0]
    });

    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);

    // Edit Student Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editFormData, setEditFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        cohort: 'Enero',
        document_type: 'C.C.',
        document_number: '',
        birth_date: '',
        document_issue_date: '',
        document_issue_place: '',
    });

    // Auto-set date when cohort changes
    useEffect(() => {
        if (COHORT_SCHEDULES[genCohort]) {
            setGenDate(COHORT_SCHEDULES[genCohort]);
        }
    }, [genCohort]);

    // Auto-select student's cohort when opening generator for single student
    useEffect(() => {
        if (showGenerator && genMode === 'single' && selectedStudentId) {
            const student = students.find(s => s.id === selectedStudentId);
            if (student && student.cohort && COHORT_SCHEDULES[student.cohort]) {
                setGenCohort(student.cohort);
            }
        }
    }, [showGenerator, genMode, selectedStudentId, students]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        // Fetch Students
        const { data: studentsData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email, cohort, is_blocked, phone, document_type, document_number, birth_date, document_issue_date, document_issue_place, status')
            .eq('role', 'student')
            .order('full_name');

        if (profilesError) {
            setMsg({ type: 'error', text: 'Error cargando perfiles: ' + profilesError.message });
        } else if (studentsData) {
            setStudents(studentsData as unknown as Student[]);
        }

        // Fetch Payments
        const { data: paymentsData, error: paymentsError } = await supabase
            .from('payments')
            .select('*')
            .order('due_date', { ascending: true });

        if (paymentsError) {
            setMsg({ type: 'error', text: 'Error cargando pagos: ' + paymentsError.message });
        } else if (paymentsData) {
            setPayments(paymentsData as Payment[]);
        }
        setLoading(false);
    };

    const handleOpenEditModal = () => {
        const student = students.find(s => s.id === selectedStudentId);
        if (student) {
            setEditFormData({
                full_name: student.full_name || '',
                email: student.email || '',
                phone: student.phone || '',
                cohort: student.cohort || '',
                document_type: student.document_type || 'C.C.',
                document_number: student.document_number || '',
                birth_date: student.birth_date || '',
                document_issue_date: student.document_issue_date || '',
                document_issue_place: student.document_issue_place || '',
            });
            setShowEditModal(true);
        }
    };

    const handleUpdateStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudentId) return;

        setLoading(true);
        setMsg(null);

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: editFormData.full_name,
                    email: editFormData.email,
                    phone: editFormData.phone,
                    cohort: editFormData.cohort,
                    document_type: editFormData.document_type,
                    document_number: editFormData.document_number,
                    birth_date: editFormData.birth_date,
                    document_issue_date: editFormData.document_issue_date,
                    document_issue_place: editFormData.document_issue_place,
                    updated_at: new Date().toISOString()
                })
                .eq('id', selectedStudentId);

            if (error) throw error;

            setMsg({ type: 'success', text: 'Datos del estudiante actualizados correctamente.' });
            setShowEditModal(false);
            fetchData();
        } catch (error: any) {
            console.error("Update error:", error);
            setMsg({ type: 'error', text: 'Error al actualizar: ' + error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        const student = students.find(s => s.id === selectedStudentId);
        if (!student || !student.document_number) {
            setMsg({ type: 'error', text: 'No se encontró el número de documento para restablecer.' });
            return;
        }

        if (!window.confirm(`¿Restablecer contraseña de ${student.full_name} a su número de documento (${student.document_number})?`)) {
            return;
        }

        setLoading(true);
        setMsg(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
                },
                body: JSON.stringify({
                    action: 'reset-password',
                    userId: student.id,
                    newPassword: student.document_number
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Error al restablecer contraseña');
            }

            setMsg({ type: 'success', text: 'Contraseña restablecida exitosamente.' });
        } catch (error: any) {
            console.error("Reset error:", error);
            setMsg({ type: 'error', text: 'Error: ' + error.message });
        } finally {
            setLoading(false);
        }
    };

    // --- Computed Data ---
    const getStudentSummary = (student: Student): StudentFinancialSummary => {
        const studentPayments = payments.filter(p => p.user_id === student.id);
        const totalAmount = studentPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        const totalPaid = studentPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0);
        const totalDebt = totalAmount - totalPaid;
        const progress = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;

        // Status Logic
        let status: 'up-to-date' | 'overdue' | 'completed' = 'up-to-date';
        if (progress === 100 && totalAmount > 0) status = 'completed';
        else {
            const hasOverdueDueDate = studentPayments.some(p => p.status !== 'paid' && new Date(p.due_date) < new Date());

            // 30-day rule check for Admin visibility
            const pendingPayments = studentPayments.filter(p => p.status !== 'paid');
            const paidPayments = studentPayments
                .filter(p => p.status === 'paid' && p.paid_at)
                .sort((a, b) => new Date(b.paid_at!).getTime() - new Date(a.paid_at!).getTime());

            let has30DayOverdue = false;
            if (pendingPayments.length > 0) {
                const now = new Date();
                let referenceDate: Date;
                if (paidPayments.length > 0) {
                    referenceDate = new Date(paidPayments[0].paid_at!);
                } else {
                    // Fallback to cohort start or first due_date
                    const cohortDateStr = student.cohort && COHORT_SCHEDULES[student.cohort]
                        ? COHORT_SCHEDULES[student.cohort]
                        : (studentPayments.length > 0 ? studentPayments[0].due_date : null);
                    referenceDate = cohortDateStr ? new Date(cohortDateStr) : now;
                }
                const diffDays = Math.ceil(Math.abs(now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
                if (diffDays > 30) has30DayOverdue = true;
            }

            if (hasOverdueDueDate || has30DayOverdue) status = 'overdue';
        }


        const nextPayment = studentPayments.find(p => p.status !== 'paid');

        return {
            student,
            totalPaid,
            totalDebt,
            progress,
            status,
            nextPaymentDate: nextPayment?.due_date
        };
    };

    const filteredStudents = students
        .filter(s => s.role === 'student')
        .filter(s => (s.status || 'active') === statusFilter)
        .filter(s => (s.full_name || "").toLowerCase().includes((searchTerm || "").toLowerCase()))
        .map(getStudentSummary);

    // --- Actions ---

    const handleSelectStudent = (id: string) => {
        setSelectedStudentId(id);
        setViewMode('detail');
    };

    const handleBackToList = () => {
        setSelectedStudentId(null);
        setViewMode('list');
    };

    // Payment Logic
    const openPayModal = (payment: Payment) => {
        setPaymentToProcess(payment);
        setPaymentAmount(payment.amount);
        setPaymentMethod('Bancolombia');
        setTransactionId('');
        setPaymentDate(new Date().toISOString().split('T')[0]);
        setShowPayModal(true);
    };

    const confirmPayment = async () => {
        if (!paymentToProcess) return;

        setLoading(true);
        setMsg(null);

        try {
            // Validate transaction ID (required by admin rules)
            if (!transactionId || !transactionId.trim()) {
                setMsg({ type: 'error', text: 'POR FAVOR INGRESA EL NÚMERO DE COMPROBANTE/REFERENCIA.' });
                setLoading(false);
                return;
            }

            let remainingAmount = Number(paymentAmount) || Number(paymentToProcess.amount);

            // Fetch pending payments
            const { data: pendingPayments, error: fetchError } = await supabase
                .from('payments')
                .select('*')
                .eq('user_id', paymentToProcess.user_id)
                .eq('status', 'pending')
                .order('due_date', { ascending: true });

            if (fetchError) throw fetchError;

            // Ensure the initially selected payment is processed first
            const orderedPayments = [
                pendingPayments?.find(p => p.id === paymentToProcess.id) || paymentToProcess,
                ...(pendingPayments?.filter(p => p.id !== paymentToProcess.id) || [])
            ];

            const promises = [];

            for (const p of orderedPayments) {
                if (remainingAmount <= 0) break;

                const pAmount = Number(p.amount);

                if (remainingAmount >= pAmount) {
                    // Fully pay this quota
                    promises.push(
                        supabase.from('payments').update({
                            status: 'paid',
                            paid_at: new Date(paymentDate + 'T12:00:00').toISOString(),
                            payment_method: paymentMethod,
                            transaction_id: transactionId
                        }).eq('id', p.id)
                    );
                    remainingAmount -= pAmount;
                } else {
                    // Partially pay this quota by splitting it
                    promises.push(
                        supabase.from('payments').update({
                            status: 'paid',
                            paid_at: new Date(paymentDate + 'T12:00:00').toISOString(),
                            payment_method: paymentMethod,
                            transaction_id: transactionId,
                            amount: remainingAmount
                        }).eq('id', p.id)
                    );
                    
                    // Create a new pending quota for the remainder
                    promises.push(
                        supabase.from('payments').insert([{
                            user_id: p.user_id,
                            concept: p.concept + ' (Saldo)',
                            amount: pAmount - remainingAmount,
                            due_date: p.due_date,
                            status: 'pending'
                        }])
                    );
                    remainingAmount = 0;
                }
            }

            await Promise.all(promises);

            setMsg({ type: 'success', text: '¡PAGO REGISTRADO EXITOSAMENTE!' });

            // Give the user a moment to see the success message before closing
            setTimeout(async () => {
                setShowPayModal(false);
                setMsg(null);
                await fetchData();
            }, 1500);

        } catch (err: any) {
            console.error("Catch Error Details:", err);
            setMsg({ type: 'error', text: 'FALLO CRÍTICO: ' + (err.message || 'Error desconocido') });
        } finally {
            setLoading(false);
        }
    };

    const revertPayment = async (payment: Payment) => {
        if (!window.confirm('¿Deshacer pago?')) return;
        const { error } = await supabase.from('payments').update({
            status: 'pending',
            paid_at: null,
            payment_method: null,
            transaction_id: null
        }).eq('id', payment.id);
        if (!error) fetchData();
    };

    // --- Student Management Actions ---

    const toggleBlockStatus = async () => {
        if (!selectedStudentId) return;
        const student = students.find(s => s.id === selectedStudentId);
        if (!student) return;

        const newStatus = !student.is_blocked;
        const confirmMsg = newStatus
            ? '¿Bloquear acceso a este estudiante? No podrá iniciar sesión.'
            : '¿Desbloquear acceso? El estudiante podrá ingresar nuevamente.';

        if (!window.confirm(confirmMsg)) return;

        setLoading(true);
        const { error } = await supabase
            .from('profiles')
            .update({ is_blocked: newStatus })
            .eq('id', selectedStudentId);

        if (error) {
            setMsg({ type: 'error', text: 'Error al cambiar estado: ' + error.message });
        } else {
            setMsg({ type: 'success', text: `Estudiante ${newStatus ? 'bloqueado' : 'desbloqueado'} exitosamente.` });
            fetchData(); // Refresh list
        }
        setLoading(false);
    };

    const toggleInactiveStatus = async () => {
        if (!selectedStudentId) return;
        const student = students.find(s => s.id === selectedStudentId);
        if (!student) return;

        const currentStatus = student.status || 'active';
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        const confirmMsg = newStatus === 'inactive'
            ? '¿Marcar como Inactivo? Perderá acceso temporalmente pero sus datos se conservarán.'
            : '¿Reactivar estudiante? Podrá iniciar sesión nuevamente.';

        if (!window.confirm(confirmMsg)) return;

        setLoading(true);
        const { error } = await supabase
            .from('profiles')
            .update({ status: newStatus })
            .eq('id', selectedStudentId);

        if (error) {
            setMsg({ type: 'error', text: 'Error al cambiar estado: ' + error.message });
        } else {
            setMsg({ type: 'success', text: `Estudiante ${newStatus === 'inactive' ? 'inactivado' : 'reactivado'} exitosamente.` });
            setSelectedStudentId(null);
            setViewMode('list');
            fetchData();
        }
        setLoading(false);
    };

    const handleDeleteUser = async () => {
        if (!selectedStudentId) return;
        // Logic handled in separate modal now, but we need a new modal for USER deletion, 
        // distinct from HISTORY deletion.
        const confirmText = prompt('ESCRIBE "BORRAR" para confirmar la eliminación PERMANENTE del estudiante y todos sus datos:');
        if (confirmText !== 'BORRAR') return;

        setLoading(true);

        // Call Edge Function — refresh session first to ensure valid token
        const { data: { session } } = await supabase.auth.refreshSession();
        if (!session?.access_token) {
            setMsg({ type: 'error', text: 'Sesión expirada. Por favor recarga la página e intenta de nuevo.' });
            setLoading(false);
            return;
        }
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ user_id: selectedStudentId, force_delete: true })
        });


        const resData = await response.json();

        if (!response.ok) {
            setMsg({ type: 'error', text: 'Error: ' + (resData.error || 'Server error') });
        } else {
            setMsg({ type: 'success', text: 'Estudiante eliminado del sistema permanentemente.' });
            setSelectedStudentId(null);
            setViewMode('list');
            fetchData();
        }
        setLoading(false);
    };

    const handleDeleteClick = () => {
        if (!selectedStudentId) return;
        setShowDeleteModal(true);
    };

    const confirmDeleteHistory = async () => {
        if (!selectedStudentId) return;

        setLoading(true);
        const { error } = await supabase
            .from('payments')
            .delete()
            .eq('user_id', selectedStudentId);

        if (error) {
            setMsg({ type: 'error', text: 'Error al eliminar historial: ' + error.message });
        } else {
            setMsg({ type: 'success', text: 'Historial de pagos eliminado exitosamente.' });
            setShowDeleteModal(false);
            fetchData();
        }
        setLoading(false);
    };

    const handleApplyPromo = async () => {
        if (!selectedStudentId) return;
        const student = students.find(s => s.id === selectedStudentId);
        if (!student) return;

        if (!window.confirm('¿Aplicar descuento por pago único? Esto eliminará cualquier cuota pendiente y creará un ÚNICO cobro de $800.000.')) {
            return;
        }

        setLoading(true);

        try {
            // Delete all pending payments
            const { error: delError } = await supabase
                .from('payments')
                .delete()
                .eq('user_id', selectedStudentId)
                .eq('status', 'pending');

            if (delError) throw delError;

            // Calculate due date (10th of cohort month)
            // Fallback to start of current month if cohort schedule is invalid
            let startDate = new Date();
            if (student.cohort && COHORT_SCHEDULES[student.cohort as keyof typeof COHORT_SCHEDULES]) {
                startDate = new Date(COHORT_SCHEDULES[student.cohort as keyof typeof COHORT_SCHEDULES] + 'T12:00:00');
            }

            const year = startDate.getFullYear();
            const month = startDate.getMonth() + 1;
            const formattedMonth = month < 10 ? `0${month}` : month;
            const dueDate = `${year}-${formattedMonth}-10`;

            // Insert single promo payment
            const { error: insError } = await supabase
                .from('payments')
                .insert([{
                    user_id: selectedStudentId,
                    concept: 'Pago Único - Descuento (Contado)',
                    amount: 800000,
                    due_date: dueDate,
                    status: 'pending'
                }]);

            if (insError) throw insError;

            setMsg({ type: 'success', text: 'Promoción aplicada. Cuotas condensadas en un solo pago de $800.000.' });
            fetchData();
        } catch (error: any) {
            setMsg({ type: 'error', text: 'Error aplicando la promoción: ' + error.message });
        } finally {
            setLoading(false);
        }
    };

    const migrateToNewPlan = async () => {
        if (!selectedStudentId || !window.confirm('¿Actualizar a plan de $900.000? Se borrará el historial actual de este estudiante.')) return;

        setIsMigrating(true);
        setLoading(true);

        try {
            // 1. Delete old payments
            const { error: delError } = await supabase
                .from('payments')
                .delete()
                .eq('user_id', selectedStudentId);

            if (delError) throw delError;

            // 2. Generate new plan
            const student = students.find(s => s.id === selectedStudentId);
            const cohortDate = student?.cohort ? COHORT_SCHEDULES[student.cohort] : genDate;
            const start = new Date(cohortDate + 'T12:00:00');

            const newPlan: any[] = [];
            // 8 installments of 80k every 14 days
            for (let i = 0; i < 8; i++) {
                const date = new Date(start);
                date.setDate(start.getDate() + (i * 14));
                newPlan.push({
                    user_id: selectedStudentId,
                    concept: `Cuota ${i + 1}/8 - Financiación`,
                    amount: 80000,
                    due_date: date.toISOString().split('T')[0],
                    status: 'pending'
                });
            }
            // Graduation Fee ($260,000) - Exactly 112 days from start (8 * 14)
            const gradDate = new Date(start);
            gradDate.setDate(gradDate.getDate() + (8 * 14));
            newPlan.push({
                user_id: selectedStudentId,
                concept: 'Derechos de Grado',
                amount: 260000,
                due_date: gradDate.toISOString().split('T')[0],
                status: 'pending'
            });

            const { error: insError } = await supabase.from('payments').insert(newPlan);
            if (insError) throw insError;

            setMsg({ type: 'success', text: '¡Plan actualizado a $900.000 exitosamente!' });
            await fetchData();
        } catch (err: any) {
            setMsg({ type: 'error', text: 'Error en migración: ' + err.message });
        } finally {
            setIsMigrating(false);
            setLoading(false);
        }
    };

    // Generator Logic
    const generatePlan = async () => {
        if (!genDate) { setMsg({ type: 'error', text: 'Fecha requerida' }); return; }
        setLoading(true);

        let targetIds: string[] = [];
        if (genMode === 'single') {
            if (viewMode === 'detail' && selectedStudentId) targetIds = [selectedStudentId];
            else {
                const cohortStudents = students.filter(s => s.cohort === genCohort);
                targetIds = cohortStudents.map(s => s.id);
            }
        } else {
            const cohortStudents = students.filter(s => s.cohort === genCohort);
            targetIds = cohortStudents.map(s => s.id);
        }

        if (targetIds.length === 0) {
            setMsg({ type: 'error', text: 'No hay estudiantes seleccionados.' });
            setLoading(false);
            return;
        }

        const planData: any[] = [];
        const start = new Date(genDate + 'T12:00:00');

        for (const uid of targetIds) {
            // 1. Check if plan already exists to prevent duplicates
            const { data: existing } = await supabase.from('payments').select('id').eq('user_id', uid).limit(1);
            if (existing && existing.length > 0) continue; // Skip if already has payments

            // 2. Generate exactly $900.000 total
            // 8 Installments of $80.000 = $640.000
            for (let i = 0; i < 8; i++) {
                const date = new Date(start);
                date.setDate(start.getDate() + (i * 14));
                planData.push({
                    user_id: uid,
                    concept: `Cuota ${i + 1}/8 - Financiación`,
                    amount: 80000,
                    due_date: date.toISOString().split('T')[0],
                    status: 'pending'
                });
            }

            // 3. Graduation Fee of $260.000 = Total $900.000
            const gradDate = new Date(start);
            gradDate.setDate(gradDate.getDate() + (8 * 14));
            planData.push({
                user_id: uid,
                concept: 'Derechos de Grado',
                amount: 260000,
                due_date: gradDate.toISOString().split('T')[0],
                status: 'pending'
            });
        }

        if (planData.length === 0) {
            setMsg({ type: 'error', text: 'Los estudiantes seleccionados ya tienen plan de pagos.' });
            setLoading(false);
            return;
        }

        const { error } = await supabase.from('payments').insert(planData);
        if (error) setMsg({ type: 'error', text: error.message });
        else {
            setMsg({ type: 'success', text: 'Plan generado exitosamente.' });
            setShowGenerator(false);
            fetchData();
        }
        setLoading(false);
    };

    const handleCreateManualInstallment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudentId) return;

        if (!manualData.concept.trim() || !manualData.amount || Number(manualData.amount) <= 0) {
            setMsg({ type: 'error', text: 'Concepto y valor son obligatorios y mayores a 0.' });
            return;
        }

        setLoading(true);
        const newInstallment = {
            user_id: selectedStudentId,
            concept: manualData.concept.trim(),
            amount: Number(manualData.amount),
            due_date: manualData.due_date,
            status: 'pending'
        };

        const { error } = await supabase.from('payments').insert([newInstallment]);
        if (error) {
            setMsg({ type: 'error', text: 'Error al agregar cuota: ' + error.message });
        } else {
            setMsg({ type: 'success', text: 'Cuota manual agregada exitosamente.' });
            setShowManualModal(false);
            setManualData({ concept: '', amount: '', due_date: new Date().toISOString().split('T')[0] });
            fetchData();
        }
        setLoading(false);
    };

    // --- RENDER ---

    return (
        <div className="space-y-6 animate-fade-in">
            {/* HEADER & CONTROLS */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold dark:text-white">Gestión de Pagos</h2>
                    <p className="text-sm text-gray-400">Administra planes y recaudos por estudiante.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => { setGenMode('cohort'); setShowGenerator(true); }}
                        className="bg-nexus-blue text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-600 transition-colors"
                    >
                        <span className="material-symbols-outlined">playlist_add</span>
                        Generar Plan
                    </button>
                </div>
            </div>

            {msg && (
                <div className={`p-4 rounded-xl text-sm font-bold text-center ${msg.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {msg.text}
                    <button onClick={() => setMsg(null)} className="ml-4 underline">Cerrar</button>
                </div>
            )}

            {/* MAIN CONTENT */}
            {viewMode === 'list' ? (
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                    {/* PANEL FINANCIERO PREMIUM */}

{(() => {

    const student = students.find(
        s => s.id === selectedStudentId
    );

    if (!student) return null;

    const summary = getStudentSummary(student);

    return (

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

            <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-5 text-white">

                <p className="text-xs uppercase opacity-80">
                    Recaudado
                </p>

                <h3 className="text-2xl font-black mt-2">
                    ${summary.totalPaid.toLocaleString()}
                </h3>

            </div>

            <div className="bg-gradient-to-r from-red-500 to-rose-600 rounded-2xl p-5 text-white">

                <p className="text-xs uppercase opacity-80">
                    Pendiente
                </p>

                <h3 className="text-2xl font-black mt-2">
                    ${summary.totalDebt.toLocaleString()}
                </h3>

            </div>

            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-5 text-white">

                <p className="text-xs uppercase opacity-80">
                    Progreso
                </p>

                <h3 className="text-2xl font-black mt-2">
                    {Math.round(summary.progress)}%
                </h3>

            </div>

            <div className="bg-gradient-to-r from-purple-500 to-fuchsia-600 rounded-2xl p-5 text-white">

                <p className="text-xs uppercase opacity-80">
                    Estado
                </p>

                <h3 className="text-lg font-black mt-2">
                    {
                        summary.status === 'completed'
                            ? 'COMPLETADO'
                            : summary.status === 'overdue'
                            ? 'EN MORA'
                            : 'AL DÍA'
                    }
                </h3>

            </div>

        </div>

    );

})()}
            {/* Toolbar */}
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex gap-4">
                        <div className="flex-1 flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1 max-w-md">
                                <span className="material-symbols-outlined absolute left-3 top-3 text-gray-400">search</span>
                                <input
                                    type="text"
                                    placeholder="Buscar estudiante..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 border-none outline-none dark:text-white"
                                />
                            </div>
                            <div className="flex bg-gray-50 dark:bg-slate-800 rounded-xl p-1 w-full md:w-auto self-start">
                                <button
                                    onClick={() => setStatusFilter('active')}
                                    className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${statusFilter === 'active' ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                >Activos</button>
                                <button
                                    onClick={() => setStatusFilter('inactive')}
                                    className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${statusFilter === 'inactive' ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                >Inactivos</button>
                            </div>
                        </div>
                    </div>

                    {/* Students Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500 font-bold uppercase text-xs">
                                <tr>
                                    <th className="p-4">Estudiante</th>
                                    <th className="p-4">Cohorte</th>
                                    <th className="p-4">Progreso</th>
                                    <th className="p-4">Deuda</th>
                                    <th className="p-4">Estado</th>
                                    <th className="p-4 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {filteredStudents.map(item => (
                                    <tr key={item.student.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={() => handleSelectStudent(item.student.id)}>
                                        <td className="p-4 font-bold text-slate-900 dark:text-white">
                                            {item.student.full_name}
                                            <div className="text-[10px] text-gray-400 font-normal">{item.student.email}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-md text-xs font-bold">{item.student.cohort || 'N/A'}</span>
                                        </td>
                                        <td className="p-4">
                                            <div className="w-24 bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                                                <div className="bg-nexus-green h-1.5 rounded-full" style={{ width: `${item.progress}%` }}></div>
                                            </div>
                                            <div className="text-[10px] text-gray-400 mt-1">{Math.round(item.progress)}% Pagado</div>
                                        </td>
                                        <td className="p-4 font-mono text-slate-700 dark:text-gray-300">
                                            ${item.totalDebt.toLocaleString()}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${item.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                item.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                {item.status === 'completed' ? 'Completado' :
                                                    item.status === 'overdue' ? 'En Mora' : 'Al Día'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleSelectStudent(item.student.id); }}
                                                className="text-nexus-blue hover:underline text-xs font-bold"
                                            >
                                                Ver Detalles
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredStudents.length === 0 && (
                                    <tr><td colSpan={6} className="p-8 text-center text-gray-400">No se encontraron estudiantes.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                // DETAIL VIEW
                <div className="space-y-4">
                    <button onClick={handleBackToList} className="flex items-center gap-2 text-gray-500 hover:text-nexus-blue font-bold text-sm">
                        <span className="material-symbols-outlined">arrow_back</span> Volver a la lista
                    </button>

                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex flex-wrap justify-between items-center gap-4">
                            <div>
                                <h3 className="font-bold text-xl dark:text-white">
                                    {students.find(s => s.id === selectedStudentId)?.full_name}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <p className="text-sm text-gray-400">Historial de Pagos Individual</p>
                                    {(() => {
                                        const count = payments.filter(p => p.user_id === selectedStudentId).length;
                                        if (count > 0 && count < 11) {
                                            return (
                                                <button
                                                    onClick={migrateToNewPlan}
                                                    className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold hover:bg-purple-200 transition-colors flex items-center gap-1"
                                                >
                                                    <span className="material-symbols-outlined text-[12px]">system_update</span>
                                                    ACTUALIZAR A $900K
                                                </button>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {/* Block Button */}
                                {(() => {
                                    const student = students.find(s => s.id === selectedStudentId);
                                    return (
                                        <button
                                            onClick={toggleBlockStatus}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${student?.is_blocked
                                                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                }`}
                                            title={student?.is_blocked ? "Desbloquear acceso" : "Bloquear acceso"}
                                        >
                                            <span className="material-symbols-outlined text-sm">
                                                {student?.is_blocked ? 'lock_open' : 'lock'}
                                            </span>
                                            {student?.is_blocked ? 'Desbloquear' : 'Bloquear'}
                                        </button>
                                    );
                                })()}

                                {/* Inactive Toggle */}
                                {(() => {
                                    const student = students.find(s => s.id === selectedStudentId);
                                    const isInactive = student?.status === 'inactive';
                                    return (
                                        <button
                                            onClick={toggleInactiveStatus}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${isInactive
                                                ? 'bg-nexus-green/20 text-nexus-green hover:bg-nexus-green/30'
                                                : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                                                }`}
                                            title={isInactive ? "Reactivar estudiante" : "Inactivar estudiante"}
                                        >
                                            <span className="material-symbols-outlined text-sm">
                                                {isInactive ? 'play_circle' : 'pause_circle'}
                                            </span>
                                            {isInactive ? 'Reactivar' : 'Inactivar'}
                                        </button>
                                    );
                                })()}

                                <button
                                    onClick={handleOpenEditModal}
                                    className="bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors"
                                    title="Editar datos personales"
                                >
                                    <span className="material-symbols-outlined text-sm">edit</span>
                                    Editar Datos
                                </button>

                                <button
                                    onClick={handleResetPassword}
                                    className="bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 hover:bg-amber-100 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors"
                                    title="Restablecer contraseña al número de documento"
                                >
                                    <span className="material-symbols-outlined text-sm">lock_reset</span>
                                    Reset Pass
                                </button>

                                <button
                                    onClick={handleDeleteUser}
                                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
                                    title="Eliminar USUARIO y datos permanentemente"
                                >
                                    <span className="material-symbols-outlined text-sm">person_remove</span>
                                    Eliminar Usuario
                                </button>

                                <button
                                    onClick={handleApplyPromo}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
                                    title="Aplicar Descuento de Pago Único ($810.000)"
                                >
                                    <span className="material-symbols-outlined text-sm">local_offer</span>
                                    Promo Contado
                                </button>

                                <button
                                    onClick={() => setShowManualModal(true)}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
                                    title="Agregar Cuota o Saldo Manualmente"
                                >
                                    <span className="material-symbols-outlined text-sm">post_add</span>
                                    Cuota Manual
                                </button>

                                <button
                                    onClick={() => { setGenMode('single'); setShowGenerator(true); }}
                                    className="bg-nexus-blue hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-sm">add</span>
                                    Agregar Plan
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto overflow-y-hidden">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                                    <tr>
                                        <th className="p-4 px-6 min-w-[220px]">Cuota / Valor / Vencimiento</th>
                                        <th className="p-4 text-center">Estado y Registro</th>
                                        <th className="p-4 text-right pr-6">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {payments.filter(p => p.user_id === selectedStudentId).map(p => (
                                        <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 group">
                                            <td className="p-4 px-6">
                                                <div className="font-bold dark:text-white text-sm">{p.concept}</div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-nexus-blue font-mono font-bold text-xs">${Number(p.amount).toLocaleString()}</span>
                                                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[10px]">calendar_today</span>
                                                        Vence: {p.due_date}
                                                    </span>
                                                </div>
                                                {p.status === 'paid' && (
                                                    <div className="text-[10px] text-nexus-green flex items-center gap-1 mt-1 font-bold">
                                                        <span className="material-symbols-outlined text-[12px]">verified</span>
                                                        {p.payment_method} • {p.transaction_id}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col items-center gap-2">
                                                    {p.status === 'paid' ? (
                                                        <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                            Pagado
                                                        </span>
                                                    ) : (
                                                        <>
                                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${new Date(p.due_date) < new Date() ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                                                }`}>
                                                                {new Date(p.due_date) < new Date() ? 'Vencido' : 'Pendiente'}
                                                            </span>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); openPayModal(p); }}
                                                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-[13px] font-black shadow-lg shadow-emerald-500/30 active:scale-95 transition-all flex items-center gap-1.5 border-2 border-emerald-400/20"
                                                            >
                                                                <span className="material-symbols-outlined text-sm">payments</span>
                                                                REGISTRAR
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right pr-6">
                                                <div className="flex justify-end gap-1">
                                                    {p.status === 'paid' ? (
                                                        <>
                                                            <button onClick={() => generateReceipt(p, students.find(s => s.id === p.user_id)?.full_name || '')} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg" title="Recibo">
                                                                <span className="material-symbols-outlined">receipt_long</span>
                                                            </button>
                                                            <button onClick={() => revertPayment(p)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Deshacer">
                                                                <span className="material-symbols-outlined">undo</span>
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={async () => {
                                                                if (window.confirm('¿Borrar esta cuota?')) {
                                                                    await supabase.from('payments').delete().eq('id', p.id);
                                                                    fetchData();
                                                                }
                                                            }}
                                                            className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">delete</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {payments.filter(p => p.user_id === selectedStudentId).length === 0 && (
                                        <tr><td colSpan={6} className="p-8 text-center text-gray-400">Este estudiante no tiene pagos asignados.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* MODALS */}

            {/* GENERATOR MODAL */}
            {showGenerator && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-xl border border-gray-100 dark:border-gray-800 animate-fade-in">
                        <h3 className="text-lg font-bold dark:text-white mb-4">Generar Plan de Pagos</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Modo</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setGenMode('cohort')}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold border ${genMode === 'cohort' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-400'}`}
                                    >
                                        Por Cohorte
                                    </button>
                                    <button
                                        onClick={() => setGenMode('single')}
                                        disabled={viewMode !== 'detail'}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold border ${genMode === 'single' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-400'} ${viewMode !== 'detail' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        Solo para {viewMode === 'detail' ? 'Actual' : 'Seleccionado'}
                                    </button>
                                </div>
                            </div>

                            {genMode === 'cohort' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Cohorte</label>
                                    <select value={genCohort} onChange={e => setGenCohort(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 text-sm dark:text-white outline-none focus:ring-2 focus:ring-nexus-blue/20">
                                        <option value="Enero">Enero (Inicio: 24 Ene)</option>
                                        <option value="Marzo">Marzo (Inicio: 21 Mar)</option>
                                        <option value="Junio">Junio (Inicio: 20 Jun)</option>
                                        <option value="Septiembre">Septiembre (Inicio: 19 Sep)</option>
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Fecha Inicio Clases</label>
                                <input type="date" value={genDate} onChange={e => setGenDate(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 text-sm dark:text-white outline-none focus:ring-2 focus:ring-nexus-blue/20" />
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setShowGenerator(false)} className="flex-1 py-3 text-gray-500 font-bold text-sm">Cancelar</button>
                                <button onClick={generatePlan} disabled={loading} className="flex-1 py-3 bg-nexus-blue text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-blue-500/20">
                                    {loading ? 'Generando...' : 'Confirmar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PAYMENT MODAL */}
            {showPayModal && paymentToProcess && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-xl border border-gray-100 dark:border-gray-800 animate-fade-in">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-nexus-green">verified</span>
                                Registrar Pago
                            </h3>
                            <button onClick={() => { setShowPayModal(false); setMsg(null); }} className="text-gray-400 hover:text-gray-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="space-y-4">
                            {msg && (
                                <div className={`p-4 rounded-xl text-sm font-bold text-center animate-bounce ${msg.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {msg.text}
                                </div>
                            )}
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
                                <p className="text-xs text-blue-600 dark:text-blue-300 font-bold mb-1">Concepto</p>
                                <p className="text-sm font-bold text-slate-800 dark:text-white mb-3">{paymentToProcess.concept}</p>

                                <label className="block text-xs font-bold text-blue-600 dark:text-blue-300 mb-1">Valor a Registrar ($)</label>
                                <input
                                    type="number"
                                    value={paymentAmount}
                                    onChange={e => setPaymentAmount(e.target.value)}
                                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700/50 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Método</label>
                                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-nexus-green/20">
                                    <option value="Bancolombia">Bancolombia</option>
                                    <option value="Nequi">Nequi</option>
                                    <option value="Daviplata">Daviplata</option>
                                    <option value="Efectivo">Efectivo</option>
                                    <option value="Tarjeta">Tarjeta</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Referencia / Comprobante</label>
                                <input type="text" value={transactionId} onChange={e => setTransactionId(e.target.value)} placeholder="Ej: AB1234" className="w-full p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 text-sm dark:text-white outline-none focus:ring-2 focus:ring-nexus-green/20" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Fecha</label>
                                <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 text-sm dark:text-white outline-none focus:ring-2 focus:ring-nexus-green/20" />
                            </div>

                            <button onClick={confirmPayment} disabled={loading} className="w-full bg-nexus-green text-white font-bold py-4 rounded-xl mt-4 shadow-lg hover:shadow-green-500/20 flex justify-center gap-2">
                                {loading ? 'Guardando...' : 'CONFIRMAR PAGO'}
                                <span className="material-symbols-outlined">check_circle</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* EDIT STUDENT MODAL */}
            {showEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-xl border border-gray-100 dark:border-gray-800 animate-fade-in max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold dark:text-white">Editar Estudiante</h3>
                            <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleUpdateStudent} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Nombre Completo</label>
                                <input
                                    required
                                    type="text"
                                    value={editFormData.full_name}
                                    onChange={e => setEditFormData({ ...editFormData, full_name: e.target.value })}
                                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 text-sm dark:text-white outline-none focus:ring-2 focus:ring-nexus-blue/20"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Correo Electrónico</label>
                                <input
                                    required
                                    type="email"
                                    value={editFormData.email}
                                    onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 text-sm dark:text-white outline-none focus:ring-2 focus:ring-nexus-blue/20"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Cohorte</label>
                                    <select
                                        value={editFormData.cohort}
                                        onChange={e => setEditFormData({ ...editFormData, cohort: e.target.value })}
                                        className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 text-sm dark:text-white outline-none"
                                    >
                                        <option value="Enero">Enero</option>
                                        <option value="Marzo">Marzo</option>
                                        <option value="Junio">Junio</option>
                                        <option value="Septiembre">Septiembre</option>
                                        <option value="Diciembre">Diciembre</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Teléfono</label>
                                    <input
                                        type="tel"
                                        value={editFormData.phone}
                                        onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
                                        className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 text-sm dark:text-white outline-none focus:ring-2 focus:ring-nexus-blue/20"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Tipo Doc.</label>
                                    <select
                                        value={editFormData.document_type}
                                        onChange={e => setEditFormData({ ...editFormData, document_type: e.target.value })}
                                        className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 text-sm dark:text-white outline-none"
                                    >
                                        <option value="C.C.">C.C.</option>
                                        <option value="T.I.">T.I.</option>
                                        <option value="C.E.">C.E.</option>
                                        <option value="Pasaporte">Pasaporte</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Número Doc.</label>
                                    <input
                                        required
                                        type="text"
                                        value={editFormData.document_number}
                                        onChange={e => setEditFormData({ ...editFormData, document_number: e.target.value })}
                                        className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 text-sm dark:text-white outline-none focus:ring-2 focus:ring-nexus-blue/20"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Fecha de Nacimiento</label>
                                <input
                                    type="date"
                                    value={editFormData.birth_date}
                                    onChange={e => setEditFormData({ ...editFormData, birth_date: e.target.value })}
                                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 text-sm dark:text-white outline-none focus:ring-2 focus:ring-nexus-blue/20"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Fecha Expedición Doc.</label>
                                    <input
                                        type="date"
                                        value={editFormData.document_issue_date}
                                        onChange={e => setEditFormData({ ...editFormData, document_issue_date: e.target.value })}
                                        className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 text-sm dark:text-white outline-none focus:ring-2 focus:ring-nexus-blue/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Lugar Expedición Doc.</label>
                                    <input
                                        type="text"
                                        value={editFormData.document_issue_place}
                                        onChange={e => setEditFormData({ ...editFormData, document_issue_place: e.target.value })}
                                        className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 text-sm dark:text-white outline-none focus:ring-2 focus:ring-nexus-blue/20"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-3 text-gray-500 dark:text-gray-400 font-bold text-sm hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl transition-all">Cancelar</button>
                                <button type="submit" disabled={loading} className="flex-1 py-3 bg-nexus-blue text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all">
                                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MANUAL INSTALLMENT MODAL */}
            {showManualModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-xl border border-gray-100 dark:border-gray-800 animate-fade-in">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-indigo-500">post_add</span>
                                Crear Cuota Manual
                            </h3>
                            <button onClick={() => setShowManualModal(false)} className="text-gray-400 hover:text-gray-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mb-6">Agrega recargos, saldos pendientes o cuotas con valores personalizados.</p>

                        <form onSubmit={handleCreateManualInstallment} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Concepto o Título</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Ej: Saldo pendiente"
                                    value={manualData.concept}
                                    onChange={e => setManualData({ ...manualData, concept: e.target.value })}
                                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 text-sm dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Valor ($)</label>
                                <input
                                    required
                                    type="number"
                                    placeholder="80000"
                                    min="1"
                                    value={manualData.amount}
                                    onChange={e => setManualData({ ...manualData, amount: e.target.value })}
                                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 text-sm dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Fecha de Vencimiento</label>
                                <input
                                    required
                                    type="date"
                                    value={manualData.due_date}
                                    onChange={e => setManualData({ ...manualData, due_date: e.target.value })}
                                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 text-sm dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                            </div>

                            <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl mt-4 shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all">
                                {loading ? 'Creando...' : 'Crear Cobro'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE MODAL */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 shadow-xl border border-gray-100 dark:border-gray-800 animate-fade-in text-center">
                        <div className="size-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-3xl">warning</span>
                        </div>
                        <h3 className="text-lg font-bold dark:text-white mb-2">¿Estás seguro?</h3>
                        <p className="text-sm text-gray-500 mb-6">
                            Se borrará <b>TODO el historial de pagos</b> de este estudiante. Esta acción es irreversible y dejará su saldo en $0.
                        </p>

                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 text-gray-500 font-bold text-sm hover:bg-gray-50 rounded-xl transition-colors">
                                Cancelar
                            </button>
                            <button onClick={confirmDeleteHistory} disabled={loading} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-red-700 transition-colors">
                                {loading ? 'Borrando...' : 'Sí, Borrar Todo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentManager;

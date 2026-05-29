import { supabase } from './supabaseClient';

export const reportService = {
    downloadInstitutionReport: async (cohort?: string) => {
        try {
            // 1. Fetch Students (Filtered by cohort if present)
            let studentQuery = supabase
                .from('profiles')
                .select('id, full_name, email, cohort, phone, document_type, document_number')
                .eq('role', 'student')
                .order('full_name');

            if (cohort) {
                studentQuery = studentQuery.eq('cohort', cohort);
            }

            const { data: students, error: profilesError } = await studentQuery;

            if (profilesError) throw profilesError;

            // 2. Fetch Payments
            const { data: payments, error: paymentsError } = await supabase
                .from('payments')
                .select('user_id, amount, status');

            if (paymentsError) throw paymentsError;

            // 3. Process Data
            const reportData = (students || []).map(student => {
                const studentPayments = (payments || []).filter(p => p.user_id === student.id);
                const totalAmount = studentPayments.reduce((sum, p) => sum + Number(p.amount), 0);
                const totalPaid = studentPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0);
                const balance = totalAmount - totalPaid;

                let financialStatus = 'Al Día';
                if (balance > 0) financialStatus = 'Con Deuda';
                if (totalAmount > 0 && balance === 0) financialStatus = 'Completado';
                if (totalAmount === 0) financialStatus = 'Sin Plan';

                return {
                    'Estudiante': student.full_name || 'N/A',
                    'Tipo Doc': student.document_type || 'N/A',
                    'Documento': student.document_number || 'N/A',
                    'Cohorte': student.cohort || 'N/A',
                    'Teléfono': student.phone || 'N/A',
                    'Email': student.email || 'N/A',
                    'Total Plan': totalAmount,
                    'Total Pagado': totalPaid,
                    'Saldo Pendiente': balance,
                    'Estado Financiero': financialStatus
                };
            });

            // 4. Constants for CSV
            const separator = ';';
            const headers = Object.keys(reportData[0] || {}).join(separator);
            const rows = reportData.map(row =>
                Object.values(row).map(val =>
                    typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
                ).join(separator)
            ).join('\n');

            const csvContent = "\uFEFF" + headers + '\n' + rows;
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);

            // 5. Trigger Download
            const link = document.createElement('a');
            const date = new Date().toISOString().split('T')[0];
            const fileName = cohort
                ? `Reporte_${cohort.replace(/ /g, '_')}_NexusApp_${date}.csv`
                : `Reporte_General_NexusApp_${date}.csv`;

            link.setAttribute('href', url);
            link.setAttribute('download', fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            return true;
        } catch (error) {
            console.error("Error generating report:", error);
            throw error;
        }
    }
};


import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { Payment } from '../types';
import { useAuth } from '../components/AuthProvider';
import { paymentService } from '../services/paymentService';
import PaymentReceiptCard from '../components/PaymentReceiptCard';

const Finance: React.FC = () => {
  const navigate = useNavigate();
  const { isDemo, isOverdue } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const { user, documentNumber } = useAuth();

  useEffect(() => {
    const loadData = async () => {
      await fetchMyPayments();
    };
    loadData();
  }, []);


  const handlePayClick = () => {
    if (isDemo) {
      alert('Esta función no está disponible en el Modo Demo.');
      return;
    }
    setShowInstructions(true);
  };

  const fetchMyPayments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', user.id)
      .order('due_date', { ascending: true });

    if (data) setPayments(data as Payment[]);
    setLoading(false);
  };

  const pendingBalance = payments
    .filter(p => p.status !== 'paid')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const totalPaid = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const remainingInstallments = payments.filter(p => p.status !== 'paid').length;

  // Check if next payment is overdue (used for additional UI hints if needed)
  const nextPayment = payments.find(p => p.status !== 'paid');


  const PaymentInstructionsModal = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-surface-dark w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in duration-300">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold dark:text-white">Instrucciones de Pago</h3>
            <button onClick={() => setShowInstructions(false)} className="size-10 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-primary/10 p-5 rounded-3xl border border-primary/20">
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3">Opción 1: Transferencia</p>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400 text-xs">Nequi</span>
                  <span className="text-[#0d121b] dark:text-white font-bold text-sm">319 252 1677</span>
                </div>
                <div className="h-px bg-primary/10"></div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400 text-xs">Ahorros Bancolombia</span>
                  <span className="text-[#0d121b] dark:text-white font-bold text-sm">168-651122-15</span>
                </div>
              </div>
            </div>

            <div className="bg-nexus-blue/10 p-5 rounded-3xl border border-nexus-blue/20">
              <p className="text-[10px] font-bold text-nexus-blue uppercase tracking-widest mb-3">Pasos a seguir</p>
              <ul className="space-y-3">
                <li className="flex gap-3 items-start">
                  <div className="size-5 rounded-full bg-nexus-blue flex items-center justify-center shrink-0 text-[10px] font-bold text-white">1</div>
                  <p className="text-xs text-gray-600 dark:text-gray-300">Realiza el pago por el valor de tu cuota pendiente.</p>
                </li>
                <li className="flex gap-3 items-start">
                  <div className="size-5 rounded-full bg-nexus-blue flex items-center justify-center shrink-0 text-[10px] font-bold text-white">2</div>
                  <p className="text-xs text-gray-600 dark:text-gray-300">Toma una captura o guarda el <strong className="text-nexus-blue">comprobante de pago</strong>.</p>
                </li>
                <li className="flex gap-3 items-start">
                  <div className="size-5 rounded-full bg-nexus-blue flex items-center justify-center shrink-0 text-[10px] font-bold text-white">3</div>
                  <p className="text-xs text-gray-600 dark:text-gray-300">Envía el comprobante al WhatsApp de <strong className="text-nexus-blue">Administración</strong> indicando tu nombre completo.</p>
                </li>
              </ul>
            </div>
          </div>

          <button
            onClick={() => {
              window.open('https://wa.me/573192521677', '_blank');
              setShowInstructions(false);
            }}
            className="w-full mt-8 bg-nexus-green text-white font-bold py-4 rounded-2xl shadow-lg shadow-nexus-green/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            NOTIFICAR POR WHATSAPP
            <span className="material-symbols-outlined text-[18px]">send</span>
          </button>
        </div>
      </div>
    </div>
  );

  const ReceiptModal = () => (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm overflow-y-auto p-4 flex items-start justify-center">
      <div className="relative w-full max-w-2xl my-8">
        <button
          onClick={() => setSelectedPayment(null)}
          className="absolute -top-12 right-0 text-white flex items-center gap-2 font-bold hover:text-nexus-green transition-colors"
        >
          CERRAR RECIBO
          <span className="material-symbols-outlined bg-white/10 rounded-full p-1">close</span>
        </button>
        {selectedPayment && (
          <PaymentReceiptCard
            studentName={user?.user_metadata?.full_name || "Estudiante"}
            studentId={documentNumber || "---"}
            payment={selectedPayment}
          />
        )}
      </div>
    </div>
  );

  const handleExport = () => {
    if (payments.length === 0) {
      alert('No hay datos para exportar.');
      return;
    }
    const headers = ['Concepto', 'Monto', 'Fecha', 'Estado', 'ID Transacción'];
    const csvContent = [
      headers.join(','),
      ...payments.map(p => [
        `"${p.concept}"`,
        p.amount,
        p.status === 'paid' ? p.paid_at : p.due_date,
        p.status,
        p.transaction_id || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Nexus_Estado_Cuenta_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col flex-1 pb-24 lg:pb-8 bg-background-light dark:bg-background-dark min-h-screen">
      {showInstructions && <PaymentInstructionsModal />}
      {selectedPayment && <ReceiptModal />}

      {/* Mobile Header - Hidden on Desktop */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center lg:hidden p-4 justify-between border-b border-gray-200 dark:border-gray-800">
        <button onClick={() => navigate(-1)} className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-slate-800">
          <span className="material-symbols-outlined dark:text-white">arrow_back_ios</span>
        </button>
        <h1 className="text-[#0d121b] dark:text-white text-lg font-bold leading-tight flex-1 text-center">Finanzas & Pagos</h1>
        <button onClick={handleExport} className="flex size-10 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-slate-800">
          <span className="material-symbols-outlined dark:text-white">download</span>
        </button>
      </header>

      <main className="p-4 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
        {/* Desktop Header */}
        <div className="hidden lg:flex items-center justify-between mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
          <div>
            <h1 className="text-4xl font-black dark:text-white mb-2">Finanzas & Pagos</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Gestiona tu programa académico y facturación</p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-white dark:bg-slate-900 px-6 py-3 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-all font-bold dark:text-white"
          >
            <span className="material-symbols-outlined">download</span>
            Descargar Estado
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Summary & Actions */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8 self-start">
            {/* Balance Card */}
            <div className={`p-8 rounded-[2.5rem] shadow-2xl text-white transition-all transform hover:scale-[1.02] duration-500 animate-in fade-in slide-in-from-left-4 ${isOverdue ? 'bg-gradient-to-br from-red-500 to-rose-700 shadow-red-500/20' : 'bg-gradient-to-br from-nexus-green to-emerald-700 shadow-nexus-green/20'}`}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-white/70 text-xs font-black uppercase tracking-[0.2em]">Saldo Pendiente</p>
                  <h2 className="text-5xl lg:text-6xl font-black mt-2">${pendingBalance.toLocaleString()}</h2>
                </div>
                <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md">
                  <span className="material-symbols-outlined text-4xl">account_balance_wallet</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mb-8">
                {nextPayment ? (
                  <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md rounded-full px-4 py-2">
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    <span className="text-xs font-black uppercase tracking-wider">
                      {isOverdue ? 'Vencido desde ' : 'Próximo Pago: '}
                      {new Date(nextPayment.due_date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md rounded-full px-4 py-2">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    <span className="text-xs font-black uppercase tracking-wider">¡Todo al día!</span>
                  </div>
                )}
              </div>

              <button
                onClick={handlePayClick}
                disabled={isDemo}
                className={`w-full font-black py-5 rounded-2xl active:scale-[0.98] transition-all shadow-xl text-lg ${isDemo ? 'bg-white/40 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-900 hover:shadow-2xl hover:-translate-y-1'}`}
              >
                {isDemo ? 'PAGO NO DISPONIBLE' : 'PAGAR AHORA'}
              </button>
            </div>

            {/* Quick Report */}
            <section className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:border-nexus-blue/30 transition-colors group">
                <div className="bg-nexus-blue/10 w-10 h-10 rounded-xl flex items-center justify-center text-nexus-blue mb-4 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">verified</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1 text-center lg:text-left">Total Pagado</p>
                <p className="text-2xl font-black dark:text-white text-center lg:text-left">${totalPaid.toLocaleString()}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:border-nexus-orange/30 transition-colors group">
                <div className="bg-nexus-orange/10 w-10 h-10 rounded-xl flex items-center justify-center text-nexus-orange mb-4 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">warning</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1 text-center lg:text-left">Cuotas Restantes</p>
                <p className="text-2xl font-black dark:text-white text-center lg:text-left">{remainingInstallments}</p>
              </div>
            </section>
{/* Financial Progress */}

<div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm animate-in fade-in duration-700 delay-250">

  <div className="flex items-center justify-between mb-4">
    <h3 className="font-black dark:text-white">
      Progreso Financiero
    </h3>

    <span className="text-sm font-black text-nexus-green">
      {payments.length > 0
        ? Math.round((totalPaid / (totalPaid + pendingBalance || 1)) * 100)
        : 0}%
    </span>
  </div>

  <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-3">
    <div
      className="h-full bg-gradient-to-r from-nexus-green to-emerald-500 rounded-full"
      style={{
        width: `${payments.length > 0
          ? Math.round((totalPaid / (totalPaid + pendingBalance || 1)) * 100)
          : 0}%`
      }}
    />
  </div>

  <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
    <span>
      ${totalPaid.toLocaleString()} pagados
    </span>

    <span>
      ${pendingBalance.toLocaleString()} pendientes
    </span>
  </div>

</div>

{/* Estado Inteligente */}

<div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm animate-in fade-in duration-700 delay-300">

  <h3 className="font-black dark:text-white mb-4">
    Estado Financiero
  </h3>

  {pendingBalance === 0 ? (

    <div className="flex items-center gap-3">

      <span className="material-symbols-outlined text-green-500">
        verified
      </span>

      <div>
        <p className="font-black text-green-500">
          AL DÍA
        </p>

        <p className="text-xs text-slate-500">
          No tienes cuotas pendientes
        </p>
          </div>

        </div>

      ) : isOverdue ? (

    <div className="flex items-center gap-3">

      <span className="material-symbols-outlined text-red-500">
        warning
      </span>

      <div>
        <p className="font-black text-red-500">
          EN MORA
        </p>

        <p className="text-xs text-slate-500">
          Existen pagos vencidos
        </p>
      </div>

    </div>

  ) : (

    <div className="flex items-center gap-3">

      <span className="material-symbols-outlined text-amber-500">
        schedule
      </span>

      <div>
        <p className="font-black text-amber-500">
          PAGO PENDIENTE
        </p>

        <p className="text-xs text-slate-500">
          Tienes cuotas próximas a vencer
        </p>
      </div>

    </div>

  )}
</div>

{/* Resumen General */}

<div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm animate-in fade-in duration-700 delay-350">

  <h3 className="font-black dark:text-white mb-4">
    Resumen General
  </h3>

  <div className="space-y-4">

    <div className="flex justify-between items-center">
      <span className="text-slate-500 text-sm">
        Programa
      </span>

      <span className="font-bold dark:text-white text-sm">
        Bachillerato
      </span>
    </div>

    <div className="flex justify-between items-center">
      <span className="text-slate-500 text-sm">
        Estado
      </span>

      <span className="font-bold text-green-500 text-sm">
        Activo
      </span>
    </div>

    <div className="flex justify-between items-center">
      <span className="text-slate-500 text-sm">
        Total Pagado
      </span>

      <span className="font-bold dark:text-white text-sm">
        ${totalPaid.toLocaleString()}
      </span>
    </div>

    <div className="flex justify-between items-center">
      <span className="text-slate-500 text-sm">
        Cuotas Restantes
      </span>

      <span className="font-bold dark:text-white text-sm">
        {remainingInstallments}
      </span>
    </div>

  </div>

</div>

{/* Próximos Eventos */}

<div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm animate-in fade-in duration-700 delay-400">

  <h3 className="font-black dark:text-white mb-4">
    Próximos Eventos
  </h3>

  <div className="space-y-4">

    <div className="flex items-start gap-3">

      <span className="material-symbols-outlined text-purple-500">
        school
      </span>

      <div>

        <p className="font-bold dark:text-white text-sm">
          Finalización Académica
        </p>

        <p className="text-xs text-slate-500">
          Consulta tu cronograma semanal
        </p>

      </div>

    </div>

    <div className="flex items-start gap-3">

      <span className="material-symbols-outlined text-green-500">
        workspace_premium
      </span>

      <div>

        <p className="font-bold dark:text-white text-sm">
          Revisión de Grado
        </p>

        <p className="text-xs text-slate-500">
          Sujeto al cumplimiento académico y financiero
        </p>

      </div>

    </div>

    <div className="flex items-start gap-3">

      <span className="material-symbols-outlined text-blue-500">
        payments
      </span>

      <div>

        <p className="font-bold dark:text-white text-sm">
          Estado Financiero
        </p>

        <p className="text-xs text-slate-500">
          Mantente al día para conservar el acceso completo
        </p>

      </div>

    </div>

  </div>

</div>

            {/* Methods Card */}
            <div
              onClick={handlePayClick}
              className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl flex items-center gap-5 border-2 border-dashed border-gray-200 dark:border-slate-800 cursor-pointer hover:bg-white dark:hover:bg-slate-900 hover:border-primary/50 active:scale-[0.98] transition-all group animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300"
            >
              <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm group-hover:bg-primary group-hover:text-white transition-colors">
                <span className="material-symbols-outlined">add_card</span>
              </div>
              <div>
                <p className="font-black dark:text-white">Añadir método de pago</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Automatiza tus cuotas fácilmente</p>
              </div>
              <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 ml-auto group-hover:translate-x-1 transition-transform">chevron_right</span>
            </div>
          </div>

          {/* Right Column: History */}
          <div className="lg:col-span-7 space-y-6 animate-in fade-in slide-in-from-right-4 duration-700 delay-400">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-gray-800 shadow-sm min-h-[500px]">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-[#0d121b] dark:text-white font-black text-2xl">Historial de Pagos</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Registro detallado de transacciones</p>
                </div>
                <button className="bg-primary/10 text-primary px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-colors">
                  Filtrar
                </button>
              </div>

              <div className="space-y-4">
                {loading && (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Sincronizando registros...</p>
                  </div>
                )}

                {!loading && payments.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-3xl">
                    <span className="material-symbols-outlined text-5xl text-gray-200">receipt_long</span>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-bold">No tienes pagos asignados aún.</p>
                  </div>
                )}

                {payments.map((payment, index) => (
                    <div
                      key={payment.id}
                      className="bg-slate-50/50 dark:bg-slate-800/20 p-5 rounded-3xl border border-transparent hover:border-gray-200 dark:hover:border-slate-700 flex items-center gap-5 transition-all group relative overflow-hidden"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className={`size-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:rotate-6 ${payment.status === 'paid' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'}`}>
                        <span className="material-symbols-outlined text-2xl font-bold">{payment.status === 'paid' ? 'verified' : 'pending_actions'}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-slate-800 dark:text-white truncate lg:text-base">{payment.concept}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`text-[10px] font-black uppercase tracking-wider ${payment.status === 'paid' ? 'text-slate-500 dark:text-slate-400' : (new Date(payment.due_date) < new Date() ? 'text-red-500' : 'text-amber-600')}`}>
                            {payment.status === 'paid' ?
                              `Pagado: ${new Date(payment.paid_at!).toLocaleDateString('es-CO')}` :
                              `Vence: ${new Date(payment.due_date).toLocaleDateString('es-CO')}`}
                          </span>
                          {payment.status === 'paid' && (
                            <button 
                              onClick={() => setSelectedPayment(payment)}
                              className="text-[10px] text-nexus-green font-black uppercase bg-nexus-green/5 px-2 py-0.5 rounded-md hover:bg-nexus-green hover:text-white transition-colors"
                            >
                              Ver Recibo
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end gap-1">
                        <p className="font-black dark:text-white text-lg">${Number(payment.amount).toLocaleString()}</p>
                        <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-2 py-1 rounded-lg ${payment.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' : (new Date(payment.due_date) < new Date() ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500')}`}>
                          {payment.status === 'paid' ? 'Éxito' : (new Date(payment.due_date) < new Date() ? 'Atrasado' : 'Pendiente')}
                        </span>
                      </div>
                    </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Finance;


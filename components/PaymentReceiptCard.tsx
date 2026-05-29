import React from 'react';
import { Payment } from '../types';

interface PaymentReceiptCardProps {
    studentName: string;
    studentId: string;
    payment: Payment;
}

const PaymentReceiptCard: React.FC<PaymentReceiptCardProps> = ({ studentName, studentId, payment }) => {
    const date = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
    const paidDate = payment.paid_at ? new Date(payment.paid_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';

    return (
        <div className="bg-white text-slate-900 font-sans w-full max-w-2xl mx-auto shadow-2xl overflow-hidden relative print:shadow-none p-12 border-t-8 border-nexus-green">
            {/* Download Button Overlay */}
            <div className="absolute top-4 right-4 print:hidden">
                <button
                    onClick={() => window.print()}
                    className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-nexus-green transition-colors shadow-lg"
                >
                    <span className="material-symbols-outlined text-sm">download</span>
                    DESCARGAR COMPROBANTE
                </button>
            </div>

            {/* Header */}
            <div className="flex justify-between items-start mb-12">
                <div className="flex items-center gap-4">
                    <img src="assets/logo.png.png" alt="Logo" className="w-16 h-16 object-contain" />
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Fundación Nexus</h1>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Comprobante de Pago Electrónico</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="bg-slate-900 text-white px-4 py-2 rounded-xl inline-block mb-2">
                        <p className="text-[10px] font-bold uppercase opacity-60">N° de Recibo</p>
                        <p className="text-lg font-black">{payment.id.split('-')[0].toUpperCase()}</p>
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">{date}</p>
                </div>
            </div>

            {/* Student & Payment Info */}
            <div className="grid grid-cols-2 gap-12 mb-12">
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-nexus-green uppercase tracking-widest border-b border-gray-100 pb-2">Información del Estudiante</h3>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Nombre Completo</p>
                        <p className="font-black text-slate-800 uppercase">{studentName}</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Documento de Identidad</p>
                        <p className="font-black text-slate-800">{studentId}</p>
                    </div>
                </div>
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-nexus-green uppercase tracking-widest border-b border-gray-100 pb-2">Detalles del Pago</h3>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Fecha de Transacción</p>
                        <p className="font-black text-slate-800">{paidDate}</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">ID de Transacción</p>
                        <p className="font-black text-nexus-blue uppercase">{payment.transaction_id || 'PROCESADO'}</p>
                    </div>
                </div>
            </div>

            {/* Item Table */}
            <div className="mb-12">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">Descripción del Concepto</th>
                            <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 text-right">Monto Pagado</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="py-6 px-6 border-b border-gray-50">
                                <p className="font-black text-slate-800 uppercase">{payment.concept}</p>
                                <p className="text-[10px] text-gray-400 mt-1 font-medium italic">Pago realizado bajo el programa de formación académica Nexus Academy.</p>
                            </td>
                            <td className="py-6 px-6 border-b border-gray-50 text-right">
                                <p className="text-xl font-black text-slate-900">${Number(payment.amount).toLocaleString()}</p>
                            </td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr>
                            <td className="py-6 px-6 text-right">
                                <p className="text-[10px] font-black uppercase text-gray-400">Total Recibido</p>
                            </td>
                            <td className="py-6 px-6 text-right bg-nexus-green/5">
                                <p className="text-3xl font-black text-nexus-green">${Number(payment.amount).toLocaleString()}</p>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Note & Security */}
            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 mb-12 flex gap-4 items-center">
                <span className="material-symbols-outlined text-4xl text-nexus-green opacity-40">verified_user</span>
                <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
                    Este documento es un comprobante oficial de pago generado por el sistema administrativo de <strong>Fundación Nexus</strong>. La transacción ha sido verificada y confirmada. Para cualquier aclaración, por favor contacte a soporte administrativo con su ID de transacción.
                </p>
            </div>

            {/* Signatures & Seal */}
            <div className="flex justify-between items-end">
                <div className="w-48 text-center">
                    <img src="assets/diana-signature.png" alt="Firma Autorizada" className="h-10 mx-auto mb-2 object-contain" />
                    <div className="border-t border-slate-300 pt-2">
                        <p className="text-xs font-black uppercase text-slate-800">Diana Rocha</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Tesorería General</p>
                    </div>
                </div>
                <div className="relative">
                    <div className="w-24 h-24 rounded-full border-4 border-nexus-green/20 flex items-center justify-center rotate-[-15deg]">
                        <div className="w-20 h-20 rounded-full border-2 border-nexus-green/40 flex items-center justify-center">
                            <span className="text-[8px] font-black text-nexus-green text-center uppercase tracking-tighter">NEXUS<br/>PAID<br/>2026</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-8 border-t border-gray-100 text-center">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.3em]">www.nexusacademy.edu.co • Bogotá, Colombia</p>
            </div>
        </div>
    );
};

export default PaymentReceiptCard;

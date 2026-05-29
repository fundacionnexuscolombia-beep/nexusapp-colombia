import React, { useState } from 'react';

interface LegalContractModalProps {
    isOpen: boolean;
    onClose: () => void;
    studentName?: string;
    studentId?: string;
    isMandatory?: boolean;
    onAccept?: () => Promise<void>;
}

const LegalContractModal: React.FC<LegalContractModalProps> = ({
    isOpen,
    onClose,
    studentName = "[NOMBRE DEL ESTUDIANTE]",
    studentId = "[ID]",
    isMandatory = false,
    onAccept
}) => {
    const [accepted, setAccepted] = useState(false);
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleAccept = async () => {
        if (!onAccept) return;
        setLoading(true);
        try {
            await onAccept();
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-surface-dark w-full max-w-2xl max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-white/10 flex items-center justify-between bg-gray-50 dark:bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-nexus-blue/10 flex items-center justify-center text-nexus-blue">
                            <span className="material-symbols-outlined">gavel</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Contrato de Servicios</h2>
                            <p className="text-xs text-gray-500 dark:text-slate-400">Términos y Condiciones Legales</p>
                        </div>
                    </div>

                    {!isMandatory && (
                        <button
                            onClick={onClose}
                            className="size-8 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center hover:bg-nexus-red hover:text-white transition-colors"
                        >
                            <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                    )}
                </div>


                {/* Content (Scrollable) */}
                <div className="p-8 overflow-y-auto space-y-6 text-sm text-gray-600 dark:text-slate-300 font-serif leading-relaxed text-justify">

                    <div className="space-y-6">
                        <p className="font-bold text-slate-900 dark:text-white text-center mb-6 text-base tracking-tight">
                            CONTRATO DE PRESTACIÓN DE SERVICIOS EDUCATIVOS
                        </p>

                        <p>
                            Entre los suscritos a saber: <strong>FUNDACIÓN NEXUS COLOMBIA</strong> identificada con NIT <strong>901.888.996-1</strong>,
                            con domicilio en <strong>BOGOTÁ D.C</strong>, quien en adelante se denominará <strong>LA INSTITUCIÓN</strong> y
                            <strong> EL ESTUDIANTE</strong>, identificado como <strong>{studentName}</strong> con ID <strong>{studentId}</strong>,
                            o su acudiente legal cuando aplique, acuerdan celebrar el presente Contrato de Prestación de Servicios Educativos, el cual se regirá por las siguientes cláusulas:
                        </p>

                        <div className="space-y-4">
                            <h3 className="font-sans font-bold text-slate-900 dark:text-white uppercase text-xs tracking-widest border-b border-gray-100 dark:border-white/5 pb-1">CLÁUSULA PRIMERA: OBJETO</h3>
                            <p>
                                <strong>LA INSTITUCIÓN</strong> se compromete a prestar los servicios educativos para el programa de
                                <strong> Preparación académica para validación del bachillerato</strong>, facilitando el acceso a la plataforma virtual NexusApp, materiales de estudio y tutoría académica según el nivel correspondiente.
                            </p>

                            <h3 className="font-sans font-bold text-slate-900 dark:text-white uppercase text-xs tracking-widest border-b border-gray-100 dark:border-white/5 pb-1">CLÁUSULA SEGUNDA: COMPROMISOS DEL ESTUDIANTE</h3>
                            <p>
                                <strong>EL ESTUDIANTE</strong> se obliga a: 1) Cumplir con los horarios y actividades académicas programadas. 2) Mantener un trato respetuoso y ético hacia docentes, directivos y compañeros. 3) Realizar los pagos en las fechas acordadas. 4) Contar con los medios tecnológicos mínimos requeridos para la formación virtual.
                            </p>

                            <h3 className="font-sans font-bold text-slate-900 dark:text-white uppercase text-xs tracking-widest border-b border-gray-100 dark:border-white/5 pb-1">CLÁUSULA TERCERA: CONDICIONES ECONÓMICAS</h3>
                            <p>
                                El valor total del servicio es de <strong>$900.000 M/CTE</strong>. EL ESTUDIANTE se compromete a cancelar dicho monto de acuerdo con el plan de pago seleccionado. El retraso en las cuotas generará la suspensión temporal del acceso a los módulos académicos, sin que esto lo exonere de sus obligaciones financieras.
                            </p>

                            <h3 className="font-sans font-bold text-slate-900 dark:text-white uppercase text-xs tracking-widest border-b border-gray-100 dark:border-white/5 pb-1">CLÁUSULA CUARTA: PROPIEDAD INTELECTUAL</h3>
                            <p>
                                Todos los contenidos, videos, guías y software proporcionados son propiedad exclusiva de <strong>FUNDACIÓN NEXUS COLOMBIA</strong>. Queda terminantemente prohibida su reproducción, distribución o uso comercial externo sin autorización expresa.
                            </p>

                            <h3 className="font-sans font-bold text-slate-900 dark:text-white uppercase text-xs tracking-widest border-b border-gray-100 dark:border-white/5 pb-1">CLÁUSULA QUINTA: TRATAMIENTO DE DATOS</h3>
                            <p>
                                De acuerdo con la <strong>Ley 1581 de 2012</strong>, EL ESTUDIANTE autoriza de manera informada a LA INSTITUCIÓN al tratamiento de sus datos personales para fines académicos, administrativos y de comunicación institucional.
                            </p>

                            <h3 className="font-sans font-bold text-slate-900 dark:text-white uppercase text-xs tracking-widest border-b border-gray-100 dark:border-white/5 pb-1">CLÁUSULA SEXTA: COMPROMISO DIGITAL</h3>
                            <p className="bg-nexus-blue/5 p-4 rounded-xl border border-nexus-blue/10 text-slate-800 dark:text-slate-200 font-sans italic">
                                "La aceptación de este contrato dentro de NexusApp constituye una firma electrónica válida y vinculante, con plena validez jurídica según la Ley 527 de 1999."
                            </p>

                            <h3 className="font-sans font-bold text-slate-900 dark:text-white uppercase text-xs tracking-widest border-b border-gray-100 dark:border-white/5 pb-1">CLÁUSULA SÉPTIMA: TERMINACIÓN</h3>
                            <p>
                                El contrato podrá terminarse por cumplimiento del ciclo académico, mutuo acuerdo, o por incumplimiento grave de las obligaciones establecidas en el reglamento institucional por parte de EL ESTUDIANTE.
                            </p>
                        </div>
                    </div>
                </div>


                <div className="p-4 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex flex-col items-end gap-4">

                    {isMandatory && (
                        <div className="w-full flex items-center gap-3 bg-nexus-blue/5 p-4 rounded-xl border border-nexus-blue/10">
                            <input
                                type="checkbox"
                                id="accept_terms"
                                checked={accepted}
                                onChange={(e) => setAccepted(e.target.checked)}
                                className="w-5 h-5 rounded-md border-gray-300 text-nexus-blue focus:ring-nexus-blue"
                            />
                            <label htmlFor="accept_terms" className="text-xs text-slate-700 dark:text-slate-300 font-medium select-none cursor-pointer">
                                He leído, comprendido y acepto la totalidad del presente contrato de prestación de servicios educativos.
                            </label>
                        </div>
                    )}

                    {!isMandatory ? (
                        <button
                            onClick={onClose}
                            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold px-6 py-3 rounded-xl shadow-lg active:scale-95 transition-transform text-xs uppercase tracking-wider"
                        >
                            Entendido y Aceptado
                        </button>
                    ) : (
                        <button
                            onClick={handleAccept}
                            disabled={!accepted || loading}
                            className="w-full bg-nexus-blue disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold px-6 py-4 rounded-xl shadow-lg active:scale-95 transition-transform text-sm uppercase tracking-wider flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                            ) : (
                                <>
                                    <span>Aceptar y Continuar</span>
                                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div >
        </div >
    );
};

export default LegalContractModal;

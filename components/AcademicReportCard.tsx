import React from 'react';
import { CombinedGrade } from '../services/gradeService';

interface AcademicReportCardProps {
    studentName: string;
    studentId: string;
    cohort: string;
    grades: CombinedGrade[];
}

const AcademicReportCard: React.FC<AcademicReportCardProps> = ({ studentName, studentId, cohort, grades }) => {

    const getPerformanceLevel = (score: number) => {
        if (score >= 4.6) return { label: 'SUPERIOR', color: 'text-nexus-green' };
        if (score >= 4.0) return { label: 'ALTO', color: 'text-nexus-blue' };
        if (score >= 3.0) return { label: 'BÁSICO', color: 'text-nexus-orange' };
        return { label: 'BAJO', color: 'text-nexus-red' };
    };

    const getAchievementText = (score: number, subject: string) => {
        const sub = subject.toLowerCase();
        
        if (score >= 4.6) {
            if (sub.includes('matemat')) return "Domina con precisión el razonamiento lógico-matemático y la resolución de problemas complejos, aplicando modelos en contextos reales de forma excepcional.";
            if (sub.includes('español')) return "Presenta una competencia comunicativa superior, con excelente capacidad de análisis crítico, producción textual y comprensión de tipologías literarias.";
            if (sub.includes('biolog') || sub.includes('quimic') || sub.includes('fisic')) return "Demuestra un alto rigor científico en el análisis de fenómenos naturales, integrando conceptos teóricos con la observación y experimentación de manera sobresaliente.";
            if (sub.includes('sociales') || sub.includes('filosof')) return "Evidencia una profunda comprensión de las dinámicas sociales y procesos históricos, analizando críticamente el impacto de estos en la realidad actual.";
            if (sub.includes('psicolog')) return "Demuestra una alta capacidad de introspección y análisis del comportamiento humano, aplicando principios psicológicos con gran madurez y pensamiento crítico.";
            return "Demuestra un dominio excepcional de las competencias de este módulo, aplicando los conceptos de manera crítica y creativa en diferentes contextos.";
        }
        if (score >= 4.0) {
            if (sub.includes('matemat')) return "Alcanza un buen nivel en el manejo de algoritmos y procesos lógicos, resolviendo situaciones problemáticas de manera efectiva y coherente.";
            if (sub.includes('español')) return "Desarrolla habilidades de lectura y escritura adecuadas, logrando interpretar y producir textos con coherencia, cohesión y buena ortografía.";
            return "Alcanza satisfactoriamente los logros propuestos para este módulo, demostrando un buen nivel de comprensión y apropiación de las temáticas tratadas.";
        }
        if (score >= 3.0) return "Cumple con los requisitos mínimos necesarios para la aprobación del módulo, aunque se recomienda reforzar algunos conceptos clave para consolidar el aprendizaje.";
        return "Presenta dificultades persistentes para alcanzar los objetivos propuestos. Requiere fortalecer sus bases teóricas y cumplir con el plan de mejoramiento académico.";
    };

    const calculateGPA = () => {
        if (grades.length === 0) return 0;
        const sum = grades.reduce((acc, g) => acc + g.score, 0);
        return (sum / grades.length).toFixed(1);
    };

    const period = "2026 - PERIODO 1";
    const date = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className="bg-white text-slate-900 font-serif w-full max-w-2xl mx-auto shadow-2xl overflow-hidden relative print:shadow-none">
            {/* Download Button Overlay */}
            <div className="absolute top-4 right-4 print:hidden">
                <button
                    onClick={() => window.print()}
                    className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-sans font-bold flex items-center gap-2 hover:bg-nexus-purple transition-colors shadow-lg"
                >
                    <span className="material-symbols-outlined text-sm">download</span>
                    DESCARGAR PDF
                </button>
            </div>

            <div className="p-8 border-b-4 border-nexus-purple/20">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <img src="assets/logo.png.png" alt="Logo" className="w-12 h-12 object-contain drop-shadow-sm" />
                        <div>
                            <h1 className="text-xl font-bold uppercase tracking-widest text-slate-900 font-sans">Fundación Nexus</h1>
                            <p className="text-[10px] text-gray-500 font-sans uppercase tracking-widest">Institución Educativa Digital</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-lg font-bold uppercase text-gray-400 font-sans">Boletín Informativo</h2>
                        <p className="text-xs font-bold text-nexus-purple">{period}</p>
                    </div>
                </div>

                {/* Student Info */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 grid grid-cols-2 gap-y-2 gap-x-8 text-xs font-sans mb-6">
                    <div>
                        <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider mb-1">Estudiante</p>
                        <p className="font-bold text-sm border-b border-gray-200 pb-1 block w-full">{studentName}</p>
                    </div>
                    <div>
                        <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider mb-1">Identificación</p>
                        <p className="font-bold text-sm border-b border-gray-200 pb-1 block w-full">{studentId}</p>
                    </div>
                </div>

                {/* Grades Table */}
                <div className="mb-6">
                    <table className="w-full text-left border-collapse font-sans text-xs">
                        <thead>
                            <tr className="border-b-2 border-slate-900">
                                <th className="py-2 uppercase text-[10px] font-black tracking-wider w-1/4">Asignatura / Módulo</th>
                                <th className="py-2 uppercase text-[10px] font-black tracking-wider text-center w-12">Nota</th>
                                <th className="py-2 uppercase text-[10px] font-black tracking-wider text-center w-20">Nivel</th>
                                <th className="py-2 uppercase text-[10px] font-black tracking-wider pl-4">Logros Obtenidos</th>
                            </tr>
                        </thead>
                        <tbody>
                            {grades.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-8 text-center text-gray-400 italic">No hay calificaciones registradas para este periodo.</td>
                                </tr>
                            ) : (
                                grades.map((grade, i) => {
                                    const performance = getPerformanceLevel(grade.score);
                                    return (
                                        <tr key={i} className="border-b border-gray-100">
                                            <td className="py-2 font-medium text-[11px] pl-2 pr-2">
                                                {grade.topic_name}
                                                {grade.type === 'manual' && <span className="text-[9px] text-gray-400 ml-2 italic block mt-0.5">(Externo)</span>}
                                            </td>
                                            <td className="py-2 text-center font-bold text-sm align-top pt-3">{grade.score.toFixed(1)}</td>
                                            <td className={`py-2 text-center font-bold ${performance.color} text-[9px] align-top pt-4`}>{performance.label}</td>
                                            <td className="py-2 text-[10px] text-gray-500 pl-4 pr-2 leading-tight align-top italic">
                                                "{getAchievementText(grade.score, grade.topic_name)}"
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                        <tfoot>
                            <tr className="bg-gray-50 border-t-2 border-slate-900">
                                <td className="py-2 pl-4 font-bold uppercase text-[10px]">Promedio General</td>
                                <td className="py-2 text-center font-bold text-sm">{calculateGPA()}</td>
                                <td className="py-2 text-center text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                                    {getPerformanceLevel(Number(calculateGPA())).label}
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Observations */}
                <div className="mb-8 font-sans">
                    <h3 className="text-[10px] font-bold uppercase border-b border-gray-200 mb-2 pb-1">Observaciones Generales</h3>
                    <p className="text-xs text-gray-600 leading-relaxed italic">
                        {(() => {
                            const gpa = Number(calculateGPA());
                            if (gpa >= 4.5) return "El estudiante mantiene un rendimiento académico sobresaliente. Su dedicación y disciplina son evidentes que reflejan un alto nivel de compromiso con su proceso formativo.";
                            if (gpa >= 4.0) return "El estudiante demuestra un buen desempeño académico. Cumple satisfactoriamente con los objetivos propuestos.";
                            if (gpa >= 3.0) return "El estudiante ha logrado los objetivos básicos, pero se observan inconsistencias en su rendimiento. Se recomienda reforzar los hábitos de estudio autónomo.";
                            return "El estudiante presenta un bajo rendimiento académico que compromete la aprobación del ciclo. Es urgente implementar un plan de mejoramiento, aumentar la dedicación horaria y revisar las estrategias de estudio para superar las dificultades actuales.";
                        })()}
                    </p>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-12 mt-12 font-sans">
                    <div className="text-center">
                        <div className="h-12 flex items-end justify-center">
                            <img src="assets/diana-signature.png"
                                className="h-10 object-contain" alt="Firma Diana Rocha" />
                        </div>
                        <div className="border-t border-slate-300 pt-1">
                            <p className="font-bold text-xs">Diana Rocha</p>
                            <p className="text-[9px] text-gray-400 uppercase">Directora Académica</p>
                        </div>
                    </div>
                    <div className="text-center relative">
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-20 rotate-[-15deg] pointer-events-none">
                            <div className="w-20 h-20 rounded-full border-4 border-nexus-purple flex items-center justify-center">
                                <span className="font-black text-nexus-purple text-[10px] text-center uppercase">Nexus Academy<br />Oficial<br />2026</span>
                            </div>
                        </div>

                        <div className="h-12"></div>
                        <div className="border-t border-slate-300 pt-1">
                            <p className="font-bold text-xs">Secretaría General</p>
                            <p className="text-[9px] text-gray-400 uppercase">Certificación Digital</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-12 pt-4 border-t border-gray-100 text-[10px] text-gray-400 text-center font-sans">
                    <p>Generado el {date} • Documento oficial de Nexus Academy • ID Estudiante: {studentId}</p>
                    <p className="mt-1">La autenticidad de este documento puede ser verificada en <strong>nexus.edu/verify</strong></p>
                </div>
            </div>
        </div>
    );
};

export default AcademicReportCard;

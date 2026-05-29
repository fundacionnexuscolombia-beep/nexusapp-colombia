
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

interface StudentProfile {
    id: string;
    full_name: string;
    cohort: string;
    access_enabled: boolean;
    role: string;
    terms_accepted: boolean;
    academic_status: string;
}

const StudentAccessManager: React.FC = () => {
    const [students, setStudents] = useState<StudentProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const fetchStudents = async () => {
        setLoading(true);

        const { data, error } = await supabase
            .from('profiles')
            .select(`
                id,
                full_name,
                cohort,
                access_enabled,
                role,
                terms_accepted,
                academic_status
            `)
            .in('role', ['student'])
            .neq('email', 'fundacionnexuscolombia@gmail.com')
            .neq('email', 'ing.davidguzman@hotmail.com')
            .order('full_name', { ascending: true });

        if (error) {
            console.error('Error fetching students:', error);
        } else {
            setStudents(data || []);
        }

        setLoading(false);
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    const toggleAccess = async (
        studentId: string,
        currentStatus: boolean
    ) => {
        setUpdatingId(studentId);

        const { error } = await supabase
            .from('profiles')
            .update({
                access_enabled: !currentStatus
            })
            .eq('id', studentId);

        if (error) {
            alert('Error al actualizar acceso: ' + error.message);
        } else {
            setStudents(prev =>
                prev.map(student =>
                    student.id === studentId
                        ? {
                              ...student,
                              access_enabled: !currentStatus
                          }
                        : student
                )
            );
        }

        setUpdatingId(null);
    };

    const resetTerms = async (studentId: string) => {
        setUpdatingId(studentId);

        const { error } = await supabase
            .from('profiles')
            .update({
                terms_accepted: false,
                terms_accepted_at: null
            })
            .eq('id', studentId);

        if (error) {
            alert('Error al resetear políticas: ' + error.message);
        } else {
            setStudents(prev =>
                prev.map(student =>
                    student.id === studentId
                        ? {
                              ...student,
                              terms_accepted: false
                          }
                        : student
                )
            );

            alert('Políticas reseteadas correctamente.');
        }

        setUpdatingId(null);
    };

    const updateAcademicStatus = async (
        studentId: string,
        newStatus: string
    ) => {
        setUpdatingId(studentId);

        const { error } = await supabase
            .from('profiles')
            .update({
                academic_status: newStatus
            })
            .eq('id', studentId);

        if (error) {
            alert('Error actualizando estado académico: ' + error.message);
        } else {
            setStudents(prev =>
                prev.map(student =>
                    student.id === studentId
                        ? {
                              ...student,
                              academic_status: newStatus
                          }
                        : student
                )
            );
        }

        setUpdatingId(null);
    };

    const filteredStudents = students.filter(student =>
        student.full_name
            ?.toLowerCase()
            .includes(search.toLowerCase()) ||
        student.cohort
            ?.toLowerCase()
            .includes(search.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    search
                </span>

                <input
                    type="text"
                    placeholder="Buscar por nombre o cohorte..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl pl-10 pr-4 py-3 text-xs focus:ring-2 focus:ring-primary outline-none dark:text-white"
                />
            </div>

            <div className="bg-white dark:bg-surface-dark rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden max-h-[500px] overflow-y-auto custom-scrollbar">
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="size-6 border-2 border-primary border-t-transparent animate-spin rounded-full mx-auto mb-2"></div>

                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            Cargando estudiantes...
                        </p>
                    </div>
                ) : filteredStudents.length > 0 ? (
                    <div className="divide-y divide-gray-50 dark:divide-white/5">
                        {filteredStudents.map(student => (
                            <div
                                key={student.id}
                                className="p-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-white/2 transition-colors"
                            >
                                <div className="min-w-0 flex-1 pr-4">
                                    <h4 className="font-bold text-xs dark:text-white truncate uppercase tracking-tight">
                                        {student.full_name || 'Sin Nombre'}
                                    </h4>

                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        <span className="text-[8px] font-black text-primary uppercase tracking-widest">
                                            {student.cohort || 'Sin Cohorte'}
                                        </span>

                                        <div className="size-1 rounded-full bg-gray-300 dark:bg-white/20" />

                                        <span
                                            className={`text-[8px] font-black uppercase tracking-widest ${
                                                student.access_enabled
                                                    ? 'text-nexus-green'
                                                    : 'text-nexus-red'
                                            }`}
                                        >
                                            {student.access_enabled
                                                ? 'Acceso Habilitado'
                                                : 'Acceso Restringido'}
                                        </span>
                                    </div>

                                    <div className="mt-3">
                                        <select
                                            value={
                                                student.academic_status ||
                                                'active'
                                            }
                                            onChange={e =>
                                                updateAcademicStatus(
                                                    student.id,
                                                    e.target.value
                                                )
                                            }
                                            className="bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-[9px] font-black uppercase tracking-widest dark:text-white"
                                        >
                                            <option value="active">
                                                Activo
                                            </option>

                                            <option value="graduated">
                                                Graduado
                                            </option>

                                            <option value="suspended">
                                                Suspendido
                                            </option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-3">
                                    <button
                                        onClick={() =>
                                            resetTerms(student.id)
                                        }
                                        disabled={
                                            updatingId === student.id ||
                                            !student.terms_accepted
                                        }
                                        className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-colors ${
                                            student.terms_accepted
                                                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                                : 'bg-gray-100/50 text-gray-400 cursor-not-allowed'
                                        }`}
                                    >
                                        RESET POLÍTICAS
                                    </button>

                                    <button
                                        onClick={() =>
                                            toggleAccess(
                                                student.id,
                                                student.access_enabled
                                            )
                                        }
                                        disabled={
                                            updatingId === student.id
                                        }
                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                            student.access_enabled
                                                ? 'bg-nexus-green'
                                                : 'bg-gray-300 dark:bg-white/10'
                                        } ${
                                            updatingId === student.id
                                                ? 'opacity-50 cursor-wait'
                                                : ''
                                        }`}
                                    >
                                        <span className="sr-only">
                                            Toggle Access
                                        </span>

                                        <span
                                            aria-hidden="true"
                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                student.access_enabled
                                                    ? 'translate-x-5'
                                                    : 'translate-x-0'
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center">
                        <span className="material-symbols-outlined text-gray-300 dark:text-white/10 text-4xl mb-2">
                            person_search
                        </span>

                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            No se encontraron estudiantes
                        </p>
                    </div>
                )}
            </div>

            <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                <p className="text-[9px] text-primary/70 font-bold leading-relaxed flex gap-2">
                    <span className="material-symbols-outlined text-xs">
                        info
                    </span>

                    Aquí puedes habilitar acceso, graduar o suspender
                    estudiantes en tiempo real desde el panel administrativo.
                </p>
            </div>
        </div>
    );
};

export default StudentAccessManager;

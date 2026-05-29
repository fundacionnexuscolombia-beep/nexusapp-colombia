import React, { useState, useEffect } from 'react';
import { gradeService, CombinedGrade } from '../services/gradeService';
import { fetchCoursesFromSheet, Topic } from '../services/sheetService';

const GradeManager: React.FC = () => {

    // Search State
    const [search, setSearch] = useState('');
    const [students, setStudents] = useState<any[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

    // Data State
    const [curriculum, setCurriculum] = useState<Record<string, Topic[]>>({});
    const [studentGrades, setStudentGrades] = useState<CombinedGrade[]>([]);
    const [loadingData, setLoadingData] = useState(false);

    // UI State
    const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

    const [gradeForm, setGradeForm] = useState<{
        topicId: string;
        topicName: string;
    } | null>(null);

    // Form State
    const [score, setScore] = useState('');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Filter Tree State
    const [filterMateria, setFilterMateria] = useState('');

    useEffect(() => {
        loadCurriculum();
    }, []);

    const loadCurriculum = async () => {
        const data = await fetchCoursesFromSheet();
        setCurriculum(data);
    };

    const handleSearch = async (e: React.FormEvent) => {

        e.preventDefault();

        if (!search) return;

        const res = await gradeService.searchStudents(search);

        setStudents(res || []);
        setSelectedStudent(null);
    };

    const handleSelectStudent = async (student: any) => {

        setSelectedStudent(student);
        setLoadingData(true);

        try {

            const data = await gradeService.getStudentReport(student.id);

            setStudentGrades(data);

        } catch (e) {

            console.error(e);

        } finally {

            setLoadingData(false);
        }
    };

    const getGradesForTopic = (topicId: string) => {

        return studentGrades.filter(
            g => g.topic_id === topicId || g.topic_name === topicId
        );
    };

    const handleOpenGradeForm = (topic: Topic) => {

        setGradeForm({
            topicId: topic.id,
            topicName: topic.title
        });

        setScore('');
        setNote('');
    };

    const handleSubmitGrade = async (e: React.FormEvent) => {

        e.preventDefault();

        if (!selectedStudent || !gradeForm) return;

        setSubmitting(true);

        try {

            await gradeService.addManualGrade(
                selectedStudent.id,
                gradeForm.topicId,
                gradeForm.topicName,
                parseFloat(score),
                note || 'Nota manual'
            );

            const data = await gradeService.getStudentReport(
                selectedStudent.id
            );

            setStudentGrades(data);

            setGradeForm(null);

        } catch (error) {

            alert('Error al guardar la nota');

            console.error(error);

        } finally {

            setSubmitting(false);
        }
    };

    const getSubjectAverage = (subject: string) => {

        const topics = curriculum[subject] || [];

        const topicIds = new Set(
            topics.map(t => t.id)
        );

        const relevantGrades = studentGrades.filter(g =>
            topicIds.has(g.topic_id)
        );

        if (relevantGrades.length === 0) return null;

        const sum = relevantGrades.reduce(
            (acc, g) => acc + g.score,
            0
        );

        return (sum / relevantGrades.length).toFixed(1);
    };

    const getOverallAverage = () => {

        if (studentGrades.length === 0) return null;

        const sum = studentGrades.reduce(
            (acc, g) => acc + g.score,
            0
        );

        return (sum / studentGrades.length).toFixed(1);
    };

    return (

        <div className="bg-white dark:bg-surface-dark p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm">

            <div className="mb-6 space-y-4">

                <div className="flex justify-between items-start">

                    <div>
                        <h2 className="text-xl font-bold dark:text-white">
                            Gestión Académica
                        </h2>

                        <p className="text-xs text-gray-400">
                            Administra notas, trabajos y quices por materia.
                        </p>
                    </div>

                </div>

                {!selectedStudent ? (

                    <div className="space-y-4">

                        <form
                            onSubmit={handleSearch}
                            className="flex gap-2"
                        >

                            <input
                                type="text"
                                placeholder="Buscar estudiante por nombre..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="flex-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none dark:text-white"
                            />

                            <button
                                type="submit"
                                className="bg-primary text-white px-6 rounded-xl font-bold text-sm"
                            >
                                Buscar
                            </button>

                        </form>

                        {students.length > 0 && (

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">

                                {students.map(s => (

                                    <button
                                        key={s.id}
                                        onClick={() => handleSelectStudent(s)}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-nexus-blue/10 border border-gray-100 dark:border-white/5 transition-colors text-left group"
                                    >

                                        <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm group-hover:bg-primary group-hover:text-white transition-colors">
                                            {s.full_name.charAt(0)}
                                        </div>

                                        <div>

                                            <p className="font-bold text-sm dark:text-white">
                                                {s.full_name}
                                            </p>

                                            <p className="text-[10px] text-gray-400">
                                                {s.email}
                                            </p>

                                        </div>

                                    </button>

                                ))}

                            </div>

                        )}

                    </div>

                ) : (

                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

                        <div className="flex items-center justify-between bg-nexus-blue/10 p-4 rounded-xl border border-nexus-blue/20 mb-6">

                            <div className="flex items-center gap-3">

                                <div className="size-12 rounded-full bg-nexus-blue text-white flex items-center justify-center font-bold text-lg shadow-md">
                                    {selectedStudent.full_name.charAt(0)}
                                </div>

                                <div>

                                    <h3 className="font-bold text-lg text-nexus-blue dark:text-blue-300">
                                        {selectedStudent.full_name}
                                    </h3>

                                    <div className="flex flex-wrap gap-2 mt-1">

                                        <span className="text-xs bg-white/50 px-2 py-0.5 rounded text-nexus-blue font-medium">
                                            {studentGrades.length} Notas Registradas
                                        </span>

                                        {getOverallAverage() && (

                                            <span
                                                className={`text-xs px-2 py-0.5 rounded font-bold border ${
                                                    parseFloat(getOverallAverage()!) >= 3
                                                        ? 'bg-green-100 text-green-700 border-green-200'
                                                        : 'bg-red-100 text-red-700 border-red-200'
                                                }`}
                                            >

                                                Promedio General: {getOverallAverage()}

                                            </span>

                                        )}

                                    </div>

                                </div>

                            </div>

                            <button
                                onClick={() => setSelectedStudent(null)}
                                className="text-xs font-bold text-nexus-blue hover:underline"
                            >
                                CAMBIAR ALUMNO
                            </button>

                        </div>

                    </div>

                )}

            </div>

        </div>
    );
};

export default GradeManager;

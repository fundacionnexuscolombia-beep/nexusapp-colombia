import React, { useState, useEffect } from 'react';
import { QuizQuestion, quizService } from '../services/quizService';
import { progressService } from '../services/progressService';

interface QuizRunnerProps {
    topicId: string;
    topicTitle: string;
    courseId: string;
    type?: 'quiz' | 'workshop';
    onClose: () => void;
    onComplete: (score: number) => void;
}

const QuizRunner: React.FC<QuizRunnerProps> = ({ topicId, topicTitle, courseId, type = 'quiz', onClose, onComplete }) => {
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [finished, setFinished] = useState(false);
    const [score, setScore] = useState(0);
    const [attemptsUsed, setAttemptsUsed] = useState(0);
    const [timeLeft, setTimeLeft] = useState(() => {
        if (topicId.startsWith('simulacro')) return 7200; // 120 minutes for ICFES
        return type === 'workshop' ? 1200 : 600;
    });
    const [showFeedback, setShowFeedback] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Timer logic
    useEffect(() => {
        if (loading || finished || showFeedback) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    finishQuiz();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [loading, finished, showFeedback]);

    // Load questions
    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                const used = await quizService.getAttemptsCount(topicId, type as 'quiz' | 'workshop');
                setAttemptsUsed(used);
                const limit = topicId.startsWith('simulacro') ? 100 : 10;
                const q = await quizService.getQuizQuestions(topicId, type as 'quiz' | 'workshop', limit);

                if (!q || q.length === 0) {
                    throw new Error("No hay preguntas disponibles");
                }

                const processed = q.map(item => {
                    let opts: any = item.options;
                    if (typeof opts === 'string') {
                        try { opts = JSON.parse(opts); } catch (e) { opts = []; }
                    }
                    const correctText = opts[item.correct_index];
                    const shuffledOpts = [...opts].sort(() => Math.random() - 0.5);
                    let newCorrectIndex = shuffledOpts.indexOf(correctText);
                    return { ...item, options: shuffledOpts, correct_index: newCorrectIndex === -1 ? 0 : newCorrectIndex };
                });

                setQuestions(processed);
            } catch (err: any) {
                setError(err.message || "Error al cargar preguntas");
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [topicId, type]);

    const handleAnswer = (optionIndex: number) => {
        if (showFeedback) return;
        const newAnswers = [...answers];
        newAnswers[currentQuestionIndex] = optionIndex;
        setAnswers(newAnswers);
        setShowFeedback(true);
    };

    const handleNext = () => {
        setShowFeedback(false);
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            finishQuiz();
        }
    };

    const finishQuiz = async () => {
        let correctCount = 0;
        questions.forEach((q, i) => {
            if (answers[i] === q.correct_index) correctCount++;
        });

        const finalScore = (correctCount / (questions.length || 1)) * 5.0;
        setScore(finalScore);
        setFinished(true);

        const passed = finalScore >= 3.0;
        await quizService.submitQuiz(topicId, finalScore, passed, type as 'quiz' | 'workshop');

        // Only mark progress as 'completed' if it's a QUIZ and passed
        if (type === 'quiz' && passed) {
            await progressService.saveProgress(courseId, topicId, 'completed', finalScore);
        } else if (type === 'workshop') {
            // Workshops can mark as 'in_progress' or similar if needed, 
            // but for now they just count as attempts/practice.
            await progressService.saveProgress(courseId, topicId, 'in_progress', finalScore);
        }

        onComplete(finalScore);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md text-white font-bold">{type === 'workshop' ? 'Cargando taller...' : 'Cargando evaluación...'}</div>;

    if (error || !questions.length) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl p-8 text-center space-y-4">
                    <span className="material-symbols-outlined text-6xl text-nexus-red">error</span>
                    <h2 className="text-xl font-bold dark:text-white">Lo sentimos</h2>
                    <p className="text-gray-500 dark:text-gray-400">{error || "No hay preguntas disponibles para este contenido."}</p>
                    <button onClick={onClose} className="w-full bg-primary text-white py-3 rounded-xl font-bold uppercase trekking-widest">Volver</button>
                </div>
            </div>
        );
    }

    if (finished) {
        const isPassed = score >= 3.0;
        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto pt-20 pb-20">
                <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl p-8 shadow-2xl relative">
                    <div className="text-center mb-10">
                        <div className={`size-20 mx-auto rounded-full flex items-center justify-center mb-4 ${isPassed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            <span className="material-symbols-outlined text-4xl">{isPassed ? 'verified' : 'cancel'}</span>
                        </div>
                        <h2 className="text-3xl font-black dark:text-white mb-2">
                            {type === 'workshop' ? (isPassed ? '¡Taller Completado!' : 'Sigue Practicando') : (isPassed ? '¡Evaluación Aprobada!' : 'Evaluación no Superada')}
                        </h2>
                        <div className="text-5xl font-black text-primary">{score.toFixed(1)} <span className="text-lg opacity-50">/ 5.0</span></div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-4">Calificación Académica</p>
                        {type === 'quiz' && !isPassed && (
                            <p className="text-nexus-red text-xs font-bold mt-2">Debes obtener un mínimo de 3.0 para desbloquear el siguiente tema.</p>
                        )}
                    </div>

                    <div className="space-y-4 mb-8">
                        {questions.map((q, i) => (
                            <div key={i} className={`p-4 rounded-2xl border ${answers[i] === q.correct_index ? 'border-green-100 bg-green-50/30' : 'border-red-100 bg-red-50/30'}`}>
                                <p className="text-sm font-bold dark:text-white mb-1">{i + 1}. {q.question}</p>
                                <p className="text-xs text-gray-500">Tu respuesta: {q.options[answers[i]] || 'Sin responder'}</p>
                            </div>
                        ))}
                    </div>

                    <button onClick={onClose} className="w-full bg-primary text-white py-4 rounded-2xl font-black shadow-lg shadow-primary/30 active:scale-95 transition-all">
                        FINALIZAR EVALUACIÓN
                    </button>
                </div>
            </div>
        );
    }

    const currentQ = questions[currentQuestionIndex];
    const userChoice = answers[currentQuestionIndex];

    return (
        <div className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-2xl flex flex-col p-4 overflow-y-auto">
            <header className="max-w-2xl mx-auto w-full flex items-center justify-between py-4 text-white">
                <div className="flex items-center gap-4">
                    <div className="bg-nexus-red text-white px-4 py-2 rounded-2xl flex items-center gap-2 shadow-lg shadow-nexus-red/20">
                        <span className="material-symbols-outlined text-sm animate-pulse">timer</span>
                        <span className="font-black tabular-nums">{formatTime(timeLeft)}</span>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Pregunta</span>
                    <span className="text-xl font-black">{currentQuestionIndex + 1} / {questions.length}</span>
                </div>
            </header>

            <main className="flex-1 max-w-2xl mx-auto w-full flex flex-col gap-6 pt-8 pb-32">
                <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 shadow-2xl space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                    <h3 className="text-xl font-bold leading-tight dark:text-white">{currentQ.question}</h3>

                    <div className="space-y-3">
                        {currentQ.options.map((opt, idx) => {
                            let styles = "border-transparent bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300";
                            if (showFeedback) {
                                if (idx === currentQ.correct_index) styles = "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 ring-4 ring-green-500/10";
                                else if (idx === userChoice) styles = "border-nexus-red bg-nexus-red/5 text-nexus-red ring-4 ring-nexus-red/10";
                                else styles = "opacity-40 grayscale";
                            } else if (userChoice === idx) {
                                styles = "border-primary bg-primary/5 text-primary ring-4 ring-primary/10";
                            }

                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleAnswer(idx)}
                                    disabled={showFeedback}
                                    className={`w-full text-left p-5 rounded-2xl border-2 font-bold text-sm transition-all flex items-center justify-between ${styles}`}
                                >
                                    <span>{opt}</span>
                                    {showFeedback && idx === currentQ.correct_index && <span className="material-symbols-outlined text-green-500">check_circle</span>}
                                    {showFeedback && idx === userChoice && idx !== currentQ.correct_index && <span className="material-symbols-outlined text-nexus-red">cancel</span>}
                                </button>
                            );
                        })}
                    </div>

                    {showFeedback && (
                        <div className="bg-primary/5 border border-primary/10 rounded-3xl p-6 animate-in fade-in zoom-in duration-300">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="material-symbols-outlined text-primary">lightbulb</span>
                                <span className="text-xs font-black uppercase tracking-widest text-primary">Retroalimentación ICFES</span>
                            </div>
                            <p className="text-sm dark:text-white leading-relaxed italic">"{currentQ.explanation}"</p>
                        </div>
                    )}

                    {showFeedback && (
                        <div className="pt-4 flex justify-center">
                            <button
                                onClick={handleNext}
                                className="w-full bg-primary text-white py-4 rounded-2xl font-black shadow-xl shadow-primary/30 animate-in zoom-in duration-300 flex items-center justify-center gap-3 active:scale-95"
                            >
                                {currentQuestionIndex === questions.length - 1 ? 'FINALIZAR EXAMEN' : 'SIGUIENTE PREGUNTA'}
                                <span className="material-symbols-outlined">double_arrow</span>
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default QuizRunner;

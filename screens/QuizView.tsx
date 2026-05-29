
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const QuizView: React.FC = () => {
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const options = [
    { id: 'A', text: 'x = 5' },
    { id: 'B', text: 'x = 10' },
    { id: 'C', text: 'x = 7.5' },
    { id: 'D', text: 'x = 20' }
  ];

  return (
    <div className="flex flex-col flex-1 h-screen bg-background-light dark:bg-slate-900">
      {/* Quiz Header */}
      <header className="bg-white/80 dark:bg-slate-900 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate(-1)} className="text-primary flex items-center gap-1 font-semibold">
            <span className="material-symbols-outlined">chevron_left</span>
            <span>Salir</span>
          </button>
          <h2 className="text-base font-bold dark:text-white">Matemáticas - Unidad 1</h2>
          <div className="w-12"></div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wide">
            <span className="text-slate-400">Progreso del Quiz</span>
            <span className="text-primary">4 de 10</span>
          </div>
          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: '40%' }}></div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="mb-8">
          <span className="bg-primary/10 text-primary text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-4 inline-block">Pregunta 4</span>
          <h1 className="text-2xl font-bold dark:text-white leading-tight">
            ¿Cuál es el resultado de despejar <span className="text-primary italic">x</span> en la ecuación 2x + 5 = 15?
          </h1>
        </div>

        {/* AI Hint */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 rounded-2xl p-4 mb-8 flex gap-4 items-start shadow-sm">
          <div className="bg-primary text-white p-2 rounded-xl flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-sm">smart_toy</span>
          </div>
          <div>
            <p className="text-slate-900 dark:text-white text-xs font-bold">Sugerencia del Tutor</p>
            <p className="text-slate-600 dark:text-slate-300 text-xs mt-1 italic">"¿Has intentado restar 5 en ambos lados primero?"</p>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-4">
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => setSelectedOption(opt.id)}
              className={`w-full flex items-center p-5 rounded-2xl border-2 transition-all text-left ${selectedOption === opt.id
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-800 hover:border-primary/30'
                }`}
            >
              <div className={`size-6 rounded-full border-2 mr-4 flex items-center justify-center transition-colors ${selectedOption === opt.id ? 'border-primary bg-primary' : 'border-gray-300'
                }`}>
                {selectedOption === opt.id && <div className="size-2 bg-white rounded-full"></div>}
              </div>
              <div className="flex-1">
                <p className={`text-lg font-bold ${selectedOption === opt.id ? 'text-primary' : 'dark:text-white'}`}>{opt.text}</p>
                <p className="text-xs text-slate-400 font-medium uppercase">Opción {opt.id}</p>
              </div>
            </button>
          ))}
        </div>
      </main>

      {/* Navigation Actions */}
      <footer className="bg-white/95 dark:bg-slate-900 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 p-6 flex gap-4">
        <button className="flex-1 py-4 rounded-2xl border-2 border-gray-100 dark:border-slate-700 font-bold dark:text-white hover:bg-gray-50 active:scale-95 transition-all">Anterior</button>
        <button className="flex-1 py-4 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/25 active:scale-95 transition-all">Siguiente</button>
      </footer>

      {/* Help Button */}
      <div className="fixed bottom-24 right-4 z-10">
        <button
          onClick={() => navigate('/tutor')}
          className="flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-full shadow-xl animate-bounce"
        >
          <span className="material-symbols-outlined text-sm">auto_awesome</span>
          <span className="text-xs font-bold uppercase tracking-wider">Consultar Tutor IA</span>
        </button>
      </div>
    </div>
  );
};

export default QuizView;

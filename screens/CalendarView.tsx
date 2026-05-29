
import React from 'react';
import { useNavigate } from 'react-router-dom';

const CalendarView: React.FC = () => {
  const navigate = useNavigate();

  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  const emptySlots = 3;

  const events = [
    { title: 'Examen de Matemáticas', desc: 'Unidad 3: Álgebra Lineal', date: 'Martes, 24 Octubre', time: '08:00 AM', tag: 'Exámenes', color: 'red', icon: 'menu_book' },
    { title: 'Fecha Límite de Pago', desc: 'Cuotas de tus estudios - Noviembre', date: 'Sábado, 28 Octubre', time: '11:59 PM', tag: 'Pagos', color: 'green', icon: 'payments' },
    { title: 'Asamblea Estudiantil', desc: 'Auditorio Principal - Piso 2', date: 'Jueves, 02 Noviembre', time: '10:00 AM', tag: 'Institucional', color: 'blue', icon: 'groups' },
  ];

  return (
    <div className="flex flex-col flex-1 pb-20">
      <header className="sticky top-0 z-20 bg-background-light/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center p-4 justify-between h-16">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <span className="material-symbols-outlined">calendar_today</span>
          </div>
          <h2 className="text-[#0d121b] dark:text-white text-lg font-bold leading-tight flex-1 text-center">NexusApp Calendar</h2>
          <div className="flex w-10"></div>
        </div>
      </header>

      <main className="flex-1 p-4">
        {/* Calendar Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-6">
            <button className="p-2 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg">
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <p className="text-[#0d121b] dark:text-white text-base font-bold">Octubre 2023</p>
            <button className="p-2 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center">
            {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map(day => (
              <p key={day} className="text-gray-400 text-xs font-bold h-10 flex items-center justify-center">{day}</p>
            ))}
            {Array.from({ length: emptySlots }).map((_, i) => <div key={`empty-${i}`} className="h-10"></div>)}
            {days.map(day => {
              const isToday = day === 5;
              const hasEvent = [10, 24, 28].includes(day);
              const eventColor = day === 24 ? 'red' : day === 28 ? 'green' : 'red';

              return (
                <button key={day} className={`h-10 w-full relative flex items-center justify-center group`}>
                  <div className={`size-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${isToday ? 'bg-primary text-white shadow-md shadow-primary/30' : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-slate-700 dark:text-white'}`}>
                    {day}
                  </div>
                  {hasEvent && !isToday && (
                    <div className={`absolute bottom-1 w-1 h-1 rounded-full bg-${eventColor}-500`}></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8 mb-4">
          <h3 className="text-[#0d121b] dark:text-white text-xl font-bold leading-tight">Próximos Eventos</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Octubre - Noviembre 2023</p>
        </div>

        <div className="space-y-4">
          {events.map((event, i) => (
            <div key={i} className="flex gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <div className={`text-${event.color}-500 flex items-center justify-center rounded-xl bg-${event.color}-50 dark:bg-${event.color}-900/20 shrink-0 size-12`}>
                <span className="material-symbols-outlined">{event.icon}</span>
              </div>
              <div className="flex flex-1 flex-col justify-center">
                <div className="flex justify-between items-start">
                  <p className="text-[#0d121b] dark:text-white text-base font-bold leading-tight">{event.title}</p>
                  <span className={`bg-${event.color}-100 dark:bg-${event.color}-900/40 text-${event.color}-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase`}>{event.tag}</span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-normal">{event.desc}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="material-symbols-outlined text-[14px] text-gray-400">calendar_month</span>
                  <p className="text-gray-600 dark:text-gray-300 text-xs">{event.date}</p>
                  <span className="material-symbols-outlined text-[14px] text-gray-400 ml-2">schedule</span>
                  <p className="text-gray-600 dark:text-gray-300 text-xs">{event.time}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* FAB */}
      <button className="fixed bottom-24 right-6 bg-primary text-white size-14 rounded-full shadow-lg shadow-primary/40 flex items-center justify-center active:scale-95 transition-transform z-30">
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>
    </div>
  );
};

export default CalendarView;

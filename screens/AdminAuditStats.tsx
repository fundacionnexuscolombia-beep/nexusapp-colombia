import React from 'react';

interface Props {
  dashboardStats: {
    totalUsers: number;
    activeStudents: number;
    pendingPayments: number;
    totalNews: number;
  };
}

const AdminAuditStats: React.FC<Props> = ({ dashboardStats }) => {
  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-3">

      <div className="rounded-2xl p-4 bg-white dark:bg-surface-dark border border-gray-100 dark:border-white/5 text-center">
        <span className="material-symbols-outlined text-primary text-2xl">
          groups
        </span>
        <p className="text-2xl font-black mt-2 dark:text-white">
          {dashboardStats.totalUsers}
        </p>
        <p className="text-[10px] uppercase font-black text-gray-400">
          Usuarios
        </p>
      </div>

      <div className="rounded-2xl p-4 bg-white dark:bg-surface-dark border border-gray-100 dark:border-white/5 text-center">
        <span className="material-symbols-outlined text-green-500 text-2xl">
          school
        </span>
        <p className="text-2xl font-black mt-2 dark:text-white">
          {dashboardStats.activeStudents}
        </p>
        <p className="text-[10px] uppercase font-black text-gray-400">
          Estudiantes Activos
        </p>
      </div>

      <div className="rounded-2xl p-4 bg-white dark:bg-surface-dark border border-gray-100 dark:border-white/5 text-center">
        <span className="material-symbols-outlined text-amber-500 text-2xl">
          payments
        </span>
        <p className="text-2xl font-black mt-2 dark:text-white">
          {dashboardStats.pendingPayments}
        </p>
        <p className="text-[10px] uppercase font-black text-gray-400">
          Pagos Pendientes
        </p>
      </div>

      <div className="rounded-2xl p-4 bg-white dark:bg-surface-dark border border-gray-100 dark:border-white/5 text-center">
        <span className="material-symbols-outlined text-blue-500 text-2xl">
          article
        </span>
        <p className="text-2xl font-black mt-2 dark:text-white">
          {dashboardStats.totalNews}
        </p>
        <p className="text-[10px] uppercase font-black text-gray-400">
          Noticias
        </p>
      </div>

    </section>
  );
};

export default AdminAuditStats;
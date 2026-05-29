import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from './AuthProvider';

interface AdminProfile {
    id: string;
    full_name: string;
    email: string | null;
    role: string;
}

const AdminAccountManager: React.FC = () => {
    const { user } = useAuth();
    const [admins, setAdmins] = useState<AdminProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const fetchAdmins = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, email, role')
            .eq('role', 'admin')
            .order('full_name', { ascending: true });

        if (error) {
            console.error('Error fetching admins:', error);
        } else {
            setAdmins(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchAdmins();
    }, []);

    const demoteAdmin = async (adminId: string, adminName: string) => {
        if (!window.confirm(`¿Estás seguro de que deseas retirar los permisos de administrador a ${adminName}? Esta acción lo convertirá en un usuario inactivo.`)) {
            return;
        }

        setUpdatingId(adminId);
        // Demote to student and disable access immediately for security
        const { error } = await supabase
            .from('profiles')
            .update({ role: 'student', access_enabled: false })
            .eq('id', adminId);

        if (error) {
            alert('Error al retirar permisos: ' + error.message);
        } else {
            setAdmins(prev => prev.filter(a => a.id !== adminId));
            alert('Permisos retirados correctamente. El usuario ahora es un estudiante inactivo.');
        }
        setUpdatingId(null);
    };

    return (
        <div className="space-y-4">
            <div className="bg-white dark:bg-surface-dark rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden max-h-[400px] overflow-y-auto custom-scrollbar">
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="size-6 border-2 border-primary border-t-transparent animate-spin rounded-full mx-auto mb-2"></div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cargando administradores...</p>
                    </div>
                ) : admins.length > 0 ? (
                    <div className="divide-y divide-gray-50 dark:divide-white/5">
                        {admins.map(admin => {
                            const isCurrentUser = user?.id === admin.id;

                            return (
                                <div key={admin.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-white/2 transition-colors">
                                    <div className="flex items-center gap-4 min-w-0 flex-1 pr-4">
                                        <div className="size-10 rounded-2xl bg-nexus-blue/10 flex items-center justify-center text-nexus-blue h-10 w-10 shrink-0">
                                            <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="font-bold text-sm dark:text-white truncate uppercase tracking-tight flex items-center gap-2">
                                                {admin.full_name || 'Sin Nombre'}
                                                {isCurrentUser && (
                                                    <span className="bg-nexus-green/10 text-nexus-green text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Tú</span>
                                                )}
                                            </h4>
                                            <p className="text-[9px] text-gray-400 font-bold tracking-widest mt-0.5 truncate">{admin.email || admin.id}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => demoteAdmin(admin.id, admin.full_name)}
                                        disabled={isCurrentUser || updatingId === admin.id}
                                        className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                                            ${isCurrentUser 
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-white/5' 
                                                : 'bg-nexus-red/10 text-nexus-red hover:bg-nexus-red hover:text-white'
                                            } ${updatingId === admin.id ? 'opacity-50 cursor-wait' : ''}`}
                                        title={isCurrentUser ? "No puedes retirarte a ti mismo" : "Evitar que este usuario acceda como administrador"}
                                    >
                                        RETIRAR ACCESO
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="p-8 text-center">
                        <span className="material-symbols-outlined text-gray-300 dark:text-white/10 text-4xl mb-2">shield_person</span>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No hay administradores registrados</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminAccountManager;

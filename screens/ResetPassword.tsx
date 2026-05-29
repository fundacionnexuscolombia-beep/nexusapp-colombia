import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

const ResetPassword = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        // When the user lands here, Supabase should have detected the hash
        // and set the session with the RECOVERY event.
        // We can check if we have a session.
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                // If no session, it might be that the link was invalid or they just navigated here manually.
                setMessage({
                    type: 'error',
                    text: 'Enlace inválido o expirado. Por favor solicita uno nuevo.'
                });
            }
        };
        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                // User is signed in with a temporary session, ready to update password
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        if (password.length < 6) {
            setMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres.' });
            setLoading(false);
            return;
        }

        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
            setMessage({ type: 'error', text: 'Error al actualizar: ' + error.message });
        } else {
            setMessage({ type: 'success', text: 'Contraseña actualizada correctamente. Redirigiendo...' });
            setTimeout(() => {
                navigate('/');
            }, 2000);
        }
        setLoading(false);
    };

    return (
        <div className="dark min-h-screen bg-[#0d121b] text-white flex flex-col justify-center px-6 py-12 lg:px-8 relative overflow-hidden font-sans">
            {/* Dynamic Background Elements */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-nexus-purple/20 rounded-full blur-[120px] animate-pulse delay-700"></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
            </div>
            <div className="sm:mx-auto sm:w-full sm:max-w-sm z-10">
                <div className="bg-primary/20 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-primary/10">
                    <span className="material-symbols-outlined text-primary text-3xl">lock_reset</span>
                </div>
                <h2 className="mt-2 text-center text-2xl font-bold leading-9 tracking-tight text-slate-900 dark:text-white">
                    Restablecer Contraseña
                </h2>
                <p className="text-center text-sm text-gray-500 mt-1">
                    Ingresa tu nueva contraseña para recuperar el acceso.
                </p>
            </div>

            <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm z-10 relative">
                <form className="space-y-6" onSubmit={handleUpdatePassword}>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium leading-6 text-slate-900 dark:text-white">
                            Nueva Contraseña
                        </label>
                        <div className="mt-2">
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full rounded-2xl border-0 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 bg-white dark:bg-surface-dark dark:ring-gray-700 dark:text-white dark:placeholder-gray-500 transition-all pl-4"
                            />
                        </div>
                    </div>

                    {message && (
                        <div className={`p-4 rounded-xl text-sm text-center ${message.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'}`}>
                            {message.text}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={loading || (message?.type === 'error' && message.text.includes('Enlace'))}
                            className="flex w-full justify-center rounded-2xl bg-primary px-3 py-3 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-nexus-purple focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Actualizando...' : 'Cambiar Contraseña'}
                        </button>
                    </div>
                </form>

                <p className="mt-10 text-center text-sm text-gray-500">
                    <button onClick={() => navigate('/login')} className="font-semibold leading-6 text-primary hover:text-nexus-purple transition-colors">
                        Volver al inicio de sesión
                    </button>
                </p>
            </div>
        </div>
    );
};

export default ResetPassword;

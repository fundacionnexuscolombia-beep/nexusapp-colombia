
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { resetPasswordForEmail } from '../services/authService';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resetMode, setResetMode] = useState(false);
    const [resetMessage, setResetMessage] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            setError('Por favor ingresa tu correo electrónico para recuperar la contraseña.');
            return;
        }
        setLoading(true);
        setError(null);
        setResetMessage(null);
        try {
            await resetPasswordForEmail(email);
            setResetMessage('¡Listo! Revisa tu correo electrónico para restablecer tu contraseña.');
            setResetMode(false);
        } catch (err: any) {
            console.error('Reset error:', err);
            if (err.message && err.message.includes('rate limit')) {
                setError('Has solicitado demasiados correos en poco tiempo. Por favor espera unos minutos antes de intentar de nuevo.');
            } else {
                setError(err.message || 'Error al enviar el correo de recuperación.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const cleanEmail = email.trim().toLowerCase();
        const cleanPassword = password.trim();

        if (!cleanEmail || !cleanPassword) {
            setError('Por favor completa todos los campos.');
            setLoading(false);
            return;
        }

        try {
            const maskUrl = (url: string | undefined) => {
                if (!url) return "No detectada";
                if (url.length <= 15) return url;
                return url.substring(0, 12) + '...' + url.substring(url.length - 4);
            };
            const diagnosticInfo = `\n(URL: ${maskUrl(import.meta.env.VITE_SUPABASE_URL)})`;

            // Add a timeout of 15 seconds to avoid infinite loading
            const loginPromise = supabase.auth.signInWithPassword({
                email: cleanEmail,
                password: cleanPassword,
            });

            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Tiempo de espera agotado. Revisa tu conexión a internet." + diagnosticInfo)), 15000)
            );

            const { error: loginError } = await Promise.race([loginPromise, timeoutPromise]) as any;

            if (loginError) {
                console.error("Login attempt failed:", loginError.message);
                if (loginError.message.includes("Invalid login credentials")) {
                    setError('Credenciales incorrectas. Verifica tu correo y contraseña.');
                } else {
                    setError(loginError.message);
                }
                setLoading(false);
            } else {
                navigate('/');
            }
        } catch (err: any) {
            console.error('Crash in login logic:', err);
            setError(err.message || 'Error inesperado al intentar iniciar sesión.');
            setLoading(false);
        }
    };

    return (
        <div className="dark min-h-screen bg-[#0d121b] text-white flex items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Dynamic Background Elements */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-nexus-purple/20 rounded-full blur-[120px] animate-pulse delay-700"></div>

                {/* Starry Background overlay if not globally handled */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
            </div>

            <div className="w-full max-w-md z-10 animate-in fade-in zoom-in duration-700">
                <div className="bg-[#0d121b]/80 border border-white/10 backdrop-blur-[20px] p-8 lg:p-12 rounded-[3.5rem] shadow-2xl relative group">
                    {/* Logo Section */}
                    <div className="flex flex-col items-center mb-10">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-primary blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-700 rounded-full"></div>
                            <div className="bg-white/10 w-24 h-24 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/10 p-5 transform group-hover:rotate-6 transition-transform duration-500">
                                <img src="assets/logo-white.png.png" alt="Nexus Logo" className="w-full h-full object-contain" />
                            </div>
                        </div>

                        <h2 className="text-3xl lg:text-4xl font-black text-center text-white tracking-tight leading-tight">
                            {resetMode ? 'Recuperar' : '¡Qué bueno verte!'}
                        </h2>
                        <p className="mt-3 text-center text-slate-400 font-medium px-4">
                            {resetMode
                                ? 'Ingresa tu correo para volver pronto'
                                : 'Tu comunidad de aprendizaje te espera en NexusApp'}
                        </p>
                    </div>

                    <form className="space-y-6" onSubmit={resetMode ? handleResetPassword : handleLogin}>
                        <div className="space-y-2">
                            <label htmlFor="email" className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">
                                Correo electrónico
                            </label>
                            <div className="relative group/input">
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="ejemplo@nexus.com"
                                    className="block w-full rounded-2xl border-0 py-4 px-6 text-white bg-white/5 ring-1 ring-inset ring-white/10 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-primary transition-all text-sm font-medium"
                                />
                            </div>
                        </div>

                        {!resetMode && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between ml-4">
                                    <label htmlFor="password" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                        Contraseña
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => { setResetMode(true); setError(null); }}
                                        className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-white transition-colors border-0 animate-pulse"
                                    >
                                        ¿Olvidaste la clave?
                                    </button>
                                </div>
                                <div className="relative group/input">
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Tu número de documento"
                                        className="block w-full rounded-2xl border-0 py-4 px-6 text-white bg-white/5 ring-1 ring-inset ring-white/10 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-primary transition-all text-sm font-medium pr-14"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-2"
                                    >
                                        <span className="material-symbols-outlined text-xl">
                                            {showPassword ? 'visibility_off' : 'visibility'}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-xs font-bold text-center animate-shake flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-sm">error</span>
                                {error}
                            </div>
                        )}

                        {resetMessage && (
                            <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-500 rounded-2xl text-xs font-bold text-center flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-sm">check_circle</span>
                                {resetMessage}
                            </div>
                        )}

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative flex w-full justify-center rounded-2xl bg-gradient-to-r from-primary to-nexus-purple p-4 text-sm font-black leading-6 text-white shadow-xl hover:shadow-primary/30 transition-all active:scale-[0.98] disabled:opacity-50 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                <span className="relative z-10">
                                    {loading ? 'Procesando...' : (resetMode ? 'Enviar Instrucciones' : 'Entrar a mi Cuenta')}
                                </span>
                            </button>
                        </div>

                        {!resetMode && (
                            <>
                                <div className="relative flex py-4 items-center">
                                    <div className="flex-grow border-t border-white/5"></div>
                                    <span className="flex-shrink mx-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">o explora primero</span>
                                    <div className="flex-grow border-t border-white/5"></div>
                                </div>

                                <button
                                    type="button"
                                    onClick={async () => {
                                        setLoading(true);
                                        const { error } = await supabase.auth.signInWithPassword({
                                            email: 'demo@nexus.com',
                                            password: 'demo12345',
                                        });
                                        if (error) setError('Modo demo temporalmente inactivo.');
                                        setLoading(false);
                                    }}
                                    className="flex w-full justify-center rounded-2xl bg-white/5 border border-white/10 p-4 text-sm font-black leading-6 text-slate-200 hover:bg-white/10 hover:text-white transition-all active:scale-[0.98] group/demo"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-xl group-hover:rotate-12 transition-transform">rocket_launch</span>
                                        ACCESO DEMOSTRACIÓN
                                    </div>
                                </button>
                            </>
                        )}

                        {resetMode && (
                            <button
                                type="button"
                                onClick={() => { setResetMode(false); setError(null); setResetMessage(null); }}
                                className="w-full text-center text-xs font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors py-2"
                            >
                                Volver al inicio
                            </button>
                        )}
                    </form>

                    <p className="mt-10 text-center text-xs text-slate-400 font-medium">
                        ¿Nuevo en la fundación?{' '}
                        <Link to="/register" className="font-black text-primary hover:text-white transition-colors uppercase tracking-widest ml-1">
                            Regístrate aquí
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;


import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

const Register: React.FC = () => {
    const navigate = useNavigate();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showNotice, setShowNotice] = useState(false);

    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();
        setShowNotice(true);
    };

    const openWhatsApp = () => {
        const message = `Hola, mi nombre es ${fullName}. Me gustaría inscribirme en NexusApp y pasar el filtro de ingreso.`;
        const url = `https://wa.me/573138620053?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    return (
        <div className="dark min-h-screen bg-[#0d121b] text-white flex flex-col justify-center px-6 py-12 lg:px-8 relative overflow-hidden font-sans">
            {/* Dynamic Background Elements */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-nexus-purple/20 rounded-full blur-[120px] animate-pulse delay-700"></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
            </div>
            <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <div className="bg-primary/20 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-primary/10">
                    <span className="material-symbols-outlined text-primary text-3xl">person_add</span>
                </div>
                <h2 className="mt-2 text-center text-2xl font-bold leading-9 tracking-tight text-slate-900 dark:text-white">
                    Crea tu cuenta estudiantil
                </h2>
                <p className="text-center text-sm text-gray-500 mt-1">
                    Unete a NexusApp y gestiona tu progreso
                </p>
            </div>

            <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm z-10 relative">
                <form className="space-y-6" onSubmit={handleRegister}>
                    {!showNotice ? (
                        <>
                            <div>
                                <label htmlFor="fullName" className="block text-sm font-medium leading-6 text-slate-900 dark:text-white">
                                    Nombre Completo
                                </label>
                                <div className="mt-2">
                                    <input
                                        id="fullName"
                                        name="fullName"
                                        type="text"
                                        autoComplete="name"
                                        required
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="block w-full rounded-2xl border-0 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 bg-white dark:bg-surface-dark dark:ring-gray-700 dark:text-white dark:placeholder-gray-500 transition-all pl-4"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium leading-6 text-slate-900 dark:text-white">
                                    Correo electrónico
                                </label>
                                <div className="mt-2">
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="block w-full rounded-2xl border-0 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 bg-white dark:bg-surface-dark dark:ring-gray-700 dark:text-white dark:placeholder-gray-500 transition-all pl-4"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium leading-6 text-slate-900 dark:text-white">
                                    Contraseña
                                </label>
                                <div className="mt-2">
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        autoComplete="new-password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full rounded-2xl border-0 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 bg-white dark:bg-surface-dark dark:ring-gray-700 dark:text-white dark:placeholder-gray-500 transition-all pl-4"
                                    />
                                </div>
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    className="flex w-full justify-center rounded-2xl bg-primary px-3 py-3 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-nexus-purple focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all active:scale-[0.98] mt-6"
                                >
                                    Solicitar Registro
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-nexus-blue/10 dark:bg-nexus-blue/5 border border-nexus-blue/20 rounded-[2.5rem] p-8 flex flex-col items-center text-center gap-6 shadow-xl shadow-blue-500/10">
                                <div className="size-20 rounded-full bg-nexus-blue flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                    <span className="material-symbols-outlined text-4xl">verified_user</span>
                                </div>
                                
                                <div className="space-y-3">
                                    <h3 className="text-xl font-bold dark:text-white text-slate-900">¡Hola, {fullName}!</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                                        Para inscribirte en NexusApp, debes pasar por un <span className="text-nexus-blue font-black underline underline-offset-4">filtro de ingreso</span> obligatorio. El equipo académico validará tus datos para asignarte un grupo.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={openWhatsApp}
                                    className="w-full bg-[#25D366] text-white rounded-2xl py-4 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-lg shadow-green-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                                >
                                    <span className="material-symbols-outlined text-xl">chat</span>
                                    Hablar con el Coordinador
                                </button>

                                <button 
                                    type="button"
                                    onClick={() => setShowNotice(false)}
                                    className="text-[10px] text-gray-400 font-bold uppercase tracking-widest hover:text-primary transition-colors"
                                >
                                    Volver a editar mis datos
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="text-center mt-6">
                        <p className="text-[10px] text-gray-400 font-medium px-4">
                            Al solicitar registro, confirmas que has leído y aceptas nuestra{' '}
                            <a href="https://www.fundacionnexuscolombia.com/politica-de-tratamiento-de-datos-personales" target="_blank" className="text-primary hover:underline">
                                Política de Privacidad
                            </a>
                        </p>
                    </div>
                </form>

                <p className="mt-10 text-center text-sm text-gray-500">
                    ¿Ya tienes una cuenta?{' '}
                    <Link to="/login" className="font-semibold leading-6 text-primary hover:text-nexus-purple transition-colors">
                        Inicia sesión
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Register;

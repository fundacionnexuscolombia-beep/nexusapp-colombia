import React, { useState } from 'react';
import LegalContractModal from '../components/LegalContractModal';
import { useAuth } from '../components/AuthProvider';
import { acceptTerms } from '../services/authService';

interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const { user, signOut, documentNumber } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [readyToSign, setReadyToSign] = useState(false);
  const [showContract, setShowContract] = useState(false);
  const [contractAccepted, setContractAccepted] = useState(false);

  return (
    <div className="min-h-screen bg-[#0d121b] flex items-center justify-center p-4 lg:p-8 relative overflow-hidden font-sans">
      {/* Background Decorations */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-nexus-blue/10 rounded-full blur-[150px] animate-pulse"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-nexus-green/10 rounded-full blur-[150px] animate-pulse delay-1000"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
      </div>

      <div className="w-full max-w-2xl z-10 animate-in fade-in zoom-in duration-1000">
        <div className="bg-[#0d121b]/80 border border-white/10 backdrop-blur-[20px] p-8 lg:p-14 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
          {/* Top Branding */}
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-4">
              <div className="bg-white/10 w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10 p-3 shadow-inner">
                <img src="assets/logo-white.png.png" alt="Nexus Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">NexusApp</h2>
                <div className="flex items-center gap-1.5 text-[9px] font-black text-nexus-blue uppercase tracking-widest bg-nexus-blue/10 px-2 py-0.5 rounded-full w-fit">
                  <span className="size-1 bg-nexus-blue rounded-full animate-ping"></span>
                  Entorno Seguro
                </div>
              </div>
            </div>
            <button className="bg-white/5 size-12 rounded-2xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all">
              <span className="material-symbols-outlined">map</span>
            </button>
          </div>

          <main className="space-y-10">
            {/* Hero Section */}
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-5xl font-black leading-tight tracking-tight text-white">
                Bienvenido a <br />
                <span className="bg-gradient-to-r from-nexus-pink via-primary to-nexus-purple bg-clip-text text-transparent">NexusApp</span>
              </h1>
              <p className="text-slate-300 text-lg leading-relaxed max-w-lg font-medium">
                Antes de comenzar tu viaje académico, aseguremos tu confianza y verifiquemos tu identidad.
              </p>
            </div>

            {/* Secure Environment Banner */}
            <div className="relative w-full h-40 rounded-[2.5rem] overflow-hidden shadow-2xl group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-purple-900/60 to-black/80 z-10"></div>
              <img
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-70"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBFW94H0NPSSSD1DNhNmBE_gC2o2CDLBbvAmHCWoP0HxinWU2yotdRTF-xskXk3TEOtllMafM2tM3-SloaFv9dZQ8vp2pwuMHqaj9zAjwU7PW0V3JfN92YUi_vXzS9GjVpB__CN6XvEgIinTKM9teyNwt2jIO7IBkqJUZ7KLk700kHS5Mef9UqJIWn8ruSVPKBJwXnIqZxUtWlmUtuMdZKpIfVogKjK5TM7i0eZYBk4y0SQQW7WDubYmje1XkBS5Ee6RndiJHBXXg"
                alt="Security"
              />
              <div className="absolute inset-0 z-20 flex flex-col justify-end p-8">
                <div className="flex items-center gap-3 text-white/90">
                  <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                    <span className="material-symbols-outlined text-2xl">verified_user</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black tracking-[0.2em] uppercase text-nexus-blue">Estándar de Seguridad</span>
                    <h4 className="text-lg font-bold">Datos Protegidos con Grado Militar</h4>
                  </div>
                </div>
              </div>
            </div>

            {/* Policy Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-6 hover:bg-white/[0.06] transition-all group/card">
                <div className="bg-nexus-blue/10 size-14 rounded-2xl text-nexus-blue flex items-center justify-center mb-5 group-hover/card:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-3xl">gavel</span>
                </div>
                <h3 className="font-bold text-lg text-white mb-2">Protección de Datos</h3>
                <p className="text-slate-300 text-sm leading-relaxed mb-4">Cumplimos con la Ley 1581 para garantizar tu privacidad total.</p>
                <button 
                  onClick={() => window.open('https://www.fundacionnexuscolombia.com/politica-de-tratamiento-de-datos-personales', '_blank')}
                  className="text-nexus-blue text-[11px] font-black uppercase tracking-widest flex items-center gap-2 group-hover/card:gap-3 transition-all"
                >
                  Leer Política <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>

              <div className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-6 hover:bg-white/[0.06] transition-all group/card">
                <div className="bg-nexus-green/10 size-14 rounded-2xl text-nexus-green flex items-center justify-center mb-5 group-hover/card:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-3xl">history_edu</span>
                </div>
                <h3 className="font-bold text-lg text-white mb-2">Contrato Institucional</h3>
                <p className="text-slate-300 text-sm leading-relaxed mb-4">Define las condiciones, derechos y deberes de tu proceso formativo integral con la institución.</p>
                <button 
                  onClick={() => setShowContract(true)}
                  className="text-nexus-green text-[11px] font-black uppercase tracking-widest flex items-center gap-2 group-hover/card:gap-3 transition-all"
                >
                  Ver Contrato <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>

            {/* Constraints & Checks */}
            <div className="space-y-4 pt-4">
              <label className="flex items-start gap-5 cursor-pointer group">
                <div className="relative flex items-center justify-center mt-1">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={() => setAccepted(!accepted)}
                    className="peer appearance-none size-7 rounded-xl border-2 border-white/10 bg-white/5 checked:bg-primary checked:border-primary transition-all cursor-pointer"
                  />
                  <span className="material-symbols-outlined absolute text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none text-xl">check</span>
                </div>
                <span className="text-slate-300 text-sm font-medium leading-relaxed group-hover:text-slate-200 transition-colors pt-0.5">
                  Acepto la <strong className="text-white">Política de Tratamiento de Datos</strong> y autorizo el manejo de mi información.
                </span>
              </label>

              <label className="flex items-start gap-5 cursor-pointer group">
                <div className="relative flex items-center justify-center mt-1">
                  <input
                    type="checkbox"
                    checked={readyToSign}
                    onChange={() => setReadyToSign(!readyToSign)}
                    className="peer appearance-none size-7 rounded-xl border-2 border-white/10 bg-white/5 checked:bg-nexus-green checked:border-nexus-green transition-all cursor-pointer"
                  />
                  <span className="material-symbols-outlined absolute text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none text-xl">check</span>
                </div>
                <span className="text-slate-300 text-sm font-medium leading-relaxed group-hover:text-slate-200 transition-colors pt-0.5">
                  Estoy de acuerdo en proceder con la revisión y firma de mi <strong className="text-white">Contrato Institucional</strong>.
                </span>
              </label>
            </div>
          </main>

          <footer className="mt-12 flex flex-col gap-5">
            <button
              onClick={() => setShowContract(true)}
              disabled={!accepted || !readyToSign}
              className={`group relative overflow-hidden py-5 rounded-[1.5rem] text-lg font-black flex items-center justify-center gap-3 transition-all duration-300
                ${contractAccepted ? 'bg-nexus-green text-white shadow-2xl shadow-green-500/30' :
                  (!accepted || !readyToSign) ? 'bg-white/5 text-gray-600 grayscale cursor-not-allowed border border-white/5' :
                    'bg-gradient-to-r from-primary to-nexus-purple text-white shadow-xl shadow-primary/30 active:scale-[0.98]'}`}
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <span className="relative z-10 flex items-center gap-2">
                {contractAccepted ? 'CONTRATO FIRMADO' : 'LEER CONTRATO INSTITUCIONAL'}
                <span className="material-symbols-outlined tracking-normal">{contractAccepted ? 'verified' : 'history_edu'}</span>
              </span>
            </button>

            {contractAccepted && (
              <button
                onClick={onComplete}
                className="w-full py-5 rounded-[1.5rem] bg-white text-[#0d121b] text-lg font-black shadow-2xl hover:bg-gray-100 transition-all active:scale-[0.98] animate-in zoom-in duration-500 flex items-center justify-center gap-3"
              >
                ACCEDER AHORA
                <span className="material-symbols-outlined animate-bounce">rocket_launch</span>
              </button>
            )}

            <button 
              onClick={signOut}
              className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] hover:text-red-400 transition-colors py-2 text-center">
              Rechazar y Salir
            </button>

            <LegalContractModal
              isOpen={showContract}
              onClose={() => setShowContract(false)}
              isMandatory={true}
              onAccept={async () => {
                try {
                  if (user) await acceptTerms(user.id);
                  setContractAccepted(true);
                  setShowContract(false);
                } catch (error) {
                  console.error("Error accepting terms:", error);
                  // Even if DB update fails, we let them proceed to avoid being stuck, 
                  // but we show the UI as accepted so they can click 'Access'
                  setContractAccepted(true);
                  setShowContract(false);
                }
              }}
              studentName={user?.user_metadata?.full_name || "Estudiante"}
              studentId={documentNumber || user?.id?.slice(0, 8).toUpperCase() || "ID"}
            />
          </footer>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;

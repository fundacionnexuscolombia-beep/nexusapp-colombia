
import React, { useState, useEffect } from 'react';

interface PdfViewerProps {
  url: string;
  title: string;
  onClose: () => void;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ url, title, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);

  // Si después de 6 segundos no ha cargado, mostramos opciones de ayuda
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTroubleshoot(true);
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  // Asegurar que la URL sea la de vista previa para embed
  const embedUrl = url.includes('/view') ? url.replace('/view', '/preview') : url;
  const externalUrl = embedUrl.replace('/preview', '/view?usp=sharing');

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col animate-in fade-in zoom-in duration-300 backdrop-blur-md">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-background-dark border-b border-white/10 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-nexus-red/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-nexus-red text-2xl fill-1">picture_as_pdf</span>
          </div>
          <div className="flex flex-col">
            <p className="text-white text-[10px] font-black uppercase tracking-widest leading-none mb-1">Guía Digital Nexus</p>
            <h3 className="text-white/70 text-[11px] font-bold truncate max-w-[180px] sm:max-w-md leading-none uppercase">{title}</h3>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <a 
            href={externalUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="size-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all shadow-lg"
            title="Abrir en pantalla completa"
          >
            <span className="material-symbols-outlined">open_in_new</span>
          </a>
          <button 
            onClick={onClose}
            className="size-10 flex items-center justify-center rounded-full bg-nexus-red text-white shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      </header>

      {/* Visualizador */}
      <div className="flex-1 w-full bg-[#1e1e1e] relative flex items-center justify-center overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-background-dark/90">
            <div className="size-14 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4"></div>
            <p className="text-white/40 text-[11px] font-black uppercase tracking-[0.3em]">Cargando Documento...</p>
          </div>
        )}

        {showTroubleshoot && (
           <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3 w-[90%] max-w-xs animate-in slide-in-from-bottom-4 duration-500">
             <div className="bg-white/10 backdrop-blur-xl border border-white/10 p-4 rounded-2xl text-center shadow-2xl">
               <p className="text-white/80 text-[11px] font-medium leading-relaxed mb-3">
                 ¿El documento no carga? Algunos navegadores bloquean la vista integrada por seguridad.
               </p>
               <a 
                 href={externalUrl} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="w-full py-3 px-4 bg-white text-black rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-nexus-red hover:text-white transition-all shadow-xl"
               >
                 <span className="material-symbols-outlined text-sm">open_in_new</span>
                 ABRIR EN VENTANA NUEVA
               </a>
             </div>
           </div>
        )}
        
        <iframe 
          src={embedUrl} 
          className="w-full h-full border-none bg-white"
          onLoad={() => setIsLoading(false)}
          title={`PDF: ${title}`}
          allow="autoplay"
        />
      </div>

      <footer className="p-3 bg-background-dark border-t border-white/5 flex items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-nexus-green"></span>
          <p className="text-white/30 text-[9px] font-black uppercase tracking-[0.2em]">Servidor Académico Fundación Nexus</p>
        </div>
      </footer>
    </div>
  );
};

export default PdfViewer;

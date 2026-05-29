import React, { useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useAuth } from './AuthProvider';

const GuidedTour: React.FC = () => {
    const { tourCompleted, markTourCompleted, role } = useAuth();

    // We only run the tour for students who haven't completed it
    const [run] = useState(role === 'student' && !tourCompleted);

    const steps: Step[] = [
        {
            target: 'body', // General welcome not tied to a specific element initially
            content: (
                <div className="text-left">
                    <h2 className="text-lg font-bold text-primary mb-2">¡Bienvenido a NexusApp! 👋</h2>
                    <p className="text-sm text-slate-700 leading-relaxed font-medium">
                        Estamos muy felices de tenerte aquí. Vamos a dar un rápido paseo para que conozcas
                        dónde encontrar todo lo que necesitas para tu aprendizaje.
                    </p>
                </div>
            ),
            placement: 'center',
            disableBeacon: true,
        },
        {
            target: '#tour-progress-section',
            content: (
                <div className="text-left">
                    <h3 className="font-bold text-primary mb-1">Tu Progreso ✨</h3>
                    <p className="text-sm text-slate-700 leading-relaxed font-medium">
                        Aquí podrás ver gráficamente cómo avanzas en tu curso. ¡Mantén tu racha de estudio diaria para desbloquear logros!
                    </p>
                </div>
            ),
        },
        {
            target: '#tour-agenda-section',
            content: (
                <div className="text-left">
                    <h3 className="font-bold text-primary mb-1">Agenda Estratégica 📅</h3>
                    <p className="text-sm text-slate-700 leading-relaxed font-medium">
                        Tu hoja de ruta semanal. Aquí verás exactamente qué temas y clases te tocan esta semana.
                    </p>
                </div>
            ),
        },
        {
            target: '#tour-subjects-section',
            content: (
                <div className="text-left">
                    <h3 className="font-bold text-primary mb-1">Materias de Estudio 📚</h3>
                    <p className="text-sm text-slate-700 leading-relaxed font-medium">
                        Acceso directo a todo tu material de clase. PDFs, videos y recursos organizados por materia.
                    </p>
                </div>
            ),
        },
        {
            target: '#tour-tools-section',
            content: (
                <div className="text-left">
                    <h3 className="font-bold text-primary mb-1">Herramientas 🛠️</h3>
                    <p className="text-sm text-slate-700 leading-relaxed font-medium">
                        Simulacros, flashcards y otras herramientas interactivas para poner a prueba tu conocimiento.
                    </p>
                </div>
            ),
        },
        {
            target: '#tour-profile-menu',
            content: (
                <div className="text-left">
                    <h3 className="font-bold text-primary mb-1">Tu Perfil y Menú 👤</h3>
                    <p className="text-sm text-slate-700 leading-relaxed font-medium">
                        Desde aquí podrás editar tus datos, ver tus insignias y cerrar sesión. ¡Eso es todo! Estás listo para empezar.
                    </p>
                </div>
            ),
        }
    ];

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status } = data;
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

        if (finishedStatuses.includes(status)) {
            // Mark the tour as completed in the global state and database
            markTourCompleted();
        }
    };

    if (!run) return null;

    return (
        <Joyride
            steps={steps}
            run={run}
            continuous={true}
            showProgress={true}
            showSkipButton={true}
            disableOverlayClose={true}
            spotlightClicks={false}
            callback={handleJoyrideCallback}
            locale={{
                back: 'Atrás',
                close: 'Cerrar',
                last: 'Finalizar',
                next: 'Siguiente',
                skip: 'Saltar Tour',
            }}
            styles={{
                options: {
                    primaryColor: '#8a2be2', // NexusApp primary purple
                    textColor: '#1e293b',    // Slate-800 for better readability
                    zIndex: 10000,
                },
                tooltip: {
                    borderRadius: '24px',
                    padding: '24px',
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                },
                buttonNext: {
                    borderRadius: '16px',
                    padding: '12px 24px',
                    fontWeight: '900',
                    fontSize: '14px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                },
                buttonBack: {
                    color: '#475569', // Slate-600
                    marginRight: '12px',
                    fontWeight: 'bold',
                },
                buttonSkip: {
                    color: '#8a2be2',
                    fontWeight: '900',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    fontSize: '12px',
                }
            }}
        />
    );
};

export default GuidedTour;

import React from 'react';

interface SegmentedProgressRingProps {
    percentage: number;
    size?: number;
    strokeWidth?: number;
    segments?: number;
    subtitle?: string;
}

const SegmentedProgressRing: React.FC<SegmentedProgressRingProps> = ({ 
    percentage, 
    size = 320, 
    strokeWidth = 32,
    segments = 60,
    subtitle
}) => {
    const radius = (size - strokeWidth) / 2;
    const center = size / 2;
    
    // Generate segments
    const segmentArray = Array.from({ length: segments });
    const anglePerSegment = 360 / segments;
    const activeSegments = Math.round((percentage / 100) * segments);

    return (
        <div className="relative flex items-center justify-center select-none" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
                {/* Background segments */}
                {segmentArray.map((_, i) => {
                    const angle = i * anglePerSegment;
                    const isActive = i < activeSegments;
                    
                    // Calculate start and end points for the radial line - SHORTER FOR THICKER FEEL
                    const rad = (angle * Math.PI) / 180;
                    const x1 = center + (radius - strokeWidth / 2) * Math.cos(rad);
                    const y1 = center + (radius - strokeWidth / 2) * Math.sin(rad);
                    const x2 = center + (radius + strokeWidth / 2) * Math.cos(rad);
                    const y2 = center + (radius + strokeWidth / 2) * Math.sin(rad);

                    // Colors based on position and active state
                    let strokeColor = "rgba(127, 19, 236, 0.08)"; // Default background (more visible)
                    
                    if (isActive) {
                        // Create a smooth gradient from primary -> pink -> orange
                        const ratio = i / segments;
                        
                        // Override with specific hex for better vibrancy
                        if (ratio < 0.2) strokeColor = "#7f13ec"; // Deep Purple
                        else if (ratio < 0.4) strokeColor = "#a855f7"; // Light Purple
                        else if (ratio < 0.6) strokeColor = "#e61b72"; // Nexus Pink
                        else if (ratio < 0.8) strokeColor = "#f43f5e"; // Rose
                        else strokeColor = "#f48221"; // Nexus Orange
                    }

                    return (
                        <line
                            key={i}
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke={strokeColor}
                            strokeWidth="5"
                            strokeLinecap="round"
                            className="transition-all duration-500"
                            style={{ 
                                transitionDelay: `${i * 10}ms`,
                                filter: isActive ? 'drop-shadow(0 0 3px rgba(127, 19, 236, 0.4))' : 'none'
                            }}
                        />
                    );
                })}
            </svg>
            
            {/* Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pt-2">
                <span className="text-7xl lg:text-8xl font-black text-slate-900 dark:text-white tracking-tighter animate-in fade-in zoom-in duration-700 leading-none">
                    {percentage}<span className="text-4xl text-primary/60 ml-1 font-black">%</span>
                </span>
                {subtitle && (
                    <div className="mt-4 px-4 py-1.5 bg-slate-900 dark:bg-white/10 rounded-full border border-white/10 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-1000 delay-300">
                        <p className="text-[10px] font-black text-white uppercase tracking-[0.2em] whitespace-nowrap">
                            {subtitle}
                        </p>
                    </div>
                )}
            </div>

            {/* Inner Glowing Ring (Subtle) */}
            <div 
                className="absolute rounded-full border border-primary/5 dark:border-white/5 pointer-events-none"
                style={{ 
                    width: size - strokeWidth * 3, 
                    height: size - strokeWidth * 3,
                    boxShadow: 'inset 0 0 40px rgba(127, 19, 236, 0.02)'
                }}
            />
        </div>
    );
};

export default SegmentedProgressRing;

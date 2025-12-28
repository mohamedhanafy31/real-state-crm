'use client';

import { PHASE_INFO } from '@/lib/api/interview';

interface PhaseProgressProps {
    currentPhase: number;
    isComplete?: boolean;
}

export function PhaseProgress({ currentPhase, isComplete }: PhaseProgressProps) {
    const totalPhases = 6;
    const phaseInfo = PHASE_INFO[currentPhase] || { name: `Phase ${currentPhase}`, nameAr: '' };

    return (
        <div className="w-full space-y-3">
            {/* Phase indicator */}
            <div className="flex items-center justify-between text-sm">
                <span className="text-[#92adc9]">
                    {isComplete ? 'Interview Complete' : `Phase ${currentPhase} of ${totalPhases}`}
                </span>
                <span className="text-white font-medium" dir="auto">
                    {phaseInfo.nameAr || phaseInfo.name}
                </span>
            </div>

            {/* Progress bar */}
            <div className="flex gap-1">
                {Array.from({ length: totalPhases }, (_, i) => {
                    const phaseNum = i + 1;
                    const isCompleted = phaseNum < currentPhase || isComplete;
                    const isCurrent = phaseNum === currentPhase && !isComplete;

                    return (
                        <div
                            key={phaseNum}
                            className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                                isCompleted
                                    ? 'bg-green-500'
                                    : isCurrent
                                    ? 'bg-primary'
                                    : 'bg-[#324d67]'
                            }`}
                        />
                    );
                })}
            </div>

            {/* Phase name in English */}
            <p className="text-xs text-[#92adc9] text-center">
                {phaseInfo.name}
            </p>
        </div>
    );
}

import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

interface AIBadgeProps {
    label?: string;
    className?: string;
    showIcon?: boolean;
    size?: 'sm' | 'md';
}

export function AIBadge({
    label = 'AI',
    className,
    showIcon = true,
    size = 'md'
}: AIBadgeProps) {
    return (
        <div className={cn(
            'inline-flex items-center gap-1.5 rounded-full font-medium',
            'bg-gradient-to-r from-purple-500/20 to-blue-500/20',
            'text-purple-300 border border-purple-500/30',
            size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
            className
        )}>
            {showIcon && (
                <Sparkles className={cn(
                    'text-purple-400',
                    size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
                )} />
            )}
            {label}
        </div>
    );
}

export default AIBadge;

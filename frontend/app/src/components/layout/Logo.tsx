'use client';

import { cn } from '@/lib/utils';
import { Building2 } from 'lucide-react';

interface LogoProps {
    size?: 'sm' | 'md' | 'lg';
    variant?: 'full' | 'icon';
    className?: string;
    showText?: boolean;
}

const sizeClasses = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-14',
};

const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
};

const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
};

export function Logo({
    size = 'md',
    variant = 'full',
    className,
    showText = true
}: LogoProps) {
    return (
        <div className={cn('flex items-center gap-3', sizeClasses[size], className)}>
            {/* Logo Icon - matches login page design */}
            <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 bg-primary/20 rounded-lg blur-md" />
                <div className="relative bg-gradient-to-br from-primary to-primary/80 p-2 rounded-lg shadow-lg">
                    <Building2 className={cn('text-white', iconSizes[size])} />
                </div>
            </div>

            {/* Logo Text - only shown for 'full' variant */}
            {variant === 'full' && showText && (
                <div className="flex flex-col">
                    <span className={cn(
                        'font-bold text-white tracking-tight leading-none',
                        textSizes[size]
                    )}>
                        AI-Properties
                    </span>
                    {size !== 'sm' && (
                        <span className="text-xs text-muted-foreground mt-0.5">
                            Real Estate CRM
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

export default Logo;

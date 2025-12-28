import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    description?: string;
    className?: string;
}

export function KPICard({
    title,
    value,
    icon: Icon,
    trend,
    description,
    className
}: KPICardProps) {
    return (
        <div className={cn(
            'bg-card rounded-xl border border-border p-6 transition-all hover:shadow-md',
            className
        )}>
            <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-muted-foreground">
                        {title}
                    </span>
                    <span className="text-3xl font-bold text-foreground">
                        {value}
                    </span>
                    {trend && (
                        <div className={cn(
                            'flex items-center gap-1 text-sm font-medium mt-1',
                            trend.isPositive ? 'text-green-500' : 'text-red-500'
                        )}>
                            <span>{trend.isPositive ? '↑' : '↓'}</span>
                            <span>{Math.abs(trend.value)}%</span>
                            <span className="text-muted-foreground font-normal">vs last month</span>
                        </div>
                    )}
                    {description && (
                        <span className="text-xs text-muted-foreground mt-1">
                            {description}
                        </span>
                    )}
                </div>
                <div className="p-3 rounded-lg bg-primary/10">
                    <Icon className="w-6 h-6 text-primary" />
                </div>
            </div>
        </div>
    );
}

export default KPICard;

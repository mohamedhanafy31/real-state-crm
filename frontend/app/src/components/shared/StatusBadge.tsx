import { cn } from '@/lib/utils';

export type StatusType =
    | 'available'
    | 'sold'
    | 'reserved'
    | 'pending'
    | 'new'
    | 'contacted'
    | 'negotiating'
    | 'closed'
    | 'lost'
    | 'active';

interface StatusBadgeProps {
    status: StatusType;
    className?: string;
    showDot?: boolean;
}

const statusConfig: Record<StatusType, { label: string; bgClass: string; textClass: string; dotClass: string }> = {
    available: {
        label: 'Available',
        bgClass: 'bg-green-100 dark:bg-green-900/40',
        textClass: 'text-green-800 dark:text-green-300',
        dotClass: 'bg-green-500',
    },
    active: {
        label: 'Active',
        bgClass: 'bg-green-100 dark:bg-green-900/40',
        textClass: 'text-green-800 dark:text-green-300',
        dotClass: 'bg-green-500',
    },
    sold: {
        label: 'Sold',
        bgClass: 'bg-red-100 dark:bg-red-900/40',
        textClass: 'text-red-800 dark:text-red-300',
        dotClass: 'bg-red-500',
    },
    reserved: {
        label: 'Reserved',
        bgClass: 'bg-orange-100 dark:bg-orange-900/40',
        textClass: 'text-orange-800 dark:text-orange-300',
        dotClass: 'bg-orange-500',
    },
    pending: {
        label: 'Pending',
        bgClass: 'bg-yellow-100 dark:bg-yellow-900/40',
        textClass: 'text-yellow-800 dark:text-yellow-300',
        dotClass: 'bg-yellow-500',
    },
    new: {
        label: 'New',
        bgClass: 'bg-blue-100 dark:bg-blue-900/40',
        textClass: 'text-blue-800 dark:text-blue-300',
        dotClass: 'bg-blue-500',
    },
    contacted: {
        label: 'Contacted',
        bgClass: 'bg-purple-100 dark:bg-purple-900/40',
        textClass: 'text-purple-800 dark:text-purple-300',
        dotClass: 'bg-purple-500',
    },
    negotiating: {
        label: 'Negotiating',
        bgClass: 'bg-cyan-100 dark:bg-cyan-900/40',
        textClass: 'text-cyan-800 dark:text-cyan-300',
        dotClass: 'bg-cyan-500',
    },
    closed: {
        label: 'Closed',
        bgClass: 'bg-blue-100 dark:bg-blue-900/40',
        textClass: 'text-blue-800 dark:text-blue-300',
        dotClass: 'bg-blue-500',
    },
    lost: {
        label: 'Lost',
        bgClass: 'bg-red-100 dark:bg-red-900/40',
        textClass: 'text-red-800 dark:text-red-300',
        dotClass: 'bg-red-500',
    },
};

export function StatusBadge({ status, className, showDot = true }: StatusBadgeProps) {
    const config = statusConfig[status];

    return (
        <div className={cn(
            'inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium',
            config.bgClass,
            config.textClass,
            className
        )}>
            {showDot && (
                <span className={cn('h-2 w-2 rounded-full', config.dotClass)} />
            )}
            {config.label}
        </div>
    );
}

export default StatusBadge;

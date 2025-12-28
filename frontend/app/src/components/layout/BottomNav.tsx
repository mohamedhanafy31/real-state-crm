'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    Building2,
    Grid3X3,
    ClipboardList,
    Users,
    UserCog,
    MessageSquare,
    Settings,
    RefreshCw,
    MapPin,
} from 'lucide-react';

export type UserRole = 'broker' | 'supervisor';

interface NavItem {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
}

interface BottomNavProps {
    role?: UserRole;
}

const brokerNav: NavItem[] = [
    { label: 'Dashboard', href: '/broker/dashboard', icon: LayoutDashboard },
    { label: 'Requests', href: '/broker/requests', icon: ClipboardList },
    { label: 'Clients', href: '/broker/clients', icon: Users },
    { label: 'Units', href: '/broker/units', icon: Building2 },
    { label: 'Settings', href: '/broker/settings', icon: Settings },
];

const supervisorNav: NavItem[] = [
    { label: 'Dashboard', href: '/supervisor/dashboard', icon: LayoutDashboard },
    { label: 'Areas', href: '/supervisor/areas', icon: MapPin },
    { label: 'Projects', href: '/supervisor/projects', icon: Building2 },
    { label: 'Units', href: '/supervisor/units', icon: Grid3X3 },
    { label: 'Settings', href: '/supervisor/settings', icon: Settings },
];

const navByRole: Record<UserRole, NavItem[]> = {
    broker: brokerNav,
    supervisor: supervisorNav,
};

export function BottomNav({ role = 'broker' }: BottomNavProps) {
    const pathname = usePathname();
    const navItems = navByRole[role];

    const isActive = (href: string) => {
        return pathname === href || pathname.startsWith(href + '/');
    };

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-card border-t border-border">
            <div className="flex items-center justify-around h-16 px-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex flex-col items-center justify-center gap-1 px-2 py-1 rounded-lg transition-colors min-w-0 flex-1',
                                active
                                    ? 'text-primary'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <Icon className={cn('w-5 h-5 shrink-0', active && 'text-primary')} />
                            <span className={cn(
                                'text-[10px] font-medium truncate max-w-full',
                                active && 'text-primary'
                            )}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}

export default BottomNav;

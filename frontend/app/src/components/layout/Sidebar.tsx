'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Logo } from './Logo';
import { useAuth } from '@/lib/context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
    LayoutDashboard,
    Building2,
    Grid3X3,
    ClipboardList,
    Users,
    UserCog,
    MessageSquare,
    Settings,
    LogOut,
    HelpCircle,
    Plus,
    BarChart3,
    RefreshCw,
    MapPin,
} from 'lucide-react';

export type UserRole = 'broker' | 'supervisor';

interface NavItem {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
}

interface SidebarProps {
    role?: UserRole;
    user?: {
        name: string;
        email: string;
        avatar?: string;
        role: string;
    };
    className?: string;
}

const brokerNav: NavItem[] = [
    { label: 'Dashboard', href: '/broker/dashboard', icon: LayoutDashboard },
    { label: 'Requests', href: '/broker/requests', icon: ClipboardList },
    { label: 'Clients', href: '/broker/clients', icon: Users },
    { label: 'Units', href: '/broker/units', icon: Building2 },
    { label: 'Conversations', href: '/broker/conversations', icon: MessageSquare },
];

const supervisorNav: NavItem[] = [
    { label: 'Dashboard', href: '/supervisor/dashboard', icon: LayoutDashboard },
    { label: 'Brokers', href: '/supervisor/brokers', icon: UserCog },
    { label: 'Reassignments', href: '/supervisor/reassignments', icon: RefreshCw },
    { label: 'Areas', href: '/supervisor/areas', icon: MapPin },
    { label: 'Projects', href: '/supervisor/projects', icon: Building2 },
    { label: 'Units', href: '/supervisor/units', icon: Grid3X3 },
    { label: 'Users', href: '/supervisor/users', icon: Users },
];

const navByRole: Record<UserRole, NavItem[]> = {
    broker: brokerNav,
    supervisor: supervisorNav,
};

export function Sidebar({ role = 'broker', user, className }: SidebarProps) {
    const pathname = usePathname();
    const { logout } = useAuth();
    const navItems = navByRole[role];

    const isActive = (href: string) => {
        return pathname === href || pathname.startsWith(href + '/');
    };

    return (
        <aside
            className={cn(
                'flex w-64 flex-col bg-sidebar p-4 border-r border-sidebar-border h-screen',
                'dark:bg-[#111a22]',
                className
            )}
        >
            {/* Logo Section */}
            <div className="flex flex-col gap-4 mb-8">
                <div className="py-2">
                    <Logo size="md" variant="full" />
                </div>

                {/* User Profile */}
                {user && (
                    <div className="flex gap-3 items-center mt-4 p-2 rounded-lg bg-sidebar-accent/50">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback className="bg-primary text-primary-foreground">
                                {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium text-foreground truncate">
                                {user.name}
                            </span>
                            <span className="text-xs text-muted-foreground capitalize">
                                {user.role}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Navigation */}
            <nav className="flex flex-col gap-1 flex-1">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                                active
                                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                    : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
                            )}
                        >
                            <Icon className={cn('w-5 h-5', active && 'text-primary')} />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Quick Action Button */}
            <div className="mt-auto">
                <Button
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                >
                    <Plus className="w-4 h-4" />
                    New Request
                </Button>

                <Separator className="my-4" />

                {/* Footer Links */}
                <div className="flex flex-col gap-1">
                    <Link
                        href={`/${role}/settings`}
                        className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                            isActive(`/${role}/settings`)
                                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
                        )}
                    >
                        <Settings className={cn('w-5 h-5', isActive(`/${role}/settings`) && 'text-primary')} />
                        <span>Settings</span>
                    </Link>
                    <Link
                        href="/help"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground transition-colors"
                    >
                        <HelpCircle className="w-5 h-5" />
                        <span>Help</span>
                    </Link>
                    <button
                        onClick={logout}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors w-full text-left"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>Logout</span>
                    </button>
                </div>
            </div>
        </aside>
    );
}

export default Sidebar;

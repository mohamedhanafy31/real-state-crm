'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Sidebar, type UserRole } from './Sidebar';
import { BottomNav } from './BottomNav';
import { Logo } from './Logo';
import { Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageTransition, FadeIn } from '@/components/ui/page-transition';

interface DashboardLayoutProps {
    children: ReactNode;
    role?: UserRole;
    user?: {
        name: string;
        email: string;
        avatar?: string;
        role: string;
    };
    pageTitle?: string;
    pageDescription?: string;
    actions?: ReactNode;
    showSearch?: boolean;
}

export function DashboardLayout({
    children,
    role = 'broker',
    user,
    pageTitle,
    pageDescription,
    actions,
    showSearch = false,
}: DashboardLayoutProps) {
    return (
        <div className="flex h-screen bg-background dark">
            {/* Sidebar Navigation - Desktop Only */}
            <div className="hidden lg:block">
                <Sidebar role={role} user={user} />
            </div>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Top Bar */}
                <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        {/* Logo - visible on mobile/tablet when sidebar is hidden */}
                        <div className="lg:hidden">
                            <Logo size="sm" variant="full" />
                        </div>

                        {showSearch && (
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search..."
                                    className="pl-9 w-64 bg-muted border-0"
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" className="relative">
                            <Bell className="w-5 h-5" />
                            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                                3
                            </span>
                        </Button>
                    </div>
                </header>

                {/* Page Content - Add bottom padding on mobile for bottom nav */}
                <div className="flex-1 overflow-y-auto p-6 lg:p-8 pb-20 lg:pb-8">
                    <PageTransition>
                        {/* Page Header */}
                        {(pageTitle || actions) && (
                            <FadeIn delay={0.1}>
                                <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                                    <div className="flex flex-col gap-1">
                                        {pageTitle && (
                                            <h1 className="text-3xl lg:text-4xl font-black text-foreground tracking-tight">
                                                {pageTitle}
                                            </h1>
                                        )}
                                        {pageDescription && (
                                            <p className="text-muted-foreground">
                                                {pageDescription}
                                            </p>
                                        )}
                                    </div>
                                    {actions && (
                                        <div className="flex items-center gap-3">
                                            {actions}
                                        </div>
                                    )}
                                </div>
                            </FadeIn>
                        )}

                        {/* Main Content */}
                        <FadeIn delay={0.2}>
                            {children}
                        </FadeIn>
                    </PageTransition>
                </div>
            </main>

            {/* Bottom Navigation - Mobile Only */}
            <BottomNav role={role} />
        </div>
    );
}

export default DashboardLayout;

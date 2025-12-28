'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/context/AuthContext';
import { getSupervisorDashboard, type SupervisorDashboardMetrics } from '@/lib/api/supervisor';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
    Users,
    UserCheck,
    FileText,
    RefreshCw,
    Loader2,
    Clock,
    Building2,
    Grid3X3,
    MapPin,
    ArrowUpRight,
    CheckCircle2,
    Clock4,
    XCircle,
    LayoutDashboard
} from 'lucide-react';

export default function SupervisorDashboard() {
    const { user, isLoading: authLoading, isAuthenticated } = useAuth();
    const router = useRouter();
    const [dashboardData, setDashboardData] = useState<SupervisorDashboardMetrics | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                setIsLoading(true);
                const data = await getSupervisorDashboard();
                setDashboardData(data);
            } catch (error) {
                console.error('Failed to fetch dashboard:', error);
                toast.error('Failed to load dashboard data');
            } finally {
                setIsLoading(false);
            }
        };

        if (!authLoading && isAuthenticated && user?.role === 'supervisor') {
            fetchDashboard();
        }
    }, [authLoading, isAuthenticated, user]);

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isAuthenticated || user?.role !== 'supervisor') {
        return null;
    }

    const dashboardUser = user ? {
        name: user.name,
        email: user.email || user.phone,
        role: user.role.charAt(0).toUpperCase() + user.role.slice(1),
    } : undefined;

    return (
        <DashboardLayout
            role="supervisor"
            user={dashboardUser}
            pageTitle="Supervisor Operations"
            pageDescription="Complete overview of brokers, inventory, and lead performance"
        >
            <div className="space-y-8">
                {/* System Overview KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-card border-border overflow-hidden">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Brokers</p>
                                    <div className="flex items-baseline gap-2">
                                        <h3 className="text-2xl font-bold">{dashboardData?.totalBrokers || 0}</h3>
                                        <span className="text-xs text-green-500 font-medium flex items-center">
                                            {dashboardData?.activeBrokers || 0} Active
                                        </span>
                                    </div>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                    <Users className="w-6 h-6 text-blue-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border overflow-hidden">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Inventory Units</p>
                                    <div className="flex items-baseline gap-2">
                                        <h3 className="text-2xl font-bold">{dashboardData?.totalUnits || 0}</h3>
                                        <span className="text-xs text-primary font-medium">
                                            {dashboardData?.totalProjects || 0} Projects
                                        </span>
                                    </div>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                                    <Grid3X3 className="w-6 h-6 text-purple-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border overflow-hidden">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Active Areas</p>
                                    <h3 className="text-2xl font-bold">{dashboardData?.totalAreas || 0}</h3>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                    <MapPin className="w-6 h-6 text-emerald-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border overflow-hidden border-l-4 border-l-orange-500">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Reassignments</p>
                                    <h3 className="text-2xl font-bold text-orange-500">{dashboardData?.pendingReassignments || 0}</h3>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                                    <RefreshCw className="w-6 h-6 text-orange-500 animate-spin-slow" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Leads Breakdown */}
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <FileText className="w-5 h-5 text-primary" />
                                Leads Performance breakdown
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 text-center">
                                    <p className="text-xs font-medium text-blue-500 uppercase tracking-wider mb-1">New</p>
                                    <p className="text-2xl font-bold">{dashboardData?.requestStatusBreakdown.new || 0}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/10 text-center">
                                    <p className="text-xs font-medium text-yellow-600 uppercase tracking-wider mb-1">In Progress</p>
                                    <p className="text-2xl font-bold">{dashboardData?.requestStatusBreakdown.in_progress || 0}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10 text-center">
                                    <p className="text-xs font-medium text-green-600 uppercase tracking-wider mb-1">Closed</p>
                                    <p className="text-2xl font-bold">{dashboardData?.requestStatusBreakdown.closed || 0}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 text-center">
                                    <p className="text-xs font-medium text-red-500 uppercase tracking-wider mb-1">Lost</p>
                                    <p className="text-2xl font-bold">{dashboardData?.requestStatusBreakdown.withdrawn || 0}</p>
                                </div>
                            </div>

                            <div className="mt-8 space-y-4">
                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                    <Building2 className="w-4 h-4" />
                                    Inventory Summary
                                </h4>
                                <div className="space-y-3">
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">Reserved Units</span>
                                            <span className="font-medium">{dashboardData?.reservedUnits || 0} / {dashboardData?.totalUnits || 0}</span>
                                        </div>
                                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary transition-all duration-500"
                                                style={{ width: `${(dashboardData?.reservedUnits || 0) / (dashboardData?.totalUnits || 1) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6 pt-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-primary" />
                                            <span className="text-xs text-muted-foreground">Reserved ({dashboardData?.reservedUnits})</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-muted" />
                                            <span className="text-xs text-muted-foreground">Available ({dashboardData?.availableUnits})</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Access */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Management shortcuts</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <button
                                onClick={() => router.push('/supervisor/brokers')}
                                className="w-full flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 border border-transparent hover:border-border transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                        <Users className="w-5 h-5 text-blue-500" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-semibold">Brokers List</p>
                                        <p className="text-xs text-muted-foreground">Manage accounts</p>
                                    </div>
                                </div>
                                <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>

                            <button
                                onClick={() => router.push('/supervisor/reassignments')}
                                className="w-full flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 border border-transparent hover:border-border transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                                        <RefreshCw className="w-5 h-5 text-orange-500" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-semibold">Reassignments</p>
                                        <p className="text-xs text-muted-foreground">{dashboardData?.pendingReassignments} pending</p>
                                    </div>
                                </div>
                                <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>

                            <button
                                onClick={() => router.push('/supervisor/projects')}
                                className="w-full flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 border border-transparent hover:border-border transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                        <Building2 className="w-5 h-5 text-purple-500" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-semibold">Projects</p>
                                        <p className="text-xs text-muted-foreground">{dashboardData?.totalProjects} current</p>
                                    </div>
                                </div>
                                <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>

                            <button
                                onClick={() => router.push('/supervisor/units')}
                                className="w-full flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 border border-transparent hover:border-border transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                        <Grid3X3 className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-semibold">Inventory</p>
                                        <p className="text-xs text-muted-foreground">Detailed units</p>
                                    </div>
                                </div>
                                <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Activity Timeline */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Clock className="w-5 h-5 text-primary" />
                            Operations Log
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!dashboardData?.recentActivity || dashboardData.recentActivity.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Clock4 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>No operations recorded yet</p>
                            </div>
                        ) : (
                            <div className="relative space-y-0 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border/50 before:to-transparent">
                                {dashboardData.recentActivity.map((activity, index) => (
                                    <div key={index} className="relative flex items-center py-4 group">
                                        <div className="absolute left-0 w-10 h-10 flex items-center justify-center rounded-full bg-card border border-border group-hover:border-primary/50 transition-colors z-10 shadow-sm">
                                            {activity.type === 'request_reassigned' ? (
                                                <RefreshCw className="w-4 h-4 text-orange-500" />
                                            ) : activity.type === 'broker_created' ? (
                                                <UserCheck className="w-4 h-4 text-green-500" />
                                            ) : (
                                                <CheckCircle2 className="w-4 h-4 text-blue-500" />
                                            )}
                                        </div>
                                        <div className="flex-1 ml-14">
                                            <div className="flex items-center justify-between gap-4">
                                                <p className="text-sm font-medium">{activity.description}</p>
                                                <time className="text-xs text-muted-foreground whitespace-nowrap">
                                                    {format(new Date(activity.timestamp), 'HH:mm · MMM dd')}
                                                </time>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}

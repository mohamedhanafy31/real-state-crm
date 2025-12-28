'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getBrokerPerformance, getBrokerRequests, type BrokerPerformance, type Request } from '@/lib/api/broker';
import { DashboardLayout } from '@/components/layout';
import { KPICard, StatusBadge, AIBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/context/AuthContext';
import {
    ClipboardList,
    Users,
    TrendingUp,
    Sparkles,
    ArrowRight,
    Phone,
    Eye,
    Loader2,
    Target,
} from 'lucide-react';

const mockAIInsights = [
    { title: 'Hot Lead Alert', description: 'Ahmed Hassan matches 3 available units in New Cairo', priority: 'high' },
    { title: 'Follow-up Reminder', description: '5 clients need follow-up today', priority: 'medium' },
    { title: 'Market Trend', description: 'Increased demand for 2BR apartments in Sheikh Zayed', priority: 'low' },
];

export default function BrokerDashboardPage() {
    const { user, isLoading: authLoading, isAuthenticated } = useAuth();
    const router = useRouter();
    const [performance, setPerformance] = useState<BrokerPerformance | null>(null);
    const [requests, setRequests] = useState<Request[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        const fetchData = async () => {
            if (!user?.userId) {
                setIsLoadingData(false);
                return;
            }

            try {
                setIsLoadingData(true);
                const [perfData, reqData] = await Promise.all([
                    getBrokerPerformance(user.userId),
                    getBrokerRequests(user.userId),
                ]);
                setPerformance(perfData);
                setRequests(reqData);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setIsLoadingData(false);
            }
        };

        // Only fetch once auth is done loading
        if (!authLoading) {
            fetchData();
        }
    }, [user?.userId, authLoading]);

    // Show loading only if auth is still checking
    if (authLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    const dashboardUser = user ? {
        name: user.name,
        email: user.email || user.phone,
        role: user.role.charAt(0).toUpperCase() + user.role.slice(1),
    } : undefined;

    // Calculate Dynamic KPIs
    const activeRequestsCount = requests.filter(r =>
        r.status === 'new' || r.status === 'contacted' || r.status === 'negotiating'
    ).length;

    const closedDealsCount = requests.filter(r => r.status === 'closed' || r.status === 'reserved').length;

    // Unique clients count
    const totalClients = new Set(requests.map(r => r.customer?.customerId).filter(Boolean)).size;

    const kpis = [
        {
            title: 'Active Requests',
            value: activeRequestsCount,
            icon: ClipboardList,
            trend: { value: 0, isPositive: true }
        },
        {
            title: 'Total Clients',
            value: totalClients,
            icon: Users,
            trend: { value: 0, isPositive: true }
        },
        {
            title: 'Closed Deals',
            value: closedDealsCount,
            icon: Target,
            trend: { value: 0, isPositive: true }
        },
        {
            title: 'Closing Rate',
            value: performance && performance.closingRate > 0 ? `${performance.closingRate}%` :
                requests.length > 0 ? `${Math.round((closedDealsCount / requests.length) * 100)}%` : '0%',
            icon: TrendingUp,
            trend: { value: 0, isPositive: true }
        },
    ];

    return (
        <DashboardLayout
            role="broker"
            user={dashboardUser}
            pageTitle="Dashboard"
            pageDescription={`Welcome back, ${user?.name || 'Broker'}! Here's an overview of your activity.`}
        >
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {kpis.map((kpi) => (
                    <KPICard
                        key={kpi.title}
                        title={kpi.title}
                        value={isLoadingData ? '...' : kpi.value}
                        icon={kpi.icon}
                        trend={kpi.trend}
                    />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* AI Insights Panel */}
                <Card className="lg:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary" />
                            AI Insights
                        </CardTitle>
                        <AIBadge size="sm" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {mockAIInsights.map((insight, index) => (
                            <div
                                key={index}
                                className="p-3 rounded-lg bg-muted/50 border border-border hover:border-primary/30 transition-colors cursor-pointer"
                            >
                                <h4 className="font-medium text-sm text-foreground mb-1">
                                    {insight.title}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                    {insight.description}
                                </p>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Recent Requests */}
                <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg font-semibold">Recent Requests</CardTitle>
                        <Link href="/broker/requests">
                            <Button variant="ghost" size="sm" className="text-primary">
                                View All <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent>
                        {isLoadingData ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {requests.slice(0, 5).map((request) => (
                                    <div
                                        key={request.requestId}
                                        className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                                        onClick={() => router.push(`/broker/requests/${request.requestId}`)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                <Users className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-foreground">{request.customer?.name || 'Unknown Client'}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {request.area?.name || 'General Area'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <StatusBadge status={request.status as any} />
                                            <div className="flex gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // Phone action
                                                    }}
                                                >
                                                    <Phone className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        router.push(`/broker/requests/${request.requestId}`);
                                                    }}
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {requests.length === 0 && (
                                    <div className="text-center py-6 text-muted-foreground">
                                        No requests assigned to you yet.
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/context/AuthContext';
import { getWithdrawnRequests, reassignRequest, getAllBrokers, type BrokerWithStats } from '@/lib/api/supervisor';
import { type Request } from '@/lib/api/requests';
import { Loader2, RefreshCw, Users, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function ReassignmentsPage() {
    const { user, isLoading: authLoading, isAuthenticated } = useAuth();
    const router = useRouter();
    const [requests, setRequests] = useState<Request[]>([]);
    const [brokers, setBrokers] = useState<BrokerWithStats[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
    const [selectedBroker, setSelectedBroker] = useState<string | null>(null);
    const [isReassigning, setIsReassigning] = useState(false);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                const [withdrawnReqs, allBrokers] = await Promise.all([
                    getWithdrawnRequests(),
                    getAllBrokers()
                ]);
                setRequests(withdrawnReqs);
                setBrokers(allBrokers.filter(b => b.user.isActive));
            } catch (error) {
                console.error('Failed to fetch data:', error);
                toast.error('Failed to load reassignment data');
            } finally {
                setIsLoading(false);
            }
        };

        if (!authLoading && isAuthenticated && user?.role === 'supervisor') {
            fetchData();
        }
    }, [authLoading, isAuthenticated, user]);

    const handleReassign = async () => {
        if (!selectedRequest || !selectedBroker) return;

        try {
            setIsReassigning(true);
            await reassignRequest(selectedRequest.requestId, selectedBroker);
            toast.success('Request reassigned successfully');

            // Remove from list
            setRequests(requests.filter(r => r.requestId !== selectedRequest.requestId));
            setSelectedRequest(null);
            setSelectedBroker(null);
        } catch (error) {
            console.error('Failed to reassign:', error);
            toast.error('Failed to reassign request');
        } finally {
            setIsReassigning(false);
        }
    };

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
            pageTitle="Request Reassignments"
            pageDescription="Manage withdrawn requests and reassign to available brokers"
        >
            <div className="space-y-6">
                {/* Stats */}
                <Card className="bg-card border-border">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
                                <RefreshCw className="w-6 h-6 text-orange-500" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold">{requests.length}</p>
                                <p className="text-sm text-muted-foreground">Pending Reassignments</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {requests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <RefreshCw className="w-16 h-16 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium mb-2">No Pending Reassignments</p>
                        <p className="text-muted-foreground text-center">
                            All withdrawn requests have been reassigned
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Withdrawn Requests List */}
                        <div>
                            <h2 className="text-lg font-semibold mb-4">Withdrawn Requests</h2>
                            <div className="space-y-3">
                                {requests.map((request) => (
                                    <Card
                                        key={request.requestId}
                                        className={`bg-card border-border cursor-pointer transition-all ${selectedRequest?.requestId === request.requestId
                                                ? 'border-primary'
                                                : 'hover:border-primary/50'
                                            }`}
                                        onClick={() => setSelectedRequest(request)}
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <p className="font-medium">Request #{request.requestId}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {request.customer?.name || 'Unknown Customer'}
                                                    </p>
                                                </div>
                                                <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                                                    Withdrawn
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {format(new Date(request.createdAt), 'MMM dd, yyyy')}
                                            </p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>

                        {/* Broker Selection */}
                        <div>
                            <h2 className="text-lg font-semibold mb-4">
                                {selectedRequest ? 'Select New Broker' : 'Select a request first'}
                            </h2>
                            {selectedRequest ? (
                                <div className="space-y-4">
                                    <Card className="bg-muted/50 border-border">
                                        <CardContent className="p-4">
                                            <div className="flex items-start gap-2">
                                                <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
                                                <div>
                                                    <p className="text-sm font-medium">Reassigning Request #{selectedRequest.requestId}</p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        Select a broker below to reassign this request
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <div className="space-y-2">
                                        {brokers.map((broker) => (
                                            <Card
                                                key={broker.brokerId}
                                                className={`bg-card border-border cursor-pointer transition-all ${selectedBroker === broker.brokerId
                                                        ? 'border-primary ring-2 ring-primary/20'
                                                        : 'hover:border-primary/50'
                                                    }`}
                                                onClick={() => setSelectedBroker(broker.brokerId)}
                                            >
                                                <CardContent className="p-4">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="font-medium">{broker.user.name}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {broker.brokerAreas.map(ba => ba.area.name).join(', ') || 'No areas'}
                                                            </p>
                                                        </div>
                                                        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                                                            Active
                                                        </Badge>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>

                                    <Button
                                        className="w-full"
                                        disabled={!selectedBroker || isReassigning}
                                        onClick={handleReassign}
                                    >
                                        {isReassigning ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Reassigning...
                                            </>
                                        ) : (
                                            <>
                                                <RefreshCw className="w-4 h-4 mr-2" />
                                                Confirm Reassignment
                                            </>
                                        )}
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                                    <Users className="w-12 h-12 mb-3 opacity-50" />
                                    <p className="text-sm">Select a request to see available brokers</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout';
import { StatusBadge, AIBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/lib/context/AuthContext';
import { getRequests, type Request, type Customer } from '@/lib/api/requests';
import {
    Search,
    Download,
    ChevronLeft,
    ChevronRight,
    User,
    Filter,
    Loader2,
    Phone,
    Mail,
} from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';

interface ClientWithStats extends Customer {
    requestCount: number;
    latestStatus: string;
    lastInteraction: string;
}

export default function ClientsPage() {
    const { user, isLoading: authLoading, isAuthenticated } = useAuth();
    const router = useRouter();

    const [clients, setClients] = useState<ClientWithStats[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    const fetchClients = async () => {
        if (!user?.userId) {
            setHasFetched(true);
            return;
        }

        try {
            setIsLoading(true);
            // Fetch requests assigned to this broker
            const requests = await getRequests({ assignedBrokerId: user.userId });

            // Extract unique clients from requests
            const clientMap = new Map<string, ClientWithStats>();

            requests.forEach((request: Request) => {
                if (request.customer) {
                    const existing = clientMap.get(request.customer.customerId);
                    if (existing) {
                        existing.requestCount++;
                        // Update to latest status if this request is newer
                        if (new Date(request.updatedAt) > new Date(existing.lastInteraction)) {
                            existing.latestStatus = request.status;
                            existing.lastInteraction = request.updatedAt;
                        }
                    } else {
                        clientMap.set(request.customer.customerId, {
                            ...request.customer,
                            requestCount: 1,
                            latestStatus: request.status,
                            lastInteraction: request.updatedAt,
                        });
                    }
                }
            });

            setClients(Array.from(clientMap.values()));
        } catch (error) {
            console.error('Error fetching clients:', error);
            toast.error('Failed to load clients');
        } finally {
            setIsLoading(false);
            setHasFetched(true);
        }
    };

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            fetchClients();
        }
    }, [authLoading, isAuthenticated, user?.userId]);

    // Filter clients
    const filteredClients = clients.filter((client) => {
        const matchesSearch = !searchQuery ||
            client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            client.phone?.includes(searchQuery) ||
            client.email?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === 'all' || client.latestStatus === statusFilter;

        return matchesSearch && matchesStatus;
    });

    // Pagination
    const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
    const paginatedClients = filteredClients.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

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

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const getStatusType = (status: string): 'active' | 'closed' | 'lost' | 'new' | 'contacted' | 'negotiating' | 'reserved' => {
        if (['new', 'contacted', 'negotiating'].includes(status)) return 'active' as any;
        if (status === 'closed' || status === 'reserved') return 'closed' as any;
        if (status === 'lost') return 'lost' as any;
        return status as any;
    };

    return (
        <DashboardLayout
            role="broker"
            user={dashboardUser}
            pageTitle="My Clients"
            pageDescription="Clients from your assigned requests."
        >
            <div className="space-y-6">
                {/* Search Bar with AI Badge */}
                <div className="relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    </div>
                    <Input
                        className="pl-12 pr-32 h-14 bg-card border-border rounded-xl text-lg focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                        placeholder="Search clients by name, phone, or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <div className="absolute inset-y-0 right-4 flex items-center">
                        <AIBadge label="AI-Powered" size="md" />
                    </div>
                </div>

                {/* Filters and Actions */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[160px] h-11 bg-card border-border rounded-lg">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-4 h-4 text-muted-foreground" />
                                    <SelectValue placeholder="Status" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="new">New</SelectItem>
                                <SelectItem value="contacted">Contacted</SelectItem>
                                <SelectItem value="negotiating">Negotiating</SelectItem>
                                <SelectItem value="reserved">Reserved</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                                <SelectItem value="lost">Lost</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="text-sm text-muted-foreground">
                            {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''} found
                        </div>
                    </div>

                    <Button variant="outline" className="h-11 gap-2 border-border bg-card hover:bg-muted font-bold px-5 rounded-lg shadow-sm transition-all active:scale-95">
                        Export Client List
                        <Download className="w-4 h-4" />
                    </Button>
                </div>

                {/* Client Grid */}
                {isLoading && !hasFetched ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : paginatedClients.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        {searchQuery || statusFilter !== 'all'
                            ? 'No clients match your filters'
                            : 'No clients found. Clients will appear here when you have assigned requests.'}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {paginatedClients.map((client) => (
                            <Card key={client.customerId} className="overflow-hidden border-border bg-card hover:border-primary/40 transition-all duration-300 hover:shadow-xl group cursor-pointer">
                                <CardContent className="p-0">
                                    {/* Card Top: Profile Info */}
                                    <div className="p-6 pb-4 border-b border-border/50 group-hover:bg-primary/5 transition-colors">
                                        <div className="flex items-start gap-4">
                                            <div className="relative">
                                                <div className="w-16 h-16 rounded-xl overflow-hidden shadow-inner bg-primary/10 flex items-center justify-center">
                                                    <User className="w-8 h-8 text-primary" />
                                                </div>
                                                <div className="absolute -bottom-1 -right-1">
                                                    <StatusBadge status={getStatusType(client.latestStatus)} className="scale-75 origin-bottom-right shadow-sm" showDot={false} />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-lg text-foreground truncate group-hover:text-primary transition-colors">
                                                    {client.name}
                                                </h3>
                                                <div className="mt-1">
                                                    <StatusBadge status={getStatusType(client.latestStatus)} className="px-2 py-0 h-6 text-[10px]" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Bottom: Metrics */}
                                    <div className="p-6 space-y-3 bg-card/50">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Phone className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-foreground">{client.phone || 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Mail className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-foreground truncate">{client.email || 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm pt-2 border-t border-border/50">
                                            <span className="text-muted-foreground font-medium">Requests:</span>
                                            <span className="font-bold text-primary">{client.requestCount}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground font-medium">Last Activity:</span>
                                            <span className="font-bold text-foreground">{formatDate(client.lastInteraction)}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 mt-12 py-4">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 border-border bg-card hover:border-primary transition-colors"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => p - 1)}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }
                                return (
                                    <Button
                                        key={pageNum}
                                        variant={currentPage === pageNum ? 'default' : 'ghost'}
                                        className={`h-10 w-10 font-bold ${currentPage === pageNum
                                            ? 'bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30'
                                            : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        onClick={() => setCurrentPage(pageNum)}
                                    >
                                        {pageNum}
                                    </Button>
                                );
                            })}
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 border-border bg-card hover:border-primary transition-colors"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => p + 1)}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

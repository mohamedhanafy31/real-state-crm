'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout';
import { StatusBadge, AIBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/lib/context/AuthContext';
import { getRequests, type Request } from '@/lib/api/requests';
import {
    Search,
    Filter,
    Download,
    Eye,
    Phone,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Loader2,
    RefreshCw,
    Users,
    MapPin,
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_OPTIONS = [
    { value: 'all', label: 'All Statuses' },
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'negotiating', label: 'Negotiating' },
    { value: 'reserved', label: 'Reserved' },
    { value: 'closed', label: 'Closed' },
    { value: 'lost', label: 'Lost' },
];

export default function RequestsPage() {
    const { user, isLoading: authLoading, isAuthenticated } = useAuth();
    const router = useRouter();

    const [requests, setRequests] = useState<Request[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    const fetchRequests = async () => {
        if (!user?.userId) {
            setHasFetched(true);
            return;
        }

        try {
            setIsLoading(true);
            const filters: any = {};
            if (statusFilter !== 'all') {
                filters.status = statusFilter;
            }
            // For brokers, filter by their assigned requests
            if (user?.role === 'broker') {
                filters.assignedBrokerId = user.userId;
            }
            const data = await getRequests(filters);
            setRequests(data);
        } catch (error) {
            console.error('Error fetching requests:', error);
            toast.error('Failed to load requests');
        } finally {
            setIsLoading(false);
            setHasFetched(true);
        }
    };

    useEffect(() => {
        // Fetch as soon as auth is done loading
        if (!authLoading && isAuthenticated) {
            fetchRequests();
        }
    }, [authLoading, isAuthenticated, user?.userId, statusFilter]);

    // Filter by search query
    const filteredRequests = requests.filter((request) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            request.customer?.name?.toLowerCase().includes(query) ||
            request.customer?.phone?.includes(query) ||
            request.area?.name?.toLowerCase().includes(query) ||
            request.requestId.toString().includes(query)
        );
    });

    // Pagination
    const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
    const paginatedRequests = filteredRequests.slice(
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

    return (
        <DashboardLayout
            role="broker"
            user={dashboardUser}
            pageTitle="Requests Management"
            pageDescription="View and manage all client requests assigned to you."
        >
            <div className="space-y-6">
                {/* Search and Filters */}
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search Bar */}
                    <div className="relative flex-1 group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        </div>
                        <Input
                            className="pl-12 pr-4 h-12 bg-card border-border rounded-xl text-base focus:ring-2 focus:ring-primary/20"
                            placeholder="Search by client name, phone, or area..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px] h-12 bg-card border-border rounded-lg">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-4 h-4 text-muted-foreground" />
                                    <SelectValue placeholder="Status" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                {STATUS_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button
                            variant="outline"
                            className="h-12 gap-2 border-border bg-card hover:bg-muted"
                            onClick={fetchRequests}
                        >
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </Button>

                        <Button
                            variant="outline"
                            className="h-12 gap-2 border-border bg-card hover:bg-muted"
                        >
                            <Download className="w-4 h-4" />
                            Export
                        </Button>
                    </div>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-card border-border">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                    <Users className="w-5 h-5 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{requests.length}</p>
                                    <p className="text-xs text-muted-foreground">Total Requests</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-card border-border">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                                    <Users className="w-5 h-5 text-green-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">
                                        {requests.filter((r) => r.status === 'new').length}
                                    </p>
                                    <p className="text-xs text-muted-foreground">New</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-card border-border">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                                    <Users className="w-5 h-5 text-yellow-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">
                                        {requests.filter((r) => r.status === 'negotiating').length}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Negotiating</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-card border-border">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Users className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">
                                        {requests.filter((r) => r.status === 'closed').length}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Closed</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Requests Table */}
                <Card className="border-border">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            Request List
                            <AIBadge size="sm" label="AI-Prioritized" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading && !hasFetched ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <>
                                <div className="rounded-lg border border-border overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                                <TableHead className="font-semibold">ID</TableHead>
                                                <TableHead className="font-semibold">Client</TableHead>
                                                <TableHead className="font-semibold">Area</TableHead>
                                                <TableHead className="font-semibold">Status</TableHead>
                                                <TableHead className="font-semibold">Created</TableHead>
                                                <TableHead className="font-semibold text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedRequests.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                                        No requests found
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                paginatedRequests.map((request) => (
                                                    <TableRow
                                                        key={request.requestId}
                                                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                                                        onClick={() => router.push(`/broker/requests/${request.requestId}`)}
                                                    >
                                                        <TableCell className="font-mono text-sm">
                                                            #{request.requestId}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                                                                    <Users className="w-4 h-4 text-primary" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium">{request.customer?.name || 'Unknown'}</p>
                                                                    <p className="text-xs text-muted-foreground">{request.customer?.phone}</p>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                                                {request.area?.name || 'N/A'}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <StatusBadge status={request.status as any} />
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground">
                                                            {formatDate(request.createdAt)}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        // Phone action
                                                                    }}
                                                                >
                                                                    <Phone className="h-4 w-4" />
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
                                                                    <Eye className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between mt-4">
                                        <p className="text-sm text-muted-foreground">
                                            Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
                                            {Math.min(currentPage * itemsPerPage, filteredRequests.length)} of{' '}
                                            {filteredRequests.length} requests
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-9 w-9"
                                                disabled={currentPage === 1}
                                                onClick={() => setCurrentPage((p) => p - 1)}
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </Button>
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
                                                        variant={currentPage === pageNum ? 'default' : 'outline'}
                                                        size="icon"
                                                        className="h-9 w-9"
                                                        onClick={() => setCurrentPage(pageNum)}
                                                    >
                                                        {pageNum}
                                                    </Button>
                                                );
                                            })}
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-9 w-9"
                                                disabled={currentPage === totalPages}
                                                onClick={() => setCurrentPage((p) => p + 1)}
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}

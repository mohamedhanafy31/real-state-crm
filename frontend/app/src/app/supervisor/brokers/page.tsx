'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/lib/context/AuthContext';

import { getAllBrokers, toggleBrokerStatus, deleteBroker, type BrokerWithStats } from '@/lib/api/supervisor';
import { Search, Loader2, Users, MapPin, Phone, Mail, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export default function BrokerManagementPage() {
    const { user, isLoading: authLoading, isAuthenticated } = useAuth();
    const router = useRouter();
    const [brokers, setBrokers] = useState<BrokerWithStats[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [brokerToDelete, setBrokerToDelete] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        const fetchBrokers = async () => {
            try {
                setIsLoading(true);
                const data = await getAllBrokers();
                setBrokers(data);
            } catch (error) {
                console.error('Failed to fetch brokers:', error);
                toast.error('Failed to load brokers');
            } finally {
                setIsLoading(false);
            }
        };

        if (!authLoading && isAuthenticated && user?.role === 'supervisor') {
            fetchBrokers();
        }
    }, [authLoading, isAuthenticated, user]);

    const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
        try {
            await toggleBrokerStatus(userId, !currentStatus);
            toast.success(`Broker ${!currentStatus ? 'activated' : 'deactivated'} successfully`);

            // Update local state
            setBrokers(brokers.map(broker =>
                broker.user.userId === userId
                    ? { ...broker, user: { ...broker.user, isActive: !currentStatus } }
                    : broker
            ));
        } catch (error) {
            console.error('Failed to toggle broker status:', error);
            toast.error('Failed to update broker status');
        }
    };

    const confirmDelete = (userId: string) => {
        setBrokerToDelete(userId);
        setDeleteModalOpen(true);
    };

    const handleDeleteBroker = async () => {
        if (!brokerToDelete) return;

        try {
            await deleteBroker(brokerToDelete);
            toast.success('Broker deleted successfully');
            setBrokers(brokers.filter(b => b.user.userId !== brokerToDelete));
            setDeleteModalOpen(false);
            setBrokerToDelete(null);
        } catch (error) {
            console.error('Failed to delete broker:', error);
            toast.error('Failed to delete broker');
        }
    };

    // Filter brokers
    const filteredBrokers = brokers.filter((broker) => {
        const matchesSearch = !searchQuery ||
            broker.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            broker.user.phone.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && broker.user.isActive) ||
            (statusFilter === 'inactive' && !broker.user.isActive);

        return matchesSearch && matchesStatus;
    });

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
            pageTitle="Broker Management"
            pageDescription="Manage broker accounts and assignments"
        >
            <div className="space-y-6">
                {/* Search and Filters */}
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <Input
                            className="pl-12 h-12 bg-card border-border rounded-xl"
                            placeholder="Search by name or phone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px] h-12 bg-card border-border rounded-lg">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-card border-border">
                        <CardContent className="p-4">
                            <div className="text-center">
                                <p className="text-3xl font-bold">{brokers.length}</p>
                                <p className="text-sm text-muted-foreground">Total Brokers</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-card border-border">
                        <CardContent className="p-4">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-green-500">
                                    {brokers.filter(b => b.user.isActive).length}
                                </p>
                                <p className="text-sm text-muted-foreground">Active</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-card border-border">
                        <CardContent className="p-4">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-red-500">
                                    {brokers.filter(b => !b.user.isActive).length}
                                </p>
                                <p className="text-sm text-muted-foreground">Inactive</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Brokers Grid */}
                {filteredBrokers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <Users className="w-16 h-16 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium mb-2">No brokers found</p>
                        <p className="text-muted-foreground text-center">
                            {searchQuery ? 'Try adjusting your search' : 'No brokers available'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredBrokers.map((broker) => (
                            <Card key={broker.brokerId} className="bg-card border-border hover:border-primary/50 transition-all">
                                <CardContent className="p-6">
                                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                                        {/* Broker Info */}
                                        <div className="flex-1">
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <h3 className="text-lg font-semibold mb-1">{broker.user.name}</h3>
                                                    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                                                        <div className="flex items-center gap-2">
                                                            <Phone className="w-4 h-4" />
                                                            {broker.user.phone}
                                                        </div>
                                                        {broker.user.email && (
                                                            <div className="flex items-center gap-2">
                                                                <Mail className="w-4 h-4" />
                                                                {broker.user.email}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <Badge
                                                    className={
                                                        broker.user.isActive
                                                            ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                                            : 'bg-red-500/10 text-red-500 border-red-500/20'
                                                    }
                                                >
                                                    {broker.user.isActive ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </div>

                                            {/* Assigned Areas */}
                                            <div className="flex items-center gap-2 mb-2">
                                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                                <div className="flex flex-wrap gap-2">
                                                    {broker.brokerAreas.length > 0 ? (
                                                        broker.brokerAreas.map((ba) => (
                                                            <Badge key={ba.area.areaId} variant="outline" className="text-xs">
                                                                {ba.area.name}
                                                            </Badge>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">No areas assigned</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-muted-foreground">Status:</span>
                                                <Switch
                                                    checked={broker.user.isActive}
                                                    onCheckedChange={() => handleToggleStatus(broker.user.userId, broker.user.isActive)}
                                                />
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => confirmDelete(broker.user.userId)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-destructive">
                                <AlertTriangle className="w-5 h-5" />
                                Delete Broker
                            </DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete this broker? This action cannot be undone and will permanently remove the broker's data.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="flex gap-2 sm:justify-end">
                            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button variant="destructive" onClick={handleDeleteBroker}>
                                Delete Broker
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}

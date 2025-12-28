'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/lib/context/AuthContext';
import { getProject, type Project, type Unit } from '@/lib/api/projects';
import {
    ArrowLeft,
    Search,
    Building2,
    Home,
    MapPin,
    Ruler,
    DollarSign,
    Loader2,
    Tag,
    Layers,
} from 'lucide-react';
import { toast } from 'sonner';

export default function ProjectUnitsPage() {
    const { user, isLoading: authLoading, isAuthenticated } = useAuth();
    const router = useRouter();
    const params = useParams();
    const projectId = params.projectId as string;

    const [project, setProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        const fetchProject = async () => {
            if (!projectId) return;
            try {
                setIsLoading(true);
                const data = await getProject(projectId as string);
                setProject(data);
            } catch (error) {
                console.error('Error fetching project:', error);
                toast.error('Failed to load project');
            } finally {
                setIsLoading(false);
            }
        };

        if (!authLoading && isAuthenticated) {
            fetchProject();
        }
    }, [projectId, authLoading, isAuthenticated]);

    // Get unique unit types for filter
    const unitTypes = project?.units
        ? Array.from(new Set(project.units.map(u => u.unitType).filter(Boolean)))
        : [];

    // Filter units
    const filteredUnits = project?.units?.filter((unit) => {
        const matchesSearch = !searchQuery ||
            unit.unitCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
            unit.unitType?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === 'all' || unit.status === statusFilter;
        const matchesType = typeFilter === 'all' || unit.unitType === typeFilter;

        return matchesSearch && matchesStatus && matchesType;
    }) || [];

    const formatPrice = (price: number) => {
        if (price >= 1000000) {
            return `${(price / 1000000).toFixed(2)}M EGP`;
        }
        return `${(price / 1000).toFixed(0)}K EGP`;
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'available':
                return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'sold':
                return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'reserved':
                return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            default:
                return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
        }
    };

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    if (!project) {
        return (
            <DashboardLayout
                role="broker"
                user={user ? { name: user.name, email: user.email || user.phone, role: 'Broker' } : undefined}
                pageTitle="Project Not Found"
            >
                <div className="flex flex-col items-center justify-center py-16">
                    <Building2 className="w-16 h-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">Project not found</p>
                    <Button onClick={() => router.push('/broker/units')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Units
                    </Button>
                </div>
            </DashboardLayout>
        );
    }

    const dashboardUser = user ? {
        name: user.name,
        email: user.email || user.phone,
        role: user.role.charAt(0).toUpperCase() + user.role.slice(1),
    } : undefined;

    const availableCount = project.units?.filter(u => u.status === 'available').length || 0;
    const soldCount = project.units?.filter(u => u.status === 'sold').length || 0;
    const reservedCount = project.units?.filter(u => u.status === 'reserved').length || 0;

    return (
        <DashboardLayout
            role="broker"
            user={dashboardUser}
            pageTitle={project.name}
            pageDescription={`Browse units in ${project.name} - ${project.area?.name}`}
        >
            <div className="space-y-6">
                {/* Back Button & Info */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push('/broker/units')}
                            className="gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Units
                        </Button>
                        <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            {project.area?.name}
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-card border-border">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Home className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{project.units?.length || 0}</p>
                                    <p className="text-xs text-muted-foreground">Total Units</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-card border-border">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                                    <Tag className="w-5 h-5 text-green-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{availableCount}</p>
                                    <p className="text-xs text-muted-foreground">Available</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-card border-border">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                                    <Layers className="w-5 h-5 text-yellow-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{reservedCount}</p>
                                    <p className="text-xs text-muted-foreground">Reserved</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-card border-border">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                                    <DollarSign className="w-5 h-5 text-red-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{soldCount}</p>
                                    <p className="text-xs text-muted-foreground">Sold</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <Input
                            className="pl-12 h-12 bg-card border-border rounded-xl"
                            placeholder="Search by unit code or type..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px] h-12 bg-card border-border rounded-lg">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="reserved">Reserved</SelectItem>
                            <SelectItem value="sold">Sold</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-[180px] h-12 bg-card border-border rounded-lg">
                            <SelectValue placeholder="Unit Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            {unitTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                    {type}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Units Grid */}
                {filteredUnits.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <Home className="w-16 h-16 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium mb-2">No units found</p>
                        <p className="text-muted-foreground text-center">
                            Try adjusting your search or filters
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredUnits.map((unit) => (
                            <Card key={unit.unitId} className="bg-card border-border hover:border-primary/50 transition-all">
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <CardTitle className="text-lg">{unit.unitCode}</CardTitle>
                                            <p className="text-sm text-muted-foreground">{unit.unitType}</p>
                                        </div>
                                        <Badge className={`${getStatusColor(unit.status)} capitalize`}>
                                            {unit.status}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Ruler className="w-4 h-4" />
                                                Size
                                            </div>
                                            <span className="font-medium">{unit.size} m²</span>
                                        </div>
                                        {unit.floor && (
                                            <div className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Layers className="w-4 h-4" />
                                                    Floor
                                                </div>
                                                <span className="font-medium">{unit.floor}</span>
                                            </div>
                                        )}
                                        {unit.gardenSize && unit.gardenSize > 0 && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-muted-foreground">Garden</span>
                                                <span className="font-medium">{unit.gardenSize} m²</span>
                                            </div>
                                        )}
                                        {unit.roofSize && unit.roofSize > 0 && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-muted-foreground">Roof</span>
                                                <span className="font-medium">{unit.roofSize} m²</span>
                                            </div>
                                        )}
                                        <div className="pt-3 border-t border-border">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-muted-foreground">Price</span>
                                                <span className="text-lg font-bold text-primary">
                                                    {formatPrice(unit.price)}
                                                </span>
                                            </div>
                                        </div>
                                        {unit.downPayment10Percent && (
                                            <div className="text-xs text-muted-foreground">
                                                10% Down: {formatPrice(unit.downPayment10Percent)}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

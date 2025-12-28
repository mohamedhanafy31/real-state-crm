'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout';
import { StatusBadge, AIBadge } from '@/components/shared';
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
import { getProjects, type Project } from '@/lib/api/projects';
import {
    Search,
    Building2,
    MapPin,
    Home,
    Loader2,
    ChevronRight,
    Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

export default function UnitsPage() {
    const { user, isLoading: authLoading, isAuthenticated } = useAuth();
    const router = useRouter();

    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [areaFilter, setAreaFilter] = useState('all');

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    const fetchProjects = async () => {
        try {
            setIsLoading(true);
            const data = await getProjects();
            setProjects(data);
        } catch (error) {
            console.error('Error fetching projects:', error);
            toast.error('Failed to load units');
        } finally {
            setIsLoading(false);
            setHasFetched(true);
        }
    };

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            fetchProjects();
        }
    }, [authLoading, isAuthenticated]);

    // Get unique areas for filter - only from broker's assigned areas
    const brokerAreaIds = user?.areaIds || [];

    // First filter by broker's assigned areas
    const brokerProjects = projects.filter((project) => {
        // If broker has no areas assigned, show nothing (or show message)
        if (brokerAreaIds.length === 0) return false;
        // Only show projects in broker's assigned areas
        return brokerAreaIds.includes(project.areaId);
    });

    const areas = Array.from(new Set(brokerProjects.map(p => p.area?.name).filter(Boolean)));

    // Filter projects by search and area dropdown
    const filteredProjects = brokerProjects.filter((project) => {
        const matchesSearch = !searchQuery ||
            project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            project.area?.name?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesArea = areaFilter === 'all' || project.area?.name === areaFilter;

        return matchesSearch && matchesArea;
    });

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

    const getAvailableUnitsCount = (project: Project) => {
        return project.units?.filter(u => u.status === 'available').length || 0;
    };

    const getTotalUnitsCount = (project: Project) => {
        return project.units?.length || 0;
    };

    const getMinPrice = (project: Project) => {
        if (!project.units?.length) return null;
        const prices = project.units.map(u => u.price).filter(p => p > 0);
        return prices.length ? Math.min(...prices) : null;
    };

    const formatPrice = (price: number) => {
        if (price >= 1000000) {
            return `${(price / 1000000).toFixed(1)}M EGP`;
        }
        return `${(price / 1000).toFixed(0)}K EGP`;
    };

    return (
        <DashboardLayout
            role="broker"
            user={dashboardUser}
            pageTitle="Units"
            pageDescription="Browse available projects and units for your clients."
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
                            className="pl-12 pr-32 h-12 bg-card border-border rounded-xl text-base focus:ring-2 focus:ring-primary/20"
                            placeholder="Search projects by name or location..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <div className="absolute inset-y-0 right-4 flex items-center">
                            <AIBadge label="AI Match Available" size="sm" />
                        </div>
                    </div>

                    {/* Area Filter */}
                    <Select value={areaFilter} onValueChange={setAreaFilter}>
                        <SelectTrigger className="w-[200px] h-12 bg-card border-border rounded-lg">
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                <SelectValue placeholder="All Areas" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Areas</SelectItem>
                            {areas.map((area) => (
                                <SelectItem key={area} value={area!}>
                                    {area}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-card border-border">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Building2 className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{brokerProjects.length}</p>
                                    <p className="text-xs text-muted-foreground">Total Projects</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-card border-border">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                                    <Home className="w-5 h-5 text-green-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">
                                        {brokerProjects.reduce((acc, p) => acc + getAvailableUnitsCount(p), 0)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Available Units</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-card border-border">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                    <MapPin className="w-5 h-5 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{brokerAreaIds.length}</p>
                                    <p className="text-xs text-muted-foreground">Areas Covered</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-card border-border">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-purple-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">AI</p>
                                    <p className="text-xs text-muted-foreground">Match Ready</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Projects Grid */}
                {isLoading && !hasFetched ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredProjects.length === 0 ? (
                            <div className="col-span-full text-center py-12 text-muted-foreground">
                                No projects found
                            </div>
                        ) : (
                            filteredProjects.map((project) => (
                                <Card
                                    key={project.projectId}
                                    className="overflow-hidden border-border hover:border-primary/40 transition-all duration-300 cursor-pointer group"
                                >
                                    {/* Project Image Placeholder */}
                                    <div className="relative h-48 bg-gradient-to-br from-primary/20 to-primary/5">
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Building2 className="w-16 h-16 text-primary/30" />
                                        </div>
                                        <div className="absolute top-3 left-3">
                                            <Badge variant={project.isActive ? 'default' : 'secondary'}>
                                                {project.isActive ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </div>
                                        <div className="absolute top-3 right-3">
                                            <Badge variant="outline" className="bg-card/80 backdrop-blur-sm">
                                                {getAvailableUnitsCount(project)} / {getTotalUnitsCount(project)} Available
                                            </Badge>
                                        </div>
                                    </div>

                                    <CardContent className="p-5">
                                        <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">
                                            {project.name}
                                        </h3>

                                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                                            <MapPin className="w-4 h-4" />
                                            {project.area?.name || 'N/A'}
                                        </div>

                                        {/* Unit Types Summary */}
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {Array.from(new Set(project.units?.map(u => u.unitType) || [])).slice(0, 3).map((type) => (
                                                <Badge key={type} variant="secondary" className="text-xs">
                                                    {type}
                                                </Badge>
                                            ))}
                                        </div>

                                        <div className="flex items-center justify-between pt-3 border-t border-border">
                                            <div>
                                                <p className="text-xs text-muted-foreground">Starting from</p>
                                                <p className="text-lg font-bold text-primary">
                                                    {getMinPrice(project) ? formatPrice(getMinPrice(project)!) : 'N/A'}
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="gap-1"
                                                onClick={() => router.push(`/broker/units/${project.projectId}`)}
                                            >
                                                View Units
                                                <ChevronRight className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

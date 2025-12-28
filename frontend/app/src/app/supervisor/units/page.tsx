'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/lib/context/AuthContext';
import {
    getUnits,
    getProjects,
    createUnit,
    updateUnit,
    deleteUnit,
    bulkUpdateUnitStatus,
    type Unit,
    type Project,
    type CreateUnitDto,
    type UpdateUnitDto,
} from '@/lib/api/projects';
import { toast } from 'sonner';
import {
    Grid3X3,
    Plus,
    Pencil,
    Trash2,
    Search,
    Loader2,
    Building2,
    DollarSign,
    Maximize2,
    Filter,
    Eye,
} from 'lucide-react';

const UNIT_STATUSES = ['available', 'reserved', 'sold', 'maintenance'];
const UNIT_TYPES = ['apartment', 'villa', 'duplex', 'penthouse', 'studio', 'townhouse'];

export default function AdminUnitsPage() {
    const { user, isLoading: authLoading, isAuthenticated } = useAuth();
    const router = useRouter();
    const [units, setUnits] = useState<Unit[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [projectFilter, setProjectFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');

    // Selection for bulk actions
    const [selectedUnits, setSelectedUnits] = useState<string[]>([]);

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);
    const [isViewMoreModalOpen, setIsViewMoreModalOpen] = useState(false);
    const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [bulkStatus, setBulkStatus] = useState<string>('');

    // Form states
    const [formData, setFormData] = useState<CreateUnitDto>({
        unitCode: '',
        unitType: 'apartment',
        size: 0,
        price: 0,
        projectId: '',
        floor: '',
    });

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                const [unitsData, projectsData] = await Promise.all([
                    getUnits(),
                    getProjects(),
                ]);
                setUnits(unitsData);
                setProjects(projectsData);
                
                // Set default project filter to the latest created project
                if (projectsData.length > 0) {
                    const sortedProjects = [...projectsData].sort((a, b) => 
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    );
                    setProjectFilter(sortedProjects[0].projectId.toString());
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
                toast.error('Failed to load units');
            } finally {
                setIsLoading(false);
            }
        };

        if (!authLoading && isAuthenticated && user?.role === 'supervisor') {
            fetchData();
        }
    }, [authLoading, isAuthenticated, user]);

    const filteredUnits = useMemo(() => {
        return units.filter(unit => {
            const matchesSearch = unit.unitCode?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false;
            const matchesStatus = statusFilter === 'all' || unit.status?.toLowerCase() === statusFilter.toLowerCase();
            const matchesType = typeFilter === 'all' || unit.unitType?.toLowerCase() === typeFilter.toLowerCase();
            const matchesProject = projectFilter === 'all' || unit.projectId?.toString() === projectFilter;
            return matchesSearch && matchesStatus && matchesType && matchesProject;
        });
    }, [units, searchQuery, statusFilter, typeFilter, projectFilter]);

    const handleSelectUnit = (unitId: string, checked: boolean) => {
        if (checked) {
            setSelectedUnits([...selectedUnits, unitId]);
        } else {
            setSelectedUnits(selectedUnits.filter(id => id !== unitId));
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedUnits(filteredUnits.map(u => u.unitId));
        } else {
            setSelectedUnits([]);
        }
    };

    const handleCreateUnit = async () => {
        if (!formData.unitCode || !formData.projectId || !formData.price) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            setIsSubmitting(true);
            const newUnit = await createUnit(formData);
            setUnits([...units, newUnit]);
            setIsCreateModalOpen(false);
            resetForm();
            toast.success('Unit created successfully');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to create unit');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateUnit = async () => {
        if (!selectedUnit) return;

        const updateData: UpdateUnitDto = {
            unitCode: formData.unitCode,
            unitType: formData.unitType,
            size: formData.size,
            price: formData.price,
            floor: formData.floor,
        };

        try {
            setIsSubmitting(true);
            const updatedUnit = await updateUnit(selectedUnit.unitId, updateData);
            setUnits(units.map(u =>
                u.unitId === selectedUnit.unitId ? updatedUnit : u
            ));
            setIsEditModalOpen(false);
            setSelectedUnit(null);
            resetForm();
            toast.success('Unit updated successfully');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update unit');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteUnit = async () => {
        if (!selectedUnit) return;

        try {
            setIsSubmitting(true);
            await deleteUnit(selectedUnit.unitId);
            setUnits(units.filter(u => u.unitId !== selectedUnit.unitId));
            setIsDeleteModalOpen(false);
            setSelectedUnit(null);
            toast.success('Unit deleted successfully');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete unit');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBulkStatusUpdate = async () => {
        if (selectedUnits.length === 0 || !bulkStatus) {
            toast.error('Please select units and a status');
            return;
        }

        try {
            setIsSubmitting(true);
            await bulkUpdateUnitStatus(selectedUnits, bulkStatus);
            // Refresh units
            const updatedUnits = await getUnits();
            setUnits(updatedUnits);
            setSelectedUnits([]);
            setBulkStatus('');
            setIsBulkStatusModalOpen(false);
            toast.success(`${selectedUnits.length} units updated successfully`);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update units');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModal = (unit: Unit) => {
        setSelectedUnit(unit);
        setFormData({
            unitCode: unit.unitCode,
            unitType: unit.unitType,
            size: unit.size,
            price: unit.price,
            projectId: '', // Not editable
            floor: unit.floor || '',
        });
        setIsEditModalOpen(true);
    };

    const openDeleteModal = (unit: Unit) => {
        setSelectedUnit(unit);
        setIsDeleteModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            unitCode: '',
            unitType: 'apartment',
            size: 0,
            price: 0,
            projectId: '',
            floor: '',
        });
    };

    const getStatusBadgeColor = (status: string) => {
        switch (status) {
            case 'available': return 'bg-green-500/10 text-green-500';
            case 'reserved': return 'bg-yellow-500/10 text-yellow-500';
            case 'sold': return 'bg-blue-500/10 text-blue-500';
            case 'maintenance': return 'bg-red-500/10 text-red-500';
            default: return 'bg-gray-500/10 text-gray-500';
        }
    };

    if (authLoading || isLoading) {
        return (
            <DashboardLayout role="supervisor" user={user ? { name: user.name, email: user.email || '', role: user.role } : undefined}>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout
            role="supervisor"
            user={user ? { name: user.name, email: user.email || '', role: user.role } : undefined}
            pageTitle="Units Management"
            pageDescription="Manage all units across projects"
            actions={
                <div className="flex gap-2">
                    {selectedUnits.length > 0 && (
                        <Button variant="outline" onClick={() => setIsBulkStatusModalOpen(true)}>
                            Update Status ({selectedUnits.length})
                        </Button>
                    )}
                    <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
                        <Plus className="w-4 h-4" />
                        New Unit
                    </Button>
                </div>
            }
        >
            {/* Filters */}
            <Card className="bg-card border-border mb-6">
                <CardContent className="pt-4">
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="flex-1 min-w-[200px]">
                            <Label className="text-xs text-muted-foreground mb-1 block">Search</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by unit code..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        <div className="w-[150px]">
                            <Label className="text-xs text-muted-foreground mb-1 block">Status</Label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    {UNIT_STATUSES.map(status => (
                                        <SelectItem key={status} value={status} className="capitalize">
                                            {status}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-[150px]">
                            <Label className="text-xs text-muted-foreground mb-1 block">Type</Label>
                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Types" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    {UNIT_TYPES.map(type => (
                                        <SelectItem key={type} value={type} className="capitalize">
                                            {type}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-[180px]">
                            <Label className="text-xs text-muted-foreground mb-1 block">Project</Label>
                            <Select value={projectFilter} onValueChange={setProjectFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Projects" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Projects</SelectItem>
                                    {projects.map(project => (
                                        <SelectItem key={project.projectId} value={project.projectId.toString()}>
                                            {project.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Units Table */}
            <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Grid3X3 className="w-5 h-5" />
                            Units ({filteredUnits.length})
                        </CardTitle>
                        {filteredUnits.length > 0 && (
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    checked={selectedUnits.length === filteredUnits.length}
                                    onCheckedChange={handleSelectAll}
                                />
                                <span className="text-sm text-muted-foreground">Select All</span>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredUnits.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <Grid3X3 className="w-16 h-16 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">No units found</h3>
                            <p className="text-muted-foreground text-center mb-4">
                                {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                                    ? 'Try adjusting your filters'
                                    : 'Get started by creating your first unit'}
                            </p>
                            {!searchQuery && statusFilter === 'all' && typeFilter === 'all' && (
                                <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
                                    <Plus className="w-4 h-4" />
                                    Create Unit
                                </Button>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left p-3 font-medium w-10"></th>
                                        <th className="text-left p-3 font-medium">Unit Code</th>
                                        <th className="text-left p-3 font-medium">Project</th>
                                        <th className="text-left p-3 font-medium">Type</th>
                                        <th className="text-left p-3 font-medium">Size</th>
                                        <th className="text-left p-3 font-medium">Price</th>
                                        <th className="text-left p-3 font-medium">Status</th>
                                        <th className="text-left p-3 font-medium">Floor</th>
                                        <th className="text-right p-3 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUnits.map((unit) => (
                                        <tr key={unit.unitId} className="border-b border-border hover:bg-muted/30 transition-colors">
                                            <td className="p-3">
                                                <Checkbox
                                                    checked={selectedUnits.includes(unit.unitId)}
                                                    onCheckedChange={(checked) => handleSelectUnit(unit.unitId, checked as boolean)}
                                                />
                                            </td>
                                            <td className="p-3 font-medium">{unit.unitCode}</td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-1">
                                                    <Building2 className="w-3 h-3 text-muted-foreground" />
                                                    {unit.project?.name || '-'}
                                                </div>
                                            </td>
                                            <td className="p-3 capitalize">{unit.unitType}</td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-1">
                                                    <Maximize2 className="w-3 h-3 text-muted-foreground" />
                                                    {unit.size} m²
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-1">
                                                    <DollarSign className="w-3 h-3 text-muted-foreground" />
                                                    {unit.price?.toLocaleString()}
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadgeColor(unit.status)}`}>
                                                    {unit.status}
                                                </span>
                                            </td>
                                            <td className="p-3">{unit.floor || '-'}</td>
                                            <td className="p-3 text-right">
                                                <div className="flex gap-1 justify-end">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedUnit(unit);
                                                            setIsViewMoreModalOpen(true);
                                                        }}
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openEditModal(unit)}
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-destructive hover:bg-destructive/10"
                                                        onClick={() => openDeleteModal(unit)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile/Tablet Card View */}
                        <div className="md:hidden grid gap-6">
                            {filteredUnits.map((unit) => (
                                <div 
                                    key={unit.unitId} 
                                    className="text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm bg-card border-border px-6"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Checkbox
                                                    checked={selectedUnits.includes(unit.unitId)}
                                                    onCheckedChange={(checked) => handleSelectUnit(unit.unitId, checked as boolean)}
                                                />
                                                <h3 className="font-semibold text-lg">{unit.unitCode}</h3>
                                            </div>
                                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                <Building2 className="w-3 h-3" />
                                                {unit.project?.name || '-'}
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadgeColor(unit.status)}`}>
                                            {unit.status}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="text-xs text-muted-foreground mb-1">Type</div>
                                            <div className="font-medium capitalize">{unit.unitType}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-muted-foreground mb-1">Floor</div>
                                            <div className="font-medium">{unit.floor || '-'}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-muted-foreground mb-1">Size</div>
                                            <div className="font-medium flex items-center gap-1">
                                                <Maximize2 className="w-3 h-3" />
                                                {unit.size} m²
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-muted-foreground mb-1">Price</div>
                                            <div className="font-medium flex items-center gap-1">
                                                <DollarSign className="w-3 h-3" />
                                                {unit.price?.toLocaleString()}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-2 border-t border-border">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => {
                                                setSelectedUnit(unit);
                                                setIsViewMoreModalOpen(true);
                                            }}
                                        >
                                            <Eye className="w-4 h-4 mr-2" />
                                            View More
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openEditModal(unit)}
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-destructive hover:bg-destructive/10"
                                            onClick={() => openDeleteModal(unit)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                    )}
                </CardContent>
            </Card>

            {/* Create Unit Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Create New Unit</DialogTitle>
                        <DialogDescription>
                            Add a new unit to a project.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="unitCode">Unit Code *</Label>
                            <Input
                                id="unitCode"
                                placeholder="e.g., A-101"
                                value={formData.unitCode}
                                onChange={(e) => setFormData({ ...formData, unitCode: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="project">Project *</Label>
                            <Select
                                value={formData.projectId?.toString() || ''}
                                onValueChange={(value) => setFormData({ ...formData, projectId: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select project" />
                                </SelectTrigger>
                                <SelectContent>
                                    {projects.map((project) => (
                                        <SelectItem key={project.projectId} value={project.projectId.toString()}>
                                            {project.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="unitType">Type</Label>
                            <Select
                                value={formData.unitType}
                                onValueChange={(value) => setFormData({ ...formData, unitType: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {UNIT_TYPES.map((type) => (
                                        <SelectItem key={type} value={type} className="capitalize">
                                            {type}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="floor">Floor</Label>
                            <Input
                                id="floor"
                                placeholder="e.g., 1, G, B1"
                                value={formData.floor}
                                onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="size">Size (m²) *</Label>
                            <Input
                                id="size"
                                type="number"
                                placeholder="0"
                                value={formData.size || ''}
                                onChange={(e) => setFormData({ ...formData, size: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="price">Price *</Label>
                            <Input
                                id="price"
                                type="number"
                                placeholder="0"
                                value={formData.price || ''}
                                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateUnit} disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Unit'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Unit Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit Unit</DialogTitle>
                        <DialogDescription>
                            Update unit details.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-unitCode">Unit Code</Label>
                            <Input
                                id="edit-unitCode"
                                value={formData.unitCode}
                                onChange={(e) => setFormData({ ...formData, unitCode: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-unitType">Type</Label>
                            <Select
                                value={formData.unitType}
                                onValueChange={(value) => setFormData({ ...formData, unitType: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {UNIT_TYPES.map((type) => (
                                        <SelectItem key={type} value={type} className="capitalize">
                                            {type}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-floor">Floor</Label>
                            <Input
                                id="edit-floor"
                                value={formData.floor}
                                onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-size">Size (m²)</Label>
                            <Input
                                id="edit-size"
                                type="number"
                                value={formData.size || ''}
                                onChange={(e) => setFormData({ ...formData, size: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="edit-price">Price</Label>
                            <Input
                                id="edit-price"
                                type="number"
                                value={formData.price || ''}
                                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdateUnit} disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Changes'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete Unit</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete unit &quot;{selectedUnit?.unitCode}&quot;? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteUnit} disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                'Delete Unit'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Status Update Modal */}
            <Dialog open={isBulkStatusModalOpen} onOpenChange={setIsBulkStatusModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Update Unit Status</DialogTitle>
                        <DialogDescription>
                            Change status for {selectedUnits.length} selected unit(s).
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label>New Status</Label>
                        <Select value={bulkStatus} onValueChange={setBulkStatus}>
                            <SelectTrigger className="mt-2">
                                <SelectValue placeholder="Select new status" />
                            </SelectTrigger>
                            <SelectContent>
                                {UNIT_STATUSES.map(status => (
                                    <SelectItem key={status} value={status} className="capitalize">
                                        {status}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBulkStatusModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleBulkStatusUpdate} disabled={isSubmitting || !bulkStatus}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                'Update Status'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View More Unit Details Modal */}
            <Dialog open={isViewMoreModalOpen} onOpenChange={setIsViewMoreModalOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Unit Details</DialogTitle>
                        <DialogDescription>
                            Complete information for unit {selectedUnit?.unitCode}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedUnit && (
                        <div className="grid gap-6 py-4">
                            {/* Basic Information */}
                            <div>
                                <h4 className="font-semibold text-sm mb-3 text-primary">Basic Information</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Unit Code</Label>
                                        <p className="font-medium">{selectedUnit.unitCode}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Unit Name</Label>
                                        <p className="font-medium">{selectedUnit.unitName || '-'}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Type</Label>
                                        <p className="font-medium capitalize">{selectedUnit.unitType}</p>
                                    </div>
                                     <div>
                                        <Label className="text-xs text-muted-foreground">Status</Label>
                                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadgeColor(selectedUnit.status)}`}>
                                            {selectedUnit.status}
                                        </span>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Building</Label>
                                        <p className="font-medium">{selectedUnit.building || '-'}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Floor</Label>
                                        <p className="font-medium">{selectedUnit.floor || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Size Details */}
                            <div>
                                <h4 className="font-semibold text-sm mb-3 text-primary">Size Details</h4>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Unit Size</Label>
                                        <p className="font-medium">{selectedUnit.size} m²</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Garden Size</Label>
                                        <p className="font-medium">{selectedUnit.gardenSize || 0} m²</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Roof Size</Label>
                                        <p className="font-medium">{selectedUnit.roofSize || 0} m²</p>
                                    </div>
                                </div>
                            </div>

                            {/* Pricing */}
                            <div>
                                <h4 className="font-semibold text-sm mb-3 text-primary">Pricing</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Total Price</Label>
                                        <p className="font-medium text-lg">{selectedUnit.price?.toLocaleString()} EGP</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Down Payment (10%)</Label>
                                        <p className="font-medium">{selectedUnit.downPayment10Percent?.toLocaleString() || '-'} EGP</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Installment (4 Years)</Label>
                                        <p className="font-medium">{selectedUnit.installment4Years?.toLocaleString() || '-'} EGP/month</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Installment (5 Years)</Label>
                                        <p className="font-medium">{selectedUnit.installment5Years?.toLocaleString() || '-'} EGP/month</p>
                                    </div>
                                </div>
                            </div>

                            {/* Location */}
                            <div>
                                <h4 className="font-semibold text-sm mb-3 text-primary">Location</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Project</Label>
                                        <p className="font-medium">{selectedUnit.project?.name || '-'}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Area</Label>
                                        <p className="font-medium">{selectedUnit.project?.area?.name || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            {selectedUnit.description && (
                                <div>
                                    <h4 className="font-semibold text-sm mb-3 text-primary">Description</h4>
                                    <p className="text-sm text-muted-foreground">{selectedUnit.description}</p>
                                </div>
                            )}

                            {/* Metadata */}
                            <div className="pt-4 border-t">
                                <h4 className="font-semibold text-sm mb-3 text-muted-foreground">Metadata</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Unit ID</Label>
                                        <p className="font-mono text-sm">#{selectedUnit.unitId}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Created At</Label>
                                        <p className="text-sm">{new Date(selectedUnit.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() =>setIsViewMoreModalOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}

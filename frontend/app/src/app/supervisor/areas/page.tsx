'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/lib/context/AuthContext';
import {
    getAreas,
    createArea,
    updateArea,
    deleteArea,
    type Area,
    type CreateAreaDto,
} from '@/lib/api/projects';
import { toast } from 'sonner';
import {
    MapPin,
    Plus,
    Pencil,
    Trash2,
    Search,
    Loader2,
} from 'lucide-react';

export default function AreasPage() {
    const { user, isLoading: authLoading, isAuthenticated } = useAuth();
    const router = useRouter();
    const [areas, setAreas] = useState<Area[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedArea, setSelectedArea] = useState<Area | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [formData, setFormData] = useState<CreateAreaDto>({ name: '' });

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        const fetchAreas = async () => {
            try {
                setIsLoading(true);
                const data = await getAreas();
                setAreas(data);
            } catch (error) {
                console.error('Failed to fetch areas:', error);
                toast.error('Failed to load areas');
            } finally {
                setIsLoading(false);
            }
        };

        if (!authLoading && isAuthenticated && user?.role === 'supervisor') {
            fetchAreas();
        }
    }, [authLoading, isAuthenticated, user]);

    const filteredAreas = areas.filter((area) =>
        area.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCreateArea = async () => {
        if (!formData.name.trim()) {
            toast.error('Please enter an area name');
            return;
        }

        try {
            setIsSubmitting(true);
            const newArea = await createArea(formData);
            setAreas([...areas, newArea]);
            setIsCreateModalOpen(false);
            setFormData({ name: '' });
            toast.success('Area created successfully');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to create area');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateArea = async () => {
        if (!selectedArea || !formData.name.trim()) return;

        try {
            setIsSubmitting(true);
            const updatedArea = await updateArea(selectedArea.areaId, formData);
            setAreas(areas.map((a) => (a.areaId === selectedArea.areaId ? updatedArea : a)));
            setIsEditModalOpen(false);
            setSelectedArea(null);
            setFormData({ name: '' });
            toast.success('Area updated successfully');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update area');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteArea = async () => {
        if (!selectedArea) return;

        try {
            setIsSubmitting(true);
            await deleteArea(selectedArea.areaId);
            setAreas(areas.filter((a) => a.areaId !== selectedArea.areaId));
            setIsDeleteModalOpen(false);
            setSelectedArea(null);
            toast.success('Area deleted successfully');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete area');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModal = (area: Area) => {
        setSelectedArea(area);
        setFormData({ name: area.name });
        setIsEditModalOpen(true);
    };

    const openDeleteModal = (area: Area) => {
        setSelectedArea(area);
        setIsDeleteModalOpen(true);
    };

    if (authLoading || isLoading) {
        return (
            <DashboardLayout
                role="supervisor"
                user={user ? { name: user.name, email: user.email || '', role: user.role } : undefined}
            >
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
            pageTitle="Areas Management"
            pageDescription="Manage geographic areas for projects and broker assignments"
            actions={
                <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    New Area
                </Button>
            }
        >
            {/* Search Bar */}
            <div className="mb-6">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search areas..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            {/* Areas Grid */}
            {filteredAreas.length === 0 ? (
                <Card className="bg-card border-border">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <MapPin className="w-16 h-16 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No areas found</h3>
                        <p className="text-muted-foreground text-center mb-4">
                            {searchQuery
                                ? 'Try adjusting your search query'
                                : 'Get started by creating your first area'}
                        </p>
                        {!searchQuery && (
                            <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
                                <Plus className="w-4 h-4" />
                                Create Area
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredAreas.map((area) => (
                        <Card
                            key={area.areaId}
                            className="bg-card border-border hover:border-primary/50 transition-colors"
                        >
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <MapPin className="w-5 h-5 text-primary" />
                                        </div>
                                        <CardTitle className="text-base">{area.name}</CardTitle>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 gap-1"
                                        onClick={() => openEditModal(area)}
                                    >
                                        <Pencil className="w-3 h-3" />
                                        Edit
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-1 text-destructive hover:bg-destructive/10"
                                        onClick={() => openDeleteModal(area)}
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create Area Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create New Area</DialogTitle>
                        <DialogDescription>
                            Add a new geographic area for project assignments.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Area Name</Label>
                            <Input
                                id="name"
                                placeholder="Enter area name"
                                value={formData.name}
                                onChange={(e) => setFormData({ name: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateArea} disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Area'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Area Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Area</DialogTitle>
                        <DialogDescription>Update area details.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Area Name</Label>
                            <Input
                                id="edit-name"
                                placeholder="Enter area name"
                                value={formData.name}
                                onChange={(e) => setFormData({ name: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdateArea} disabled={isSubmitting}>
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
                        <DialogTitle>Delete Area</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete &quot;{selectedArea?.name}&quot;? This action
                            cannot be undone. All projects in this area will need to be reassigned.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteArea} disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                'Delete Area'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}

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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/lib/context/AuthContext';
import {
    getProjects,
    createProject,
    updateProject,
    deleteProject,
    getAreas,
    type Project,
    type Area,
    type CreateProjectDto,
    type UpdateProjectDto,
} from '@/lib/api/projects';
import { toast } from 'sonner';
import {
    Building2,
    Plus,
    Pencil,
    Trash2,
    Search,
    Loader2,
    MapPin,
    Home,
    CheckCircle2,
    XCircle,
} from 'lucide-react';

export default function AdminProjectsPage() {
    const { user, isLoading: authLoading, isAuthenticated } = useAuth();
    const router = useRouter();
    const [projects, setProjects] = useState<Project[]>([]);
    const [areas, setAreas] = useState<Area[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form states
    const [formData, setFormData] = useState<CreateProjectDto>({
        name: '',
        areaId: '',
        isActive: true,
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
                const [projectsData, areasData] = await Promise.all([
                    getProjects(),
                    getAreas(),
                ]);
                setProjects(projectsData);
                setAreas(areasData);
            } catch (error) {
                console.error('Failed to fetch data:', error);
                toast.error('Failed to load projects');
            } finally {
                setIsLoading(false);
            }
        };

        if (!authLoading && isAuthenticated && user?.role === 'supervisor') {
            fetchData();
        }
    }, [authLoading, isAuthenticated, user]);

    const filteredProjects = projects.filter(project =>
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.area?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCreateProject = async () => {
        if (!formData.name || !formData.areaId) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            setIsSubmitting(true);
            const newProject = await createProject(formData);
            setProjects([...projects, newProject]);
            setIsCreateModalOpen(false);
            resetForm();
            toast.success('Project created successfully');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to create project');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateProject = async () => {
        if (!selectedProject) return;

        const updateData: UpdateProjectDto = {
            name: formData.name,
            areaId: formData.areaId,
            isActive: formData.isActive,
        };

        try {
            setIsSubmitting(true);
            const updatedProject = await updateProject(selectedProject.projectId, updateData);
            setProjects(projects.map(p =>
                p.projectId === selectedProject.projectId ? updatedProject : p
            ));
            setIsEditModalOpen(false);
            setSelectedProject(null);
            resetForm();
            toast.success('Project updated successfully');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update project');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteProject = async () => {
        if (!selectedProject) return;

        try {
            setIsSubmitting(true);
            await deleteProject(selectedProject.projectId);
            setProjects(projects.filter(p => p.projectId !== selectedProject.projectId));
            setIsDeleteModalOpen(false);
            setSelectedProject(null);
            toast.success('Project deleted successfully');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete project');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModal = (project: Project) => {
        setSelectedProject(project);
        setFormData({
            name: project.name,
            areaId: project.areaId,
            isActive: project.isActive,
        });
        setIsEditModalOpen(true);
    };

    const openDeleteModal = (project: Project) => {
        setSelectedProject(project);
        setIsDeleteModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            areaId: '',
            isActive: true,
        });
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
            pageTitle="Project Management"
            pageDescription="Create, edit, and manage real estate projects"
            actions={
                <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    New Project
                </Button>
            }
        >
            {/* Search Bar */}
            <div className="mb-6">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search projects by name or area..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            {/* Projects Grid */}
            {filteredProjects.length === 0 ? (
                <Card className="bg-card border-border">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <Building2 className="w-16 h-16 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No projects found</h3>
                        <p className="text-muted-foreground text-center mb-4">
                            {searchQuery ? 'Try adjusting your search query' : 'Get started by creating your first project'}
                        </p>
                        {!searchQuery && (
                            <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
                                <Plus className="w-4 h-4" />
                                Create Project
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.map((project) => (
                        <Card key={project.projectId} className="bg-card border-border hover:border-primary/50 transition-colors">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <Building2 className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">{project.name}</CardTitle>
                                            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                                <MapPin className="w-3 h-3" />
                                                {project.area?.name || 'Unknown Area'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${project.isActive
                                        ? 'bg-green-500/10 text-green-500'
                                        : 'bg-red-500/10 text-red-500'
                                        }`}>
                                        {project.isActive ? 'Active' : 'Inactive'}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                                    <Home className="w-4 h-4" />
                                    <span>{project.units?.length || 0} Units</span>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 gap-1"
                                        onClick={() => openEditModal(project)}
                                    >
                                        <Pencil className="w-3 h-3" />
                                        Edit
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-1 text-destructive hover:bg-destructive/10"
                                        onClick={() => openDeleteModal(project)}
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create Project Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create New Project</DialogTitle>
                        <DialogDescription>
                            Add a new real estate project to the system.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Project Name</Label>
                            <Input
                                id="name"
                                placeholder="Enter project name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="area">Area</Label>
                            <Select
                                value={formData.areaId?.toString() || ''}
                                onValueChange={(value) => setFormData({ ...formData, areaId: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an area" />
                                </SelectTrigger>
                                <SelectContent>
                                    {areas.map((area) => (
                                        <SelectItem key={area.areaId} value={area.areaId.toString()}>
                                            {area.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateProject} disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Project'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Project Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Project</DialogTitle>
                        <DialogDescription>
                            Update project details.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Project Name</Label>
                            <Input
                                id="edit-name"
                                placeholder="Enter project name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-area">Area</Label>
                            <Select
                                value={formData.areaId?.toString() || ''}
                                onValueChange={(value) => setFormData({ ...formData, areaId: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an area" />
                                </SelectTrigger>
                                <SelectContent>
                                    {areas.map((area) => (
                                        <SelectItem key={area.areaId} value={area.areaId.toString()}>
                                            {area.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <div className="flex gap-4">
                                <Button
                                    type="button"
                                    variant={formData.isActive ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setFormData({ ...formData, isActive: true })}
                                    className="gap-2"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    Active
                                </Button>
                                <Button
                                    type="button"
                                    variant={!formData.isActive ? 'destructive' : 'outline'}
                                    size="sm"
                                    onClick={() => setFormData({ ...formData, isActive: false })}
                                    className="gap-2"
                                >
                                    <XCircle className="w-4 h-4" />
                                    Inactive
                                </Button>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdateProject} disabled={isSubmitting}>
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
                        <DialogTitle>Delete Project</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete &quot;{selectedProject?.name}&quot;? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteProject} disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                'Delete Project'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}

import { apiClient } from './client';

export interface Area {
    areaId: string;
    name: string;
}

export interface Unit {
    unitId: string;
    unitCode: string;
    unitName?: string;
    unitType: string;
    size: number;
    price: number;
    status: string;
    projectId: string;
    floor?: string;
    building?: string;
    gardenSize?: number;
    roofSize?: number;
    downPayment10Percent?: number;
    installment4Years?: number;
    installment5Years?: number;
    imageUrl?: string;
    description?: string;
    createdAt: string;
    project?: {
        projectId: string;
        name: string;
        area: {
            areaId: string;
            name: string;
        };
    };
}

export interface Project {
    projectId: string;
    name: string;
    areaId: string;
    isActive: boolean;
    imageUrl?: string;
    createdAt: string;
    area: Area;
    units: Unit[];
}

export interface UnitFilters {
    status?: string;
    projectId?: string;
    areaId?: string;
    minPrice?: number;
    maxPrice?: number;
    unitType?: string;
}

export async function getProjects(): Promise<Project[]> {
    try {
        const response = await apiClient.get<Project[]>('/projects');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch projects:', error);
        return [];
    }
}

export async function getProject(id: string): Promise<Project | null> {
    try {
        const response = await apiClient.get<Project>(`/projects/${id}`);
        return response.data;
    } catch (error) {
        console.error('Failed to fetch project:', error);
        return null;
    }
}

export async function getUnits(filters?: UnitFilters): Promise<Unit[]> {
    try {
        const response = await apiClient.get<Unit[]>('/units', { params: filters });
        return response.data;
    } catch (error) {
        console.error('Failed to fetch units:', error);
        return [];
    }
}

export async function getUnit(id: string): Promise<Unit | null> {
    try {
        const response = await apiClient.get<Unit>(`/units/${id}`);
        return response.data;
    } catch (error) {
        console.error('Failed to fetch unit:', error);
        return null;
    }
}

export interface CreateProjectDto {
    name: string;
    areaId: string;
    isActive?: boolean;
    imageUrl?: string;
}

export interface UpdateProjectDto {
    name?: string;
    areaId?: string;
    isActive?: boolean;
    imageUrl?: string;
}

export async function createProject(data: CreateProjectDto): Promise<Project> {
    const response = await apiClient.post<Project>('/projects', data);
    return response.data;
}

export async function updateProject(id: string, data: UpdateProjectDto): Promise<Project> {
    const response = await apiClient.patch<Project>(`/projects/${id}`, data);
    return response.data;
}

export async function deleteProject(id: string): Promise<void> {
    await apiClient.delete(`/projects/${id}`);
}

export async function getAreas(): Promise<Area[]> {
    try {
        const response = await apiClient.get<Area[]>('/areas');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch areas:', error);
        return [];
    }
}

// Unit CRUD operations
export interface CreateUnitDto {
    unitCode: string;
    unitType: string;
    size: number;
    price: number;
    projectId: string;
    floor?: string;
    gardenSize?: number;
    roofSize?: number;
    downPayment10Percent?: number;
    installment4Years?: number;
    installment5Years?: number;
    imageUrl?: string;
}

export interface UpdateUnitDto {
    unitCode?: string;
    unitType?: string;
    size?: number;
    price?: number;
    projectId?: string;
    status?: string;
    floor?: string;
    gardenSize?: number;
    roofSize?: number;
    imageUrl?: string;
}

export async function createUnit(data: CreateUnitDto): Promise<Unit> {
    const response = await apiClient.post<Unit>('/units', data);
    return response.data;
}

export async function updateUnit(id: string, data: UpdateUnitDto): Promise<Unit> {
    const response = await apiClient.patch<Unit>(`/units/${id}`, data);
    return response.data;
}

export async function deleteUnit(id: string): Promise<void> {
    await apiClient.delete(`/units/${id}`);
}

export async function bulkUpdateUnitStatus(unitIds: string[], status: string): Promise<void> {
    await Promise.all(unitIds.map(id => updateUnit(id, { status })));
}

// Area CRUD operations
export interface CreateAreaDto {
    name: string;
}

export interface UpdateAreaDto {
    name?: string;
}

export async function createArea(data: CreateAreaDto): Promise<Area> {
    const response = await apiClient.post<Area>('/areas', data);
    return response.data;
}

export async function updateArea(id: string, data: UpdateAreaDto): Promise<Area> {
    const response = await apiClient.patch<Area>(`/areas/${id}`, data);
    return response.data;
}

export async function deleteArea(id: string): Promise<void> {
    await apiClient.delete(`/areas/${id}`);
}

// Image upload
export interface UploadResult {
    success: boolean;
    url: string;
    filename: string;
    originalName: string;
    size: number;
}

export async function uploadImage(file: File, type: 'users' | 'units' | 'projects'): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<UploadResult>(`/upload/${type}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
}


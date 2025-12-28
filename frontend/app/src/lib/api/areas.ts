import { apiClient } from './client';

export interface Area {
    areaId: string;
    name: string;
}

export async function getAreas(): Promise<Area[]> {
    const response = await apiClient.get<Area[]>('/areas');
    return response.data;
}

export async function updateAreas(areaIds: string[]): Promise<{ areaIds: string[] }> {
    const response = await apiClient.patch<{ areaIds: string[] }>('/auth/areas', { areaIds });
    return response.data;
}


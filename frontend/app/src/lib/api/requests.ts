import { apiClient } from './client';

export interface Customer {
    customerId: string;
    name: string;
    phone: string;
    email: string;
    source: string;
}

export interface Area {
    areaId: string;
    name: string;
}

export interface Broker {
    brokerId: string;
    user: {
        userId: string;
        name: string;
        phone: string;
    };
}

export interface Request {
    requestId: string;
    customerId: string;
    assignedBrokerId: string | null;
    areaId: string;
    status: string;
    notes: string | null;
    unitType: string | null;
    budgetMin: number | null;
    budgetMax: number | null;
    sizeMin: number | null;
    sizeMax: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    createdAt: string;
    updatedAt: string;
    customer: Customer;
    area: Area;
    assignedBroker: Broker | null;
}

export interface RequestFilters {
    status?: string;
    assignedBrokerId?: string;
    areaId?: string;
}

export interface UpdateRequestDto {
    status?: string;
    notes?: string;
}

export async function getRequests(filters?: RequestFilters): Promise<Request[]> {
    try {
        const response = await apiClient.get<Request[]>('/requests', { params: filters });
        return response.data;
    } catch (error) {
        console.error('Failed to fetch requests:', error);
        return [];
    }
}

export async function getRequest(id: string): Promise<Request | null> {
    try {
        const response = await apiClient.get<Request>(`/requests/${id}`);
        return response.data;
    } catch (error) {
        console.error('Failed to fetch request:', error);
        return null;
    }
}

export async function updateRequest(id: string, data: UpdateRequestDto): Promise<Request | null> {
    try {
        const response = await apiClient.patch<Request>(`/requests/${id}`, data);
        return response.data;
    } catch (error) {
        console.error('Failed to update request:', error);
        return null;
    }
}

export async function getRequestHistory(id: string): Promise<any[]> {
    try {
        const response = await apiClient.get<any[]>(`/requests/${id}/history`);
        return response.data;
    } catch (error) {
        console.error('Failed to fetch request history:', error);
        return [];
    }
}

export async function getCustomers(): Promise<Customer[]> {
    try {
        const response = await apiClient.get<Customer[]>('/customers');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch customers:', error);
        return [];
    }
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

import { apiClient } from './client';

export interface BrokerPerformance {
    responseSpeedScore: number;
    closingRate: number;
    customerSatisfaction: number;
    totalDeals: number;
    totalRevenue: number;
}

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

export interface Request {
    requestId: string;
    customerId: string;
    assignedBrokerId: string | null;
    areaId: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    customer: Customer;
    area: Area;
}

// Correct endpoint: GET /users/brokers/:id/performance
export async function getBrokerPerformance(brokerId: string): Promise<BrokerPerformance> {
    try {
        const response = await apiClient.get<BrokerPerformance>(`/users/brokers/${brokerId}/performance`);
        return response.data;
    } catch (error) {
        // Return default values if endpoint fails
        console.warn('Failed to fetch broker performance, using defaults');
        return {
            responseSpeedScore: 0,
            closingRate: 0,
            customerSatisfaction: 0,
            totalDeals: 0,
            totalRevenue: 0,
        };
    }
}

// Correct query param: assignedBrokerId (not brokerId)
export async function getBrokerRequests(brokerId: string): Promise<Request[]> {
    try {
        const response = await apiClient.get<Request[]>('/requests', {
            params: { assignedBrokerId: brokerId }
        });
        return response.data;
    } catch (error) {
        console.warn('Failed to fetch broker requests');
        return [];
    }
}

import { apiClient } from './client';

export interface SupervisorDashboardMetrics {
    totalBrokers: number;
    activeBrokers: number;
    totalRequests: number;
    pendingReassignments: number;
    totalProjects: number;
    totalUnits: number;
    availableUnits: number;
    reservedUnits: number;
    totalAreas: number;
    requestStatusBreakdown: {
        new: number;
        in_progress: number;
        closed: number;
        withdrawn: number;
    };
    recentActivity: RecentActivity[];
}

export interface RecentActivity {
    type: 'broker_created' | 'broker_status_changed' | 'request_reassigned' | 'request_created';
    description: string;
    timestamp: Date;
    relatedUserId?: string;
    relatedRequestId?: string;
}

export interface BrokerWithStats {
    brokerId: string;
    user: {
        userId: string;
        name: string;
        phone: string;
        email?: string;
        isActive: boolean;
    };
    brokerAreas: Array<{
        area: {
            areaId: string;
            name: string;
        };
    }>;
    activeRequestsCount?: number;
}

export async function getSupervisorDashboard(): Promise<SupervisorDashboardMetrics> {
    const response = await apiClient.get<SupervisorDashboardMetrics>('/supervisor/dashboard');
    return response.data;
}

export async function getAllBrokers(): Promise<BrokerWithStats[]> {
    const response = await apiClient.get<BrokerWithStats[]>('/users/brokers');
    return response.data;
}

export async function toggleBrokerStatus(userId: string, isActive: boolean): Promise<void> {
    await apiClient.patch(`/users/${userId}/status`, { isActive });
}

export async function deleteBroker(userId: string): Promise<void> {
    await apiClient.delete(`/users/${userId}`);
}

export async function getWithdrawnRequests() {
    const response = await apiClient.get('/requests', {
        params: { status: 'withdrawn' }
    });
    return response.data;
}

export async function reassignRequest(requestId: string, brokerId: string): Promise<void> {
    await apiClient.patch(`/requests/${requestId}/reassign`, { brokerId });
}

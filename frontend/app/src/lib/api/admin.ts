import apiClient from './client';
import { User } from '@/lib/context/AuthContext';
import { BrokerWithStats } from './supervisor';

// Re-export User type
export type { User };

export async function getAllUsers(role?: string): Promise<User[]> {
    const params = role ? { role } : {};
    const response = await apiClient.get<User[]>('/users', { params });
    return response.data;
}

export async function updateUserStatus(userId: string, isActive: boolean): Promise<User> {
    const response = await apiClient.patch<User>(`/users/${userId}/status`, { isActive });
    return response.data;
}

export async function createUser(data: Partial<User> & { password?: string }): Promise<User> {
    const response = await apiClient.post<User>('/users', data);
    return response.data;
}

export async function getDashboardMetrics() {
    // Current admin dashboard is frontend-only aggregation of other endpoints primarily
    // But we might want a dedicated endpoint later.
    // For now, we can fetch users and projects to calculate basic stats on frontend 
    // or assume there's an endpoint if we created one.
    // The implementation plan says "Total Sales, Active Projects" etc.
    // We haven't created a specific admin stats endpoint yet.
    // We'll leave this empty or mock it for now, or fetch individual counts.
    return {
        // Placeholder
    };
}

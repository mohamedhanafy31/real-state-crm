import { apiClient } from './client';

export interface LoginCredentials {
    phone: string;
    password: string;
}

export interface RegisterCredentials {
    phone: string;
    password: string;
    name: string;
    email?: string;
    role: 'broker' | 'supervisor';
    areaIds?: string[];
}

export interface AuthResponse {
    access_token: string;
    user: {
        userId: string;
        phone: string;
        name: string;
        email?: string;
        role: string;
        isActive: boolean;
        areaIds?: string[];
    };
}

export interface UpdateProfileData {
    name?: string;
    email?: string;
    phone?: string;
}

// Broker registration returns application instead of auth token
export interface BrokerApplicationResponse {
    application_id: string;
    status: 'pending_interview';
    interview_url: string;
}

// Register can return AuthResponse (supervisor) or BrokerApplicationResponse (broker)
export type RegisterResponse = AuthResponse | BrokerApplicationResponse;

export function isBrokerApplication(response: RegisterResponse): response is BrokerApplicationResponse {
    return 'application_id' in response;
}

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return response.data;
}

export async function register(credentials: RegisterCredentials): Promise<RegisterResponse> {
    const response = await apiClient.post<RegisterResponse>('/auth/register', credentials);
    return response.data;
}

export async function getProfile() {
    const response = await apiClient.get('/auth/profile');
    return response.data;
}

export async function updateProfile(userId: string, data: UpdateProfileData) {
    // Use self-update endpoint - userId is ignored since backend uses JWT token
    const response = await apiClient.patch('/auth/profile', data);
    return response.data;
}

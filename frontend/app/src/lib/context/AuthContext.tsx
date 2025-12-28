'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
    login as loginApi,
    register as registerApi,
    getProfile,
    LoginCredentials,
    RegisterCredentials
} from '@/lib/api/auth';

export interface User {
    userId: string;
    phone: string;
    name: string;
    email?: string;
    role: 'broker' | 'supervisor' | 'admin';
    isActive: boolean;
    areaIds?: string[];
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (credentials: LoginCredentials) => Promise<void>;
    register: (credentials: RegisterCredentials) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('auth_token');
            console.log('[AuthContext] checkAuth called, token exists:', !!token);

            if (token) {
                try {
                    console.log('[AuthContext] Fetching profile from API...');
                    const userData = await getProfile();
                    console.log('[AuthContext] Profile data received:', userData);
                    console.log('[AuthContext] Email from profile:', userData.email);
                    setUser(userData);
                } catch (error: any) {
                    console.error('[AuthContext] getProfile error:', error);
                    if (error.response?.data?.message === 'Your account has been deactivated by the supervisor') {
                        // eslint-disable-next-line @typescript-eslint/no-floating-promises
                        import('sonner').then(({ toast }) => {
                            toast.error('Your account has been deactivated by the supervisor');
                        });
                    }
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('user');
                    setUser(null);
                }
            }
            setIsLoading(false);
        };

        checkAuth();
    }, []);

    const login = async (credentials: LoginCredentials) => {
        setIsLoading(true);
        try {
            const response = await loginApi(credentials);
            localStorage.setItem('auth_token', response.access_token);
            localStorage.setItem('user', JSON.stringify(response.user));
            setUser(response.user as User);

            const roleRoutes: Record<string, string> = {
                broker: '/broker/dashboard',
                supervisor: '/supervisor/dashboard',
                admin: '/admin/dashboard',
            };
            router.push(roleRoutes[response.user.role] || '/broker/dashboard');
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (credentials: RegisterCredentials) => {
        setIsLoading(true);
        try {
            const response = await registerApi(credentials);
            
            // Check if this is a broker application (interview required)
            if ('application_id' in response) {
                // Broker registration - redirect to interview
                // Store application ID for reference
                localStorage.setItem('pending_application_id', String(response.application_id));
                router.push(response.interview_url);
                return;
            }
            
            // Supervisor registration - normal flow with JWT
            localStorage.setItem('auth_token', response.access_token);
            localStorage.setItem('user', JSON.stringify(response.user));
            setUser(response.user as User);

            const roleRoutes: Record<string, string> = {
                broker: '/broker/dashboard',
                supervisor: '/supervisor/dashboard',
                admin: '/admin/dashboard',
            };
            router.push(roleRoutes[response.user.role] || '/broker/dashboard');
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        setUser(null);
        router.push('/login');
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                login,
                register,
                logout
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;

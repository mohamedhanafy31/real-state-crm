'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/context/AuthContext';
import { updateProfile } from '@/lib/api/auth';
import { User, Mail, Phone, Save, Loader2, LogOut } from 'lucide-react';
import { toast } from 'sonner';

export default function SupervisorSettingsPage() {
    const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isModified, setIsModified] = useState(false);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        if (user) {
            setName(user.name || '');
            setEmail(user.email || '');
            setPhone(user.phone || '');
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            const hasChanges =
                name !== (user.name || '') ||
                email !== (user.email || '') ||
                phone !== (user.phone || '');
            setIsModified(hasChanges);
        }
    }, [name, email, phone, user]);

    const handleSave = async () => {
        try {
            setIsSaving(true);
            if (user?.userId) {
                await updateProfile(user.userId, { name, email, phone });
            }
            toast.success('Profile updated successfully');
            setIsModified(false);
            // Reload to update user context
            window.location.reload();
        } catch (error) {
            console.error('Failed to update profile:', error);
            toast.error('Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isAuthenticated || user?.role !== 'supervisor') {
        return null;
    }

    const dashboardUser = user ? {
        name: user.name,
        email: user.email || user.phone,
        role: user.role.charAt(0).toUpperCase() + user.role.slice(1),
    } : undefined;

    return (
        <DashboardLayout
            role="supervisor"
            user={dashboardUser}
            pageTitle="Settings"
            pageDescription="Manage your account settings and preferences"
        >
            <div className="max-w-5xl space-y-6">
                {/* Profile Settings */}
                <Card className="bg-card border-border">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="w-5 h-5" />
                            Profile Information
                        </CardTitle>
                        <CardDescription>
                            Update your personal information and contact details
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Enter your full name"
                                        className="pl-10 bg-card border-border"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Enter your email"
                                        className="pl-10 bg-card border-border"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="phone"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="Enter your phone number"
                                        className="pl-10 bg-card border-border"
                                        disabled
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Phone number cannot be changed as it's used for login
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end pt-6 mt-6 border-t border-border">
                            <Button
                                onClick={handleSave}
                                disabled={!isModified || isSaving}
                                className="gap-2"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Save Changes
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Account Information */}
                <Card className="bg-card border-border">
                    <CardHeader>
                        <CardTitle>Account Information</CardTitle>
                        <CardDescription>View your account details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between py-2 border-b border-border">
                            <span className="text-sm text-muted-foreground">Role</span>
                            <span className="text-sm font-medium capitalize">{user.role}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-border">
                            <span className="text-sm text-muted-foreground">User ID</span>
                            <span className="text-sm font-medium">#{user.userId}</span>
                        </div>
                        <div className="flex justify-between py-2">
                            <span className="text-sm text-muted-foreground">Login Method</span>
                            <span className="text-sm font-medium">Phone-based Authentication</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Logout Section */}
                <Card className="bg-card border-border border-destructive/20">
                    <CardHeader>
                        <CardTitle className="text-destructive">Logout</CardTitle>
                        <CardDescription>Sign out of your account</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            variant="destructive"
                            onClick={logout}
                            className="w-full gap-2"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}

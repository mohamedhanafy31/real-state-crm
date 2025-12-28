'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/lib/context/AuthContext';
import { updateProfile } from '@/lib/api/auth';
import { getAreas, updateAreas, type Area } from '@/lib/api/areas';
import {
    User,
    Bell,
    Shield,
    Palette,
    Save,
    Loader2,
    Camera,
    Mail,
    Phone,
    Lock,
    MapPin,
} from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
    const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);

    // Profile form state
    const [profileForm, setProfileForm] = useState({
        name: '',
        email: '',
        phone: '',
    });

    // Notification preferences
    const [notifications, setNotifications] = useState({
        emailNotifications: true,
        pushNotifications: true,
        newRequestAlerts: true,
        dealClosedAlerts: true,
        weeklyReports: false,
    });

    // Area management state
    const [areas, setAreas] = useState<Area[]>([]);
    const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
    const [areasLoading, setAreasLoading] = useState(true);
    const [isAreasModified, setIsAreasModified] = useState(false);
    const [isSavingAreas, setIsSavingAreas] = useState(false);

    // Load user data into form
    useEffect(() => {
        console.log('[SettingsPage] useEffect triggered, user:', user);
        console.log('[SettingsPage] user.email value:', user?.email);
        if (user) {
            setProfileForm({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
            });
            // Initialize selected areas from user
            if (user.areaIds) {
                setSelectedAreas(user.areaIds);
            }
            console.log('[SettingsPage] Form set with:', { name: user.name, email: user.email, phone: user.phone, areaIds: user.areaIds });
        }
    }, [user]);

    // Fetch available areas
    useEffect(() => {
        const fetchAreas = async () => {
            try {
                const data = await getAreas();
                setAreas(data);
            } catch (error) {
                console.error('Failed to fetch areas:', error);
            } finally {
                setAreasLoading(false);
            }
        };
        fetchAreas();
    }, []);

    const toggleArea = (areaId: string) => {
        const newAreas = selectedAreas.includes(areaId)
            ? selectedAreas.filter(id => id !== areaId)
            : [...selectedAreas, areaId];
        setSelectedAreas(newAreas);
        setIsAreasModified(true);
    };

    const handleSaveAreas = async () => {
        if (selectedAreas.length === 0) {
            toast.error('Please select at least one area');
            return;
        }
        setIsSavingAreas(true);
        try {
            await updateAreas(selectedAreas);
            toast.success('Areas updated successfully!');
            setIsAreasModified(false);
            // Force page reload to update user context with new areas
            window.location.reload();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update areas');
        } finally {
            setIsSavingAreas(false);
        }
    };

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    if (authLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    const dashboardUser = user ? {
        name: user.name,
        email: user.email || user.phone,
        role: user.role.charAt(0).toUpperCase() + user.role.slice(1),
    } : undefined;

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('handleProfileSubmit called');
        console.log('user:', user);
        console.log('profileForm:', profileForm);

        if (!user?.userId) {
            console.log('No user.userId, returning early');
            toast.error('User not logged in');
            return;
        }

        setIsSaving(true);

        try {
            console.log('Calling updateProfile API...');
            const result = await updateProfile(user.userId, {
                name: profileForm.name,
                email: profileForm.email || undefined,
                phone: profileForm.phone,
            });
            console.log('API result:', result);

            // Update localStorage to reflect changes
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                const parsed = JSON.parse(storedUser);
                parsed.name = profileForm.name;
                parsed.email = profileForm.email;
                parsed.phone = profileForm.phone;
                localStorage.setItem('user', JSON.stringify(parsed));
            }

            toast.success('Profile updated successfully');
        } catch (error: any) {
            console.error('Error updating profile:', error);
            console.error('Error details:', error.response?.data);
            toast.error(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    const handleNotificationToggle = (key: keyof typeof notifications) => {
        setNotifications(prev => ({
            ...prev,
            [key]: !prev[key],
        }));
        toast.success('Notification preference updated');
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    };

    return (
        <DashboardLayout
            role="broker"
            user={dashboardUser}
            pageTitle="Settings"
            pageDescription="Manage your account settings and preferences."
        >
            <div className="space-y-6">
                {/* Profile Section */}
                <Card className="border-border">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <User className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle>Profile Information</CardTitle>
                                <CardDescription>Update your personal details and contact information.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleProfileSubmit} className="space-y-6">
                            {/* Avatar */}
                            <div className="flex items-center gap-6">
                                <Avatar className="w-20 h-20">
                                    <AvatarFallback className="text-xl bg-primary/20 text-primary">
                                        {user?.name ? getInitials(user.name) : 'U'}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <Button type="button" variant="outline" size="sm" className="gap-2">
                                        <Camera className="w-4 h-4" />
                                        Change Photo
                                    </Button>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        JPG, PNG or GIF. Max 2MB
                                    </p>
                                </div>
                            </div>

                            <Separator />

                            {/* Form Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            id="name"
                                            className="pl-10"
                                            value={profileForm.name}
                                            onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
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
                                            className="pl-10"
                                            value={profileForm.email}
                                            onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone Number</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            id="phone"
                                            className="pl-10"
                                            value={profileForm.phone}
                                            onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Button type="submit" disabled={isSaving} className="gap-2">
                                    {isSaving ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4" />
                                    )}
                                    Save Changes
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Service Areas Section */}
                {user?.role === 'broker' && (
                    <Card className="border-border">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                                    <MapPin className="w-5 h-5 text-green-500" />
                                </div>
                                <div>
                                    <CardTitle>Service Areas</CardTitle>
                                    <CardDescription>Select the areas where you offer your services.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {areasLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                        {areas.map((area) => (
                                            <button
                                                key={area.areaId}
                                                type="button"
                                                onClick={() => toggleArea(area.areaId)}
                                                className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all ${selectedAreas.includes(area.areaId)
                                                    ? 'bg-primary border-primary text-white'
                                                    : 'bg-card border-border text-foreground hover:border-primary/50'
                                                    }`}
                                            >
                                                {area.name}
                                            </button>
                                        ))}
                                    </div>
                                    {selectedAreas.length > 0 && (
                                        <p className="text-sm text-muted-foreground">
                                            {selectedAreas.length} area{selectedAreas.length > 1 ? 's' : ''} selected
                                        </p>
                                    )}
                                    <div className="flex justify-end pt-2">
                                        <Button
                                            onClick={handleSaveAreas}
                                            disabled={!isAreasModified || isSavingAreas || selectedAreas.length === 0}
                                            className="gap-2"
                                        >
                                            {isSavingAreas ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Save className="w-4 h-4" />
                                            )}
                                            Save Areas
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Notifications Section */}
                <Card className="border-border">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                <Bell className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                                <CardTitle>Notification Preferences</CardTitle>
                                <CardDescription>Choose how you want to receive notifications.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Email Notifications</p>
                                <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                            </div>
                            <Switch
                                checked={notifications.emailNotifications}
                                onCheckedChange={() => handleNotificationToggle('emailNotifications')}
                            />
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Push Notifications</p>
                                <p className="text-sm text-muted-foreground">Receive push notifications in browser</p>
                            </div>
                            <Switch
                                checked={notifications.pushNotifications}
                                onCheckedChange={() => handleNotificationToggle('pushNotifications')}
                            />
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">New Request Alerts</p>
                                <p className="text-sm text-muted-foreground">Get alerted when new requests are assigned</p>
                            </div>
                            <Switch
                                checked={notifications.newRequestAlerts}
                                onCheckedChange={() => handleNotificationToggle('newRequestAlerts')}
                            />
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Deal Closed Alerts</p>
                                <p className="text-sm text-muted-foreground">Celebrate when you close a deal</p>
                            </div>
                            <Switch
                                checked={notifications.dealClosedAlerts}
                                onCheckedChange={() => handleNotificationToggle('dealClosedAlerts')}
                            />
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Weekly Reports</p>
                                <p className="text-sm text-muted-foreground">Receive weekly performance summaries</p>
                            </div>
                            <Switch
                                checked={notifications.weeklyReports}
                                onCheckedChange={() => handleNotificationToggle('weeklyReports')}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Security Section */}
                <Card className="border-border">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                                <Shield className="w-5 h-5 text-red-500" />
                            </div>
                            <div>
                                <CardTitle>Security</CardTitle>
                                <CardDescription>Manage your password and account security.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Change Password</p>
                                <p className="text-sm text-muted-foreground">Update your account password</p>
                            </div>
                            <Button variant="outline" className="gap-2">
                                <Lock className="w-4 h-4" />
                                Change Password
                            </Button>
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-destructive">Logout</p>
                                <p className="text-sm text-muted-foreground">Sign out of your account</p>
                            </div>
                            <Button variant="destructive" onClick={logout}>
                                Logout
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}

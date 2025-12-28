'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout';
import { StatusBadge, AIBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/lib/context/AuthContext';
import { getRequest, updateRequest, getRequestHistory, type Request } from '@/lib/api/requests';
import { getAIAnalysis, getRequestConversationsWithContext } from '@/lib/api/conversations';
import {
    ArrowLeft,
    Phone,
    Mail,
    MapPin,
    Calendar,
    Clock,
    User,
    Building,
    MessageSquare,
    Loader2,
    CheckCircle2,
    CircleDot,
    Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_OPTIONS = [
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'negotiating', label: 'Negotiating' },
    { value: 'reserved', label: 'Reserved' },
    { value: 'closed', label: 'Closed' },
    { value: 'lost', label: 'Lost' },
];

export default function RequestDetailsPage() {
    const { user, isLoading: authLoading, isAuthenticated } = useAuth();
    const router = useRouter();
    const params = useParams();
    const requestId = params.id as string;

    const [request, setRequest] = useState<Request | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [hasExistingConversation, setHasExistingConversation] = useState(false);
    const [updateNote, setUpdateNote] = useState('');

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [reqData, histData] = await Promise.all([
                getRequest(requestId),
                getRequestHistory(requestId).catch(() => []),
            ]);
            setRequest(reqData);
            setHistory(histData);
        } catch (error) {
            console.error('Error fetching request:', error);
            toast.error('Failed to load request details');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (requestId) {
            fetchData();
            checkExistingConversation();
        }
    }, [requestId]);

    const checkExistingConversation = async () => {
        try {
            const conversations = await getRequestConversationsWithContext(
                requestId,
                'broker' // Only check broker-AI conversations
            );
            setHasExistingConversation(conversations.length > 0);
        } catch (error) {
            console.error('Error checking conversations:', error);
            setHasExistingConversation(false);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!request) return;
        try {
            setIsUpdating(true);
            await updateRequest(requestId, { status: newStatus, notes: updateNote });
            setRequest({ ...request, status: newStatus, notes: updateNote });
            setUpdateNote('');
            toast.success('Status updated successfully');
            fetchData(); // Refresh history
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Failed to update status');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleUpdateNoteOnly = async () => {
        if (!request) return;
        try {
            setIsUpdating(true);
            await updateRequest(requestId, { notes: updateNote });
            setUpdateNote('');
            toast.success('Note added successfully');
            fetchData();
        } catch (error) {
            console.error('Error updating note:', error);
            toast.error('Failed to add note');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleStartAIAnalysis = async () => {
        if (!request) return;
        try {
            setIsAnalyzing(true);
            const response = await getAIAnalysis(requestId);
            
            if (response.success) {
                toast.success('AI analysis complete! Redirecting to conversations...');
                // Redirect to conversations page after short delay
                setTimeout(() => {
                    router.push(`/broker/conversations`);
                }, 1500);
            } else {
                toast.error(response.error || 'Failed to generate AI analysis');
                setIsAnalyzing(false);
            }
        } catch (error: any) {
            console.error('Error starting AI analysis:', error);
            toast.error(error.response?.data?.message || 'Failed to start AI analysis');
            setIsAnalyzing(false);
        }
    };

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isAuthenticated || !request) {
        return null;
    }

    const dashboardUser = user ? {
        name: user.name,
        email: user.email || user.phone,
        role: user.role.charAt(0).toUpperCase() + user.role.slice(1),
    } : undefined;

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <DashboardLayout
            role="broker"
            user={dashboardUser}
            pageTitle={`Request #${requestId}`}
            pageDescription="View and manage request details"
        >
            <div className="space-y-6">
                {/* Back Button */}
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.back()}
                        className="gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Requests
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Client & Request Info */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Client Requirements Card */}
                        <Card className="border-border">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-primary" />
                                    Requirements & Preferences
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground uppercase font-semibold">Unit Type</p>
                                        <p className="font-medium text-lg capitalize">{request.unitType || 'Any'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground uppercase font-semibold">Budget (EGP)</p>
                                        <p className="font-medium text-lg">
                                            {request.budgetMin?.toLocaleString() || '0'} - {request.budgetMax?.toLocaleString() || 'Any'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground uppercase font-semibold">Rooms</p>
                                        <p className="font-medium text-lg">
                                            {request.bedrooms ? `${request.bedrooms} BR` : 'Any'} / {request.bathrooms ? `${request.bathrooms} BA` : 'Any'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground uppercase font-semibold">Size (SQM)</p>
                                        <p className="font-medium text-lg">
                                            {request.sizeMin || 'Any'} - {request.sizeMax || 'Any'}
                                        </p>
                                    </div>
                                    <div className="md:col-span-2 space-y-1">
                                        <p className="text-xs text-muted-foreground uppercase font-semibold">Current Agent Notes</p>
                                        <div className="p-3 rounded-lg bg-muted/50 text-sm border border-border italic min-h-[60px]">
                                            {request.notes || 'No notes added yet.'}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* AI Recommendations */}
                        <Card className="border-border border-primary/30 bg-primary/5">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-primary" />
                                    AI Recommendations
                                    <AIBadge size="sm" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="p-3 rounded-lg bg-card border border-border">
                                        <p className="text-sm">
                                            Based on this client's preferences for <strong>{request.unitType || 'units'}</strong> in <strong>{request.area?.name}</strong>,
                                            we found <span className="text-primary font-bold">3 matching units</span> in
                                            nearby projects.
                                        </p>
                                    </div>
                                    <Button 
                                        variant="default" 
                                        className="w-full gap-2" 
                                        onClick={handleStartAIAnalysis}
                                        disabled={isAnalyzing || hasExistingConversation}
                                    >
                                        {hasExistingConversation ? (
                                            <>
                                                <CheckCircle2 className="w-4 h-4" />
                                                Analysis Complete
                                            </>
                                        ) : isAnalyzing ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Analyzing Client...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-5 h-5" />
                                                Start AI Analysis
                                            </>
                                        )}
                                    </Button>
                                    {hasExistingConversation && (
                                        <Button
                                            variant="outline"
                                            className="w-full gap-2 mt-2"
                                            onClick={() => router.push('/broker/conversations')}
                                        >
                                            <MessageSquare className="w-4 h-4" />
                                            View Conversation
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column - Status & Timeline */}
                    <div className="space-y-6">
                        {/* Status Card */}
                        <Card className="border-border">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg font-semibold">Request Status</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Current Status</span>
                                    <StatusBadge status={request.status as any} />
                                </div>

                                <Separator />

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Add Note / Status Update</label>
                                    <textarea
                                        className="w-full min-h-[80px] p-2 text-sm rounded-md border border-input bg-background focus:ring-1 focus:ring-primary outline-none"
                                        placeholder="Add a comment about this update..."
                                        value={updateNote}
                                        onChange={(e) => setUpdateNote(e.target.value)}
                                    />
                                    <div className="flex gap-2">
                                        <Select
                                            value={request.status}
                                            onValueChange={handleStatusChange}
                                            disabled={isUpdating}
                                        >
                                            <SelectTrigger className="flex-1">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {STATUS_OPTIONS.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleUpdateNoteOnly}
                                            disabled={isUpdating || !updateNote}
                                        >
                                            Save Note
                                        </Button>
                                    </div>
                                </div>

                                <div className="pt-2 space-y-2">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Calendar className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">Created:</span>
                                        <span>{formatDate(request.createdAt)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Clock className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">Updated:</span>
                                        <span>{formatDate(request.updatedAt)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Status Timeline */}
                        <Card className="border-border">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg font-semibold">Status History</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {history.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-4">
                                            No status changes recorded yet
                                        </p>
                                    ) : (
                                        history.map((item, index) => (
                                            <div key={index} className="flex gap-3">
                                                <div className="flex flex-col items-center">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${index === 0 ? 'bg-primary text-white' : 'bg-muted'
                                                        }`}>
                                                        {index === 0 ? (
                                                            <CheckCircle2 className="w-4 h-4" />
                                                        ) : (
                                                            <CircleDot className="w-4 h-4 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                    {index < history.length - 1 && (
                                                        <div className="w-px h-12 bg-border" />
                                                    )}
                                                </div>
                                                <div className="pb-4 flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <p className="font-medium text-sm">
                                                            {item.oldStatus ? `${item.oldStatus} → ` : ''}{item.newStatus}
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground uppercase bg-muted px-1 rounded">
                                                            {item.changedBy}
                                                        </p>
                                                    </div>
                                                    {item.notes && (
                                                        <p className="text-sm bg-muted/30 p-2 rounded mt-1 border border-border/50 italic shadow-sm">
                                                            "{item.notes}"
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {formatDate(item.createdAt)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout';
import { AIBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/lib/context/AuthContext';
import { getBrokerConversationThreads, getRequestConversationsWithContext, chatWithAI, type ConversationThread, type Conversation, type ClientAnalysis, type Strategy } from '@/lib/api/conversations';
import {
    Search,
    Send,
    Phone,
    MoreVertical,
    Bot,
    User,
    Loader2,
    MessageSquare,
    Sparkles,
    AlertTriangle,
    Target,
    Brain,
    Shield,
    ChevronRight,
    ChevronLeft,
    Lightbulb,
} from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ConversationsPage() {
    const { user, isLoading: authLoading, isAuthenticated } = useAuth();
    const router = useRouter();

    const [threads, setThreads] = useState<ConversationThread[]>([]);
    const [selectedThread, setSelectedThread] = useState<ConversationThread | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);
    const [messages, setMessages] = useState<Conversation[]>([]);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    // AI Analysis state
    const [aiAnalysis, setAiAnalysis] = useState<ClientAnalysis | null>(null);
    const [aiStrategy, setAiStrategy] = useState<Strategy | null>(null);
    const [showAnalysisPanel, setShowAnalysisPanel] = useState(true);
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    const fetchThreads = async () => {
        if (!user?.userId) {
            setHasFetched(true);
            return;
        }

        try {
            setIsLoading(true);
            const data = await getBrokerConversationThreads(user.userId);
            setThreads(data);
            if (data.length > 0 && !selectedThread) {
                setSelectedThread(data[0]);
            }
        } catch (error) {
            console.error('Error fetching conversations:', error);
            toast.error('Failed to load conversations');
        } finally {
            setIsLoading(false);
            setHasFetched(true);
        }
    };

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            fetchThreads();
        }
    }, [authLoading, isAuthenticated, user?.userId]);

    // Load conversation messages when thread is selected
    useEffect(() => {
        if (selectedThread?.requestId) {
            loadConversationMessages(selectedThread.requestId);
        }
    }, [selectedThread]);

    const loadConversationMessages = async (requestId: string) => {
        try {
            setIsLoadingMessages(true);
            const conversations = await getRequestConversationsWithContext(
                requestId,
                'broker' // Only load broker-AI conversations
            );
            setMessages(conversations);
        } catch (error) {
            console.error('Error loading messages:', error);
            toast.error('Failed to load conversation history');
        } finally {
            setIsLoadingMessages(false);
        }
    };

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Detect if text contains Arabic characters
    const isArabic = (text: string): boolean => {
        const arabicPattern = /[\u0600-\u06FF]/;
        return arabicPattern.test(text);
    };

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

    const filteredThreads = threads.filter((thread) =>
        thread.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        thread.customerPhone.includes(searchQuery)
    );

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedThread || isSending) return;
        
        const messageToSend = newMessage.trim();
        setNewMessage('');
        setIsSending(true);
        
        // Add broker message to UI immediately (optimistic update)
        const tempBrokerMsg: Conversation = {
            conversationId: `temp-${Date.now()}`,
            relatedRequestId: selectedThread.requestId,
            actorType: 'broker',
            actorId: user?.userId || '',
            message: messageToSend,
            createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, tempBrokerMsg]);
        
        try {
            const response = await chatWithAI(selectedThread.requestId, messageToSend);
            
            if (response.success) {
                // Add AI response to messages
                const aiMsg: Conversation = {
                    conversationId: `ai-${Date.now()}`,
                    relatedRequestId: selectedThread.requestId,
                    actorType: 'ai',
                    actorId: 'ai-assistant',
                    message: response.response,
                    createdAt: response.timestamp,
                };
                setMessages(prev => [...prev, aiMsg]);
                
                // Update analysis if returned
                if (response.client_analysis) {
                    setAiAnalysis(response.client_analysis);
                }
                if (response.strategy) {
                    setAiStrategy(response.strategy);
                }
            } else {
                toast.error(response.error || 'Failed to get AI response');
                // Remove optimistic message on error
                setMessages(prev => prev.filter(m => m.conversationId !== tempBrokerMsg.conversationId));
            }
        } catch (error: any) {
            console.error('Error sending message:', error);
            toast.error(error.response?.data?.message || 'Failed to send message');
            // Remove optimistic message on error
            setMessages(prev => prev.filter(m => m.conversationId !== tempBrokerMsg.conversationId));
        } finally {
            setIsSending(false);
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <DashboardLayout
            role="broker"
            user={dashboardUser}
            pageTitle="Conversations"
            pageDescription="Communicate with your clients."
        >
            <div className="flex h-[calc(100vh-220px)] gap-4">
                {/* Conversations List */}
                <Card className="w-80 flex flex-col border-border">
                    <div className="p-4 border-b border-border">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                className="pl-9 bg-muted/50 border-0"
                                placeholder="Search conversations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <ScrollArea className="flex-1 overflow-y-auto h-full">
                        {isLoading && !hasFetched ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            </div>
                        ) : filteredThreads.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                {searchQuery ? 'No matching conversations' : 'No conversations yet'}
                            </div>
                        ) : (
                            <>
                                {filteredThreads.map((thread) => (
                                    <div
                                        key={thread.customerId}
                                        className={`mx-2 my-1 p-3 rounded-lg cursor-pointer transition-colors ${selectedThread?.customerId === thread.customerId
                                            ? 'bg-primary/10 border border-primary/30'
                                            : 'hover:bg-muted/50'
                                            }`}
                                        onClick={() => setSelectedThread(thread)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <Avatar className="h-10 w-10 shrink-0">
                                                <AvatarFallback className="bg-primary/20 text-primary">
                                                    {thread.customerName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="font-medium text-sm truncate">{thread.customerName}</p>
                                                    <span className="text-xs text-muted-foreground shrink-0">{formatTime(thread.lastMessageTime)}</span>
                                                </div>
                                                <div className="flex items-center gap-1 mt-1">
                                                    {thread.isAI && <Bot className="w-3 h-3 text-primary shrink-0" />}
                                                    <p className="text-xs text-muted-foreground truncate">{thread.lastMessage}</p>
                                                </div>
                                            </div>
                                            {thread.unreadCount > 0 && (
                                                <Badge className="h-5 w-5 p-0 flex items-center justify-center text-xs shrink-0">
                                                    {thread.unreadCount}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </ScrollArea>
                </Card>

                {/* Chat Area */}
                <Card className="flex-1 flex flex-col border-border">
                    {selectedThread ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 border-b border-border flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                        <AvatarFallback className="bg-primary/20 text-primary">
                                            {selectedThread.customerName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium">{selectedThread.customerName}</p>
                                        <p className="text-xs text-muted-foreground">{selectedThread.customerPhone} • {selectedThread.areaName}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <AIBadge size="sm" label="AI Assisted" />
                                    <Button variant="ghost" size="icon">
                                        <Phone className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon">
                                        <MoreVertical className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Messages */}
                            <ScrollArea className="flex-1 overflow-y-auto">
                                <div className="p-4">
                                    {isLoadingMessages ? (
                                        <div className="flex items-center justify-center h-full">
                                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                        </div>
                                    ) : messages.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                                            <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
                                            <p className="font-medium">No conversation history yet</p>
                                            <p className="text-sm mt-2">
                                                Messages will appear here once you start analyzing this request.
                                            </p>
                                            <Button
                                                variant="outline"
                                                className="mt-4"
                                                onClick={() => router.push(`/broker/requests/${selectedThread.requestId}`)}
                                            >
                                                View Request Details
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {messages.map((msg) => {
                                                const hasArabic = isArabic(msg.message);
                                                return (
                                                    <div
                                                        key={msg.conversationId}
                                                        className={`flex ${
                                                            msg.actorType === 'broker' ? 'justify-end' : 'justify-start'
                                                        }`}
                                                    >
                                                        <div
                                                            className={`max-w-[80%] rounded-lg p-3 ${
                                                                msg.actorType === 'broker'
                                                                    ? 'bg-primary text-primary-foreground'
                                                                    : 'bg-muted'
                                                            }`}
                                                            dir={hasArabic ? 'rtl' : 'ltr'}
                                                        >
                                                            <div className="flex items-center gap-2 mb-2">
                                                                {msg.actorType === 'ai' && <Bot className="w-4 h-4" />}
                                                                {msg.actorType === 'broker' && <User className="w-4 h-4" />}
                                                                <span className="text-xs opacity-70">
                                                                    {formatTime(msg.createdAt)}
                                                                </span>
                                                            </div>
                                                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                                                <ReactMarkdown 
                                                                    remarkPlugins={[remarkGfm]}
                                                                >
                                                                    {msg.message}
                                                                </ReactMarkdown>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            <div ref={messagesEndRef} />
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>

                            {/* Message Input */}
                            <div className="p-4 border-t border-border">
                                <div className="flex items-center gap-3">
                                    <Input
                                        className="flex-1 bg-muted/50"
                                        placeholder="Type a message..."
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                    />
                                    <Button 
                                        onClick={handleSendMessage} 
                                        disabled={!newMessage.trim() || isSending}
                                    >
                                        {isSending ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <Send className="w-4 h-4 mr-2" />
                                        )}
                                        {isSending ? 'Sending...' : 'Send'}
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" />
                                    AI will suggest responses based on conversation context
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground">
                            <div className="text-center">
                                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>Select a conversation to start chatting</p>
                            </div>
                        </div>
                    )}
                </Card>

                {/* AI Analysis Panel (Collapsible) */}
                {selectedThread && (aiAnalysis || aiStrategy) && (
                    <Card className={`border-border flex flex-col transition-all duration-300 ${
                        showAnalysisPanel ? 'w-80' : 'w-12'
                    }`}>
                        {showAnalysisPanel ? (
                            <>
                                <div className="p-4 border-b border-border flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Brain className="w-5 h-5 text-primary" />
                                        <h3 className="font-semibold">AI Analysis</h3>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowAnalysisPanel(false)}
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                                
                                <ScrollArea className="flex-1 p-4">
                                    {/* Client Profile */}
                                    {aiAnalysis && (
                                        <div className="space-y-4">
                                            <div>
                                                <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                                                    <Target className="w-4 h-4 text-primary" />
                                                    Client Profile
                                                </h4>
                                                <div className="space-y-2 text-sm">
                                                    {aiAnalysis.personality_type && (
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">Personality</span>
                                                            <span className="font-medium">{aiAnalysis.personality_type}</span>
                                                        </div>
                                                    )}
                                                    {aiAnalysis.communication_style && (
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">Communication</span>
                                                            <span className="font-medium">{aiAnalysis.communication_style}</span>
                                                        </div>
                                                    )}
                                                    {aiAnalysis.decision_speed && (
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">Decision Speed</span>
                                                            <span className="font-medium">{aiAnalysis.decision_speed}</span>
                                                        </div>
                                                    )}
                                                    {aiAnalysis.budget_realism && (
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">Budget</span>
                                                            <span className="font-medium">{aiAnalysis.budget_realism}</span>
                                                        </div>
                                                    )}
                                                    {aiAnalysis.seriousness_level && (
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">Seriousness</span>
                                                            <span className="font-medium">{aiAnalysis.seriousness_level}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Risk Assessment */}
                                            {(aiAnalysis.risk_level || aiAnalysis.risk_indicators?.length > 0) && (
                                                <div className="pt-3 border-t border-border">
                                                    <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                                                        <Shield className="w-4 h-4 text-orange-500" />
                                                        Risk Assessment
                                                    </h4>
                                                    {aiAnalysis.risk_level && (
                                                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium mb-2 ${
                                                            aiAnalysis.risk_level.toLowerCase().includes('high') 
                                                                ? 'bg-red-500/20 text-red-400'
                                                                : aiAnalysis.risk_level.toLowerCase().includes('medium')
                                                                ? 'bg-orange-500/20 text-orange-400'
                                                                : 'bg-green-500/20 text-green-400'
                                                        }`}>
                                                            <AlertTriangle className="w-3 h-3" />
                                                            {aiAnalysis.risk_level}
                                                        </div>
                                                    )}
                                                    {aiAnalysis.risk_indicators?.length > 0 && (
                                                        <ul className="space-y-1 text-xs text-muted-foreground">
                                                            {aiAnalysis.risk_indicators.map((indicator, i) => (
                                                                <li key={i} className="flex items-start gap-1">
                                                                    <span className="text-orange-400 mt-0.5">•</span>
                                                                    {indicator}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            )}

                                            {/* Summary */}
                                            {aiAnalysis.summary && (
                                                <div className="pt-3 border-t border-border">
                                                    <p className="text-xs text-muted-foreground" dir="rtl">
                                                        {aiAnalysis.summary}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Strategy */}
                                    {aiStrategy && (
                                        <div className="mt-4 pt-4 border-t border-border space-y-3">
                                            <h4 className="text-sm font-medium flex items-center gap-2">
                                                <Lightbulb className="w-4 h-4 text-yellow-500" />
                                                Strategy
                                            </h4>
                                            
                                            {aiStrategy.communication_tone && (
                                                <div className="text-sm">
                                                    <span className="text-muted-foreground">Tone: </span>
                                                    <span className="font-medium">{aiStrategy.communication_tone}</span>
                                                </div>
                                            )}

                                            {aiStrategy.key_points?.length > 0 && (
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">Key Points:</p>
                                                    <ul className="space-y-1 text-xs">
                                                        {aiStrategy.key_points.map((point, i) => (
                                                            <li key={i} className="flex items-start gap-1" dir="rtl">
                                                                <span className="text-primary mt-0.5">✓</span>
                                                                {point}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {aiStrategy.negotiation_tips?.length > 0 && (
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">Negotiation Tips:</p>
                                                    <ul className="space-y-1 text-xs">
                                                        {aiStrategy.negotiation_tips.map((tip, i) => (
                                                            <li key={i} className="flex items-start gap-1" dir="rtl">
                                                                <span className="text-blue-400 mt-0.5">💡</span>
                                                                {tip}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {aiStrategy.warnings?.length > 0 && (
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">Warnings:</p>
                                                    <ul className="space-y-1 text-xs text-orange-400">
                                                        {aiStrategy.warnings.map((warning, i) => (
                                                            <li key={i} className="flex items-start gap-1" dir="rtl">
                                                                <span className="mt-0.5">⚠️</span>
                                                                {warning}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </ScrollArea>
                            </>
                        ) : (
                            <div className="flex flex-col items-center py-4">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowAnalysisPanel(true)}
                                    className="h-auto flex flex-col gap-2 py-2"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    <Brain className="w-5 h-5 text-primary" />
                                </Button>
                            </div>
                        )}
                    </Card>
                )}
            </div>
        </DashboardLayout>
    );
}

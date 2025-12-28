'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Logo } from '@/components/layout/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChatMessage } from '@/components/interview/ChatMessage';
import { PhaseProgress } from '@/components/interview/PhaseProgress';
import {
    startInterview,
    submitInterviewResponse,
    getApplicationStatus,
    type ConversationMessage
} from '@/lib/api/interview';
import { Loader2, Send, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function InterviewPage() {
    const params = useParams();
    const router = useRouter();
    const applicationId = params.id as string;

    const [messages, setMessages] = useState<ConversationMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [currentPhase, setCurrentPhase] = useState(1);
    const [isComplete, setIsComplete] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Start interview on mount
    useEffect(() => {
        const initInterview = async () => {
            try {
                // First check if application exists and status
                const status = await getApplicationStatus(applicationId);

                if (status.status === 'approved') {
                    router.push('/interview/result?status=approved');
                    return;
                }

                if (status.status === 'rejected') {
                    router.push('/interview/result?status=rejected');
                    return;
                }

                // Start or resume interview
                const session = await startInterview(applicationId);
                setSessionId(session.sessionId);
                setCurrentPhase(session.currentPhase);

                // Add initial message if there's one
                if (session.conversationContext && session.conversationContext.length > 0) {
                    setMessages(session.conversationContext);
                } else if (session.message) {
                    setMessages([{
                        role: 'assistant',
                        content: session.message
                    }]);
                }
            } catch (err: any) {
                console.error('Failed to start interview:', err);
                setError(err.response?.data?.message || 'Failed to load interview. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };

        if (applicationId) {
            initInterview();
        }
    }, [applicationId, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!inputText.trim() || !sessionId || isSending) return;

        const userMessage = inputText.trim();
        setInputText('');
        setIsSending(true);

        // Add user message immediately
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

        // Show typing indicator
        setMessages(prev => [...prev, { role: 'assistant', content: '...', isTyping: true } as any]);

        try {
            const result = await submitInterviewResponse(sessionId, userMessage);

            // Remove typing indicator and add AI response
            setMessages(prev => {
                const filtered = prev.filter(m => !(m as any).isTyping);
                if (result.aiMessage) {
                    return [...filtered, { role: 'assistant', content: result.aiMessage }];
                }
                return filtered;
            });

            // Update phase
            if (result.currentPhase) {
                setCurrentPhase(result.currentPhase);
            }

            // Check if interview is complete
            if (result.isComplete) {
                setIsComplete(true);
                // Redirect to result page after a short delay
                setTimeout(() => {
                    router.push(`/interview/result?status=${result.finalResult}&score=${result.finalScore}`);
                }, 3000);
            }
        } catch (err: any) {
            // Remove typing indicator
            setMessages(prev => prev.filter(m => !(m as any).isTyping));
            toast.error(err.response?.data?.message || 'Failed to send message');
        } finally {
            setIsSending(false);
            inputRef.current?.focus();
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#101922]">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-[#92adc9]">Loading interview...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#101922] px-4">
                <div className="text-center max-w-md">
                    <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
                    <p className="text-[#92adc9] mb-6">{error}</p>
                    <Button onClick={() => window.location.reload()} className="bg-primary">
                        Try Again
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-[#101922] overflow-hidden">
            {/* Fixed Header */}
            <header className="flex-shrink-0 p-4 border-b border-[#324d67] bg-[#101922] sticky top-0 z-10">
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-center justify-between mb-4">
                        <Logo size="sm" variant="icon" />
                        <span className="text-sm text-[#92adc9]">Broker Interview</span>
                    </div>
                    <PhaseProgress currentPhase={currentPhase} isComplete={isComplete} />
                </div>
            </header>

            {/* Scrollable Chat Messages */}
            <main className="flex-1 overflow-y-auto p-4">
                <div className="max-w-3xl mx-auto pb-4">
                    {messages.map((msg, index) => (
                        <ChatMessage
                            key={index}
                            role={msg.role}
                            content={msg.content}
                            isTyping={(msg as any).isTyping}
                        />
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </main>

            {/* Fixed Input Area */}
            <footer className="flex-shrink-0 p-4 border-t border-[#324d67] bg-[#101922] sticky bottom-0 z-10">
                <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
                    <div className="flex gap-3">
                        <Input
                            ref={inputRef}
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder={isComplete ? 'Interview complete' : 'Type your answer...'}
                            disabled={isSending || isComplete}
                            className="flex-1 h-12 bg-[#233648] border-[#324d67] text-white placeholder:text-[#92adc9] focus:border-primary"
                            dir="auto"
                        />
                        <Button
                            type="submit"
                            disabled={!inputText.trim() || isSending || isComplete}
                            className="h-12 px-6 bg-primary hover:bg-primary/90"
                        >
                            {isSending ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Send className="w-5 h-5" />
                            )}
                        </Button>
                    </div>
                </form>
            </footer>
        </div>
    );
}

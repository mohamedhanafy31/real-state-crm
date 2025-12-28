'use client';

import { cn } from '@/lib/utils';

interface ChatMessageProps {
    role: 'assistant' | 'user';
    content: string;
    isTyping?: boolean;
}

export function ChatMessage({ role, content, isTyping }: ChatMessageProps) {
    const isAI = role === 'assistant';

    return (
        <div
            className={cn(
                'flex w-full mb-4',
                isAI ? 'justify-start' : 'justify-end'
            )}
        >
            <div
                className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-3',
                    isAI
                        ? 'bg-[#233648] text-white rounded-tl-sm'
                        : 'bg-primary text-white rounded-tr-sm'
                )}
            >
                {isTyping ? (
                    <div className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                ) : (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed" dir="auto">
                        {content}
                    </p>
                )}
            </div>
        </div>
    );
}

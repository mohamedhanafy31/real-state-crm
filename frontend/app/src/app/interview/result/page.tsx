'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/layout/Logo';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react';

import { Suspense } from 'react';

function InterviewResultContent() {
    const searchParams = useSearchParams();
    const status = searchParams.get('status');
    const score = searchParams.get('score');

    const isApproved = status === 'approved';

    return (
        <div className="max-w-md w-full text-center">
            {isApproved ? (
                <>
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
                        <CheckCircle className="w-14 h-14 text-green-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-3">
                        🎉 مبروك! Congratulations!
                    </h1>
                    <p className="text-lg text-[#92adc9] mb-2">
                        You passed the interview!
                    </p>
                    {score && (
                        <p className="text-2xl font-bold text-green-400 mb-6">
                            Score: {score}/100
                        </p>
                    )}
                    <p className="text-[#92adc9] mb-8">
                        Your account has been approved. You can now log in and start using the platform.
                    </p>
                    <Link href="/login">
                        <Button className="h-12 px-8 bg-primary hover:bg-primary/90 text-white font-semibold gap-2">
                            Go to Login
                            <ArrowRight className="w-5 h-5" />
                        </Button>
                    </Link>
                </>
            ) : (
                <>
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                        <XCircle className="w-14 h-14 text-red-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-3">
                        😔 للأسف
                    </h1>
                    <p className="text-lg text-[#92adc9] mb-2">
                        You did not pass the interview
                    </p>
                    {score && (
                        <p className="text-2xl font-bold text-red-400 mb-6">
                            Score: {score}/100
                        </p>
                    )}
                    <p className="text-[#92adc9] mb-4">
                        The minimum required score is 75 points.
                    </p>
                    <p className="text-sm text-[#92adc9]/70 mb-8">
                        Unfortunately, the interview cannot be retried. We appreciate your time and effort.
                    </p>
                    <Link href="/">
                        <Button variant="outline" className="h-12 px-8 border-[#324d67] text-white hover:bg-[#233648]">
                            Return to Home
                        </Button>
                    </Link>
                </>
            )}
        </div>
    );
}

export default function InterviewResultPage() {
    return (
        <div className="min-h-screen flex flex-col bg-[#101922]">
            {/* Header */}
            <header className="p-6">
                <Logo size="md" variant="full" />
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center px-4">
                <Suspense fallback={<div className="text-white">Loading result...</div>}>
                    <InterviewResultContent />
                </Suspense>
            </main>

            {/* Footer */}
            <footer className="p-6 text-center">
                <p className="text-sm text-[#92adc9]">
                    © 2024 AI-Properties. All rights reserved.
                </p>
            </footer>
        </div>
    );
}

'use client';

import { Logo } from '@/components/layout/Logo';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ForgotPasswordPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#101922] p-6">
            <div className="w-full max-w-md space-y-8 text-center">
                <Logo size="lg" variant="full" />
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-white">Forgot Password?</h1>
                    <p className="text-[#92adc9]">
                        Password recovery is not yet implemented. Please contact your administrator.
                    </p>
                </div>
                <Button asChild className="w-full">
                    <Link href="/login">Back to Login</Link>
                </Button>
            </div>
        </div>
    );
}

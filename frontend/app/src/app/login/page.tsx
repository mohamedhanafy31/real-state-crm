'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/context/AuthContext';
import { Logo } from '@/components/layout/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

const loginSchema = z.object({
    phone: z.string()
        .regex(/^01[0-9]{9}$/, 'Phone must be a valid Egyptian number (11 digits starting with 01)'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const { login, isLoading } = useAuth();
    const [showPassword, setShowPassword] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginFormData) => {
        try {
            await login(data);
            toast.success('Login successful!');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Invalid phone or password');
        }
    };

    return (
        <div className="min-h-screen flex bg-[#101922]">
            {/* Left Side - Image */}
            <div className="hidden lg:flex lg:w-1/2 relative">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                        backgroundImage: `url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070')`,
                    }}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-[#101922] via-[#101922]/50 to-transparent" />
                </div>

                <div className="relative z-10 flex flex-col justify-end p-12 text-white">
                    <h2 className="text-4xl font-bold mb-4">
                        Find Your Perfect Unit
                    </h2>
                    <p className="text-lg text-gray-300 max-w-md">
                        AI-Properties helps you discover the ideal real estate opportunities
                        with intelligent matching and personalized recommendations.
                    </p>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex flex-col">
                <div className="p-6 lg:p-8">
                    <Logo size="md" variant="full" />
                </div>

                <div className="flex-1 flex items-center justify-center px-6 lg:px-16">
                    <div className="w-full max-w-md">
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-white mb-2">
                                Welcome back
                            </h1>
                            <p className="text-[#92adc9]">
                                Enter your credentials to access your account
                            </p>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                            {/* Phone Field */}
                            <div className="space-y-2">
                                <Label htmlFor="phone" className="text-white">
                                    Phone Number
                                </Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    placeholder="01XXXXXXXXX"
                                    {...register('phone')}
                                    className={`h-12 bg-[#233648] border-[#324d67] text-white placeholder:text-[#92adc9] focus:border-primary focus:ring-primary ${errors.phone ? 'border-red-500' : ''
                                        }`}
                                />
                                {errors.phone && (
                                    <p className="text-sm text-red-400">{errors.phone.message}</p>
                                )}
                            </div>

                            {/* Password Field */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password" className="text-white">
                                        Password
                                    </Label>
                                    <Link
                                        href="/forgot-password"
                                        className="text-sm text-primary hover:underline"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        {...register('password')}
                                        className={`h-12 bg-[#233648] border-[#324d67] text-white placeholder:text-[#92adc9] pr-10 focus:border-primary focus:ring-primary ${errors.password ? 'border-red-500' : ''
                                            }`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#92adc9] hover:text-white transition-colors"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-5 h-5" />
                                        ) : (
                                            <Eye className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="text-sm text-red-400">{errors.password.message}</p>
                                )}
                            </div>

                            {/* Remember Me */}
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="remember"
                                    className="w-4 h-4 rounded border-[#324d67] bg-[#233648] text-primary focus:ring-primary focus:ring-offset-0"
                                />
                                <label htmlFor="remember" className="text-sm text-[#92adc9]">
                                    Remember me for 30 days
                                </label>
                            </div>

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    'Sign in'
                                )}
                            </Button>
                        </form>

                        {/* Sign Up Link */}
                        <p className="mt-8 text-center text-[#92adc9]">
                            Don&apos;t have an account?{' '}
                            <Link href="/register" className="text-primary hover:underline font-medium">
                                Create an account
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 lg:p-8 text-center">
                    <p className="text-sm text-[#92adc9]">
                        © 2024 AI-Properties. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}

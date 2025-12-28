'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/context/AuthContext';
import { Logo } from '@/components/layout/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';

const registerSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    phone: z.string()
        .regex(/^01[0-9]{9}$/, 'Phone must be a valid Egyptian number (11 digits starting with 01)'),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function SupervisorRegisterPage() {
    const { register: registerUser, isLoading } = useAuth();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
    });

    const onSubmit = async (data: RegisterFormData) => {
        try {
            await registerUser({
                name: data.name,
                phone: data.phone,
                email: data.email || undefined,
                password: data.password,
                role: 'supervisor',
                areaIds: undefined,
            });
            toast.success('Supervisor account created successfully!');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Registration failed. Please try again.');
        }
    };

    return (
        <div className="min-h-screen flex bg-[#101922]">
            {/* Left Side - Image */}
            <div className="hidden lg:flex lg:w-1/2 relative">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                        backgroundImage: `url('https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069')`,
                    }}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-[#101922] via-[#101922]/50 to-transparent" />
                </div>

                <div className="relative z-10 flex flex-col justify-end p-12 text-white">
                    <h2 className="text-4xl font-bold mb-4">
                        Supervisor Dashboard
                    </h2>
                    <p className="text-lg text-gray-300 max-w-md">
                        Manage the entire real estate operation with powerful analytics,
                        broker management, and comprehensive oversight tools.
                    </p>
                </div>
            </div>

            {/* Right Side - Register Form */}
            <div className="w-full lg:w-1/2 flex flex-col overflow-y-auto">
                <div className="p-6 lg:p-8">
                    <Logo size="md" variant="full" />
                </div>

                <div className="flex-1 flex items-center justify-center px-6 lg:px-16 py-8">
                    <div className="w-full max-w-md">
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
                                <ShieldCheck className="w-8 h-8 text-primary" />
                                Register as Supervisor
                            </h1>
                            <p className="text-[#92adc9]">
                                Create your supervisor account to manage operations
                            </p>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                            {/* Name Field */}
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-white">
                                    Full Name
                                </Label>
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="Ahmed Ali"
                                    {...register('name')}
                                    className={`h-12 bg-[#233648] border-[#324d67] text-white placeholder:text-[#92adc9] focus:border-primary focus:ring-primary ${errors.name ? 'border-red-500' : ''
                                        }`}
                                />
                                {errors.name && (
                                    <p className="text-sm text-red-400">{errors.name.message}</p>
                                )}
                            </div>

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

                            {/* Email Field (Optional) */}
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-white">
                                    Email <span className="text-[#92adc9]">(optional)</span>
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="ahmed@example.com"
                                    {...register('email')}
                                    className={`h-12 bg-[#233648] border-[#324d67] text-white placeholder:text-[#92adc9] focus:border-primary focus:ring-primary ${errors.email ? 'border-red-500' : ''
                                        }`}
                                />
                                {errors.email && (
                                    <p className="text-sm text-red-400">{errors.email.message}</p>
                                )}
                            </div>

                            {/* Password Field */}
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-white">
                                    Password
                                </Label>
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

                            {/* Confirm Password Field */}
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" className="text-white">
                                    Confirm Password
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        {...register('confirmPassword')}
                                        className={`h-12 bg-[#233648] border-[#324d67] text-white placeholder:text-[#92adc9] pr-10 focus:border-primary focus:ring-primary ${errors.confirmPassword ? 'border-red-500' : ''
                                            }`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#92adc9] hover:text-white transition-colors"
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff className="w-5 h-5" />
                                        ) : (
                                            <Eye className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                                {errors.confirmPassword && (
                                    <p className="text-sm text-red-400">{errors.confirmPassword.message}</p>
                                )}
                            </div>

                            {/* Terms */}
                            <div className="flex items-start gap-2">
                                <input
                                    type="checkbox"
                                    id="terms"
                                    required
                                    className="w-4 h-4 mt-1 rounded border-[#324d67] bg-[#233648] text-primary focus:ring-primary focus:ring-offset-0"
                                />
                                <label htmlFor="terms" className="text-sm text-[#92adc9]">
                                    I agree to the{' '}
                                    <Link href="/terms" className="text-primary hover:underline">
                                        Terms of Service
                                    </Link>{' '}
                                    and{' '}
                                    <Link href="/privacy" className="text-primary hover:underline">
                                        Privacy Policy
                                    </Link>
                                </label>
                            </div>

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold gap-2"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Creating account...
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck className="w-5 h-5" />
                                        Create Supervisor Account
                                    </>
                                )}
                            </Button>
                        </form>

                        {/* Sign In Link */}
                        <p className="mt-8 text-center text-[#92adc9]">
                            Already have an account?{' '}
                            <Link href="/login" className="text-primary hover:underline font-medium">
                                Sign in
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

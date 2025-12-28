'use client';

import Link from 'next/link';
import { Logo } from '@/components/layout/Logo';
import { Button } from '@/components/ui/button';
import {
  Building2,
  Sparkles,
  Settings2,
  BarChart3,
  ArrowRight,
  TrendingUp,
  Cpu,
  Layers,
  ChevronRight,
  ArrowUpRight
} from 'lucide-react';

const features = [
  {
    icon: Settings2,
    title: 'AI-Assisted Operations',
    description: 'Automate repetitive tasks. Streamline workflows, schedule viewings, and manage documents with AI-driven efficiency.',
  },
  {
    icon: BarChart3,
    title: 'Performance Intelligence',
    description: 'Unlock data-driven insights. Analyze market trends, predict unit value, and optimize portfolio performance in real-time.',
  },
  {
    icon: Layers,
    title: 'Complete Unit Lifecycle',
    description: 'Manage every step. From initial lead to payment tracking, gain comprehensive oversight of the entire customer journey.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#101922] text-white selection:bg-primary/30">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#101922]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <Logo size="md" variant="full" />

          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-gray-400">
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#solutions" className="hover:text-white transition-colors flex items-center gap-1">
              Solutions <span className="text-[10px]">▼</span>
            </Link>
            <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="#resources" className="hover:text-white transition-colors flex items-center gap-1">
              Resources <span className="text-[10px]">▼</span>
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-white/5">
                Login
              </Button>
            </Link>
            <Link href="/login">
              <Button className="bg-[#137fec] hover:bg-[#137fec]/90 text-white font-bold px-6 shadow-[0_0_20px_rgba(19,127,236,0.3)]">
                Get Started with AI
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="container mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Hero Content */}
            <div className="max-w-2xl">
              <h1 className="text-5xl lg:text-7xl font-black tracking-tight leading-[1.1] mb-8">
                AI-Powered Real <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">
                  Estate Management
                </span>
              </h1>
              <p className="text-xl text-gray-400 leading-relaxed mb-10 max-w-lg">
                Revolutionize your operations with intelligent automation and data-driven insights.
                From inquiry to payment, manage the complete customer journey.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Link href="/login" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto h-14 px-8 bg-gradient-to-r from-[#d97706] to-[#b45309] hover:from-[#b45309] hover:to-[#92400e] text-black font-black text-lg gap-3 rounded-full group shadow-lg">
                    Transform Your Business with AI-Properties
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
              <div className="mt-6 ml-2">
                <Link href="#" className="text-sm font-bold text-gray-400 hover:text-white underline decoration-gray-600 underline-offset-4">
                  Schedule a Demo
                </Link>
              </div>
            </div>

            {/* Hero Visual - Mocking the AI City Graphic */}
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />
              <div className="relative aspect-square max-w-[500px] mx-auto">
                {/* Custom SVG or Image Placeholder for the AI City Visual */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-full h-full flex items-center justify-center">
                    {/* Simplified Geometric Visual to represent the AI City */}
                    <div className="absolute w-[80%] h-[80%] border border-primary/20 rounded-full animate-pulse" />
                    <div className="absolute w-[60%] h-[60%] border border-primary/30 rounded-full animate-reverse-spin" />
                    <div className="relative z-10 bg-[#192633] p-10 rounded-3xl border border-primary/30 shadow-2xl backdrop-blur-xl">
                      <div className="relative">
                        <Cpu className="w-24 h-24 text-primary animate-pulse" />
                        <Sparkles className="absolute -top-4 -right-4 w-8 h-8 text-purple-400" />
                        <Building2 className="absolute -bottom-4 -left-4 w-12 h-12 text-blue-300" />
                      </div>
                    </div>
                    {/* Floating elements */}
                    <div className="absolute top-10 right-10 bg-card/80 p-3 rounded-xl border border-white/10 backdrop-blur-md shadow-xl animate-bounce-slow">
                      <TrendingUp className="w-6 h-6 text-green-400" />
                    </div>
                    <div className="absolute bottom-20 left-10 bg-card/80 p-3 rounded-xl border border-white/10 backdrop-blur-md shadow-xl animate-bounce-delayed">
                      <ArrowUpRight className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group p-8 rounded-2xl bg-[#192633]/50 border border-white/5 hover:border-[#d97706]/30 transition-all duration-500 hover:shadow-[0_0_40px_rgba(217,119,6,0.1)]"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <span className="text-primary opacity-50 font-mono text-sm">0{index + 1}</span>
                  {feature.title}
                </h3>
                <p className="text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-[#101922]">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-6 text-sm text-gray-500 uppercase tracking-widest font-bold">
              <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="#" className="hover:text-white transition-colors">Terms</Link>
              <Link href="#" className="hover:text-white transition-colors">Contact</Link>
            </div>

            <div className="flex items-center gap-6">
              {['Facebook', 'X', 'LinkedIn', 'YouTube'].map((social) => (
                <Link key={social} href="#" className="text-gray-500 hover:text-primary transition-colors">
                  <span className="sr-only">{social}</span>
                  <div className="w-6 h-6 rounded-md border border-white/10 flex items-center justify-center text-xs font-bold">
                    {social[0]}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-xs text-gray-600 font-bold uppercase tracking-widest">
            <p>© 2024 AI-Properties. All rights reserved.</p>
            <div className="flex items-center gap-3 mt-4 md:mt-0">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>System Status: All Systems Operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

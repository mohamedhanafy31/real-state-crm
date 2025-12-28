import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that don't require authentication
const publicRoutes = ['/', '/login'];

// Role-based route prefixes
const roleRoutes: Record<string, string[]> = {
    broker: ['/broker'],
    supervisor: ['/supervisor', '/broker'],
    admin: ['/admin', '/supervisor', '/broker'],
};

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow public routes
    if (publicRoutes.includes(pathname)) {
        return NextResponse.next();
    }

    // Check for auth token
    const token = request.cookies.get('auth_token')?.value;

    // For now, we'll handle auth client-side
    // In production, you'd want to verify JWT here

    // Allow API routes
    if (pathname.startsWith('/api')) {
        return NextResponse.next();
    }

    // Allow static files
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/assets') ||
        pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};

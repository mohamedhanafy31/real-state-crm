# Next.js Implementation Guide: AI-Properties Real Estate CRM

## Project Overview

**AI-Properties** is a Real Estate CRM system with AI-powered features for managing customer requests, broker operations, and property inventory. This document provides complete technical specifications for implementing the frontend using **Next.js 14+** with the App Router.

**Attached**: UI/UX design files containing all page mockups, components, and design specifications.

---

## Technology Stack Requirements

### Core Framework
- **Next.js 14+** (App Router)
- **React 18+**
- **TypeScript** (strictly typed)

### Styling & UI
- **Tailwind CSS** (utility-first styling)
- **shadcn/ui** (component library - recommended)
- **Lucide React** (icon library)
- **Recharts** or **Chart.js** (data visualization)

### State Management
- **React Context API** (for global state like auth, user role)
- **TanStack Query (React Query)** (for server state management, caching)
- **Zustand** (optional, for complex client state)

### Forms & Validation
- **React Hook Form** (form management)
- **Zod** (schema validation)

### Additional Libraries
- **date-fns** or **day.js** (date manipulation)
- **clsx** or **cn** utility (conditional classnames)
- **react-hot-toast** or **sonner** (toast notifications)

### Development Tools
- **ESLint** (code quality)
- **Prettier** (code formatting)
- **Husky** (git hooks)

---

## Project Structure

```
ai-properties-frontend/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (public)/
│   │   └── page.tsx                    # Landing page
│   ├── (broker)/
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── requests/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── clients/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── properties/
│   │   │   └── page.tsx
│   │   └── conversations/
│   │       └── page.tsx
│   ├── (supervisor)/
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── brokers/
│   │   │   └── page.tsx
│   │   ├── reassignment/
│   │   │   └── page.tsx
│   │   └── reports/
│   │       └── page.tsx
│   ├── (admin)/
│   │   ├── projects/
│   │   │   └── page.tsx
│   │   ├── units/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                             # shadcn/ui components
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   ├── DashboardLayout.tsx
│   │   └── RoleBasedLayout.tsx
│   ├── broker/
│   │   ├── RequestsTable.tsx
│   │   ├── RequestStatusBadge.tsx
│   │   ├── AIInsightsPanel.tsx
│   │   ├── ClientCard.tsx
│   │   └── PropertyMatchCard.tsx
│   ├── supervisor/
│   │   ├── BrokerPerformanceChart.tsx
│   │   ├── RequestHeatmap.tsx
│   │   └── ReassignmentModal.tsx
│   ├── admin/
│   │   ├── ProjectForm.tsx
│   │   ├── UnitForm.tsx
│   │   └── SettingsPanel.tsx
│   └── shared/
│       ├── KPICard.tsx
│       ├── DataTable.tsx
│       ├── StatusTimeline.tsx
│       ├── AIBadge.tsx
│       ├── SearchBar.tsx
│       └── NotificationBell.tsx
├── lib/
│   ├── api/
│   │   ├── client.ts                   # API client setup
│   │   ├── auth.ts
│   │   ├── requests.ts
│   │   ├── clients.ts
│   │   ├── properties.ts
│   │   └── brokers.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useRequests.ts
│   │   ├── useClients.ts
│   │   └── useRole.ts
│   ├── utils/
│   │   ├── cn.ts
│   │   ├── date.ts
│   │   ├── format.ts
│   │   └── validators.ts
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   └── constants/
│       ├── routes.ts
│       ├── roles.ts
│       └── status.ts
├── types/
│   ├── auth.ts
│   ├── request.ts
│   ├── client.ts
│   ├── property.ts
│   ├── broker.ts
│   └── api.ts
├── public/
│   ├── images/
│   └── icons/
├── middleware.ts                       # Auth & role-based routing
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Implementation Phases

### **Phase 1: Foundation Setup** (Week 1)
**Goal**: Project initialization, authentication, and shared layout

**Tasks**:
1. Initialize Next.js 14 project with TypeScript and Tailwind CSS
2. Install and configure dependencies (shadcn/ui, React Query, etc.)
3. Set up project structure (folders as shown above)
4. Configure ESLint, Prettier, and Husky
5. Implement authentication flow:
   - Login page UI
   - Auth context provider
   - API client setup with interceptors
   - Token management (localStorage/cookies)
   - Protected route middleware
6. Create shared layout components:
   - Sidebar with role-based navigation
   - TopBar with user info and notifications
   - DashboardLayout wrapper
   - RoleBasedLayout with permission checks
7. Implement global components:
   - KPICard component
   - StatusBadge component
   - AIBadge component
   - DataTable component (reusable)
8. Set up routing structure with route groups

**Deliverables**:
- ✅ Working login page with authentication
- ✅ Protected routes based on user role
- ✅ Shared layout with sidebar and top bar
- ✅ Reusable component library foundation

---

### **Phase 2: Broker Pages** (Week 2-3)
**Goal**: Implement all broker-facing pages with full functionality

**Tasks**:

#### 2.1 Broker Dashboard
- KPI cards (Active Requests, Follow-ups, Response Time, Deals)
- AI Insights Panel with recommendations
- Request status distribution chart
- Quick actions tiles
- Recent activity feed
- API integration for dashboard data

#### 2.2 Requests Management Page
- Filterable requests table with pagination
- Status filter, date range, area/project filters
- AI-powered smart filters
- Bulk actions (select multiple, update status)
- Request status update modal
- Export to CSV functionality

#### 2.3 Request Details Page
- Two-column layout (client info + actions)
- Client profile card
- Request requirements display
- Vertical status timeline component
- AI-matched properties cards with scores
- Quick action buttons (Mark Contacted, Reserve, etc.)
- Communication history with AI chatbot summaries

#### 2.4 Clients Page
- Client cards/table with search
- Filter by status (Active/Closed/Lost)
- Linked requests count
- Quick access to client profile

#### 2.5 Client Profile Page
- Profile header with client info
- Tabbed interface (Requests, Reservations, Payments)
- Request timeline visualization
- AI insights about client preferences

#### 2.6 Properties & Projects Page
- Project cards with images
- Available units count and price range
- AI tags ("Matches X clients")
- Drill-down to units list
- Unit grid with specs and availability

#### 2.7 Conversations Page
- Split view (conversation list + message thread)
- Filter by conversation type (AI/Broker/Client)
- Message bubbles with distinct AI styling
- Timestamp and context display
- AI conversation summary panel

**Deliverables**:
- ✅ All 7 broker pages fully functional
- ✅ API integration for all data operations
- ✅ Real-time updates where applicable
- ✅ Responsive design for all pages

---

### **Phase 3: Supervisor Pages** (Week 4)
**Goal**: Build supervisor dashboard and management tools

**Tasks**:

#### 3.1 Supervisor Dashboard
- Overview KPI cards (6 metrics)
- Broker performance bar chart
- Request distribution heatmap
- AI alerts section
- Team activity feed
- Export reports functionality

#### 3.2 Broker Management Page
- Broker table with performance metrics
- Individual broker detail view
- Performance charts (response time, deals)
- Activate/deactivate broker actions
- AI capacity recommendations

#### 3.3 Requests Reassignment Page
- Withdrawn requests list
- Withdrawal reason display
- AI-suggested broker recommendations
- Reassignment action modal
- Confirmation workflow

#### 3.4 Reports Page
- Report type selector
- Dynamic filters (date, broker, project)
- Data visualization based on report type
- Downloadable tables (CSV/Excel)
- AI insights panel for trends

**Deliverables**:
- ✅ All 4 supervisor pages complete
- ✅ Advanced charts and analytics
- ✅ Role-based access control enforced
- ✅ Export and download functionality

---

### **Phase 4: Admin Pages** (Week 5)
**Goal**: Complete CRUD operations for system management

**Tasks**:

#### 4.1 Projects Management Page
- Projects table with CRUD actions
- Create/Edit project form with validation
- Image upload functionality
- Area assignment
- Delete confirmation modal

#### 4.2 Units Management Page
- Units table with inline editing
- Unit form modal
- Bulk import via CSV
- Status management (Available/Reserved/Sold)
- Link to parent project

#### 4.3 System Settings Page
- Sectioned settings panels
- Request workflow configuration
- SLA threshold settings
- AI features toggle switches
- Notification preferences
- User roles and permissions

**Deliverables**:
- ✅ All 3 admin pages functional
- ✅ Form validation and error handling
- ✅ File upload capabilities
- ✅ Settings persistence

---

### **Phase 5: Landing & Polish** (Week 6)
**Goal**: Public-facing landing page and final optimizations

**Tasks**:

#### 5.1 Landing Page
- Hero section with value proposition
- AI features showcase (animated)
- Three-pillar benefits display
- Login CTA
- Modern design with property visuals

#### 5.2 Final Polish
- Performance optimization (code splitting, lazy loading)
- SEO optimization (metadata, Open Graph)
- Accessibility audit (WCAG 2.1 AA)
- Error boundaries and fallback UI
- Loading states and skeleton screens
- Toast notifications for all actions
- Form validation messages
- Responsive design testing (mobile, tablet, desktop)
- Browser compatibility testing
- Final design review against mockups

**Deliverables**:
- ✅ Production-ready landing page
- ✅ Optimized performance (Lighthouse score 90+)
- ✅ Full responsive design
- ✅ Accessibility compliance

---

## Technical Implementation Guidelines

### Authentication Flow

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')
  const { pathname } = request.nextUrl
  
  // Public routes
  if (pathname === '/' || pathname === '/login') {
    return NextResponse.next()
  }
  
  // Protected routes
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  // Role-based access control
  const role = getUserRole(token) // Decode JWT to get role
  
  if (pathname.startsWith('/broker') && role !== 'broker') {
    return NextResponse.redirect(new URL('/unauthorized', request.url))
  }
  
  if (pathname.startsWith('/supervisor') && role !== 'supervisor') {
    return NextResponse.redirect(new URL('/unauthorized', request.url))
  }
  
  if (pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/unauthorized', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

### API Client Setup

```typescript
// lib/api/client.ts
import axios from 'axios'

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient
```

### React Query Setup

```typescript
// app/providers.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

### Custom Hook Example

```typescript
// lib/hooks/useRequests.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getRequests, updateRequestStatus } from '@/lib/api/requests'
import { toast } from 'sonner'

export function useRequests(filters?: RequestFilters) {
  return useQuery({
    queryKey: ['requests', filters],
    queryFn: () => getRequests(filters),
  })
}

export function useUpdateRequestStatus() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateRequestStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] })
      toast.success('Request status updated successfully')
    },
    onError: (error) => {
      toast.error('Failed to update request status')
    },
  })
}
```

### Component Example: KPI Card

```typescript
// components/shared/KPICard.tsx
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface KPICardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

export function KPICard({ title, value, icon: Icon, trend, className }: KPICardProps) {
  return (
    <div className={cn(
      'bg-white rounded-lg shadow-sm p-6 border border-gray-200',
      className
    )}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {trend && (
            <p className={cn(
              'text-sm mt-2 flex items-center',
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            )}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span className="ml-1">{Math.abs(trend.value)}%</span>
            </p>
          )}
        </div>
        <div className="p-3 bg-blue-50 rounded-full">
          <Icon className="w-6 h-6 text-blue-600" />
        </div>
      </div>
    </div>
  )
}
```

---

## Key Implementation Considerations

### 1. **AI Visual Integration**
- Create dedicated `AIBadge` component with sparkle icon and gradient
- Use distinct colors for AI-generated content (purple/blue accent)
- Add subtle animations to AI insight panels (fade-in, pulse)
- Implement match score visualization (progress circles/bars)
- Show AI confidence levels in property recommendations

### 2. **Real-time Updates**
- Consider WebSocket integration for live notifications
- Use React Query's `refetchInterval` for polling updates
- Implement optimistic updates for better UX

### 3. **Performance Optimization**
- Code splitting by route groups
- Lazy load heavy components (charts, image galleries)
- Implement virtual scrolling for large tables
- Optimize images with Next.js Image component
- Use Server Components where possible

### 4. **Form Handling**
- Use React Hook Form with Zod validation
- Show inline error messages
- Implement field-level validation
- Add loading states during submission
- Success/error toast notifications

### 5. **Data Tables**
- Implement server-side pagination
- Sortable columns
- Column visibility toggle
- Export functionality
- Row selection for bulk actions

### 6. **Charts & Visualization**
- Use Recharts for consistency
- Responsive chart containers
- Loading states for data fetching
- Empty states with helpful messages
- Interactive tooltips

### 7. **Error Handling**
- Error boundaries for component errors
- API error handling with user-friendly messages
- Retry mechanisms for failed requests
- Fallback UI for network issues
- 404 and 500 error pages

### 8. **Accessibility**
- Semantic HTML
- ARIA labels and roles
- Keyboard navigation support
- Focus management
- Color contrast compliance
- Screen reader testing

---

## Environment Variables

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_APP_NAME=AI-Properties
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
```

---

## Testing Strategy

### Unit Tests
- Component testing with React Testing Library
- Utility function tests
- Custom hooks tests

### Integration Tests
- Page-level tests
- API integration tests
- Form submission flows

### E2E Tests (Optional)
- Playwright or Cypress
- Critical user journeys
- Role-based access scenarios

---

## Deployment Checklist

- [ ] Environment variables configured
- [ ] API endpoints tested and working
- [ ] Performance optimization complete
- [ ] SEO metadata added
- [ ] Error tracking configured (Sentry)
- [ ] Analytics integrated (GA4, PostHog)
- [ ] SSL certificate installed
- [ ] Domain configured
- [ ] Monitoring setup
- [ ] Backup strategy defined

---

## Deliverables Per Phase

### Phase 1 (Foundation)
- Login page screenshot
- Dashboard layout mockup
- Component library demo

### Phase 2 (Broker)
- All broker pages screenshots
- Video walkthrough of broker workflow

### Phase 3 (Supervisor)
- Supervisor dashboard screenshot
- Analytics/charts demonstration

### Phase 4 (Admin)
- Admin CRUD operations demo
- Settings page screenshot

### Phase 5 (Landing & Polish)
- Landing page screenshot
- Lighthouse performance report
- Final QA report

---

## Communication & Collaboration

### Weekly Check-ins
- Progress review
- Blocker discussion
- Design clarifications
- API integration updates

### Documentation
- Component documentation (Storybook optional)
- API integration guide
- Deployment instructions
- User guide (optional)

---

## Success Metrics

The implementation will be considered successful when:

✅ All 16 pages are fully functional and match designs
✅ Authentication and role-based access work correctly
✅ All CRUD operations are operational
✅ Performance score: Lighthouse 90+ on all metrics
✅ Responsive on desktop, tablet, and mobile
✅ WCAG 2.1 AA compliance
✅ Zero critical bugs
✅ Smooth animations and transitions
✅ Fast page load times (<2s)
✅ API integration complete and tested

---

## Next Steps

1. **Review this document** and attached designs
2. **Set up initial project** following Phase 1
3. **Schedule kickoff meeting** to clarify any questions
4. **Begin implementation** following the phased approach
5. **Provide weekly updates** on progress

---

**Questions or Need Clarification?**

Please reach out for:
- Design asset access/clarification
- API endpoint specifications
- Business logic details
- Technical architecture decisions

**Let's build AI-Properties! 🚀**
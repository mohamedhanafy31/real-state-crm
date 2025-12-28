import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Request } from '../entities/request.entity';
import { Project } from '../entities/project.entity';
import { Unit } from '../entities/unit.entity';
import { Area } from '../entities/area.entity';
import { Broker } from '../entities/broker.entity';
import { RequestStatusHistory } from '../entities/request-status-history.entity';
import { CacheService } from '../cache/cache.service';

export interface SupervisorDashboardMetrics {
    totalBrokers: number;
    activeBrokers: number;
    totalRequests: number;
    pendingReassignments: number;
    totalProjects: number;
    totalUnits: number;
    availableUnits: number;
    reservedUnits: number;
    totalAreas: number;
    requestStatusBreakdown: {
        new: number;
        in_progress: number;
        closed: number;
        withdrawn: number;
    };
    recentActivity: RecentActivity[];
}

export interface RecentActivity {
    type: 'broker_created' | 'broker_status_changed' | 'request_reassigned' | 'request_created';
    description: string;
    timestamp: Date;
    relatedUserId?: string;
    relatedRequestId?: string;
}

@Injectable()
export class SupervisorService {
    private readonly CACHE_TTL_DASHBOARD = 300; // 5 minutes
    
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Request)
        private readonly requestRepository: Repository<Request>,
        @InjectRepository(Project)
        private readonly projectRepository: Repository<Project>,
        @InjectRepository(Unit)
        private readonly unitRepository: Repository<Unit>,
        @InjectRepository(Area)
        private readonly areaRepository: Repository<Area>,
        @InjectRepository(Broker)
        private readonly brokerRepository: Repository<Broker>,
        @InjectRepository(RequestStatusHistory)
        private readonly statusHistoryRepository: Repository<RequestStatusHistory>,
        private readonly cacheService: CacheService,
    ) { }

    async getDashboardMetrics(): Promise<SupervisorDashboardMetrics> {
        return this.cacheService.wrap(
            'dashboard:supervisor',
            async () => {
                // Count total brokers
                const totalBrokers = await this.userRepository.count({
                    where: { role: 'broker' },
                });

                // Count active (non-blocked) brokers
                const activeBrokers = await this.userRepository.count({
                    where: { role: 'broker', isActive: true },
                });

                // Count total requests
                const totalRequests = await this.requestRepository.count();

                // Count withdrawn requests pending reassignment
                const pendingReassignments = await this.requestRepository.count({
                    where: { status: 'withdrawn' },
                });

                // Inventory metrics
                const totalProjects = await this.projectRepository.count();
                const totalUnits = await this.unitRepository.count();
                const availableUnits = await this.unitRepository.count({ where: { status: 'available' } });
                const reservedUnits = await this.unitRepository.count({ where: { status: 'reserved' } });
                const totalAreas = await this.areaRepository.count();

                // Request breakdown
                const statuses = ['new', 'in_progress', 'closed', 'withdrawn', 'reassigned'];
                const breakdown: any = {};
                for (const status of statuses) {
                    breakdown[status] = await this.requestRepository.count({ where: { status } });
                }

                // Create unified activity list from multiple sources
                const activityLog: RecentActivity[] = [];

                // 1. Get recent reassignments/status changes from history
                const statusChanges = await this.statusHistoryRepository.find({
                    order: { createdAt: 'DESC' },
                    take: 10,
                    relations: ['request', 'request.customer'],
                });

                statusChanges.forEach(change => {
                    let description = '';
                    let type: RecentActivity['type'] = 'request_created';

                    if (change.newStatus === 'reassigned') {
                        description = `Request #${change.requestId} for ${change.request?.customer?.name || 'Customer'} was reassigned`;
                        type = 'request_reassigned';
                    } else if (change.newStatus === 'withdrawn') {
                        description = `Request #${change.requestId} was marked as withdrawn`;
                        type = 'request_reassigned';
                    } else {
                        description = `Request #${change.requestId} status changed to ${change.newStatus}`;
                        type = 'request_created';
                    }

                    activityLog.push({
                        type,
                        description,
                        timestamp: change.createdAt,
                        relatedRequestId: change.requestId
                    });
                });

                // 2. Get recent new brokers
                const newBrokers = await this.userRepository.find({
                    where: { role: 'broker' },
                    order: { createdAt: 'DESC' },
                    take: 5
                });

                newBrokers.forEach(broker => {
                    activityLog.push({
                        type: 'broker_created',
                        description: `New broker ${broker.name} joined the team`,
                        timestamp: broker.createdAt,
                        relatedUserId: broker.userId
                    });
                });

                // Sort by date and take latest 10
                const recentActivity = activityLog
                    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                    .slice(0, 10);

                return {
                    totalBrokers,
                    activeBrokers,
                    totalRequests,
                    pendingReassignments,
                    totalProjects,
                    totalUnits,
                    availableUnits,
                    reservedUnits,
                    totalAreas,
                    requestStatusBreakdown: {
                        new: breakdown.new || 0,
                        in_progress: breakdown.in_progress || 0,
                        closed: breakdown.closed || 0,
                        withdrawn: (breakdown.withdrawn || 0) + (breakdown.reassigned || 0),
                    },
                    recentActivity,
                };
            },
            this.CACHE_TTL_DASHBOARD,
        );
    }
}

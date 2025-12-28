import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../entities/customer.entity';
import { Request } from '../entities/request.entity';
import { RequestStatusHistory } from '../entities/request-status-history.entity';
import { BrokerArea } from '../entities/broker-area.entity';
import { Conversation } from '../entities/conversation.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { ReassignRequestDto } from './dto/reassign-request.dto';
import { AppLoggerService } from '../logger/logger.service';

@Injectable()
export class RequestsService {
    constructor(
        @InjectRepository(Customer)
        private readonly customerRepository: Repository<Customer>,
        @InjectRepository(Request)
        private readonly requestRepository: Repository<Request>,
        @InjectRepository(RequestStatusHistory)
        private readonly statusHistoryRepository: Repository<RequestStatusHistory>,
        @InjectRepository(BrokerArea)
        private readonly brokerAreaRepository: Repository<BrokerArea>,
        @InjectRepository(Conversation)
        private readonly conversationRepository: Repository<Conversation>,
        private readonly logger: AppLoggerService,
    ) { }

    // Customer operations
    async createCustomer(createCustomerDto: CreateCustomerDto): Promise<Customer> {
        this.logger.log(`Creating customer: ${createCustomerDto.name}, phone: ${createCustomerDto.phone}`, 'RequestsService');
        const customer = this.customerRepository.create(createCustomerDto);
        const savedCustomer = await this.customerRepository.save(customer);
        this.logger.log(`Customer created successfully: customerId=${savedCustomer.customerId}`, 'RequestsService');
        return savedCustomer;
    }

    async findAllCustomers(phone?: string): Promise<Customer[]> {
        const query = this.customerRepository
            .createQueryBuilder('customer')
            .leftJoinAndSelect('customer.requests', 'requests')
            .orderBy('customer.createdAt', 'DESC');

        if (phone) {
            query.andWhere('customer.phone = :phone', { phone });
        }

        return query.getMany();
    }

    async findCustomer(customerId: string): Promise<Customer> {
        const customer = await this.customerRepository.findOne({
            where: { customerId },
            relations: ['requests', 'requests.area', 'requests.assignedBroker', 'requests.assignedBroker.user'],
        });

        if (!customer) {
            throw new NotFoundException(`Customer with ID ${customerId} not found`);
        }

        return customer;
    }

    // Request operations
    async createRequest(createRequestDto: CreateRequestDto): Promise<Request> {
        const { customerId, areaId, assignedBrokerId } = createRequestDto;
        this.logger.log(`Creating request: customerId=${customerId}, areaId=${areaId}`, 'RequestsService');

        // Verify customer exists
        const customer = await this.customerRepository.findOne({ where: { customerId } });
        if (!customer) {
            this.logger.warn(`Request creation failed: Customer not found customerId=${customerId}`, 'RequestsService');
            throw new NotFoundException(`Customer with ID ${customerId} not found`);
        }

        // Auto-assign broker if not provided
        let brokerId: string | null = assignedBrokerId || null;
        if (!brokerId) {
            brokerId = await this.findAvailableBroker(areaId);
            this.logger.log(`Auto-assigned broker: brokerId=${brokerId} for areaId=${areaId}`, 'RequestsService');
        }

        // Create request
        const request = this.requestRepository.create({
            customerId,
            areaId,
            assignedBrokerId: brokerId,
            status: 'new',
            unitType: createRequestDto.unitType,
            budgetMin: createRequestDto.budgetMin,
            budgetMax: createRequestDto.budgetMax,
            sizeMin: createRequestDto.sizeMin,
            sizeMax: createRequestDto.sizeMax,
            bedrooms: createRequestDto.bedrooms,
            bathrooms: createRequestDto.bathrooms,
            notes: createRequestDto.notes,
        });

        const savedRequest = await this.requestRepository.save(request);

        // Log initial status
        await this.logStatusChange(
            savedRequest.requestId,
            null,
            'new',
            'system',
            null,
            brokerId,
            createRequestDto.notes,
        );

        this.logger.log(`Request created successfully: requestId=${savedRequest.requestId}, status=new, brokerId=${brokerId}`, 'RequestsService');
        return this.findRequest(savedRequest.requestId);
    }

    async findAllRequests(filters?: any): Promise<Request[]> {
        const query = this.requestRepository
            .createQueryBuilder('request')
            .leftJoinAndSelect('request.customer', 'customer')
            .leftJoinAndSelect('request.area', 'area')
            .leftJoinAndSelect('request.assignedBroker', 'broker')
            .leftJoinAndSelect('broker.user', 'user');

        if (filters?.status) {
            query.andWhere('request.status = :status', { status: filters.status });
        }

        if (filters?.assignedBrokerId) {
            query.andWhere('request.assignedBrokerId = :brokerId', {
                brokerId: filters.assignedBrokerId,
            });
        }

        if (filters?.areaId) {
            query.andWhere('request.areaId = :areaId', { areaId: filters.areaId });
        }

        query.orderBy('request.createdAt', 'DESC');

        return query.getMany();
    }

    async findRequest(requestId: string): Promise<Request> {
        const request = await this.requestRepository.findOne({
            where: { requestId },
            relations: [
                'customer',
                'area',
                'assignedBroker',
                'assignedBroker.user',
                'statusHistory',
            ],
        });

        if (!request) {
            throw new NotFoundException(`Request with ID ${requestId} not found`);
        }

        return request;
    }

    async updateRequest(requestId: string, updateRequestDto: UpdateRequestDto): Promise<Request> {
        const request = await this.findRequest(requestId);
        const oldStatus = request.status;

        Object.assign(request, updateRequestDto);
        const updatedRequest = await this.requestRepository.save(request);

        // Log status change if status was updated
        if (updateRequestDto.status && updateRequestDto.status !== oldStatus) {
            this.logger.log(`Request status updated: requestId=${requestId}, ${oldStatus} → ${updateRequestDto.status}`, 'RequestsService');
            await this.logStatusChange(
                requestId,
                oldStatus,
                updateRequestDto.status,
                'broker',
                request.assignedBrokerId,
                request.assignedBrokerId,
                updateRequestDto.notes,
            );
        }

        return this.findRequest(requestId);
    }

    async reassignRequest(requestId: string, reassignDto: ReassignRequestDto): Promise<Request> {
        this.logger.log(`Reassigning request: requestId=${requestId} to brokerId=${reassignDto.brokerId}`, 'RequestsService');
        const request = await this.findRequest(requestId);
        const oldBrokerId = request.assignedBrokerId;

        request.assignedBrokerId = reassignDto.brokerId;
        request.status = 'reassigned';
        // Use update to avoid relation issues
        await this.requestRepository.update(requestId, {
            assignedBrokerId: reassignDto.brokerId,
            status: 'reassigned',
        });

        // await this.requestRepository.save(request);

        // Log reassignment
        await this.logStatusChange(
            requestId,
            request.status,
            'reassigned',
            'supervisor',
            oldBrokerId,
            reassignDto.brokerId,
        );

        this.logger.log(`Request reassigned successfully: requestId=${requestId}, fromBroker=${oldBrokerId} → toBroker=${reassignDto.brokerId}`, 'RequestsService');
        return this.findRequest(requestId);
    }

    async getRequestHistory(requestId: string): Promise<RequestStatusHistory[]> {
        return this.statusHistoryRepository.find({
            where: { requestId },
            order: { createdAt: 'ASC' },
        });
    }

    // Helper methods
    private async findAvailableBroker(areaId: string): Promise<string | null> {
        const brokerArea = await this.brokerAreaRepository.findOne({
            where: { areaId },
            relations: ['broker'],
        });

        return brokerArea?.brokerId || null;
    }

    private async logStatusChange(
        requestId: string,
        oldStatus: string | null,
        newStatus: string,
        changedBy: string,
        fromBrokerId: string | null,
        toBrokerId: string | null,
        notes?: string,
    ): Promise<void> {
        const history = this.statusHistoryRepository.create({
            requestId,
            oldStatus,
            newStatus,
            changedBy,
            fromBrokerId,
            toBrokerId,
            notes,
        });

        await this.statusHistoryRepository.save(history);
    }

    async findPendingRequests(hours: number): Promise<Request[]> {
        const cutoffDate = new Date();
        cutoffDate.setHours(cutoffDate.getHours() - hours);

        return this.requestRepository
            .createQueryBuilder('request')
            .where('request.status = :status', { status: 'new' })
            .andWhere('request.updatedAt < :cutoff', { cutoff: cutoffDate })
            .getMany();
    }

    // ========== Broker Chatbot Methods ==========

    /**
     * Get request with conversations for broker chatbot.
     * Verifies broker has access to the request.
     */
    async getRequestWithConversationsForBroker(
        requestId: string,
        brokerId: string,
    ): Promise<Request> {
        this.logger.log(
            `Broker ${brokerId} requesting access to request ${requestId}`,
            'RequestsService',
        );

        const request = await this.requestRepository.findOne({
            where: { requestId },
            relations: [
                'customer',
                'area',
                'assignedBroker',
                'assignedBroker.user',
                'conversations',
            ],
        });

        if (!request) {
            throw new NotFoundException(`Request with ID ${requestId} not found`);
        }

        // Verify broker is assigned to this request
        if (request.assignedBrokerId !== brokerId) {
            this.logger.warn(
                `Access denied: Broker ${brokerId} not assigned to request ${requestId} (assigned to: ${request.assignedBrokerId})`,
                'RequestsService',
            );
            throw new ForbiddenException(
                `Broker ${brokerId} is not assigned to request ${requestId}`,
            );
        }

        this.logger.log(
            `Returning request ${requestId} with ${request.conversations?.length || 0} conversations`,
            'RequestsService',
        );

        return request;
    }

    /**
 * Get conversations for a request.
 */
    async getRequestConversations(requestId: string, contextType?: 'customer' | 'broker'): Promise<Conversation[]> {
        const where: any = { relatedRequestId: requestId };
        if (contextType) {
            where.contextType = contextType;
        }
        return this.conversationRepository.find({
            where,
            order: { createdAt: 'ASC' },
        });
    }

    /**
     * Save a conversation message.
     */
    async saveConversation(
        requestId: string,
        actorType: 'broker' | 'ai' | 'customer',
        message: string,
        actorId?: string,
        contextType: 'customer' | 'broker' = 'customer',
    ): Promise<Conversation> {
        const conversation = this.conversationRepository.create({
            relatedRequestId: requestId,
            actorType: actorType,
            message: message,
            actorId: actorId || 'system',
            contextType: contextType,
        });

        const saved = await this.conversationRepository.save(conversation);
        this.logger.log(
            `Saved ${actorType} conversation (context: ${contextType}) for request ${requestId}`,
            'RequestsService',
        );
        return saved;
    }

    /**
     * Get all requests for broker UI.
     */
    async getAllRequestsForBrokerUI(brokerId?: string): Promise<Request[]> {
        const query = this.requestRepository
            .createQueryBuilder('request')
            .leftJoinAndSelect('request.customer', 'customer')
            .leftJoinAndSelect('request.area', 'area')
            .leftJoinAndSelect('request.assignedBroker', 'broker')
            .leftJoinAndSelect('broker.user', 'user');

        if (brokerId) {
            query.where('request.assignedBrokerId = :brokerId', { brokerId });
        }

        query.orderBy('request.createdAt', 'DESC');

        return query.getMany();
    }

    /**
     * Get only requests that have broker-AI conversations.
     */
    async getRequestsWithBrokerConversations(brokerId: string): Promise<Request[]> {
        const requests = await this.requestRepository
            .createQueryBuilder('request')
            .leftJoinAndSelect('request.customer', 'customer')
            .leftJoinAndSelect('request.area', 'area')
            .leftJoinAndSelect('request.assignedBroker', 'broker')
            .leftJoinAndSelect('broker.user', 'user')
            .innerJoin(
                'request.conversations',
                'conversation',
                'conversation.contextType = :contextType',
                { contextType: 'broker' }
            )
            .where('request.assignedBrokerId = :brokerId', { brokerId })
            .orderBy('request.updatedAt', 'DESC')
            .getMany();

        this.logger.log(
            `Found ${requests.length} requests with broker conversations for broker ${brokerId}`,
            'RequestsService',
        );

        return requests;
    }
}

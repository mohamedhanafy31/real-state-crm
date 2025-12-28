import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Broker } from '../entities/broker.entity';
import { BrokerArea } from '../entities/broker-area.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignAreasDto } from './dto/assign-areas.dto';
import * as bcrypt from 'bcrypt';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class UsersService {
    private readonly CACHE_TTL_BROKER_PERF = 3600; // 1 hour
    
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Broker)
        private readonly brokerRepository: Repository<Broker>,
        @InjectRepository(BrokerArea)
        private readonly brokerAreaRepository: Repository<BrokerArea>,
        private readonly cacheService: CacheService,
    ) { }

    async createUser(createUserDto: CreateUserDto): Promise<User> {
        const { phone, password, name, email, role } = createUserDto;

        //Check if user already exists
        const existingUser = await this.userRepository.findOne({ where: { phone } });
        if (existingUser) {
            throw new BadRequestException('User with this phone already exists');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const user = this.userRepository.create({
            phone,
            passwordHash,
            name,
            email,
            role,
        });

        const savedUser = await this.userRepository.save(user);

        // If role is broker, create broker entry
        if (role === 'broker') {
            const broker = this.brokerRepository.create({
                brokerId: savedUser.userId,
            });
            await this.brokerRepository.save(broker);
        }

        // Remove password from response
        const userResponse: any = savedUser;
        delete userResponse.passwordHash;
        return userResponse;
    }

    async findAll(role?: string): Promise<User[]> {
        const where: any = {};
        if (role) {
            where.role = role;
        }

        return this.userRepository.find({
            where,
            relations: ['broker'],
            order: { createdAt: 'DESC' },
        });
    }

    async findOne(userId: string): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { userId },
            relations: ['broker'],
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${userId} not found`);
        }

        return user;
    }

    async updateUser(userId: string, updateUserDto: UpdateUserDto): Promise<User> {
        const user = await this.findOne(userId);

        if (updateUserDto.phone && updateUserDto.phone !== user.phone) {
            const existingUser = await this.userRepository.findOne({
                where: { phone: updateUserDto.phone },
            });
            if (existingUser) {
                throw new BadRequestException('Phone number already in use');
            }
        }

        Object.assign(user, updateUserDto);
        return this.userRepository.save(user);
    }

    async updateUserStatus(userId: string, isActive: boolean): Promise<User> {
        const user = await this.findOne(userId);
        user.isActive = isActive;
        return this.userRepository.save(user);
    }

    async assignAreas(brokerId: string, assignAreasDto: AssignAreasDto): Promise<void> {
        // Verify broker exists
        const broker = await this.brokerRepository.findOne({ where: { brokerId } });
        if (!broker) {
            throw new NotFoundException(`Broker with ID ${brokerId} not found`);
        }

        // Remove existing area assignments
        await this.brokerAreaRepository.delete({ brokerId });

        // Create new assignments
        const brokerAreas = assignAreasDto.areaIds.map((areaId) =>
            this.brokerAreaRepository.create({ brokerId, areaId }),
        );

        await this.brokerAreaRepository.save(brokerAreas);
    }

    async getBrokerPerformance(brokerId: string) {
        return this.cacheService.wrap(
            `broker:perf:${brokerId}`,
            async () => {
                const broker = await this.brokerRepository.findOne({
                    where: { brokerId },
                    relations: ['user', 'brokerAreas', 'brokerAreas.area'],
                });

                if (!broker) {
                    throw new NotFoundException(`Broker with ID ${brokerId} not found`);
                }

                return {
                    brokerId: broker.brokerId,
                    name: broker.user.name,
                    overallRate: broker.overallRate,
                    responseSpeedScore: broker.responseSpeedScore,
                    closingRate: broker.closingRate,
                    lostRequestsCount: broker.lostRequestsCount,
                    withdrawnRequestsCount: broker.withdrawnRequestsCount,
                    assignedAreas: broker.brokerAreas.map((ba) => ba.area.name),
                };
            },
            this.CACHE_TTL_BROKER_PERF,
        );
    }

    async getAllBrokers() {
        return this.cacheService.wrap(
            'brokers:all',
            async () => {
                return this.brokerRepository.find({
                    relations: ['user', 'brokerAreas', 'brokerAreas.area'],
                });
            },
            this.CACHE_TTL_BROKER_PERF,
        );
    }

    async deleteUser(userId: string): Promise<void> {
        const result = await this.userRepository.delete(userId);
        if (result.affected === 0) {
            throw new NotFoundException(`User with ID ${userId} not found`);
        }
    }
}

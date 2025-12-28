import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { Broker } from '../entities/broker.entity';
import { BrokerArea } from '../entities/broker-area.entity';
import { BrokerApplication } from '../entities/broker-application.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AppLoggerService } from '../logger/logger.service';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Broker)
        private readonly brokerRepository: Repository<Broker>,
        @InjectRepository(BrokerArea)
        private readonly brokerAreaRepository: Repository<BrokerArea>,
        @InjectRepository(BrokerApplication)
        private readonly applicationRepository: Repository<BrokerApplication>,
        private readonly jwtService: JwtService,
        private readonly logger: AppLoggerService,
    ) { }

    async register(registerDto: RegisterDto): Promise<{ access_token?: string; user?: any; application_id?: string; status?: string; interview_url?: string }> {
        const { phone, password, name, email, role, areaIds } = registerDto;
        this.logger.log(`Registration attempt for phone: ${phone}, role: ${role}`, 'AuthService');

        // Check if user already exists
        const existingUser = await this.userRepository.findOne({ where: { phone } });
        if (existingUser) {
            this.logger.warn(`Registration failed: User with phone ${phone} already exists`, 'AuthService');
            throw new UnauthorizedException('User with this phone already exists');
        }

        // BROKER REGISTRATION: Create application instead of user
        if (role === 'broker') {
            // Check if application already exists
            const existingApp = await this.applicationRepository.findOne({ where: { applicantPhone: phone } });
            if (existingApp) {
                this.logger.warn(`Registration failed: Application with phone ${phone} already exists`, 'AuthService');
                throw new BadRequestException('Application with this phone already exists. Please complete your interview.');
            }

            // Hash password
            const passwordHash = await bcrypt.hash(password, 10);

            // Create application
            const application = this.applicationRepository.create({
                applicantPhone: phone,
                applicantName: name,
                applicantEmail: email,
                passwordHash,
                requestedAreaIds: areaIds || [],
                status: 'pending_interview',
            });

            const savedApp = await this.applicationRepository.save(application);
            this.logger.log(`Broker application created: applicationId=${savedApp.applicationId}, phone=${phone}`, 'AuthService');

            return {
                application_id: savedApp.applicationId,
                status: 'pending_interview',
                interview_url: `/interview/${savedApp.applicationId}`,
            };
        }

        // SUPERVISOR REGISTRATION: Immediate activation (existing flow)
        const passwordHash = await bcrypt.hash(password, 10);

        const user = this.userRepository.create({
            phone,
            passwordHash,
            name,
            email,
            role,
        });

        const savedUser = await this.userRepository.save(user);

        // Generate JWT token
        const payload = { userId: savedUser.userId, phone: savedUser.phone, role: savedUser.role };
        const access_token = this.jwtService.sign(payload);

        this.logger.log(`User registered successfully: userId=${savedUser.userId}, phone=${phone}, role=${role}`, 'AuthService');

        return {
            access_token,
            user: {
                userId: savedUser.userId,
                phone: savedUser.phone,
                name: savedUser.name,
                email: savedUser.email,
                role: savedUser.role,
                areaIds: areaIds || [],
            },
        };
    }

    async login(loginDto: LoginDto): Promise<{ access_token: string; user: { userId: string; phone: string; email: string | null; name: string; role: string; isActive: boolean; areaIds: string[] } }> {
        const { phone, password } = loginDto;
        this.logger.log(`Login attempt for phone: ${phone}`, 'AuthService');

        // Find user with password field (normally excluded)
        const user = await this.userRepository
            .createQueryBuilder('user')
            .addSelect('user.passwordHash')
            .where('user.phone = :phone', { phone })
            .getOne();

        if (!user) {
            this.logger.warn(`Login failed: User not found for phone ${phone}`, 'AuthService');
            throw new UnauthorizedException('Invalid credentials');
        }

        // Check if user is active
        if (!user.isActive) {
            this.logger.warn(`Login failed: Account deactivated for userId=${user.userId}`, 'AuthService');
            throw new ForbiddenException('Your account has been deactivated by the supervisor');
        }

        // Verify password
        if (!user.passwordHash) {
            throw new UnauthorizedException('Password not set for this user');
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            this.logger.warn(`Login failed: Invalid password for phone ${phone}`, 'AuthService');
            throw new UnauthorizedException('Invalid credentials');
        }

        // Generate JWT token
        const payload = { userId: user.userId, phone: user.phone, role: user.role };
        const access_token = this.jwtService.sign(payload);

        this.logger.log(`User logged in successfully: userId=${user.userId}, phone=${phone}, role=${user.role}`, 'AuthService');

        // Fetch areaIds if broker
        let areaIds: string[] = [];
        if (user.role === 'broker') {
            const brokerAreas = await this.brokerAreaRepository.find({
                where: { brokerId: user.userId },
            });
            areaIds = brokerAreas.map(ba => ba.areaId);
        }

        // Return token and user info (excluding password_hash)
        return {
            access_token,
            user: {
                userId: user.userId,
                phone: user.phone,
                email: user.email,
                name: user.name,
                role: user.role,
                isActive: user.isActive,
                areaIds,
            }
        };
    }

    async validateUser(userId: string): Promise<User> {
        const user = await this.userRepository.findOne({ where: { userId } });
        if (!user) {
            throw new UnauthorizedException('User not found');
        }
        if (!user.isActive) {
            throw new ForbiddenException('Your account has been deactivated by the supervisor');
        }
        return user;
    }

    async updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<User> {
        this.logger.log(`Profile update attempt for userId=${userId}`, 'AuthService');
        const user = await this.userRepository.findOne({ where: { userId } });
        if (!user) {
            this.logger.warn(`Profile update failed: User not found userId=${userId}`, 'AuthService');
            throw new UnauthorizedException('User not found');
        }

        // Check if phone is being changed and is already in use
        if (updateProfileDto.phone && updateProfileDto.phone !== user.phone) {
            const existingUser = await this.userRepository.findOne({
                where: { phone: updateProfileDto.phone },
            });
            if (existingUser) {
                throw new BadRequestException('Phone number already in use');
            }
        }

        // Update user fields
        if (updateProfileDto.name) user.name = updateProfileDto.name;
        if (updateProfileDto.email) user.email = updateProfileDto.email;
        if (updateProfileDto.phone) user.phone = updateProfileDto.phone;

        this.logger.log(`Profile updated successfully for userId=${userId}`, 'AuthService');
        return this.userRepository.save(user);
    }

    async updateAreas(userId: string, areaIds: string[]): Promise<{ areaIds: string[] }> {
        // Verify user is a broker
        const user = await this.userRepository.findOne({ where: { userId } });
        if (!user || user.role !== 'broker') {
            throw new UnauthorizedException('Only brokers can update their areas');
        }

        // Remove existing area assignments
        await this.brokerAreaRepository.delete({ brokerId: userId });

        // Create new assignments
        const brokerAreas = areaIds.map((areaId) =>
            this.brokerAreaRepository.create({ brokerId: userId, areaId }),
        );
        await this.brokerAreaRepository.save(brokerAreas);

        return { areaIds };
    }
}


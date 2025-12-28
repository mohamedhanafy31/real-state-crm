import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BrokerArea } from '../../entities/broker-area.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly authService: AuthService,
        @InjectRepository(BrokerArea)
        private readonly brokerAreaRepository: Repository<BrokerArea>,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET || 'dev-secret-key-12345-change-in-production',
        });
    }

    async validate(payload: any) {
        const user = await this.authService.validateUser(payload.userId);

        // Fetch broker areas if user is a broker
        let areaIds: string[] = [];
        if (user.role === 'broker') {
            const brokerAreas = await this.brokerAreaRepository.find({
                where: { brokerId: user.userId },
            });
            areaIds = brokerAreas.map(ba => ba.areaId);
        }

        return {
            userId: user.userId,
            phone: user.phone,
            role: user.role,
            name: user.name,
            email: user.email,
            isActive: user.isActive,
            areaIds,
        };
    }
}


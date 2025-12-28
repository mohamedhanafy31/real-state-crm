import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Users & Brokers (e2e)', () => {
    let app: INestApplication;
    let supervisorToken: string;
    let brokerToken: string;
    let createdBrokerId: string;
    const timestamp = Date.now();

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
            }),
        );
        await app.init();

        // Register supervisor and broker for testing
        const supervisorRes = await request(app.getHttpServer())
            .post('/auth/register')
            .send({
                name: 'Test Supervisor',
                phone: `01${timestamp.toString().slice(-9)}`,
                email: `supervisor${timestamp}@test.com`,
                password: 'password123',
                role: 'supervisor',
            });
        supervisorToken = supervisorRes.body.access_token;

        const brokerRes = await request(app.getHttpServer())
            .post('/auth/register')
            .send({
                name: 'Test Broker',
                phone: `01${(timestamp + 1).toString().slice(-9)}`,
                email: `broker${timestamp}@test.com`,
                password: 'broker123',
                role: 'broker',
            });
        brokerToken = brokerRes.body.access_token;
    });

    afterAll(async () => {
        await app.close();
    });

    describe('/users (POST)', () => {
        it('should create a new broker (supervisor only)', () => {
            return request(app.getHttpServer())
                .post('/users')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                    name: 'Ahmed Mohamed',
                    phone: `01${(timestamp + 2).toString().slice(-9)}`,
                    email: `ahmed${timestamp}@test.com`,
                    password: 'ahmed123',
                    role: 'broker',
                })
                .expect(201)
                .expect((res) => {
                    expect(res.body).toHaveProperty('userId');
                    expect(res.body.name).toBe('Ahmed Mohamed');
                    expect(res.body.role).toBe('broker');
                    createdBrokerId = res.body.userId;
                });
        });

        it('should fail when broker tries to create user', () => {
            return request(app.getHttpServer())
                .post('/users')
                .set('Authorization', `Bearer ${brokerToken}`)
                .send({
                    name: 'Unauthorized User',
                    phone: '01099999999',
                    email: `unauthorized${timestamp}@test.com`,
                    password: 'pass123',
                    role: 'broker',
                })
                .expect(403);
        });
    });

    describe('/users (GET)', () => {
        it('should get all users', () => {
            return request(app.getHttpServer())
                .get('/users')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .expect(200)
                .expect((res) => {
                    expect(Array.isArray(res.body)).toBe(true);
                    expect(res.body.length).toBeGreaterThan(0);
                });
        });
    });

    describe('/users/brokers (GET)', () => {
        it('should get all brokers', () => {
            return request(app.getHttpServer())
                .get('/users/brokers')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .expect(200)
                .expect((res) => {
                    expect(Array.isArray(res.body)).toBe(true);
                });
        });
    });

    describe('/users/:id (GET)', () => {
        it('should get user by ID', () => {
            return request(app.getHttpServer())
                .get(`/users/${createdBrokerId}`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body.userId).toBe(createdBrokerId);
                    expect(res.body.name).toBe('Ahmed Mohamed');
                });
        });

        it('should return 404 for non-existent user', () => {
            return request(app.getHttpServer())
                .get('/users/99999')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .expect(404);
        });
    });

    describe('/users/:id (PATCH)', () => {
        it('should update user (supervisor only)', () => {
            return request(app.getHttpServer())
                .patch(`/users/${createdBrokerId}`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                    name: 'Ahmed Mohamed Updated',
                    email: `ahmed.updated${timestamp}@test.com`,
                })
                .expect(200)
                .expect((res) => {
                    expect(res.body.name).toBe('Ahmed Mohamed Updated');
                    expect(res.body.email).toBe(`ahmed.updated${timestamp}@test.com`);
                });
        });
    });

    describe('/users/:id/status (PATCH)', () => {
        it('should block user', () => {
            return request(app.getHttpServer())
                .patch(`/users/${createdBrokerId}/status`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({ isActive: false })
                .expect(200)
                .expect((res) => {
                    expect(res.body.isActive).toBe(false);
                });
        });

        it('should unblock user', () => {
            return request(app.getHttpServer())
                .patch(`/users/${createdBrokerId}/status`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({ isActive: true })
                .expect(200)
                .expect((res) => {
                    expect(res.body.isActive).toBe(true);
                });
        });
    });

    describe('/users/brokers/:id/performance (GET)', () => {
        it('should get broker performance metrics', () => {
            return request(app.getHttpServer())
                .get(`/users/brokers/${createdBrokerId}/performance`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('brokerId');
                    expect(res.body).toHaveProperty('overallRate');
                    expect(res.body).toHaveProperty('responseSpeedScore');
                    expect(res.body).toHaveProperty('closingRate');
                });
        });
    });
});

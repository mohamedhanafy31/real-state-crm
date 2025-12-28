import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Authentication (e2e)', () => {
    let app: INestApplication;
    let supervisorToken: string;
    let brokerToken: string;
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
    });

    afterAll(async () => {
        await app.close();
    });

    describe('/auth/register (POST)', () => {
        it('should register a new supervisor', () => {
            return request(app.getHttpServer())
                .post('/auth/register')
                .send({
                    name: 'Test Supervisor',
                    phone: `01${timestamp.toString().slice(-9)}`,
                    email: `supervisor${timestamp}@test.com`,
                    password: 'password123',
                    role: 'supervisor',
                })
                .expect(201)
                .expect((res) => {
                    expect(res.body).toHaveProperty('access_token');
                    supervisorToken = res.body.access_token;
                });
        });

        it('should register a new broker and return application (not JWT)', () => {
            return request(app.getHttpServer())
                .post('/auth/register')
                .send({
                    name: 'Test Broker',
                    phone: `01${(timestamp + 1).toString().slice(-9)}`,
                    email: `broker${timestamp}@test.com`,
                    password: 'broker123',
                    role: 'broker',
                })
                .expect(201)
                .expect((res) => {
                    // New flow: broker registration returns application, not JWT
                    expect(res.body).toHaveProperty('application_id');
                    expect(res.body).toHaveProperty('status', 'pending_interview');
                    expect(res.body).toHaveProperty('interview_url');
                    expect(res.body).not.toHaveProperty('access_token');
                });
        });

        it('should fail with duplicate phone number', async () => {
            const uniquePhone = `01${(timestamp + 99).toString().slice(-9)}`;
            // First registration
            await request(app.getHttpServer())
                .post('/auth/register')
                .send({
                    name: 'First User',
                    phone: uniquePhone,
                    email: `first${timestamp}@test.com`,
                    password: 'password123',
                    role: 'broker',
                })
                .expect(201);

            // Duplicate should fail
            return request(app.getHttpServer())
                .post('/auth/register')
                .send({
                    name: 'Duplicate User',
                    phone: uniquePhone,
                    email: `duplicate${timestamp}@test.com`,
                    password: 'password123',
                    role: 'broker',
                })
                .expect(401);
        });

        it('should fail with invalid role', () => {
            return request(app.getHttpServer())
                .post('/auth/register')
                .send({
                    name: 'Invalid Role',
                    phone: `01${(timestamp + 999).toString().slice(-9)}`,
                    email: `invalid${timestamp}@test.com`,
                    password: 'password123',
                    role: 'admin',
                })
                .expect(400);
        });
    });

    describe('/auth/login (POST)', () => {
        it('should login with valid credentials', () => {
            return request(app.getHttpServer())
                .post('/auth/login')
                .send({
                    phone: `01${timestamp.toString().slice(-9)}`,
                    password: 'password123',
                })
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('access_token');
                });
        });

        it('should fail with invalid password', () => {
            return request(app.getHttpServer())
                .post('/auth/login')
                .send({
                    phone: `01${timestamp.toString().slice(-9)}`,
                    password: 'wrongpassword',
                })
                .expect(401);
        });

        it('should fail with non-existent phone', () => {
            return request(app.getHttpServer())
                .post('/auth/login')
                .send({
                    phone: `01${(timestamp + 9999).toString().slice(-9)}`,
                    password: 'password123',
                })
                .expect(401);
        });
    });

    describe('/auth/profile (GET)', () => {
        it('should get user profile with valid token', () => {
            return request(app.getHttpServer())
                .get('/auth/profile')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('userId');
                    expect(res.body).toHaveProperty('phone');
                    expect(res.body).toHaveProperty('role');
                    expect(res.body.role).toBe('supervisor');
                });
        });

        it('should fail without token', () => {
            return request(app.getHttpServer())
                .get('/auth/profile')
                .expect(401);
        });

        it('should fail with invalid token', () => {
            return request(app.getHttpServer())
                .get('/auth/profile')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);
        });
    });
});

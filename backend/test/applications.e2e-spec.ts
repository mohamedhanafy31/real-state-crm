import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Applications (e2e)', () => {
    let app: INestApplication;
    let applicationId: string;
    let supervisorToken: string;
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

        // Create a supervisor for admin tests
        const supervisorRes = await request(app.getHttpServer())
            .post('/auth/register')
            .send({
                name: 'Test Supervisor',
                phone: `01${(timestamp + 5000).toString().slice(-9)}`,
                email: `supervisor${timestamp}@test.com`,
                password: 'password123',
                role: 'supervisor',
            });
        supervisorToken = supervisorRes.body.access_token;
    });

    afterAll(async () => {
        await app.close();
    });

    describe('Broker Registration Flow', () => {
        it('should create application on broker registration', async () => {
            const res = await request(app.getHttpServer())
                .post('/auth/register')
                .send({
                    name: 'Interview Test Broker',
                    phone: `01${(timestamp + 100).toString().slice(-9)}`,
                    email: `interviewbroker${timestamp}@test.com`,
                    password: 'broker123',
                    role: 'broker',
                })
                .expect(201);

            expect(res.body).toHaveProperty('application_id');
            expect(res.body).toHaveProperty('status', 'pending_interview');
            expect(res.body).toHaveProperty('interview_url');
            expect(res.body).not.toHaveProperty('access_token');

            applicationId = res.body.application_id;
        });

        it('should get application status', async () => {
            const res = await request(app.getHttpServer())
                .get(`/applications/${applicationId}/status`)
                .expect(200);

            expect(res.body).toHaveProperty('applicationId', applicationId);
            expect(res.body).toHaveProperty('status', 'pending_interview');
        });

        it('should prevent duplicate broker applications', async () => {
            await request(app.getHttpServer())
                .post('/auth/register')
                .send({
                    name: 'Duplicate Broker',
                    phone: `01${(timestamp + 100).toString().slice(-9)}`, // Same phone
                    email: `duplicate${timestamp}@test.com`,
                    password: 'broker123',
                    role: 'broker',
                })
                .expect(400);
        });
    });

    describe('Supervisor Application Management', () => {
        it('should list applications as supervisor', async () => {
            const res = await request(app.getHttpServer())
                .get('/applications')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
        });

        it('should get application details as supervisor', async () => {
            const res = await request(app.getHttpServer())
                .get(`/applications/${applicationId}`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .expect(200);

            expect(res.body).toHaveProperty('applicationId', applicationId);
            expect(res.body).toHaveProperty('applicantName', 'Interview Test Broker');
        });

        it('should fail to list applications without auth', async () => {
            await request(app.getHttpServer())
                .get('/applications')
                .expect(401);
        });
    });

    describe('Interview Session Endpoints', () => {
        let sessionId: string;

        it('should start interview session', async () => {
            const res = await request(app.getHttpServer())
                .post('/chatbot/interview/start')
                .send({ applicationId })
                .expect(200);

            expect(res.body).toHaveProperty('sessionId');
            expect(res.body).toHaveProperty('currentPhase', 1);
            sessionId = res.body.sessionId;
        });

        it('should get interview session state', async () => {
            const res = await request(app.getHttpServer())
                .get(`/chatbot/interview/${sessionId}`)
                .expect(200);

            expect(res.body).toHaveProperty('sessionId', sessionId);
            expect(res.body).toHaveProperty('applicationId', applicationId);
        });

        it('should submit response to interview', async () => {
            const res = await request(app.getHttpServer())
                .post('/chatbot/interview/respond')
                .send({
                    sessionId,
                    responseText: 'أنا شغال وسيط عقاري من 5 سنين',
                })
                .expect(200);

            expect(res.body).toHaveProperty('sessionId', sessionId);
            expect(res.body).toHaveProperty('responseId');
        });
    });
});

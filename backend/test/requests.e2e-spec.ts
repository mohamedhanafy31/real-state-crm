import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Customers & Requests (e2e)', () => {
    let app: INestApplication;
    let token: string;
    let customerId: string;
    let requestId: string;
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

        // Login to get token
        const loginRes = await request(app.getHttpServer())
            .post('/auth/register')
            .send({
                name: 'Test User',
                phone: `01${timestamp.toString().slice(-9)}`,
                password: 'pass123',
                role: 'broker',
            });
        token = loginRes.body.access_token;
    });

    afterAll(async () => {
        await app.close();
    });

    describe('/customers (POST)', () => {
        it('should create a new customer', () => {
            const customerPhone = `01${(timestamp + 1).toString().slice(-9)}`;
            return request(app.getHttpServer())
                .post('/customers')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: 'Mohamed Hassan',
                    phone: customerPhone,
                })
                .expect(201)
                .expect((res) => {
                    expect(res.body).toHaveProperty('customerId');
                    expect(res.body.name).toBe('Mohamed Hassan');
                    expect(res.body.phone).toBe(customerPhone);
                    customerId = res.body.customerId;
                });
        });
    });

    describe('/customers (GET)', () => {
        it('should get all customers', () => {
            return request(app.getHttpServer())
                .get('/customers')
                .set('Authorization', `Bearer ${token}`)
                .expect(200)
                .expect((res) => {
                    expect(Array.isArray(res.body)).toBe(true);
                    expect(res.body.length).toBeGreaterThan(0);
                });
        });
    });

    describe('/customers/:id (GET)', () => {
        it('should get customer by ID', () => {
            return request(app.getHttpServer())
                .get(`/customers/${customerId}`)
                .set('Authorization', `Bearer ${token}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body.customerId).toBe(customerId);
                    expect(res.body.name).toBe('Mohamed Hassan');
                });
        });
    });

    describe('/requests (POST)', () => {
        it('should create a new request', () => {
            return request(app.getHttpServer())
                .post('/requests')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    customerId: customerId,
                    areaId: 1,
                })
                .expect(201)
                .expect((res) => {
                    expect(res.body).toHaveProperty('requestId');
                    expect(res.body.customerId).toBe(customerId);
                    expect(res.body.status).toBe('new');
                    requestId = res.body.requestId;
                });
        });
    });

    describe('/requests (GET)', () => {
        it('should get all requests', () => {
            return request(app.getHttpServer())
                .get('/requests')
                .set('Authorization', `Bearer ${token}`)
                .expect(200)
                .expect((res) => {
                    expect(Array.isArray(res.body)).toBe(true);
                });
        });

        it('should filter requests by status', () => {
            return request(app.getHttpServer())
                .get('/requests?status=new')
                .set('Authorization', `Bearer ${token}`)
                .expect(200)
                .expect((res) => {
                    expect(Array.isArray(res.body)).toBe(true);
                    if (res.body.length > 0) {
                        expect(res.body[0].status).toBe('new');
                    }
                });
        });
    });

    describe('/requests/:id (GET)', () => {
        it('should get request by ID', () => {
            return request(app.getHttpServer())
                .get(`/requests/${requestId}`)
                .set('Authorization', `Bearer ${token}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body.requestId).toBe(requestId);
                    expect(res.body).toHaveProperty('customer');
                    expect(res.body).toHaveProperty('area');
                });
        });
    });

    describe('/requests/:id (PATCH)', () => {
        it('should update request status', () => {
            return request(app.getHttpServer())
                .patch(`/requests/${requestId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    status: 'contacted',
                })
                .expect(200)
                .expect((res) => {
                    expect(res.body.status).toBe('contacted');
                });
        });
    });

    describe('/requests/:id/history (GET)', () => {
        it('should get request status history', () => {
            return request(app.getHttpServer())
                .get(`/requests/${requestId}/history`)
                .set('Authorization', `Bearer ${token}`)
                .expect(200)
                .expect((res) => {
                    expect(Array.isArray(res.body)).toBe(true);
                    expect(res.body.length).toBeGreaterThan(0);
                });
        });
    });
});

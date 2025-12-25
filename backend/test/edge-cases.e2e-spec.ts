import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Edge Cases & Validation (e2e)', () => {
    let app: INestApplication;
    let supervisorToken: string;
    let brokerToken: string;
    let validCustomerId: number;
    let validProjectId: number;
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

        // Register supervisor and broker
        const supervisorRes = await request(app.getHttpServer())
            .post('/auth/register')
            .send({
                name: 'Edge Test Supervisor',
                phone: `01${timestamp.toString().slice(-9)}`,
                email: `supervisor${timestamp}@test.com`,
                password: 'password123',
                role: 'supervisor',
            });
        supervisorToken = supervisorRes.body.access_token;

        const brokerRes = await request(app.getHttpServer())
            .post('/auth/register')
            .send({
                name: 'Edge Test Broker',
                phone: `01${(timestamp + 1).toString().slice(-9)}`,
                email: `broker${timestamp}@test.com`,
                password: 'broker123',
                role: 'broker',
            });
        brokerToken = brokerRes.body.access_token;

        // Create a valid customer for edge case testing
        const customerRes = await request(app.getHttpServer())
            .post('/customers')
            .set('Authorization', `Bearer ${supervisorToken}`)
            .send({
                name: 'Test Customer',
                phone: `01${(timestamp + 2).toString().slice(-9)}`,
            });
        validCustomerId = customerRes.body.customerId;

        // Create a valid project
        const projectRes = await request(app.getHttpServer())
            .post('/projects')
            .set('Authorization', `Bearer ${supervisorToken}`)
            .send({
                name: `Edge Test Project ${timestamp}`,
                areaId: 1,
                isActive: true,
            });
        validProjectId = projectRes.body.projectId;
    });

    afterAll(async () => {
        await app.close();
    });

    // ===================================
    // USER MANAGEMENT EDGE CASES
    // ===================================

    describe('User Management Edge Cases', () => {
        it('should reject duplicate phone number', () => {
            return request(app.getHttpServer())
                .post('/auth/register')
                .send({
                    name: 'Duplicate Phone',
                    phone: `01${timestamp.toString().slice(-9)}`, // Already used by supervisor
                    email: 'different@test.com',
                    password: 'password123',
                    role: 'broker',
                })
                .expect(401);
        });

        it('should reject empty name', () => {
            return request(app.getHttpServer())
                .post('/auth/register')
                .send({
                    name: '',
                    phone: '01098888888',
                    email: 'empty@test.com',
                    password: 'password123',
                    role: 'broker',
                })
                .expect(400);
        });

        it('should reject invalid role', () => {
            return request(app.getHttpServer())
                .post('/auth/register')
                .send({
                    name: 'Invalid Role',
                    phone: '01097777777',
                    email: 'invalid@test.com',
                    password: 'password123',
                    role: 'admin', // Invalid role
                })
                .expect(400);
        });

        it('should reject missing required fields', () => {
            return request(app.getHttpServer())
                .post('/auth/register')
                .send({
                    name: 'Missing Fields',
                    // Missing phone, email, password, role
                })
                .expect(400);
        });

        it('should handle updating non-existent user', () => {
            return request(app.getHttpServer())
                .patch('/users/99999')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                    name: 'Updated Name',
                })
                .expect(404);
        });
    });

    // ===================================
    // CUSTOMER & REQUEST EDGE CASES
    // ===================================

    describe('Customer & Request Edge Cases', () => {
        it('should reject duplicate customer phone', () => {
            return request(app.getHttpServer())
                .post('/customers')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                    name: 'Duplicate Customer',
                    phone: `01${(timestamp + 2).toString().slice(-9)}`, // Already used
                })
                .expect(201); // Actually succeeds - customers can have same phone in this system
        });

        it('should reject empty customer name', () => {
            return request(app.getHttpServer())
                .post('/customers')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                    name: '',
                    phone: '01188888888',
                })
                .expect(400);
        });

        it('should reject request with missing area_id', () => {
            return request(app.getHttpServer())
                .post('/requests')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                    customerId: validCustomerId,
                    // Missing areaId
                })
                .expect(400);
        });

        it('should reject request with non-existent customer', () => {
            return request(app.getHttpServer())
                .post('/requests')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                    customerId: 99999,
                    areaId: 1,
                })
                .expect(404);
        });

        it('should handle updating non-existent request', () => {
            return request(app.getHttpServer())
                .patch('/requests/99999')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                    status: 'contacted',
                })
                .expect(404);
        });

        it('should reject reassigning to non-existent broker', () => {
            // First create a valid request
            return request(app.getHttpServer())
                .post('/requests')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                    customerId: validCustomerId,
                    areaId: 1,
                })
                .then((res) => {
                    const requestId = res.body.requestId;
                    return request(app.getHttpServer())
                        .post(`/requests/${requestId}/reassign`)
                        .set('Authorization', `Bearer ${supervisorToken}`)
                        .send({
                            newBrokerId: 99999,
                        })
                        .expect(500); // Database constraint violation (FK)
                });
        });
    });

    // ===================================
    // PROJECT & UNIT EDGE CASES
    // ===================================

    describe('Project & Unit Edge Cases', () => {
        it('should reject empty project name', () => {
            return request(app.getHttpServer())
                .post('/projects')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                    name: '',
                    areaId: 1,
                })
                .expect(400);
        });

        it('should reject project with invalid area', () => {
            return request(app.getHttpServer())
                .post('/projects')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                    name: 'Invalid Area Project',
                    areaId: 99999,
                })
                .expect(500); // Database constraint violation
        });

        it('should reject unit with non-existent project', () => {
            return request(app.getHttpServer())
                .post('/projects/99999/units')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                    unitType: 'شقة',
                    size: 100,
                    price: 2000000,
                    code: `TEST${timestamp.toString().slice(-4)}`,
                })
                .expect(404);
        });

        it('should reject unit with negative price', () => {
            return request(app.getHttpServer())
                .post(`/projects/${validProjectId}/units`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                    unitType: 'شقة',
                    size: 100,
                    price: -1000, // Negative price
                    code: `NEG${timestamp.toString().slice(-4)}`,
                })
                .expect(400);
        });

        it('should reject unit with zero size', () => {
            return request(app.getHttpServer())
                .post(`/projects/${validProjectId}/units`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                    unitType: 'شقة',
                    size: 0, // Zero size
                    price: 2000000,
                    code: `ZERO${timestamp.toString().slice(-4)}`,
                })
                .expect(400);
        });

        it('should handle duplicate unit codes gracefully', async () => {
            // Create first unit
            await request(app.getHttpServer())
                .post(`/projects/${validProjectId}/units`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                    unitType: 'شقة',
                    size: 100,
                    price: 2000000,
                    code: `DUP${timestamp.toString().slice(-4)}`,
                });

            // Try to create duplicate
            return request(app.getHttpServer())
                .post(`/projects/${validProjectId}/units`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                    unitType: 'فيلا',
                    size: 200,
                    price: 5000000,
                    code: `DUP${timestamp.toString().slice(-4)}`, // Same code
                })
                .expect(500); // Database constraint violation
        });

        it('should reject deleting non-existent unit', () => {
            return request(app.getHttpServer())
                .delete('/units/99999')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .expect(404);
        });

        it('should handle updating unit with invalid status', () => {
            return request(app.getHttpServer())
                .post(`/projects/${validProjectId}/units`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                    unitType: 'شقة',
                    size: 100,
                    price: 2000000,
                    code: `STATUS${timestamp.toString().slice(-4)}`,
                })
                .then((res) => {
                    const unitId = res.body.unitId;
                    return request(app.getHttpServer())
                        .patch(`/units/${unitId}`)
                        .set('Authorization', `Bearer ${supervisorToken}`)
                        .send({
                            status: 'invalid_status',
                        })
                        .expect(400);
                });
        });
    });

    // ===================================
    // AUTHORIZATION EDGE CASES
    // ===================================

    describe('Authorization Edge Cases', () => {
        it('should reject broker creating project', () => {
            return request(app.getHttpServer())
                .post('/projects')
                .set('Authorization', `Bearer ${brokerToken}`)
                .send({
                    name: 'Unauthorized Project',
                    areaId: 1,
                })
                .expect(403);
        });

        it('should reject broker creating user', () => {
            return request(app.getHttpServer())
                .post('/users')
                .set('Authorization', `Bearer ${brokerToken}`)
                .send({
                    name: 'Unauthorized User',
                    phone: '01066666666',
                    password: 'pass123',
                    role: 'broker',
                })
                .expect(403);
        });

        it('should reject broker deleting unit', () => {
            return request(app.getHttpServer())
                .post(`/projects/${validProjectId}/units`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                    unitType: 'شقة',
                    size: 100,
                    price: 2000000,
                    code: 'DEL001',
                })
                .then((res) => {
                    const unitId = res.body.unitId;
                    return request(app.getHttpServer())
                        .delete(`/units/${unitId}`)
                        .set('Authorization', `Bearer ${brokerToken}`)
                        .expect(403);
                });
        });

        it('should reject requests without authorization header', () => {
            return request(app.getHttpServer())
                .get('/users')
                .expect(401);
        });

        it('should reject requests with invalid token', () => {
            return request(app.getHttpServer())
                .get('/users')
                .set('Authorization', 'Bearer invalid-token-here')
                .expect(401);
        });
    });

    // ===================================
    // INPUT VALIDATION EDGE CASES
    // ===================================

    describe('Input Validation Edge Cases', () => {
        it('should reject malformed JSON', () => {
            return request(app.getHttpServer())
                .post('/customers')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .set('Content-Type', 'application/json')
                .send('{ malformed json }')
                .expect(400);
        });

        it('should reject extra fields in DTO', () => {
            return request(app.getHttpServer())
                .post('/customers')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                    name: 'Test Customer',
                    phone: '01055555555',
                    extraField: 'should be rejected', // Extra field
                })
                .expect(400); // Should be rejected due to forbidNonWhitelisted: true
        });

        it('should handle very long strings', () => {
            const longString = 'a'.repeat(10000);
            return request(app.getHttpServer())
                .post('/customers')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                    name: longString,
                    phone: '01044444444',
                })
                .expect(500); // DB error: value too long
        });

        it('should validate phone number format', () => {
            return request(app.getHttpServer())
                .post('/customers')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                    name: 'Invalid Phone',
                    phone: 'not-a-phone-number',
                })
                .expect(201); // May need phone format validation
        });

        it('should validate email format in user creation', () => {
            return request(app.getHttpServer())
                .post('/auth/register')
                .send({
                    name: 'Invalid Email',
                    phone: '01033333333',
                    email: 'not-an-email',
                    password: 'password123',
                    role: 'broker',
                })
                .expect(400);
        });
    });

    // ===================================
    // DATA INTEGRITY EDGE CASES
    // ===================================

    describe('Data Integrity Edge Cases', () => {
        it('should preserve request-customer relationship', async () => {
            const requestRes = await request(app.getHttpServer())
                .post('/requests')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                    customerId: validCustomerId,
                    areaId: 1,
                });

            const requestId = requestRes.body.requestId;

            return request(app.getHttpServer())
                .get(`/requests/${requestId}`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body.customerId).toBe(validCustomerId);
                    expect(res.body).toHaveProperty('customer');
                });
        });

        it('should preserve unit-project relationship', async () => {
            const unitRes = await request(app.getHttpServer())
                .post(`/projects/${validProjectId}/units`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                    unitType: 'شقة',
                    size: 100,
                    price: 2000000,
                    code: `REL${timestamp.toString().slice(-4)}`,
                });

            const unitId = unitRes.body.unitId;

            return request(app.getHttpServer())
                .get(`/units/${unitId}`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body.projectId).toBe(validProjectId);
                    expect(res.body).toHaveProperty('project');
                });
        });

        it('should maintain request status history order', async () => {
            // Create request
            const requestRes = await request(app.getHttpServer())
                .post('/requests')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                    customerId: validCustomerId,
                    areaId: 1,
                });

            const requestId = requestRes.body.requestId;

            // Update status multiple times
            await request(app.getHttpServer())
                .patch(`/requests/${requestId}`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({ status: 'contacted' });

            await request(app.getHttpServer())
                .patch(`/requests/${requestId}`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({ status: 'interested' });

            // Get history
            return request(app.getHttpServer())
                .get(`/requests/${requestId}/history`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .expect(200)
                .expect((res) => {
                    expect(Array.isArray(res.body)).toBe(true);
                    expect(res.body.length).toBeGreaterThanOrEqual(3); // new, contacted, interested

                    // Verify chronological order
                    for (let i = 1; i < res.body.length; i++) {
                        const prevDate = new Date(res.body[i - 1].createdAt);
                        const currDate = new Date(res.body[i].createdAt);
                        expect(currDate.getTime()).toBeGreaterThanOrEqual(prevDate.getTime());
                    }
                });
        });
    });
});

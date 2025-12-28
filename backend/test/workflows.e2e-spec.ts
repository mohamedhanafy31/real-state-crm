import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Full Workflow Scenarios (e2e)', () => {
    let app: INestApplication;
    let supervisorToken: string;
    let broker1Token: string;
    let broker2Token: string;
    let broker1Id: string;
    let broker2Id: string;
    let timestamp: number;

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

        timestamp = Date.now();

        // Register users for workflow testing
        const supervisorRes = await request(app.getHttpServer())
            .post('/auth/register')
            .send({
                name: 'Workflow Supervisor',
                phone: `01${timestamp.toString().slice(-9)}`,
                email: `workflow-sup${timestamp}@test.com`,
                password: 'password123',
                role: 'supervisor',
            });
        supervisorToken = supervisorRes.body.access_token;

        const broker1Res = await request(app.getHttpServer())
            .post('/auth/register')
            .send({
                name: 'Workflow Broker 1',
                phone: `01${(timestamp + 1).toString().slice(-9)}`,
                email: `workflow-broker1${timestamp}@test.com`,
                password: 'broker123',
                role: 'broker',
            });
        broker1Token = broker1Res.body.access_token;
        broker1Token = broker1Res.body.access_token;

        const broker1Profile = await request(app.getHttpServer())
            .get('/auth/profile')
            .set('Authorization', `Bearer ${broker1Token}`);
        broker1Id = broker1Profile.body.userId;

        const broker2Res = await request(app.getHttpServer())
            .post('/auth/register')
            .send({
                name: 'Workflow Broker 2',
                phone: `01${(timestamp + 2).toString().slice(-9)}`,
                email: `workflow-broker2${timestamp}@test.com`,
                password: 'broker123',
                role: 'broker',
            });
        broker2Token = broker2Res.body.access_token;

        const broker2Profile = await request(app.getHttpServer())
            .get('/auth/profile')
            .set('Authorization', `Bearer ${broker2Token}`);
        broker2Id = broker2Profile.body.userId;
    });

    afterAll(async () => {
        await app.close();
    });

    // ===================================
    // COMPLETE CUSTOMER JOURNEY
    // ===================================

    describe('Complete Customer Journey - Happy Path', () => {
        let customerId: string;
        let requestId: string;
        let projectId: string;
        let unitId: string;

        it('Step 1: Create customer', async () => {
            const res = await request(app.getHttpServer())
                .post('/customers')
                .set('Authorization', `Bearer ${broker1Token}`)
                .send({
                    name: 'Ahmed Mohamed',
                    phone: `01${(timestamp + 3).toString().slice(-9)}`,
                })
                .expect(201);

            customerId = res.body.customerId;
            expect(res.body).toHaveProperty('customerId');
            expect(res.body.name).toBe('Ahmed Mohamed');
        });

        it('Step 2: Create request with auto-broker assignment', async () => {
            const res = await request(app.getHttpServer())
                .post('/requests')
                .set('Authorization', `Bearer ${broker1Token}`)
                .send({
                    customerId,
                    areaId: 1,
                })
                .expect(201);

            requestId = res.body.requestId;
            expect(res.body.status).toBe('new');
            expect(res.body.customerId).toBe(customerId);
        });

        it('Step 3: Broker contacts customer (update status)', async () => {
            const res = await request(app.getHttpServer())
                .patch(`/requests/${requestId}`)
                .set('Authorization', `Bearer ${broker1Token}`)
                .send({
                    status: 'contacted',
                })
                .expect(200);

            expect(res.body.status).toBe('contacted');
        });

        it('Step 4: Customer shows interest', async () => {
            const res = await request(app.getHttpServer())
                .patch(`/requests/${requestId}`)
                .set('Authorization', `Bearer ${broker1Token}`)
                .send({
                    status: 'interested',
                })
                .expect(200);

            expect(res.body.status).toBe('interested');
        });

        it('Step 5: Create project and unit for customer', async () => {
            // Create project
            const projectRes = await request(app.getHttpServer())
                .post('/projects')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                    name: `Customer Journey Project ${timestamp}`,
                    areaId: 1,
                    isActive: true,
                })
                .expect(201);

            projectId = projectRes.body.projectId;

            // Create unit
            const unitRes = await request(app.getHttpServer())
                .post(`/projects/${projectId}/units`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                    unitType: 'شقة',
                    size: 150,
                    price: 4000000,
                    code: `WF-${timestamp.toString().slice(-4)}`,
                    unitName: 'Workflow Apartment',
                    building: 'Building A',
                    floor: '3rd Floor',
                    downPayment10Percent: 400000,
                    installment4Years: 75000,
                    installment5Years: 60000,
                })
                .expect(201);

            unitId = unitRes.body.unitId;
            expect(unitRes.body.status).toBe('available');
        });

        it('Step 6: Reserve unit for customer', async () => {
            const res = await request(app.getHttpServer())
                .patch(`/units/${unitId}`)
                .set('Authorization', `Bearer ${broker1Token}`)
                .send({
                    status: 'reserved',
                })
                .expect(200);

            expect(res.body.status).toBe('reserved');
        });

        it('Step 7: Update request to negotiating', async () => {
            const res = await request(app.getHttpServer())
                .patch(`/requests/${requestId}`)
                .set('Authorization', `Bearer ${broker1Token}`)
                .send({
                    status: 'negotiating',
                })
                .expect(200);

            expect(res.body.status).toBe('negotiating');
        });

        it('Step 8: Verify status history is complete', async () => {
            const res = await request(app.getHttpServer())
                .get(`/requests/${requestId}/history`)
                .set('Authorization', `Bearer ${broker1Token}`)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(4);

            // Verify all status changes are logged
            const statuses = res.body.map((h: any) => h.newStatus);
            expect(statuses).toContain('new');
            expect(statuses).toContain('contacted');
            expect(statuses).toContain('interested');
            expect(statuses).toContain('negotiating');
        });

        it('Step 9: Verify all relationships are intact', async () => {
            // Check request
            const requestRes = await request(app.getHttpServer())
                .get(`/requests/${requestId}`)
                .set('Authorization', `Bearer ${broker1Token}`)
                .expect(200);

            expect(requestRes.body.customer.customerId).toBe(customerId);
            expect(requestRes.body).toHaveProperty('area');
            expect(requestRes.body).toHaveProperty('assignedBroker');

            // Check unit
            const unitRes = await request(app.getHttpServer())
                .get(`/units/${unitId}`)
                .set('Authorization', `Bearer ${broker1Token}`)
                .expect(200);

            expect(unitRes.body.project.projectId).toBe(projectId);
            expect(unitRes.body.status).toBe('reserved');
        });
    });

    // ===================================
    // CUSTOMER CANCELLATION WORKFLOW
    // ===================================

    describe('Customer Cancellation Workflow', () => {
        let customerId: string;
        let requestId: string;
        let unitId: string;

        it('Setup: Create customer, request, and reserved unit', async () => {
            // Customer
            const customerRes = await request(app.getHttpServer())
                .post('/customers')
                .set('Authorization', `Bearer ${broker1Token}`)
                .send({ name: 'Cancellation Customer', phone: `01${(timestamp + 4).toString().slice(-9)}` });
            customerId = customerRes.body.customerId;

            // Request
            const requestRes = await request(app.getHttpServer())
                .post('/requests')
                .set('Authorization', `Bearer ${broker1Token}`)
                .send({ customerId, areaId: 1 });
            requestId = requestRes.body.requestId;

            // Project and Unit
            const projectRes = await request(app.getHttpServer())
                .post('/projects')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({ name: `Cancellation Project ${timestamp}`, areaId: 1, isActive: true });

            const unitRes = await request(app.getHttpServer())
                .post(`/projects/${projectRes.body.projectId}/units`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                    unitType: 'فيلا',
                    size: 300,
                    price: 8000000,
                    code: `CANCEL-${timestamp.toString().slice(-4)}`,
                });
            unitId = unitRes.body.unitId;

            // Reserve unit
            await request(app.getHttpServer())
                .patch(`/units/${unitId}`)
                .set('Authorization', `Bearer ${broker1Token}`)
                .send({ status: 'reserved' });
        });

        it('Customer cancels - update request to lost', async () => {
            const res = await request(app.getHttpServer())
                .patch(`/requests/${requestId}`)
                .set('Authorization', `Bearer ${broker1Token}`)
                .send({ status: 'lost' })
                .expect(200);

            expect(res.body.status).toBe('lost');
        });

        it('Release unit back to available', async () => {
            const res = await request(app.getHttpServer())
                .patch(`/units/${unitId}`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({ status: 'available' })
                .expect(200);

            expect(res.body.status).toBe('available');
        });

        it('Verify status history includes cancellation', async () => {
            const res = await request(app.getHttpServer())
                .get(`/requests/${requestId}/history`)
                .set('Authorization', `Bearer ${broker1Token}`)
                .expect(200);

            const statuses = res.body.map((h: any) => h.newStatus);
            expect(statuses).toContain('lost');
        });
    });

    // ===================================
    // BROKER REASSIGNMENT WORKFLOW
    // ===================================

    describe('Broker Reassignment Workflow', () => {
        let customerId: string;
        let requestId: string;

        it('Setup: Create customer and request assigned to broker 1', async () => {
            const customerRes = await request(app.getHttpServer())
                .post('/customers')
                .set('Authorization', `Bearer ${broker1Token}`)
                .send({ name: 'Reassignment Customer', phone: `01${(timestamp + 5).toString().slice(-9)}` });
            customerId = customerRes.body.customerId;

            const requestRes = await request(app.getHttpServer())
                .post('/requests')
                .set('Authorization', `Bearer ${broker1Token}`)
                .send({ customerId, areaId: 1, assignedBrokerId: broker1Id });
            requestId = requestRes.body.requestId;

            expect(requestRes.body.assignedBrokerId).toBe(broker1Id);
        });

        it('Supervisor reassigns to broker 2', async () => {
            const res = await request(app.getHttpServer())
                .post(`/requests/${requestId}/reassign`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({ newBrokerId: broker2Id })
                .expect(200);

            expect(res.body.assignedBrokerId).toBe(broker2Id);
            expect(res.body.status).toBe('reassigned');
        });

        it('Broker 2 can now update the request', async () => {
            const res = await request(app.getHttpServer())
                .patch(`/requests/${requestId}`)
                .set('Authorization', `Bearer ${broker2Token}`)
                .send({ status: 'contacted' })
                .expect(200);

            expect(res.body.status).toBe('contacted');
        });

        it('Verify reassignment is in status history', async () => {
            const res = await request(app.getHttpServer())
                .get(`/requests/${requestId}/history`)
                .set('Authorization', `Bearer ${broker2Token}`)
                .expect(200);

            const reassignHistory = res.body.find((h: any) => h.newStatus === 'reassigned');
            expect(reassignHistory).toBeDefined();
            expect(reassignHistory.fromBrokerId).toBe(broker1Id);
            expect(reassignHistory.toBrokerId).toBe(broker2Id);
        });
    });

    // ===================================
    // MULTI-REQUEST WORKFLOW
    // ===================================

    describe('Customer with Multiple Requests', () => {
        let customerId: string;
        let request1Id: string;
        let request2Id: string;

        it('Create customer', async () => {
            const res = await request(app.getHttpServer())
                .post('/customers')
                .set('Authorization', `Bearer ${broker1Token}`)
                .send({ name: 'Multi-Request Customer', phone: `01${(timestamp + 6).toString().slice(-9)}` })
                .expect(201);

            customerId = res.body.customerId;
        });

        it('Create first request for apartment', async () => {
            const res = await request(app.getHttpServer())
                .post('/requests')
                .set('Authorization', `Bearer ${broker1Token}`)
                .send({ customerId, areaId: 1 })
                .expect(201);

            request1Id = res.body.requestId;
        });

        it('Create second request for villa', async () => {
            const res = await request(app.getHttpServer())
                .post('/requests')
                .set('Authorization', `Bearer ${broker1Token}`)
                .send({ customerId, areaId: 2 })
                .expect(201);

            request2Id = res.body.requestId;
        });

        it('Update first request to paid', async () => {
            await request(app.getHttpServer())
                .patch(`/requests/${request1Id}`)
                .set('Authorization', `Bearer ${broker1Token}`)
                .send({ status: 'paid' })
                .expect(200);
        });

        it('Update second request to lost', async () => {
            await request(app.getHttpServer())
                .patch(`/requests/${request2Id}`)
                .set('Authorization', `Bearer ${broker1Token}`)
                .send({ status: 'lost' })
                .expect(200);
        });

        it('Verify customer has both requests', async () => {
            const res = await request(app.getHttpServer())
                .get(`/customers/${customerId}`)
                .set('Authorization', `Bearer ${broker1Token}`)
                .expect(200);

            expect(res.body.requests).toBeDefined();
            expect(res.body.requests.length).toBeGreaterThanOrEqual(2);

            const statuses = res.body.requests.map((r: any) => r.status);
            expect(statuses).toContain('paid');
            expect(statuses).toContain('lost');
        });
    });

    // ===================================
    // PROJECT LIFECYCLE WORKFLOW
    // ===================================

    describe('Complete Project Lifecycle', () => {
        let projectId: string;
        let unit1Id: string;
        let unit2Id: string;
        let unit3Id: string;

        it('Create project', async () => {
            const res = await request(app.getHttpServer())
                .post('/projects')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                    name: `Lifecycle Project ${timestamp}`,
                    areaId: 1,
                    isActive: true,
                })
                .expect(201);

            projectId = res.body.projectId;
        });

        it('Add multiple units to project', async () => {
            const unit1 = await request(app.getHttpServer())
                .post(`/projects/${projectId}/units`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                    unitType: 'شقة',
                    size: 100,
                    price: 2000000,
                    code: `LIFE-${timestamp.toString().slice(-4)}-1`,
                });
            unit1Id = unit1.body.unitId;

            const unit2 = await request(app.getHttpServer())
                .post(`/projects/${projectId}/units`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                    unitType: 'شقة',
                    size: 120,
                    price: 2500000,
                    code: `LIFE-${timestamp.toString().slice(-4)}-2`,
                });
            unit2Id = unit2.body.unitId;

            const unit3 = await request(app.getHttpServer())
                .post(`/projects/${projectId}/units`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                    unitType: 'فيلا',
                    size: 250,
                    price: 6000000,
                    code: `LIFE-${timestamp.toString().slice(-4)}-3`,
                });
            unit3Id = unit3.body.unitId;
        });

        it('Reserve some units', async () => {
            await request(app.getHttpServer())
                .patch(`/units/${unit1Id}`)
                .set('Authorization', `Bearer ${broker1Token}`)
                .send({ status: 'reserved' });

            await request(app.getHttpServer())
                .patch(`/units/${unit2Id}`)
                .set('Authorization', `Bearer ${broker1Token}`)
                .send({ status: 'reserved' });

            // Unit 3 stays available
        });

        it('Update unit prices', async () => {
            await request(app.getHttpServer())
                .patch(`/units/${unit1Id}`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({ price: 2100000 })
                .expect(200);

            await request(app.getHttpServer())
                .patch(`/units/${unit3Id}`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({ price: 5800000 })
                .expect(200);
        });

        it('Get all units in project', async () => {
            const res = await request(app.getHttpServer())
                .get(`/units?projectId=${projectId}`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .expect(200);

            expect(res.body.length).toBe(3);
            expect(res.body.filter((u: any) => u.status === 'reserved').length).toBe(2);
            expect(res.body.filter((u: any) => u.status === 'available').length).toBe(1);
        });

        it('Deactivate project', async () => {
            const res = await request(app.getHttpServer())
                .patch(`/projects/${projectId}`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({ isActive: false })
                .expect(200);

            expect(res.body.isActive).toBe(false);
        });

        it('Verify project constraints', async () => {
            const res = await request(app.getHttpServer())
                .get(`/projects/${projectId}`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .expect(200);

            expect(res.body.units.length).toBe(3);
            expect(res.body.isActive).toBe(false);
        });
    });
});

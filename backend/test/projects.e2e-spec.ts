import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Projects & Units (e2e)', () => {
    let app: INestApplication;
    let supervisorToken: string;
    let brokerToken: string;
    let projectId: number;
    let unitId: number;
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

    describe('/projects (POST)', () => {
        it('should create a new project (supervisor only)', () => {
            return request(app.getHttpServer())
                .post('/projects')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                    name: 'Palm Hills Residence',
                    areaId: 1,
                })
                .expect(201)
                .expect((res) => {
                    console.log('Project Creation Status:', res.status);
                    console.log('Project Creation Body:', res.body);
                    expect(res.body).toHaveProperty('projectId');
                    expect(res.body.name).toBe('Palm Hills Residence');
                    expect(res.body.isActive).toBe(true);
                    projectId = res.body.projectId;
                });
        });

        it('should fail when broker tries to create project', () => {
            return request(app.getHttpServer())
                .post('/projects')
                .set('Authorization', `Bearer ${brokerToken}`)
                .send({
                    name: 'Unauthorized Project',
                    areaId: 1,
                    isActive: true,
                })
                .expect(403);
        });
    });

    describe('/projects (GET)', () => {
        it('should get all projects', () => {
            return request(app.getHttpServer())
                .get('/projects')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .expect(200)
                .expect((res) => {
                    expect(Array.isArray(res.body)).toBe(true);
                    expect(res.body.length).toBeGreaterThan(0);
                });
        });
    });

    describe('/projects/:id (GET)', () => {
        it('should get project by ID', () => {
            return request(app.getHttpServer())
                .get(`/projects/${projectId}`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body.projectId).toBe(projectId);
                    expect(res.body.name).toBe('Palm Hills Residence');
                    expect(res.body).toHaveProperty('area');
                });
        });

        it('should return 404 for non-existent project', () => {
            return request(app.getHttpServer())
                .get('/projects/99999')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .expect(404);
        });
    });

    describe('/projects/:id (PATCH)', () => {
        it('should update project (supervisor only)', () => {
            return request(app.getHttpServer())
                .patch(`/projects/${projectId}`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                    name: `Palm Hills Residence - Updated ${timestamp}`,
                    isActive: true,
                })
                .expect((res) => {
                    if (res.status !== 200) {
                        console.log('Update Project Failed:', res.status, res.body);
                    }
                })
                .expect(200)
                .expect((res) => {
                    expect(res.body.name).toBe(`Palm Hills Residence - Updated ${timestamp}`);
                });
        });
    });

    describe('/projects/:projectId/units (POST)', () => {
        it('should create a new unit (supervisor only)', () => {
            return request(app.getHttpServer())
                .post(`/projects/${projectId}/units`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                    unitType: 'شقة',
                    size: 120.5,
                    price: 3000000,
                    code: `A${timestamp.toString().slice(-4)}`,
                    unitName: 'Apartment 101',
                    building: 'Building A',
                    floor: '1st Floor',
                    gardenSize: 0,
                    roofSize: 0,
                    downPayment10Percent: 300000,
                    installment4Years: 56250,
                    installment5Years: 45000,
                })
                .expect(201)
                .expect((res) => {
                    expect(res.body).toHaveProperty('unitId');
                    unitId = res.body.unitId;
                    expect(res.body.unitType).toBe('شقة');
                    expect(res.body.price).toBe(3000000);
                    // Match unique code format A[digits]
                    expect(res.body.code).toMatch(/A\d+/);
                    expect(res.body.status).toBe('available');
                });
        });

        it('should fail when broker tries to create unit', () => {
            return request(app.getHttpServer())
                .post(`/projects/${projectId}/units`)
                .set('Authorization', `Bearer ${brokerToken}`)
                .send({
                    unitType: 'شقة',
                    size: 100,
                    price: 2500000,
                    code: 'A102',
                })
                .expect(403);
        });
    });

    describe('/units (GET)', () => {
        it('should get all units', () => {
            return request(app.getHttpServer())
                .get('/units')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .expect(200)
                .expect((res) => {
                    expect(Array.isArray(res.body)).toBe(true);
                    expect(res.body.length).toBeGreaterThan(0);
                });
        });

        it('should filter units by price range', () => {
            return request(app.getHttpServer())
                .get('/units?minPrice=2000000&maxPrice=4000000')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .expect(200)
                .expect((res) => {
                    expect(Array.isArray(res.body)).toBe(true);
                    if (res.body.length > 0) {
                        expect(res.body[0].price).toBeGreaterThanOrEqual(2000000);
                        expect(res.body[0].price).toBeLessThanOrEqual(4000000);
                    }
                });
        });

        it('should filter units by status', () => {
            return request(app.getHttpServer())
                .get('/units?status=available')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .expect(200)
                .expect((res) => {
                    expect(Array.isArray(res.body)).toBe(true);
                    if (res.body.length > 0) {
                        expect(res.body[0].status).toBe('available');
                    }
                });
        });

        it('should filter units by project', () => {
            return request(app.getHttpServer())
                .get(`/units?projectId=${projectId}`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .expect(200)
                .expect((res) => {
                    expect(Array.isArray(res.body)).toBe(true);
                    if (res.body.length > 0) {
                        expect(res.body[0].projectId).toBe(projectId);
                    }
                });
        });
    });

    describe('/units/available (GET)', () => {
        it('should get only available units', () => {
            return request(app.getHttpServer())
                .get('/units/available')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .expect(200)
                .expect((res) => {
                    expect(Array.isArray(res.body)).toBe(true);
                    res.body.forEach((unit: any) => {
                        expect(unit.status).toBe('available');
                    });
                });
        });
    });

    describe('/units/:id (GET)', () => {
        it('should get unit by ID', () => {
            return request(app.getHttpServer())
                .get(`/units/${unitId}`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body.unitId).toBe(unitId);
                    expect(res.body.code).toMatch(/A\d+/);
                    expect(res.body).toHaveProperty('project');
                    expect(res.body.project).toHaveProperty('area');
                });
        });

        it('should return 404 for non-existent unit', () => {
            return request(app.getHttpServer())
                .get('/units/99999')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .expect(404);
        });
    });

    describe('/units/:id (PATCH)', () => {
        it('should update unit', () => {
            return request(app.getHttpServer())
                .patch(`/units/${unitId}`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                    price: 3200000,
                })
                .expect(200)
                .expect((res) => {
                    expect(res.body.price).toBe(3200000);
                });
        });

        it('should allow broker to update unit', () => {
            return request(app.getHttpServer())
                .patch(`/units/${unitId}`)
                .set('Authorization', `Bearer ${brokerToken}`)
                .send({
                    status: 'reserved',
                })
                .expect(200)
                .expect((res) => {
                    expect(res.body.status).toBe('reserved');
                });
        });
    });

    describe('/units/:id (DELETE)', () => {
        it('should fail to delete reserved unit', () => {
            return request(app.getHttpServer())
                .delete(`/units/${unitId}`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .expect(404); // Should fail because unit is reserved
        });

        it('should allow deleting available unit', async () => {
            // First, change status back to available
            await request(app.getHttpServer())
                .patch(`/units/${unitId}`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({ status: 'available' });

            // Then delete
            return request(app.getHttpServer())
                .delete(`/units/${unitId}`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .expect(200);
        });

        it('should fail when broker tries to delete unit', () => {
            return request(app.getHttpServer())
                .delete(`/units/${unitId}`)
                .set('Authorization', `Bearer ${brokerToken}`)
                .expect(403);
        });
    });
});

import { DataSource } from 'typeorm';
import { Area } from '../entities/area.entity';
import { Project } from '../entities/project.entity';
import { Unit } from '../entities/unit.entity';
import { User } from '../entities/user.entity';
import { Broker } from '../entities/broker.entity';
import { BrokerArea } from '../entities/broker-area.entity';
import { Customer } from '../entities/customer.entity';
import { Request } from '../entities/request.entity';
import { RequestStatusHistory } from '../entities/request-status-history.entity';
import { Reservation } from '../entities/reservation.entity';
import { PaymentRecord } from '../entities/payment-record.entity';
import { Conversation } from '../entities/conversation.entity';
import * as dotenv from 'dotenv';
import { typeOrmConfig } from '../config/database.config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

// Load env vars
dotenv.config();

// Mapped area names to their locations roughly, for realistic project naming if needed,
// though we will use generic "Compound" names or similar.
const TARGET_AREAS = [
    'New Capital',
    'Tagamoo',
    'Madinty',
    'Sharm El Sheikh',
];

const UNIT_TYPES = ['Apartment', 'Villa', 'Duplex', 'Penthouse', 'Townhouse'];

// Helper to get random int between min and max (inclusive)
const randomInt = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

// Helper to get random array element
const randomElement = <T>(arr: T[]): T => arr[randomInt(0, arr.length - 1)];

async function seed() {
    // Create DataSource instance
    const config = typeOrmConfig() as any; // Type assertions to avoid strict TypeOrmModuleOptions issues in script
    const dataSource = new DataSource({
        ...config,
        entities: [
            Area,
            Project,
            Unit,
            User,
            Broker,
            BrokerArea,
            Customer,
            Request,
            RequestStatusHistory,
            Reservation,
            PaymentRecord,
            Conversation,
        ],
        // Need to explicitly set type as it might be missing in some config setups when loaded this way
        type: 'postgres',
    });

    await dataSource.initialize();
    console.log('Data Source has been initialized!');

    const areaRepo = dataSource.getRepository(Area);
    const projectRepo = dataSource.getRepository(Project);
    const unitRepo = dataSource.getRepository(Unit);

    try {
        // 1. Ensure Areas Exist
        console.log('Checking and creating Areas...');
        const areasMap = new Map<string, Area>();

        for (const name of TARGET_AREAS) {
            let area = await areaRepo.findOne({ where: { name } });
            if (!area) {
                console.log(`Creating area: ${name}`);
                area = areaRepo.create({ name });
                await areaRepo.save(area);
            } else {
                console.log(`Area exists: ${name}`);
            }
            areasMap.set(name, area);
        }

        // 2. Create 15 Projects distributed across these areas
        console.log('Creating 15 Projects...');
        const projects: Project[] = [];

        // Distribute 15 projects. We have 4 areas.
        // Let's just loop 15 times and pick a random area.
        for (let i = 1; i <= 15; i++) {
            const areaName = randomElement(TARGET_AREAS);
            const area = areasMap.get(areaName);

            // Realistic Project Names
            const projectPrefixes = ['Green', 'Palm', 'Royal', 'Grand', 'Elite', 'Sunny', 'Golden', 'Blue', 'Crystal', 'Future', 'Sky', 'River', 'Mountain', 'Lake', 'Oasis'];
            const projectSuffixes = ['Heights', 'View', 'Valley', 'Garden', 'Resort', 'Plaza', 'Towers', 'Hills', 'Compound', 'City', 'Park', 'Bay', 'Island', 'Gate', 'Life'];

            // Ensure unique names if possible, or just append number if collision risk high (low here)
            const name = `${randomElement(projectPrefixes)} ${randomElement(projectSuffixes)} ${i}`;

            let project = await projectRepo.findOne({ where: { name } });

            if (!project) {
                project = projectRepo.create({
                    name: name,
                    area: area,
                    isActive: true,
                    imageUrl: `https://placehold.co/600x400?text=${encodeURIComponent(name)}`, // Placeholder
                });
                await projectRepo.save(project);
                console.log(`Created project: ${name} in ${areaName}`);
            } else {
                console.log(`Project already exists: ${name}`);
            }
            projects.push(project);
        }

        // 3. Create Units for each Project
        console.log('Creating Units...');

        for (const project of projects) {
            // Range 50 to 100 units
            const unitCount = randomInt(50, 100);
            console.log(`Adding ${unitCount} units to project ${project.name}...`);

            const unitsToInsert: Unit[] = [];

            for (let u = 0; u < unitCount; u++) {
                const unitType = randomElement(UNIT_TYPES);

                // Realistic Price and Size based on type
                let baseSize = 0;
                let basePrice = 0;

                switch (unitType) {
                    case 'Apartment': baseSize = 80; basePrice = 1_500_000; break;
                    case 'Villa': baseSize = 300; basePrice = 8_000_000; break;
                    case 'Duplex': baseSize = 200; basePrice = 5_000_000; break;
                    case 'Penthouse': baseSize = 250; basePrice = 6_500_000; break;
                    case 'Townhouse': baseSize = 220; basePrice = 5_500_000; break;
                }

                // Variate size +/- 20%
                const size = Math.floor(baseSize * (1 + (Math.random() * 0.4 - 0.2)));
                // Variate price +/- 15%
                const price = Math.floor(basePrice * (1 + (Math.random() * 0.3 - 0.15)));

                const unitCode = `P${project.projectId}-U${u + 1}-${Math.random().toString(36).substring(7).toUpperCase()}`;

                const unit = unitRepo.create({
                    project: project,
                    unitType: unitType,
                    size: size,
                    price: price,
                    status: 'available',
                    unitCode: unitCode,
                    unitName: `${unitType} ${u + 1}`,
                    building: `B${randomInt(1, 10)}`,
                    floor: `${randomInt(1, 5)}`,
                    // Add some gardens/roofs for ground/top floors roughly
                    gardenSize: randomInt(0, 5) === 0 ? randomInt(50, 150) : 0,
                    roofSize: randomInt(0, 10) === 0 ? randomInt(40, 100) : 0,
                    imageUrl: `https://placehold.co/600x400?text=${encodeURIComponent(unitCode)}`,
                });
                unitsToInsert.push(unit);
            }

            // Save in chunks to be safe, or all at once if valid
            // Using save(array) is more efficient
            await unitRepo.save(unitsToInsert);
        }

        console.log('Seeding completed successfully!');

    } catch (error) {
        console.error('Error seeding data:', error);
    } finally {
        await dataSource.destroy();
    }
}

seed();

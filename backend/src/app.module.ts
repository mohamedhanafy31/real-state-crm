import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { typeOrmConfig } from './config/database.config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RequestsModule } from './requests/requests.module';
import { ProjectsModule } from './projects/projects.module';
import { AreasModule } from './areas/areas.module';
import { SupervisorModule } from './supervisor/supervisor.module';
import { UploadModule } from './upload/upload.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { LoggerModule } from './logger/logger.module';
import { CacheModule } from './cache/cache.module';
import { EmbeddingModule } from './embedding/embedding.module';
import { ApplicationsModule } from './applications/applications.module';

@Module({
    imports: [
        // Environment configuration
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),

        // Logger module
        LoggerModule,

        // Cache module
        CacheModule,

        // Database connection
        TypeOrmModule.forRootAsync({
            useFactory: typeOrmConfig,
        }),

        // Scheduled tasks
        ScheduleModule.forRoot(),

        // Static file serving for uploads
        ServeStaticModule.forRoot({
            rootPath: join(process.cwd(), 'uploads'),
            serveRoot: '/uploads',
        }),

        // Feature modules
        AuthModule,
        UsersModule,
        RequestsModule,
        ProjectsModule,
        AreasModule,
        SupervisorModule,
        UploadModule,
        ChatbotModule,
        EmbeddingModule,
        ApplicationsModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule { }


import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppLoggerService } from './logger/logger.service';
import { HttpLoggerInterceptor } from './logger/http-logger.interceptor';
import { AllExceptionsFilter } from './logger/all-exceptions.filter';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Get logger instance
    const logger = app.get(AppLoggerService);
    app.useLogger(logger);

    // Global exception filter
    app.useGlobalFilters(new AllExceptionsFilter(logger));

    // HTTP request logging interceptor
    app.useGlobalInterceptors(new HttpLoggerInterceptor(logger));

    // Set global prefix
    app.setGlobalPrefix('api');

    // Enable CORS for frontend integration
    app.enableCors({
        origin: ['http://localhost:5000', 'http://127.0.0.1:5000', 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:8000', 'http://localhost:8001', 'http://localhost:8002'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    });

    // Global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }),
    );

    // Swagger API documentation
    const config = new DocumentBuilder()
        .setTitle('Real Estate CRM API')
        .setDescription('Backend API for Real Estate CRM system')
        .setVersion('1.0')
        .addBearerAuth()
        .addTag('auth', 'Authentication endpoints')
        .addTag('users', 'User and broker management')
        .addTag('customers', 'Customer management')
        .addTag('requests', 'Request lifecycle management')
        .addTag('projects', 'Project management')
        .addTag('units', 'Unit inventory management')
        .addTag('reservations', 'Reservation and payment management')
        .addTag('conversations', 'Conversation logging')
        .addTag('analytics', 'Analytics and reporting')
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    const port = process.env.PORT || 3000;
    await app.listen(port);

    logger.log(`🚀 Real Estate CRM Backend is running on: http://localhost:${port}`, 'Bootstrap');
    logger.log(`📚 API Documentation available at: http://localhost:${port}/api/docs`, 'Bootstrap');
    logger.log(`📁 Logs directory: ${logger.getLogDirectory()}`, 'Bootstrap');
    logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`, 'Bootstrap');
}

bootstrap();

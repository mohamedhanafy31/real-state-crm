import { Logger as TypeOrmLogger } from 'typeorm';
import { AppLoggerService } from './logger.service';

/**
 * Custom TypeORM logger that uses our AppLoggerService
 */
export class TypeOrmCustomLogger implements TypeOrmLogger {
    constructor(private readonly logger: AppLoggerService) { }

    logQuery(query: string, parameters?: any[]): void {
        this.logger.logQuery(query, parameters);
    }

    logQueryError(error: string, query: string, parameters?: any[]): void {
        this.logger.logQueryError(error, query, parameters);
    }

    logQuerySlow(time: number, query: string): void {
        this.logger.logQuerySlow(query, time);
    }

    logSchemaBuild(message: string): void {
        this.logger.logSchemaBuild(message);
    }

    logMigration(message: string): void {
        this.logger.logMigration(message);
    }

    log(level: 'log' | 'info' | 'warn', message: any): void {
        switch (level) {
            case 'log':
            case 'info':
                this.logger.log(message, 'TypeORM');
                break;
            case 'warn':
                this.logger.warn(message, 'TypeORM');
                break;
        }
    }
}

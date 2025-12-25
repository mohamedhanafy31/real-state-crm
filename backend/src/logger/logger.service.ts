import { Injectable, LoggerService, Scope } from '@nestjs/common';
import * as winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';

@Injectable({ scope: Scope.DEFAULT })
export class AppLoggerService implements LoggerService {
    private logger: winston.Logger;
    private logDir: string;

    constructor() {
        // Create timestamped log directory for this run
        const timestamp = this.getTimestamp();
        const baseLogDir = process.env.LOG_DIR || 'logs';
        this.logDir = path.join(baseLogDir, timestamp);

        // Ensure log directory exists
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }

        // Configure Winston logger
        this.logger = winston.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.errors({ stack: true }),
                winston.format.splat(),
                winston.format.json(),
            ),
            defaultMeta: { service: 'real-estate-crm' },
            transports: [
                // Combined log - all messages
                new winston.transports.File({
                    filename: path.join(this.logDir, 'combined.log'),
                    level: 'debug',
                }),
                // Error log - only errors
                new winston.transports.File({
                    filename: path.join(this.logDir, 'error.log'),
                    level: 'error',
                }),
                // App log - info and above
                new winston.transports.File({
                    filename: path.join(this.logDir, 'app.log'),
                    level: 'info',
                }),
                // Console output with colors
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
                            const contextStr = context ? `[${context}] ` : '';
                            const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
                            return `${timestamp} ${level}: ${contextStr}${message} ${metaStr}`;
                        }),
                    ),
                }),
            ],
        });

        // Log initialization
        this.logger.info(`Logger initialized. Logs directory: ${this.logDir}`);
    }

    /**
     * Generate timestamp in YYYYMMDD_HHMMSS format
     */
    private getTimestamp(): string {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        return `${year}${month}${day}_${hours}${minutes}${seconds}`;
    }

    /**
     * Get the current log directory path
     */
    getLogDirectory(): string {
        return this.logDir;
    }

    /**
     * Log general information
     */
    log(message: string, context?: string): void {
        this.logger.info(message, { context });
    }

    /**
     * Log error with optional stack trace
     */
    error(message: string, trace?: string, context?: string): void {
        this.logger.error(message, { context, trace });
    }

    /**
     * Log warning
     */
    warn(message: string, context?: string): void {
        this.logger.warn(message, { context });
    }

    /**
     * Log debug information
     */
    debug(message: string, context?: string): void {
        this.logger.debug(message, { context });
    }

    /**
     * Log verbose information
     */
    verbose(message: string, context?: string): void {
        this.logger.verbose(message, { context });
    }

    /**
     * Log HTTP request
     */
    logRequest(method: string, url: string, statusCode: number, duration: number, userId?: number): void {
        this.logger.info('HTTP Request', {
            context: 'HTTP',
            method,
            url,
            statusCode,
            duration: `${duration}ms`,
            userId,
        });
    }

    /**
     * Log database query (for TypeORM integration)
     */
    logQuery(query: string, parameters?: any[]): void {
        this.logger.debug('Database Query', {
            context: 'Database',
            query,
            parameters,
        });
    }

    /**
     * Log database query error
     */
    logQueryError(error: string, query: string, parameters?: any[]): void {
        this.logger.error('Database Query Error', {
            context: 'Database',
            error,
            query,
            parameters,
        });
    }

    /**
     * Log database query slow performance
     */
    logQuerySlow(query: string, time: number): void {
        this.logger.warn('Slow Database Query', {
            context: 'Database',
            query,
            time: `${time}ms`,
        });
    }

    /**
     * Log schema build
     */
    logSchemaBuild(message: string): void {
        this.logger.info(message, { context: 'DatabaseSchema' });
    }

    /**
     * Log migration
     */
    logMigration(message: string): void {
        this.logger.info(message, { context: 'Migration' });
    }
}

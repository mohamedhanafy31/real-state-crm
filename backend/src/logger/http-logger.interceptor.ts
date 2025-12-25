import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AppLoggerService } from './logger.service';

@Injectable()
export class HttpLoggerInterceptor implements NestInterceptor {
    constructor(private readonly logger: AppLoggerService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const { method, url, user } = request;
        const startTime = Date.now();
        const userId = user?.userId;

        return next.handle().pipe(
            tap({
                next: () => {
                    const response = context.switchToHttp().getResponse();
                    const { statusCode } = response;
                    const duration = Date.now() - startTime;
                    this.logger.logRequest(method, url, statusCode, duration, userId);
                },
                error: (error) => {
                    const statusCode = error?.status || 500;
                    const duration = Date.now() - startTime;
                    this.logger.logRequest(method, url, statusCode, duration, userId);
                },
            }),
        );
    }
}

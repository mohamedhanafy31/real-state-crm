/**
 * Embedding Service
 * HTTP client for communicating with embedding microservice
 * Provides fire-and-forget async embedding sync on CRUD operations
 */

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { SyncAreaDto, SyncProjectDto, SyncUnitTypeDto } from './embedding.dto';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly baseUrl: string;
  private readonly maxRetries = 3;
  private readonly retryDelayMs = 1000;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('EMBEDDING_SERVICE_URL') || 'http://localhost:8001';
    this.logger.log(`Embedding service initialized with URL: ${this.baseUrl}`);
  }

  /**
   * Delay helper for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Sync area embedding (create or update)
   * Fire-and-forget: doesn't block caller
   */
  async syncArea(areaId: number, name: string, nameAr?: string): Promise<void> {
    const dto: SyncAreaDto = { area_id: areaId, name, name_ar: nameAr };
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await firstValueFrom(
          this.httpService.post(`${this.baseUrl}/sync/area`, dto, { timeout: 5000 })
        );
        this.logger.log(`Synced area embedding: ${name} (ID: ${areaId})`);
        return;
      } catch (error) {
        this.logger.warn(`Attempt ${attempt}/${this.maxRetries} failed to sync area ${areaId}: ${error.message}`);
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelayMs * attempt);
        }
      }
    }
    
    this.logger.error(`Failed to sync area ${areaId} after ${this.maxRetries} attempts`);
  }

  /**
   * Delete area embedding
   * Fire-and-forget: doesn't block caller
   */
  async deleteArea(areaId: number): Promise<void> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await firstValueFrom(
          this.httpService.delete(`${this.baseUrl}/sync/area/${areaId}`, { timeout: 5000 })
        );
        this.logger.log(`Deleted area embedding: ID ${areaId}`);
        return;
      } catch (error) {
        this.logger.warn(`Attempt ${attempt}/${this.maxRetries} failed to delete area ${areaId}: ${error.message}`);
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelayMs * attempt);
        }
      }
    }
    
    this.logger.error(`Failed to delete area ${areaId} after ${this.maxRetries} attempts`);
  }

  /**
   * Sync project embedding (create or update)
   * Fire-and-forget: doesn't block caller
   */
  async syncProject(projectId: number, name: string, nameAr?: string, areaId?: number): Promise<void> {
    const dto: SyncProjectDto = { project_id: projectId, name, name_ar: nameAr, area_id: areaId };
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await firstValueFrom(
          this.httpService.post(`${this.baseUrl}/sync/project`, dto, { timeout: 5000 })
        );
        this.logger.log(`Synced project embedding: ${name} (ID: ${projectId})`);
        return;
      } catch (error) {
        this.logger.warn(`Attempt ${attempt}/${this.maxRetries} failed to sync project ${projectId}: ${error.message}`);
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelayMs * attempt);
        }
      }
    }
    
    this.logger.error(`Failed to sync project ${projectId} after ${this.maxRetries} attempts`);
  }

  /**
   * Delete project embedding
   * Fire-and-forget: doesn't block caller
   */
  async deleteProject(projectId: number): Promise<void> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await firstValueFrom(
          this.httpService.delete(`${this.baseUrl}/sync/project/${projectId}`, { timeout: 5000 })
        );
        this.logger.log(`Deleted project embedding: ID ${projectId}`);
        return;
      } catch (error) {
        this.logger.warn(`Attempt ${attempt}/${this.maxRetries} failed to delete project ${projectId}: ${error.message}`);
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelayMs * attempt);
        }
      }
    }
    
    this.logger.error(`Failed to delete project ${projectId} after ${this.maxRetries} attempts`);
  }

  /**
   * Sync unit type embedding
   */
  async syncUnitType(name: string, nameAr?: string): Promise<void> {
    const dto: SyncUnitTypeDto = { name, name_ar: nameAr };
    
    try {
      await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/sync/unit-type`, dto, { timeout: 5000 })
      );
      this.logger.log(`Synced unit type embedding: ${name}`);
    } catch (error) {
      this.logger.warn(`Failed to sync unit type ${name}: ${error.message}`);
    }
  }

  /**
   * Check if embedding service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/health`, { timeout: 2000 })
      );
      return true;
    } catch {
      return false;
    }
  }
}

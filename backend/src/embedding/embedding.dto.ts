/**
 * Embedding Service DTOs
 * Request/Response types for embedding microservice API
 */

export class SyncAreaDto {
  area_id: number;
  name: string;
  name_ar?: string;
}

export class SyncProjectDto {
  project_id: number;
  name: string;
  name_ar?: string;
  area_id?: number;
}

export class SyncUnitTypeDto {
  name: string;
  name_ar?: string;
}

export class SyncResponseDto {
  success: boolean;
  message: string;
}

export class DeleteResponseDto {
  success: boolean;
  message: string;
}

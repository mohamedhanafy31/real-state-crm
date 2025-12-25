import { Injectable } from '@nestjs/common';

@Injectable()
export class UploadService {
    getFileUrl(filename: string, type: string): string {
        return `/uploads/${type}/${filename}`;
    }
}

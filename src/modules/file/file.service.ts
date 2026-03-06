import { Injectable, Logger } from '@nestjs/common';
import { join } from 'path';
import { FileFolderEnum } from './enums/file-folder.enum';
import { existsSync, mkdirSync } from 'fs';
import { writeFile, unlink } from 'fs/promises';
import sharp from 'sharp';

@Injectable()
export class FileService {
  private readonly serverUrl = process.env.SERVER_URL;
  private readonly uploadsPath = join(process.cwd(), 'uploads');
  private readonly logger = new Logger(FileService.name);

  constructor() {
    if (!existsSync(this.uploadsPath)) {
      mkdirSync(this.uploadsPath, { recursive: true });
    }
  }

  async saveFile({
    file,
    folder,
    entityId,
  }: {
    file: Express.Multer.File;
    folder: FileFolderEnum;
    entityId?: string | number;
  }): Promise<string> {
    if (!file) throw new Error('File not provided');

    const safeEntityId = String(entityId ?? 'common').replace(
      /[^a-zA-Z0-9_-]/g,
      '_',
    );
    const folderPath = join(this.uploadsPath, folder, safeEntityId);
    if (!existsSync(folderPath)) {
      mkdirSync(folderPath, { recursive: true });
    }

    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);

    // HAR DOIM webp
    const filename = `${timestamp}-${random}.webp`;
    const filePath = join(folderPath, filename);

    // sharp orqali webp ga o‘tkazamiz
    const webpBuffer = await sharp(file.buffer)
      .webp({
        quality: 80,
        effort: 6,
      })
      .toBuffer();

    await writeFile(filePath, webpBuffer);

    const fileKey = `${folder}/${safeEntityId}/${filename}`;
    return this.getPublicUrl(fileKey) || fileKey;
  }

  private normalizeKey(fileRef: string) {
    if (!fileRef) return '';

    if (fileRef.startsWith('http://') || fileRef.startsWith('https://')) {
      try {
        const parsed = new URL(fileRef);
        const path = parsed.pathname.replace(/^\/+/, '');
        if (path.startsWith('uploads/')) {
          return path.replace(/^uploads\//, '');
        }
        return path;
      } catch {
        return fileRef;
      }
    }

    return fileRef.replace(/^\/+/, '').replace(/^uploads\//, '');
  }

  getPublicUrl(fileRef?: string | null): string | null {
    if (!fileRef) return null;
    if (fileRef.startsWith('http://') || fileRef.startsWith('https://')) {
      return fileRef;
    }
    const normalized = this.normalizeKey(fileRef);
    if (!normalized) return null;
    const baseUrl = (this.serverUrl || '').replace(/\/+$/, '');
    if (!baseUrl) return `/uploads/${normalized}`;
    return `${baseUrl}/uploads/${normalized}`;
  }

  async deleteFile(fileRef: string) {
    try {
      const key = this.normalizeKey(fileRef);
      const absolutePath = join(this.uploadsPath, key);

      if (existsSync(absolutePath)) {
        await unlink(absolutePath);
        this.logger.log(`File deleted: ${absolutePath}`);
        return true;
      } else {
        this.logger.warn(`File not found: ${absolutePath}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Error deleting file: ${error}`);
      return false;
    }
  }
}

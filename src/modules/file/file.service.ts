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
  }: {
    file: Express.Multer.File;
    folder: FileFolderEnum;
  }): Promise<string> {
    if (!file) throw new Error('File not provided');

    const folderPath = join(this.uploadsPath, folder);
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

    return `${this.serverUrl}/uploads/${folder}/${filename}`;
  }

  async deleteFile(fileUrl: string) {
    try {
      const filePath = fileUrl.replace(this.serverUrl + '/', '');
      const absolutePath = join(process.cwd(), filePath);

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

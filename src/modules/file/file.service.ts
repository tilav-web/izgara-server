import { Injectable } from "@nestjs/common";
import { join } from "path";
import { FileFolderEnum } from "./enums/file-folder.enum";
import { existsSync, mkdirSync } from "fs";
import { writeFile } from "fs/promises";

@Injectable()
export class FileService {
    private readonly serverUrl = process.env.SERVER_URL
    private readonly uploadsPath = join(process.cwd(), 'uploads')

    constructor() {
        if (!existsSync(this.uploadsPath)) {
            mkdirSync(this.uploadsPath, { recursive: true })
        }
    }

    async saveFile({
        file,
        folder
    }: { file: Express.Multer.File, folder: FileFolderEnum }): Promise<string> {

        if (!file) throw new Error('File not provided')

        const folderPath = join(this.uploadsPath, folder)
        if (!existsSync(folderPath)) {
            mkdirSync(folderPath, { recursive: true })
        }

        const timestamp = Date.now();
        const random = Math.round(Math.random() * 1e9);
        const extension = file.originalname.split('.').pop(); // fayl kengaytmasi
        const filename = `${timestamp}-${random}.${extension}`;

        const filePath = join(folderPath, filename);

        await writeFile(filePath, file.buffer)

        return `${this.serverUrl}/uploads/${folder}/${filename}`
    }

}
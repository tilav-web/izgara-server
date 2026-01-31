import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Category } from "./category.entity";
import { Repository } from "typeorm";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { FileService } from "../file/file.service";
import { FileFolderEnum } from "../file/enums/file-folder.enum";

@Injectable()
export class CategoryService {
    constructor(
        @InjectRepository(Category) private readonly repository: Repository<Category>,
        private readonly fileService: FileService
    ) { }

    async findAll() {
        return this.repository.find()
    }

    async upsertMany(data: {
        id: string,
        name: string,
        sort_order: number
    }[]) {
        return this.repository.upsert(data, ['id'])
    }

    async updateCategory({ id, name, sort_order, image }: { id: string; image?: Express.Multer.File; } & UpdateCategoryDto) {
        const category = await this.repository.findOne({
            where: {
                id
            }
        })

        if (!category) {
            throw new NotFoundException('Kategoriya topilmadi!')
        }

        if (image) {

            if (category.image) {
                await this.fileService.deleteFile(category.image)
            }

            category.image = await this.fileService.saveFile({ file: image, folder: FileFolderEnum.CATEGORIES })
        }
        if (name) category.name = name
        if (sort_order !== undefined) category.sort_order = sort_order

        return this.repository.save(category)
    }

}
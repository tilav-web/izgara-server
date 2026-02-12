import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from './category.entity';
import { Repository } from 'typeorm';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { FileService } from '../file/file.service';
import { FileFolderEnum } from '../file/enums/file-folder.enum';
import { CategoryRedisService } from '../redis/category-redis.service';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly repository: Repository<Category>,
    private readonly fileService: FileService,
    private readonly categoryRedisService: CategoryRedisService,
  ) {}

  async findAll() {
    const cacheCategories = await this.categoryRedisService.getAllCategories();

    if (cacheCategories) return cacheCategories;

    const categories = await this.repository.find();
    await this.categoryRedisService.setCategories(categories);

    return categories;
  }

  async findById(id: string) {
    const category = await this.categoryRedisService.getCategoryById(id);

    if (category) return category;

    return this.repository.findOne({
      where: {
        id,
      },
    });
  }

  async upsertMany(
    data: {
      id: string;
      name: string;
      sort_order: number;
    }[],
  ) {
    await this.categoryRedisService.invalidate();
    return this.repository.upsert(data, ['id']);
  }

  async updateCategory({
    id,
    name,
    sort_order,
    image,
  }: { id: string; image?: Express.Multer.File } & UpdateCategoryDto) {
    const category = await this.repository.findOne({
      where: {
        id,
      },
    });

    if (!category) {
      throw new NotFoundException('Kategoriya topilmadi!');
    }

    if (image) {
      if (category.image) {
        await this.fileService.deleteFile(category.image);
      }

      category.image = await this.fileService.saveFile({
        file: image,
        folder: FileFolderEnum.CATEGORIES,
      });
    }
    if (name) category.name = name;
    if (sort_order !== undefined) category.sort_order = sort_order;

    await this.categoryRedisService.invalidate();
    return this.repository.save(category);
  }
}

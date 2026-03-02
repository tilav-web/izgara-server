import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from './category.entity';
import { Repository } from 'typeorm';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { FileService } from '../file/file.service';
import { FileFolderEnum } from '../file/enums/file-folder.enum';
import { CategoryRedisService } from '../redis/category-redis.service';
import { AuthRoleEnum } from '../auth/enums/auth-role.enum';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly repository: Repository<Category>,
    private readonly fileService: FileService,
    private readonly categoryRedisService: CategoryRedisService,
  ) {}

  private withImageUrl<T extends { image?: string | null }>(item: T): T {
    return {
      ...item,
      image: this.fileService.getPublicUrl(item.image),
    };
  }

  async findAll(role?: AuthRoleEnum) {
    const cacheCategories = await this.categoryRedisService.getAllCategories();

    if (cacheCategories) {
      const mapped = cacheCategories.map((category) =>
        this.withImageUrl(category),
      );
      if (role === AuthRoleEnum.SUPERADMIN) return mapped;
      return mapped.filter((category) => category.is_active);
    }

    const categories = await this.repository.find();
    await this.categoryRedisService.setCategories(categories);
    const mapped = categories.map((category) => this.withImageUrl(category));

    if (role === AuthRoleEnum.SUPERADMIN) return mapped;
    return mapped.filter((category) => category.is_active);
  }

  async findById(id: string, role?: AuthRoleEnum) {
    const category = await this.categoryRedisService.getCategoryById(id);

    if (category) {
      const mapped = this.withImageUrl(category);
      if (role === AuthRoleEnum.SUPERADMIN) return mapped;
      return mapped.is_active ? mapped : null;
    }

    const categoryDb = await this.repository.findOne({
      where: {
        id,
      },
    });

    if (!categoryDb) return null;
    const mapped = this.withImageUrl(categoryDb);
    if (role === AuthRoleEnum.SUPERADMIN) return mapped;
    return mapped.is_active ? mapped : null;
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
    is_active,
    image,
  }: {
    id: string;
    image?: Express.Multer.File;
  } & UpdateCategoryDto) {
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
        entityId: category.id,
      });
    }
    if (name) category.name = name;
    if (sort_order !== undefined) category.sort_order = sort_order;
    if (is_active !== undefined) category.is_active = is_active;

    await this.categoryRedisService.invalidate();
    const result = await this.repository.save(category);
    return this.withImageUrl(result);
  }
}

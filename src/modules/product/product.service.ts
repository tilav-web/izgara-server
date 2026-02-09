import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './product.entity';
import {
  Between,
  DeepPartial,
  FindOptionsWhere,
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { FindAllFilterDto } from './dto/find-all-filter.dto';
import { CoinSettingsService } from '../coinSettings/coin-settings.service';
import { claculateCoin } from '../../utils/calculate-coin';
import { UpdateProductDto } from './dto/update-product.dto';
import { FileService } from '../file/file.service';
import { FileFolderEnum } from '../file/enums/file-folder.enum';
import { OrderProductDto } from '../order/dto/order-product.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product) private readonly repository: Repository<Product>,
    private readonly coinSettingsService: CoinSettingsService,
    private readonly fileService: FileService,
  ) {}

  async saveMenu(products: DeepPartial<Product>[]) {
    return await this.repository.save(products);
  }

  async getTotalPrice(dto: OrderProductDto[]) {
    if (dto.length === 0)
      throw new BadRequestException('Mahsulotlarni tanlang!');

    const ids = dto.map((item) => item.product_id);

    const products = await this.repository.find({
      where: {
        id: In(ids),
      },
    });

    if (products.length !== dto.length)
      throw new BadRequestException('Mahsulotlarni tanlang!');

    const quantityMap = new Map<string, number>();
    dto.forEach((item) => quantityMap.set(item.product_id, item.quantity));

    const total_price = products.reduce((acc, item) => {
      const quantity = quantityMap.get(item.id);
      if (!quantity) return acc;
      return acc + item.price * quantity;
    }, 0);

    return { total_price };
  }

  async findAll({
    page = 1,
    limit = 10,
    category_id,
    price_min,
    price_max,
  }: FindAllFilterDto) {
    const filter: FindOptionsWhere<Product> = {};
    if (category_id) filter.category_id = category_id;

    const coinSettings = await this.coinSettingsService.findCoinSettings();

    if (price_min && price_max) {
      if (price_min > price_max) {
        throw new BadRequestException(
          "Narx bo'yicha qidirish uchun min va max mantiqan to'g'ri bo'lishi kerak!",
        );
      }
      filter.price = Between(price_min, price_max);
    } else if (price_min) {
      filter.price = MoreThanOrEqual(price_min);
    } else if (price_max) {
      filter.price = LessThanOrEqual(price_max);
    }

    const skip = (page - 1) * limit;

    const [data, total] = await this.repository.findAndCount({
      where: filter,
      take: limit,
      skip,
    });

    const products = data.map((item) => {
      return {
        ...item,
        ...claculateCoin({ product_price: item.price, coinSettings }),
      };
    });

    return {
      products,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    const product = await this.repository.findOne({
      where: {
        id,
      },
      relations: {
        modifier_groups: {
          modifiers: true,
        },
      },
    });
    if (!product) {
      throw new NotFoundException('Mahsulot topilmadi!');
    }
    const coinSettings = await this.coinSettingsService.findCoinSettings();

    return {
      ...product,
      ...claculateCoin({ product_price: product?.price ?? 0, coinSettings }),
    };
  }

  async update(
    id: string,
    dto: UpdateProductDto & { image?: Express.Multer.File },
  ) {
    if (!id)
      throw new BadRequestException(
        'Mahsulot id sini yuborish majburiy uni params da yuboring!',
      );

    const hasUpdateField =
      dto.image ||
      Object.values(dto).some((value) => value !== undefined && value !== null);

    if (!hasUpdateField) {
      throw new BadRequestException('Hech qanday maydon yuborilmadi!');
    }

    const product = await this.repository.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Mahsulot topilmadi!');

    if (dto.image) {
      if (product.image) {
        await this.fileService.deleteFile(product.image);
      }

      product.image = await this.fileService.saveFile({
        file: dto.image,
        folder: FileFolderEnum.PRODUCTS,
      });
    }

    if (dto.name !== undefined && dto.name !== null) product.name = dto.name;
    if (dto.description !== undefined && dto.description !== null)
      product.description = dto.description;
    if (dto.vat !== undefined && dto.vat !== null) product.vat = dto.vat;
    if (dto.measure_unit !== undefined && dto.measure_unit !== null)
      product.measure_unit = dto.measure_unit;
    if (dto.measure !== undefined && dto.measure !== null)
      product.measure = dto.measure;
    if (dto.sort_order !== undefined && dto.sort_order !== null)
      product.sort_order = dto.sort_order;
    if (dto.is_active !== undefined && dto.is_active !== null)
      product.is_active = dto.is_active;
    if (dto.category_id !== undefined && dto.category_id !== null)
      product.category_id = dto.category_id;

    const result = await this.repository.save(product);
    return result;
  }

  async findByIds(dto: OrderProductDto[]) {
    const ids = dto.map((item) => item.product_id);

    const products = await this.repository.find({
      where: { id: In(ids) },
    });

    const result = products.map((product) => {
      const found = dto.find((d) => d.product_id === product.id);
      return {
        ...product,
        quantity: found?.quantity ?? 1,
      };
    });

    return result;
  }
}

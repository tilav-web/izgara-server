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
import { Modifier } from '../modifier/modifier.entity';
import { OrderItem } from '../order/schemas/order-item.entity';
import { OrderItemModifier } from '../order/schemas/order-item-modifier.entity';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product) private readonly repository: Repository<Product>,
    @InjectRepository(Modifier)
    private readonly modifierRepository: Repository<Modifier>,
    private readonly coinSettingsService: CoinSettingsService,
    private readonly fileService: FileService,
  ) {}

  async saveMenu(products: DeepPartial<Product>[]) {
    return await this.repository.save(products);
  }

  async getTotalPrice(dto: OrderProductDto[]) {
    if (dto.length === 0)
      throw new BadRequestException('Mahsulotlarni tanlang!');

    // 1. Unikal ID-larni yig'amiz (Bazaga ortiqcha yuk tushirmaslik uchun)
    const productIds = [...new Set(dto.map((item) => item.product_id))];
    const modifierIds = [
      ...new Set(
        dto.flatMap((item) => item.modifiers?.map((m) => m.modifier_id) ?? []),
      ),
    ];

    // 2. Bazadan ma'lumotlarni parallel olish
    const [products, modifiers] = await Promise.all([
      this.repository.find({ where: { id: In(productIds) } }),
      this.modifierRepository.find({
        where: { id: In(modifierIds) },
        relations: { group: true },
      }),
    ]);

    // 3. Bazada hamma mahsulotlar borligini tekshirish
    if (products.length !== productIds.length) {
      throw new BadRequestException("Ba'zi mahsulotlar topilmadi!");
    }

    // 4. Map orqali qidiruvni tezlashtiramiz
    const productMap = new Map(products.map((p) => [p.id, p]));
    const modifierMap = new Map(modifiers.map((m) => [m.id, m]));

    // 5. Umumiy narxni DTO bo'yicha hisoblaymiz
    const items_price = dto.reduce((acc, item) => {
      const product = productMap.get(item.product_id);
      if (!product) return acc;

      // Asosiy mahsulot narxi
      let currentItemPrice = Number(product.price);

      // Modifierlar narxini hisoblaymiz
      if (item.modifiers && item.modifiers.length > 0) {
        const seenModifierIds = new Set<string>();
        const modifiersSum = item.modifiers.reduce((mAcc, mDto) => {
          if (seenModifierIds.has(mDto.modifier_id)) {
            throw new BadRequestException(
              `Bir mahsulot ichida takroriy modifier bor: ${mDto.modifier_id}`,
            );
          }
          seenModifierIds.add(mDto.modifier_id);

          const mod = modifierMap.get(mDto.modifier_id);
          if (!mod) {
            throw new NotFoundException(
              `Modifier ${mDto.modifier_id} topilmadi!`,
            );
          }

          if (mod.group?.product_id !== item.product_id) {
            throw new BadRequestException(
              `Modifier ${mod.id} mahsulot ${item.product_id} ga tegishli emas`,
            );
          }

          // Modifier narxi * DTO dagi modifier quantity
          return mAcc + Number(mod.price) * mDto.quantity;
        }, 0);

        currentItemPrice += modifiersSum;
      }

      // (Mahsulot + Modifierlar) * DTO dagi mahsulot quantity
      return acc + currentItemPrice * item.quantity;
    }, 0);

    return { items_price };
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
    // 1. ID-larni yig'ish
    const productIds = dto.map((d) => d.product_id);
    const modifierIds = dto.flatMap(
      (d) => d.modifiers?.map((m) => m.modifier_id) ?? [],
    );

    // 2. Bazadan ma'lumotlarni parallel olish
    const [products, modifiers] = await Promise.all([
      this.repository.find({ where: { id: In(productIds) } }),
      this.modifierRepository.find({
        where: { id: In(modifierIds) },
        relations: { group: true },
      }),
    ]);

    // 3. Mahsulotlar to'liqligini tekshirish
    if (products.length !== [...new Set(productIds)].length) {
      throw new NotFoundException("Ba'zi mahsulotlar topilmadi!");
    }

    // 4. Map-lar orqali optimallash
    const productMap = new Map(products.map((p) => [p.id, p]));
    const modifierMap = new Map(modifiers.map((m) => [m.id, m]));

    // 5. DTO-ni Entity strukturasiga o'tkazish
    const items = dto.map((d) => {
      const product = productMap.get(d.product_id)!;

      // OrderItem obyektini shakllantiramiz
      const orderItem = new OrderItem();
      orderItem.product_id = product.id;
      orderItem.product_name = product.name; // Tarix uchun nom
      orderItem.price = Number(product.price); // Tarix uchun narx
      orderItem.quantity = d.quantity;

      // Agar modifierlar bo'lsa, ularni ham entity ko'rinishida shakllantiramiz
      if (d.modifiers && d.modifiers.length > 0) {
        const seenModifierIds = new Set<string>();
        orderItem.order_item_modifiers = d.modifiers.map((mDto) => {
          if (seenModifierIds.has(mDto.modifier_id)) {
            throw new BadRequestException(
              `Bir mahsulot ichida takroriy modifier bor: ${mDto.modifier_id}`,
            );
          }
          seenModifierIds.add(mDto.modifier_id);

          const mod = modifierMap.get(mDto.modifier_id);
          if (!mod)
            throw new NotFoundException(
              `Modifier ${mDto.modifier_id} topilmadi!`,
            );

          if (mod.group?.product_id !== d.product_id) {
            throw new BadRequestException(
              `Modifier ${mod.id} mahsulot ${d.product_id} ga tegishli emas`,
            );
          }

          const orderItemModifier = new OrderItemModifier();
          orderItemModifier.modifier_id = mod.id;
          orderItemModifier.modifier_name = mod.name;
          orderItemModifier.price = Number(mod.price);
          orderItemModifier.quantity = mDto.quantity;

          return orderItemModifier;
        });
      }

      return orderItem;
    });

    return items;
  }
}

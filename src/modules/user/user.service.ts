import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Repository } from 'typeorm';
import { UserRedisService } from '../redis/user-redis.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { FileService } from '../file/file.service';
import { FileFolderEnum } from '../file/enums/file-folder.enum';
import { UsersFilterDto } from './dto/users-filter.dto';
import { AuthStatusEnum } from '../auth/enums/status.enum';
import { AuthRoleEnum } from '../auth/enums/auth-role.enum';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly repository: Repository<User>,
    private readonly userRedisService: UserRedisService,
    private readonly fileService: FileService,
  ) {}

  async findAll({
    search,
    status,
    role,
    coin_balance,
    page = 1,
    limit = 10,
  }: UsersFilterDto) {
    const qb = this.repository.createQueryBuilder('user');

    if (role) {
      qb.andWhere('user.role = :role', { role: role });
    }

    if (status) {
      qb.andWhere('user.status = :status', { status: status });
    }

    if (coin_balance === true) {
      qb.orderBy('user.coin_balance', 'DESC');
    } else if (coin_balance === false) {
      qb.orderBy('user.coin_balance', 'ASC');
    }

    if (search) {
      qb.andWhere(
        `(user.phone ILIKE :search OR user.first_name ILIKE :search OR user.last_name ILIKE :search)`,
        {
          search: `%${search}%`,
        },
      );
    }

    qb.skip((page - 1) * limit).take(limit);

    const [users, total] = await qb.getManyAndCount();

    return {
      users,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  async findById(id: number) {
    return this.repository.findOne({ where: { id } });
  }

  async findByIdForAdmin(id: number) {
    return this.repository.findOne({
      where: {
        id,
      },
      relations: {
        orders: {
          items: {
            order_item_modifiers: {
              modifier: true,
            },
            product: true,
          },
          transactions: true,
          location: true,
        },
      },
    });
  }

  async findByAuthId(id: number) {
    const cacheUser = await this.userRedisService.getUserDetails(id);
    if (cacheUser) return cacheUser;
    const user = await this.repository.findOne({ where: { auth: { id } } });
    if (user) {
      await this.userRedisService.setUserDetails({ user, auth_id: id });
    }
    return user;
  }

  async create({
    phone,
    first_name,
    last_name,
  }: {
    phone: string;
    first_name?: string;
    last_name?: string;
  }) {
    const user = this.repository.create({ phone, first_name, last_name });
    const result = await this.repository.save(user);
    return result;
  }

  async update(
    auth_id: number,
    dto: UpdateUserDto & { image?: Express.Multer.File },
  ) {
    if (!auth_id) throw new UnauthorizedException('Tizimga qayta kiring!');

    const hasUpdateField =
      dto.image ||
      Object.values(dto).some((value) => value !== undefined && value !== null);

    if (!hasUpdateField) {
      throw new BadRequestException('Hech qanday maydon yuborilmadi!');
    }

    const user = await this.findByAuthId(auth_id);

    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi!');

    if (dto.image) {
      if (user.image) {
        await this.fileService.deleteFile(user.image);
      }

      user.image = await this.fileService.saveFile({
        file: dto.image,
        folder: FileFolderEnum.PROFILES,
      });
    }

    if (dto.first_name) user.first_name = dto.first_name;
    if (dto.last_name) user.last_name = dto.last_name;

    const result = await this.repository.save(user);
    await this.userRedisService.setUserDetails({ user: result, auth_id });
    return result;
  }

  async getStatsUsers() {
    const [statusStats, roleStats] = await Promise.all([
      this.repository
        .createQueryBuilder('user')
        .select('user.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('user.status')
        .getRawMany<{ status: AuthStatusEnum; count: string }>(),

      this.repository
        .createQueryBuilder('user')
        .select('user.role', 'role')
        .addSelect('COUNT(*)', 'count')
        .groupBy('user.role')
        .getRawMany<{
          role: AuthRoleEnum;
          count: string;
        }>(),
    ]);

    const getStatusCount = (status: AuthStatusEnum): number =>
      Number(statusStats.find((s) => s.status === status)?.count ?? 0);

    const getRoleCount = (role: AuthRoleEnum): number =>
      Number(roleStats.find((r) => r.role === role)?.count ?? 0);

    return {
      total_users: statusStats.reduce((sum, s) => sum + Number(s.count), 0),
      active_users: getStatusCount(AuthStatusEnum.ACTIVE),
      inactive_users: getStatusCount(AuthStatusEnum.BLOCK),
      deleted_users: getStatusCount(AuthStatusEnum.DELETED),
      account_deleted_users: getStatusCount(AuthStatusEnum.ACCOUNT_DELETED),
      admins_users: getRoleCount(AuthRoleEnum.SUPERADMIN),
      chef_users: getRoleCount(AuthRoleEnum.CHEF),
      users: getRoleCount(AuthRoleEnum.USER),
      waiter_users: getRoleCount(AuthRoleEnum.WAITER),
      delivery_users: getRoleCount(AuthRoleEnum.DELIVERY),
    };
  }
}

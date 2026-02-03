import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Location } from './location.entity';
import { Repository } from 'typeorm';
import { CreateLocationDto } from './dto/create-location.dto';
import { UserService } from '../user/user.service';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class LocationService {
  constructor(
    @InjectRepository(Location)
    private readonly repository: Repository<Location>,
    private readonly userService: UserService,
  ) {}

  async create(auth_id: number, dto: CreateLocationDto) {
    const existUser = await this.userService.findByAuthId(auth_id);
    if (!existUser) {
      throw new Error('Foydalanuvchi topilmadi!');
    }

    return this.repository.save({
      user_id: existUser.id,
      title: dto.title,
      address_line: dto.address_line,
      latitude: dto.latitude,
      longitude: dto.longitude,
    });
  }

  async update(
    { auth_id, location_id }: { auth_id: number; location_id: string },
    dto: UpdateLocationDto,
  ) {
    const location = await this.repository.findOne({
      where: { id: location_id },
      relations: {
        user: {
          auth: true,
        },
      },
    });

    if (!location) {
      throw new NotFoundException('Joylashuv topilmadi!');
    }

    if (auth_id !== location.user.auth.id)
      throw new ForbiddenException('Sizga ruxsat berilmagan!');

    if (dto.title) {
      location.title = dto.title;
    }

    if (dto.address_line) {
      location.address_line = dto.address_line;
    }

    if (dto.latitude) {
      location.latitude = dto.latitude;
    }

    if (dto.longitude) {
      location.longitude = dto.longitude;
    }

    return this.repository.save(location);
  }

  async findLocationsByAuthId(auth_id: number) {
    const user = await this.userService.findByAuthId(auth_id);
    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi!');
    }

    return this.repository.find({
      where: {
        user_id: user.id,
      },
    });
  }

  async deleteLocation({
    location_id,
    auth_id,
  }: {
    location_id: string;
    auth_id: number;
  }) {
    const existUser = await this.userService.findByAuthId(auth_id);

    if (!existUser) {
      throw new NotFoundException('Foydalanuvchi topilmadi!');
    }

    const location = await this.repository.findOne({
      where: { id: location_id },
      relations: {
        user: {
          auth: true,
        },
      },
    });

    if (!location) throw new NotFoundException('Joylashuv topilmadi!');

    if (existUser.id !== location.user.id)
      throw new ForbiddenException('Sizga ruxsat berilmagan!');

    return this.repository.delete(location_id);
  }

  async findLocationById(id: string) {
    return this.repository.findOne({ where: { id } });
  }
}

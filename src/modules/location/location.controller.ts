import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { LocationService } from './location.service';
import { type Request } from 'express';
import { CreateLocationDto } from './dto/create-location.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth('access_token')
@Controller('locations')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get('/my')
  @UseGuards(AuthGuard('jwt'))
  async findMyLocations(@Req() req: Request) {
    const auth = req.user as { id: number };
    return this.locationService.findLocationsByAuthId(auth.id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(@Req() req: Request, @Body() dto: CreateLocationDto) {
    const auth = req.user as { id: number };
    return this.locationService.create(auth.id, dto);
  }

  @Patch('/update/:id')
  @UseGuards(AuthGuard('jwt'))
  async update(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() dto: CreateLocationDto,
  ) {
    const auth = req.user as { id: number };
    return this.locationService.update(
      { location_id: id, auth_id: auth.id },
      dto,
    );
  }

  @Delete('/delete/:id')
  @UseGuards(AuthGuard('jwt'))
  async deleteLocation(@Param('id') id: string, @Req() req: Request) {
    const auth = req.user as { id: number };
    return this.locationService.deleteLocation({
      location_id: id,
      auth_id: auth.id,
    });
  }
}

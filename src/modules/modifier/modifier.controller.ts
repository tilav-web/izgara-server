import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ModifierService } from './modifier.service';
import { AuthGuard } from '@nestjs/passport';
import { AuthRoleGuard } from '../auth/guard/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthRoleEnum } from '../auth/enums/auth-role.enum';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FindAllModifierFilterDto } from './dto/find-all-filter.dto';
import { AuthStatusGuard } from '../auth/guard/status.guard';
import { UpdateModifierDto } from './dto/update-modifier.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Modifiers')
@Controller('modifiers')
export class ModifierController {
  constructor(private readonly modifierService: ModifierService) {}

  @Get('/')
  async findAllForAdmin(@Query() dto: FindAllModifierFilterDto) {
    return this.modifierService.findAll(dto);
  }

  @Get('/:id')
  async findById(@Param('id') id: string) {
    return this.modifierService.findById(id);
  }

  @Patch('/update/:id')
  @UseGuards(AuthGuard('jwt'), AuthRoleGuard, AuthStatusGuard)
  @Roles(AuthRoleEnum.SUPERADMIN)
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth('access_token')
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Param('id') id: string,
    @Body() body: UpdateModifierDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.modifierService.update(id, { ...body, image });
  }
}

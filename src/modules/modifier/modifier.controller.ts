import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ModifierService } from './modifier.service';
import { AuthGuard } from '@nestjs/passport';
import { AuthRoleGuard } from '../auth/guard/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthRoleEnum } from '../auth/enums/auth-role.enum';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FindAllModifierFilterDto } from './dto/find-all-filter.dto';
import { AuthStatusGuard } from '../auth/guard/status.guard';
import { UpdateModifierDto } from './dto/update-modifier.dto';

@ApiTags('Modifiers')
@Controller('modifiers')
export class ModifierController {
  constructor(private readonly modifierService: ModifierService) {}

  @Get('/admin/all')
  @UseGuards(AuthGuard('jwt'), AuthRoleGuard, AuthStatusGuard)
  @Roles(AuthRoleEnum.SUPERADMIN)
  @ApiBearerAuth('access_token')
  async findAllForAdmin(@Query() dto: FindAllModifierFilterDto) {
    return this.modifierService.findAll(dto, AuthRoleEnum.SUPERADMIN);
  }

  @Get('/:id')
  async findById(@Param('id') id: string) {
    return this.modifierService.findById(id);
  }

  @Patch('/update/:id')
  @UseGuards(AuthGuard('jwt'), AuthRoleGuard, AuthStatusGuard)
  @Roles(AuthRoleEnum.SUPERADMIN)
  @ApiBearerAuth('access_token')
  async update(@Param('id') id: string, @Body() body: UpdateModifierDto) {
    return this.modifierService.update(id, body);
  }
}

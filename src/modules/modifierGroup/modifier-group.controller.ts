import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ModifierGroupService } from './modifier-group.service';
import { AuthGuard } from '@nestjs/passport';
import { AuthRoleGuard } from '../auth/guard/role.guard';
import { AuthStatusGuard } from '../auth/guard/status.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthRoleEnum } from '../auth/enums/auth-role.enum';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FindAllModifierGroupFilterDto } from './dto/find-all-filter.dto';
import { UpdateModifierGroupDto } from './dto/update-modifier-group.dto';

@ApiTags('Modifier Groups')
@Controller('modifier-groups')
export class ModifierGroupController {
  constructor(private readonly modifierGroupService: ModifierGroupService) {}

  @Get('/')
  async findAllForAdmin(@Query() dto: FindAllModifierGroupFilterDto) {
    return this.modifierGroupService.findAll(dto, AuthRoleEnum.SUPERADMIN);
  }

  @Get('/:id')
  async findById(@Param('id') id: string) {
    return this.modifierGroupService.findById(id);
  }

  @Patch('/update/:id')
  @UseGuards(AuthGuard('jwt'), AuthRoleGuard, AuthStatusGuard)
  @Roles(AuthRoleEnum.SUPERADMIN)
  @ApiBearerAuth('access_token')
  async update(@Param('id') id: string, @Body() body: UpdateModifierGroupDto) {
    return this.modifierGroupService.update(id, body);
  }
}

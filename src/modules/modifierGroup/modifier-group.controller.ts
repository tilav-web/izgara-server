import { Controller } from '@nestjs/common';
import { ModifierGroupService } from './modifier-group.service';

@Controller('modifier-groups')
export class ModifierGroupController {
  constructor(private readonly modifierGroupService: ModifierGroupService) {}
}

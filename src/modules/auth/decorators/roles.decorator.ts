import { SetMetadata } from '@nestjs/common';
import { AuthRoleEnum } from '../enums/auth-role.enum';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: AuthRoleEnum[]) =>
  SetMetadata(ROLES_KEY, roles);

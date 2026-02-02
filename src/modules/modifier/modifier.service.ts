import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Modifier } from './modifier.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ModifierService {
  constructor(
    @InjectRepository(Modifier) private readonly modifier: Repository<Modifier>,
  ) {}
}

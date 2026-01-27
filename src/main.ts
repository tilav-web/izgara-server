import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SeedSuperAdminService } from './seed/seed.service';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const seedService = app.get(SeedSuperAdminService);
  await seedService.createSuperAdminNotExists();

  app.enableCors({
    origin: ['http://localhost:5173'],
  });

  app.use(cookieParser());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SeedSuperAdminService } from './seed/seed.service';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const seedService = app.get(SeedSuperAdminService);
  await seedService.createSuperAdminNotExists();

  //swagger config
  const config = new DocumentBuilder().setTitle("Izgara Api Docs").addBearerAuth({
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT'
  }, 'access_token').build()

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document);

  app.enableCors({
    origin: ['http://localhost:5173'],
  });

  app.use(cookieParser());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

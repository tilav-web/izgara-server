import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SeedSuperAdminService } from './seed/seed.service';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

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

  const allowedOrigins = process.env.CORS_ORIGINS?.split(',') ?? [];

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Not allowed by CORS ${origin}`));
      }
    },
    credentials: true
  });

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

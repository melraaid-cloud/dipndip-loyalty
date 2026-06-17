import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3000);
  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');

  app.use(helmet({
    contentSecurityPolicy: nodeEnv === 'production',
    crossOriginEmbedderPolicy: false,
  }));
  app.use(compression());

  app.enableCors({
    origin: nodeEnv === 'production'
      ? ['https://admin.dipndip.ly', 'https://dipndip.ly']
      : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.setGlobalPrefix('api/v1', {
    exclude: ['/join', '/join/(.*)', '/card/(.*)', '/admin', '/admin/(.*)'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(reflector), new RolesGuard(reflector));
  app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector));

  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('dipndip Libya Loyalty API')
      .setDescription('Complete Loyalty & Wallet Platform API Documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('Auth', 'Authentication & Authorization')
      .addTag('Customers', 'Customer Management')
      .addTag('Loyalty', 'Points & Rewards Engine')
      .addTag('Wallet', 'Apple & Google Wallet Passes')
      .addTag('Campaigns', 'Marketing Campaign Engine')
      .addTag('Analytics', 'Business Intelligence & Reporting')
      .addTag('Notifications', 'Push, Email & SMS Notifications')
      .addTag('Branches', 'Branch & Location Management')
      .addTag('Staff', 'Staff & Admin Management')
      .addTag('Rewards', 'Reward Catalog')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(port);
  console.log(`\n🍫 dipndip Libya Loyalty Platform`);
  console.log(`🚀 API running on: http://localhost:${port}/api/v1`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
  console.log(`🌍 Environment: ${nodeEnv}\n`);
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});

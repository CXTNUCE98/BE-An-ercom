import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Request, Response, Application } from 'express';

export function setupApp(app: INestApplication) {
  // Bật CORS
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Sử dụng ValidationPipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Cấu hình Swagger
  const config = new DocumentBuilder()
    .setTitle('An-ercom API')
    .setDescription('API cho hệ thống thương mại điện tử An-ercom (FE + Admin)')
    .setVersion('2.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  const expressApp = app.getHttpAdapter().getInstance() as Application;

  // Setup Swagger UI sử dụng CDN (cdnjs) để đảm bảo load resources ổn định trên Vercel
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'An-ercom API Docs',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-standalone-preset.min.js',
    ],
    customCssUrl: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.min.css',
    ],
  });

  // Endpoint Swagger JSON
  expressApp.get('/api-docs-json', (req: Request, res: Response) => {
    res.json(document);
  });
}

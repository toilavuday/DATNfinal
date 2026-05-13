import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  const config = new DocumentBuilder()
    .setTitle('Coffee Shop Management API')
    .setDescription('API documentation for the Coffee Shop Management System')
    .setVersion('1.0')
    .addTag('coffee')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3002;
  try {
    await app.listen(port);
    console.log(`Application is running on: http://localhost:${port}`);
    console.log(`Swagger docs: http://localhost:${port}/api`);
  } catch (err: any) {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Port ${port} is already in use!`);
      console.error(`   Run this to free it: Get-Process -Id (Get-NetTCPConnection -LocalPort ${port}).OwningProcess | Stop-Process -Force`);
      process.exit(1);
    }
    throw err;
  }
}
bootstrap();

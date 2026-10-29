import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestNodeApplication, NodeAdapter } from '@nestjs/platform-node';
import { AppModule } from './app.module.js';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create<NestNodeApplication>(
    AppModule,
    new NodeAdapter({ trustProxy: ['172.16.0.0/12', 'loopback'] }),
  );
  app.setGlobalPrefix('api');
  app.enableCors();
  app.enableShutdownHooks();

  const config = app.get(ConfigService);
  if (!config.get('NO_OPENAPI')) {
    const documentConfig = new DocumentBuilder()
      .setTitle('app')
      .setDescription('The app')
      .setVersion('1.0')
      .build();

    const document = SwaggerModule.createDocument(app, documentConfig);
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen(
    config.get<number>('port') || 3000,
    config.get<string>('host') || '::',
  );
}
bootstrap();

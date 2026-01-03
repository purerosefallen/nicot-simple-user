import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { loadConfig } from './utility/load-config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SimpleUserModule } from './simple-user/simple-user.module';
import { AppUser } from './app-user.entity';
import { ArticleService } from './article/article.service';
import { Article } from './article/article.entity';
import { ArticleController } from './article/article.controller';
import {
  UserLanguageModule,
  UserLanguageProvider,
} from './user-language/user-language.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [loadConfig],
      isGlobal: true,
      ignoreEnvVars: true,
      ignoreEnvFile: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        type: 'postgres',
        entities: [],
        autoLoadEntities: true,
        dropSchema: !!config.get('DB_DROP_SCHEMA'),
        synchronize: !config.get('DB_NO_INIT'),
        host: config.get('DB_HOST'),
        port: parseInt(config.get('DB_PORT')) || 5432,
        username: config.get('DB_USER'),
        password: config.get('DB_PASS'),
        database: config.get('DB_NAME'),
        supportBigNumbers: true,
        bigNumberStrings: false,
      }),
    }),
    TypeOrmModule.forFeature([Article]),
    SimpleUserModule.registerAsync({
      userClass: AppUser,
      imports: [UserLanguageModule],
      inject: [UserLanguageProvider.token],
      useFactory: async () => {
        return {
          sendCodeGenerator: (ctx) => {
            console.log(
              `Generating code for ${ctx.email} on ${ctx.codePurpose}`,
            );
            return '123456';
          },
        };
      },
    }),
  ],
  providers: [ArticleService],
  controllers: [ArticleController],
})
export class AppModule {}

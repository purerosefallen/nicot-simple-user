import { ConfigurableModuleBuilder } from '@nestjs/common';
import { SimpleUserExtraOptions, SimpleUserOptions } from './options';
import { SimpleUser } from './simple-user.entity';
import { OptionsExToken, UserRepoToken } from './tokens';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<SimpleUserOptions>()
    .setExtras<SimpleUserExtraOptions>(
      {
        userClass: SimpleUser,
        isGlobal: false,
      },
      (definition, extras) => {
        const typeormFeatModule = TypeOrmModule.forFeature(
          [extras.userClass],
          extras.userConnectionName,
        );
        return {
          ...definition,
          imports: [...(definition.imports || []), typeormFeatModule],
          providers: [
            ...(definition.providers || []),
            {
              provide: OptionsExToken,
              useValue: extras,
            },
            {
              provide: UserRepoToken,
              useExisting: getRepositoryToken(
                extras.userClass,
                extras.userConnectionName || undefined,
              ),
            },
          ],
          exports: [...(definition.exports || []), typeormFeatModule],
        };
      },
    )
    .build();

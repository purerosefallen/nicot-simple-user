import { DynamicModule, Module } from '@nestjs/common';
import { SimpleUserExtraOptions, SimpleUserOptions } from './options';
import { AragamiOptions } from 'aragami';
import { createProvider } from 'nicot';
import { MODULE_OPTIONS_TOKEN } from './module-builder';
import { AragamiModule } from 'nestjs-aragami';

@Module({})
class SimpleUserAragamiBridgeModule {}

function deriveAragamiOptions(o: SimpleUserOptions): AragamiOptions {
  return {
    ...(o.redisUrl ? { redis: { uri: o.redisUrl } } : {}),
    ...(o.aragamiExtras || {}),
  };
}

const ARAGAMI_OPTIONS = Symbol('ARAGAMI_OPTIONS');

export function attachAragamiWithBridge(
  base: DynamicModule,
  options: SimpleUserExtraOptions,
): DynamicModule {
  if (options.useExistingAragami) return base;
  const baseImports = base.imports ?? [];
  const baseProviders = base.providers ?? [];

  const bridge: DynamicModule = {
    module: SimpleUserAragamiBridgeModule,
    imports: baseImports,
    providers: [
      ...baseProviders,
      createProvider(
        {
          provide: ARAGAMI_OPTIONS,
          inject: [MODULE_OPTIONS_TOKEN],
        },
        (o: SimpleUserOptions) => deriveAragamiOptions(o),
      ),
    ],
    exports: [ARAGAMI_OPTIONS],
  };

  return {
    ...base,
    imports: [
      ...baseImports,
      bridge,
      AragamiModule.registerAsync({
        imports: [bridge],
        inject: [ARAGAMI_OPTIONS],
        useFactory: (aragamiOptions: AragamiOptions) => aragamiOptions,
      }),
    ],
    exports: [
      ...(base.exports || []),
      ...(options.reexportAragami ? [AragamiModule] : []),
    ],
  };
}

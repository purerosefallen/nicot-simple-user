import {
  DynamicModule,
  InjectionToken,
  Module,
  OptionalFactoryDependency,
} from '@nestjs/common';
import {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
} from './module-builder.js';
import { attachAragamiWithBridge } from './aragami-init.js';
import { SimpleUserService } from './simple-user/simple-user.service.js';
import { SendCodeService } from './send-code/send-code.service.js';
import { SendCodeController } from './send-code/send-code.controller.js';
import { LoginController } from './login/login.controller.js';
import { UserCenterController } from './user-center/user-center.controller.js';
import {
  userResolverProvider,
  userRiskControlResolverProvider,
} from './resolver.js';
import { OptionsExToken } from './tokens.js';
import { ValueProvider } from '@nestjs/common/interfaces/modules/provider.interface';
import { patchUserCenterControllerMe } from './user-center/patch-me.js';
import { addInjectionTokenMapping, ApiFromProvider } from 'nicot';
import { SimpleUserInitialCreationService } from './simple-user-initial-creation/simple-user-initial-creation.service.js';
import { SimpleUserI18nModule } from './i18n/i18n-init.js';
import { SimpleUserI18nSetupService } from './i18n/i18n-setup.service.js';
import { SimpleUserExtraOptions } from './options.js';

export type SimpleUserRegisterOptions = Parameters<
  typeof ConfigurableModuleClass.register
>[0];

export type SimpleUserRegisterAsyncOptions = Parameters<
  typeof ConfigurableModuleClass.registerAsync
>[0];

const patchUserCenterControllerMeWithDynamicModule = (
  module: DynamicModule,
) => {
  const userExProvider = module.providers?.find(
    (p: ValueProvider) => p.provide === OptionsExToken,
  ) as ValueProvider;
  if (userExProvider?.useValue) {
    patchUserCenterControllerMe(userExProvider.useValue);
  }
};

const controllers = [SendCodeController, LoginController, UserCenterController];

function attachI18n(
  base: DynamicModule,
  options: SimpleUserExtraOptions,
): DynamicModule {
  if (options.useExistingI18n) return base;
  return {
    ...base,
    imports: [...(base.imports || []), SimpleUserI18nModule],
  };
}

@Module({
  providers: [
    SimpleUserService,
    SendCodeService,
    userResolverProvider.provider,
    userRiskControlResolverProvider.provider,
    SimpleUserInitialCreationService,
    SimpleUserI18nSetupService,
  ],
  exports: [
    SimpleUserService,
    userResolverProvider.provider,
    userRiskControlResolverProvider.provider,
  ],
  controllers,
})
export class SimpleUserModule extends ConfigurableModuleClass {
  static register(options: SimpleUserRegisterOptions): DynamicModule {
    const base = super.register(options);
    patchUserCenterControllerMeWithDynamicModule(base);
    return attachI18n(attachAragamiWithBridge(base, options), options);
  }

  static registerAsync(options: SimpleUserRegisterAsyncOptions): DynamicModule {
    const base = super.registerAsync(options);
    patchUserCenterControllerMeWithDynamicModule(base);
    if (options.inject) {
      const normalizedInject = options.inject.map(
        (t) => ((t as OptionalFactoryDependency)?.token || t) as InjectionToken,
      );
      addInjectionTokenMapping(MODULE_OPTIONS_TOKEN, normalizedInject);
      for (const token of normalizedInject) {
        for (const controller of controllers) {
          ApiFromProvider(token)(controller);
        }
      }
    }
    return attachI18n(attachAragamiWithBridge(base, options), options);
  }
}

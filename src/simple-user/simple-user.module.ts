import {
  DynamicModule,
  InjectionToken,
  Module,
  OptionalFactoryDependency,
} from '@nestjs/common';
import {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
} from './module-builder';
import { attachAragamiWithBridge } from './aragami-init';
import { SimpleUserService } from './simple-user/simple-user.service';
import { SendCodeService } from './send-code/send-code.service';
import { SendCodeController } from './send-code/send-code.controller';
import { LoginController } from './login/login.controller';
import { UserCenterController } from './user-center/user-center.controller';
import {
  userResolverProvider,
  userRiskControlResolverProvider,
} from './resolver';
import { OptionsExToken } from './tokens';
import { ValueProvider } from '@nestjs/common/interfaces/modules/provider.interface';
import { patchUserCenterControllerMe } from './user-center/patch-me';
import { addInjectionTokenMapping, ApiFromProvider } from 'nicot';

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

@Module({
  providers: [
    SimpleUserService,
    SendCodeService,
    userResolverProvider.provider,
    userRiskControlResolverProvider.provider,
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
    return attachAragamiWithBridge(base, options.reexportAragami);
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
    return attachAragamiWithBridge(base, options.reexportAragami);
  }
}

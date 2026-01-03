import { DynamicModule, Module } from '@nestjs/common';
import { ConfigurableModuleClass } from './module-builder';
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

@Module({
  providers: [
    SimpleUserService,
    SendCodeService,
    userResolverProvider.provider,
    userRiskControlResolverProvider.provider,
  ],
  exports: [SimpleUserService],
  controllers: [SendCodeController, LoginController, UserCenterController],
})
export class SimpleUserModule extends ConfigurableModuleClass {
  static register(options: SimpleUserRegisterOptions): DynamicModule {
    const base = super.register(options);
    patchUserCenterControllerMeWithDynamicModule(base);
    return attachAragamiWithBridge(base);
  }

  static registerAsync(options: SimpleUserRegisterAsyncOptions): DynamicModule {
    const base = super.registerAsync(options);
    patchUserCenterControllerMeWithDynamicModule(base);
    return attachAragamiWithBridge(base);
  }
}

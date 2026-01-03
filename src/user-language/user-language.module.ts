import { Module } from '@nestjs/common';
import { ParamResolver } from 'nicot';

export const UserLanguageProvider = new ParamResolver({
  paramType: 'header',
  paramName: 'x-user-language',
}).toRequestScopedProvider();

@Module({
  providers: [UserLanguageProvider.provider],
  exports: [UserLanguageProvider.provider],
})
export class UserLanguageModule {}

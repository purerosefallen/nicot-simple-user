import { Injectable } from '@nestjs/common';
import { I18nService } from 'nesties';
import { SimpleUserI18nMiddleware } from './i18n-middleware.js';

@Injectable()
export class SimpleUserI18nSetupService {
  constructor(i18nService: I18nService) {
    i18nService.middleware(SimpleUserI18nMiddleware());
  }
}

import { I18nLookupMiddleware } from 'nesties';
import { SIMPLE_USER_I18N_DICT } from './i18n-dict.js';

export const SimpleUserI18nMiddleware = (): ReturnType<
  typeof I18nLookupMiddleware
> => I18nLookupMiddleware(SIMPLE_USER_I18N_DICT, { matchType: 'hierarchy' });

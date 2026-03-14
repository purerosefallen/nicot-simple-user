import { createI18n } from 'nesties';
import { SIMPLE_USER_LOCALES } from './i18n-dict';

const i18n = createI18n({
  locales: SIMPLE_USER_LOCALES,
  defaultLocale: 'en',
});

export const SimpleUserI18nModule = i18n.I18nModule;
export const UseI18n = i18n.UseI18n;
export const SimpleUserI18nParamResolver = i18n.I18nParamResolver;
export const SimpleUserI18nParamResolverProvider =
  i18n.I18nParamResolverProvider;

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { GenericReturnMessageDto } from 'nicot';
import { LoginResponseDto } from '../src/simple-user/simple-user/login.dto';
import { SIMPLE_USER_I18N_DICT } from '../src/simple-user/i18n/i18n-dict';

const dict = SIMPLE_USER_I18N_DICT;

describe('i18n (e2e)', () => {
  let app: INestApplication;
  let httpServer: any;

  const EMAIL_CODE = '123456';
  const SMS_CODE = '654321';

  const rand = Math.random().toString(16).slice(2);
  const email = `i18n_${rand}@example.com`;
  const mobile = `86 1380000${rand.slice(0, 4)}`;
  const ssaid = `ssaid_i18n_${rand}`;
  const password = `P@ss_${rand}`;

  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    httpServer = app.getHttpServer();

    await request(httpServer)
      .post('/send-code/send')
      .set('x-client-ssaid', ssaid)
      .send({ email, codePurpose: 'Login' });

    const res = await request(httpServer)
      .post('/login')
      .set('x-client-ssaid', ssaid)
      .send({ email, code: EMAIL_CODE, setPassword: password });

    token = (res.body as GenericReturnMessageDto<LoginResponseDto>).data.token;
  });

  afterAll(async () => {
    await app.close();
  });

  const lang = (req: request.Test, locale?: string) =>
    locale ? req.set('x-client-language', locale) : req;

  // ──────────────────────────────────────────────────────────
  // 403 Invalid password
  // ──────────────────────────────────────────────────────────

  describe('403 - invalid_password', () => {
    const makeRequest = (locale?: string) =>
      lang(
        request(httpServer)
          .post('/login')
          .set('x-client-ssaid', ssaid)
          .send({ email, password: 'WRONG_PASSWORD' }),
        locale,
      );

    it('default (en)', async () => {
      const res = await makeRequest().expect(403);
      expect(res.body.message).toBe(dict.en.invalid_password);
    });

    it('zh', async () => {
      const res = await makeRequest('zh').expect(403);
      expect(res.body.message).toBe(dict.zh.invalid_password);
    });

    it('zh-Hant', async () => {
      const res = await makeRequest('zh-Hant').expect(403);
      expect(res.body.message).toBe(dict['zh-Hant'].invalid_password);
    });

    it('ja', async () => {
      const res = await makeRequest('ja').expect(403);
      expect(res.body.message).toBe(dict.ja.invalid_password);
    });

    it('ko', async () => {
      const res = await makeRequest('ko').expect(403);
      expect(res.body.message).toBe(dict.ko.invalid_password);
    });

    it('unknown locale falls back to en', async () => {
      const res = await makeRequest('xx-YY').expect(403);
      expect(res.body.message).toBe(dict.en.invalid_password);
    });
  });

  // ──────────────────────────────────────────────────────────
  // 403 Invalid verification code
  // ──────────────────────────────────────────────────────────

  describe('403 - invalid_code', () => {
    beforeAll(async () => {
      await request(httpServer)
        .post('/send-code/send')
        .set('x-client-ssaid', ssaid)
        .send({ email, codePurpose: 'Login' });
    });

    const makeRequest = (locale?: string) =>
      lang(
        request(httpServer)
          .get('/send-code/verify')
          .query({ email, codePurpose: 'Login', code: '000000' }),
        locale,
      );

    it('default (en)', async () => {
      const res = await makeRequest().expect(403);
      expect(res.body.message).toBe(dict.en.invalid_code);
    });

    it('zh', async () => {
      const res = await makeRequest('zh').expect(403);
      expect(res.body.message).toBe(dict.zh.invalid_code);
    });

    it('fr', async () => {
      const res = await makeRequest('fr').expect(403);
      expect(res.body.message).toBe(dict.fr.invalid_code);
    });

    it('de', async () => {
      const res = await makeRequest('de').expect(403);
      expect(res.body.message).toBe(dict.de.invalid_code);
    });
  });

  // ──────────────────────────────────────────────────────────
  // 404 User does not exist (password login for unknown user)
  // ──────────────────────────────────────────────────────────

  describe('404 - user_not_exist_provide_code', () => {
    const nonExistentEmail = `nouser_${rand}@example.com`;

    const makeRequest = (locale?: string) =>
      lang(
        request(httpServer)
          .post('/login')
          .set('x-client-ssaid', `ssaid_nouser_${rand}`)
          .send({ email: nonExistentEmail, password: 'any' }),
        locale,
      );

    it('default (en)', async () => {
      const res = await makeRequest().expect(404);
      expect(res.body.message).toBe(dict.en.user_not_exist_provide_code);
    });

    it('zh', async () => {
      const res = await makeRequest('zh').expect(404);
      expect(res.body.message).toBe(dict.zh.user_not_exist_provide_code);
    });

    it('es', async () => {
      const res = await makeRequest('es').expect(404);
      expect(res.body.message).toBe(dict.es.user_not_exist_provide_code);
    });

    it('ru', async () => {
      const res = await makeRequest('ru').expect(404);
      expect(res.body.message).toBe(dict.ru.user_not_exist_provide_code);
    });
  });

  // ──────────────────────────────────────────────────────────
  // 403 Current password is incorrect
  // ──────────────────────────────────────────────────────────

  describe('403 - current_password_incorrect', () => {
    const makeRequest = (locale?: string) =>
      lang(
        request(httpServer)
          .post('/user-center/change-password')
          .set('x-client-ssaid', ssaid)
          .set('x-client-token', token)
          .send({ currentPassword: 'WRONG', newPassword: 'Whatever1!' }),
        locale,
      );

    it('default (en)', async () => {
      const res = await makeRequest().expect(403);
      expect(res.body.message).toBe(dict.en.current_password_incorrect);
    });

    it('zh', async () => {
      const res = await makeRequest('zh').expect(403);
      expect(res.body.message).toBe(dict.zh.current_password_incorrect);
    });

    it('zh-Hant', async () => {
      const res = await makeRequest('zh-Hant').expect(403);
      expect(res.body.message).toBe(
        dict['zh-Hant'].current_password_incorrect,
      );
    });

    it('tr', async () => {
      const res = await makeRequest('tr').expect(403);
      expect(res.body.message).toBe(dict.tr.current_password_incorrect);
    });
  });

  // ──────────────────────────────────────────────────────────
  // 200 success messages should NOT be translated
  // ──────────────────────────────────────────────────────────

  describe('200 success is not affected by i18n', () => {
    it('GET /user-center/me with zh should still return success', async () => {
      const res = await request(httpServer)
        .get('/user-center/me')
        .set('x-client-ssaid', ssaid)
        .set('x-client-token', token)
        .set('x-client-language', 'zh')
        .expect(200);

      expect(res.body.message).toBe('success');
    });
  });

  // ──────────────────────────────────────────────────────────
  // Hierarchy fallback
  // ──────────────────────────────────────────────────────────

  describe('hierarchy fallback', () => {
    const makeRequest = (locale: string) =>
      request(httpServer)
        .post('/login')
        .set('x-client-ssaid', ssaid)
        .set('x-client-language', locale)
        .send({ email, password: 'WRONG_PASSWORD' });

    it('zh-Hans-CN falls back to zh', async () => {
      const res = await makeRequest('zh-Hans-CN').expect(403);
      expect(res.body.message).toBe(dict.zh.invalid_password);
    });

    it('zh-TW falls back to zh', async () => {
      const res = await makeRequest('zh-TW').expect(403);
      expect(res.body.message).toBe(dict.zh.invalid_password);
    });
  });

  // ──────────────────────────────────────────────────────────
  // Mobile errors also translated
  // ──────────────────────────────────────────────────────────

  describe('mobile errors are also i18n-translated', () => {
    it('404 via mobile login (zh)', async () => {
      const res = await request(httpServer)
        .post('/login')
        .set('x-client-ssaid', `ssaid_mob_${rand}`)
        .set('x-client-language', 'zh')
        .send({ mobile: '86 19900000000', password: 'any' })
        .expect(404);

      expect(res.body.message).toBe(dict.zh.user_not_exist_provide_code);
    });

    it('403 invalid SMS code (ja)', async () => {
      await request(httpServer)
        .post('/send-code/send')
        .set('x-client-ssaid', ssaid)
        .send({ mobile, codePurpose: 'Login' });

      const res = await request(httpServer)
        .get('/send-code/verify')
        .query({ mobile, codePurpose: 'Login', code: '000000' })
        .set('x-client-language', 'ja')
        .expect(403);

      expect(res.body.message).toBe(dict.ja.invalid_code);
    });
  });
});

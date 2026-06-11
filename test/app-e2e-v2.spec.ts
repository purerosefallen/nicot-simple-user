import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { AppUser } from '../src/app-user.entity';
import { GenericReturnMessageDto } from 'nicot';
import { LoginResponseDto } from '../src/simple-user/simple-user/login.dto';

describe('SimpleUserModule v2 - mobile support (e2e)', () => {
  let app: INestApplication;
  let httpServer: any;

  const EMAIL_CODE = '123456';
  const SMS_CODE = '654321';

  const rand = Math.random().toString(16).slice(2);
  const email1 = `v2_${rand}@example.com`;
  const email2 = `v2b_${rand}@example.com`;
  const mobile1 = `86 1380000${rand.slice(0, 4)}`;
  const mobile2 = `86 1390000${rand.slice(0, 4)}`;

  const ssaid = `ssaid_v2_${rand}`;
  const ssaid2 = `ssaid_v2b_${rand}`;

  const password1 = `P@ss_${rand}_1`;
  const password2 = `P@ss_${rand}_2`;

  let token: string | undefined;
  let userId: number | undefined;

  let mobileToken: string | undefined;
  let mobileUserId: number | undefined;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    httpServer = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  function expectOkEnvelope(resBody: any) {
    expect(resBody).toHaveProperty('statusCode');
    expect(resBody).toHaveProperty('message');
    expect(resBody).toHaveProperty('success');
    expect(resBody).toHaveProperty('timestamp');
  }

  // ──────────────────────────────────────────────────────────
  // 1. Validation: must provide exactly one of email or mobile
  // ──────────────────────────────────────────────────────────

  describe('ContactDto validation', () => {
    it('should reject when neither email nor mobile is provided', async () => {
      const res = await request(httpServer)
        .get('/login/user-exists')
        .query({})
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });

    it('should reject when both email and mobile are provided', async () => {
      const res = await request(httpServer)
        .get('/login/user-exists')
        .query({ email: email1, mobile: mobile1 })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });

    it('should accept when only email is provided', async () => {
      const res = await request(httpServer)
        .get('/login/user-exists')
        .query({ email: email1 })
        .expect(200);

      expectOkEnvelope(res.body);
      expect(res.body.data.exists).toBe(false);
    });

    it('should accept when only mobile is provided', async () => {
      const res = await request(httpServer)
        .get('/login/user-exists')
        .query({ mobile: mobile1 })
        .expect(200);

      expectOkEnvelope(res.body);
      expect(res.body.data.exists).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────
  // 2. Mobile registration & login flow
  // ──────────────────────────────────────────────────────────

  describe('Mobile registration & login', () => {
    it('POST /send-code/send (mobile, Login) -> should succeed', async () => {
      const res = await request(httpServer)
        .post('/send-code/send')
        .set('x-client-ssaid', ssaid)
        .send({ mobile: mobile1, codePurpose: 'Login' })
        .expect(200);

      expectOkEnvelope(res.body);
    });

    it('GET /send-code/verify (mobile, Login) -> correct SMS code should pass; wrong code should 403', async () => {
      const ok = await request(httpServer)
        .get('/send-code/verify')
        .query({ mobile: mobile1, codePurpose: 'Login', code: SMS_CODE })
        .expect(200);

      expectOkEnvelope(ok.body);

      const bad = await request(httpServer)
        .get('/send-code/verify')
        .query({ mobile: mobile1, codePurpose: 'Login', code: '000000' })
        .expect(403);

      expectOkEnvelope(bad.body);
    });

    it('POST /login (mobile + code) -> should auto-create user & return token', async () => {
      const res = await request(httpServer)
        .post('/login')
        .set('x-client-ssaid', ssaid)
        .send({ mobile: mobile1, code: SMS_CODE })
        .expect(200);

      expectOkEnvelope(res.body);
      const data = (res.body as GenericReturnMessageDto<LoginResponseDto>).data;
      expect(data).toBeDefined();
      expect(typeof data.userId).toBe('number');
      expect(data.token).toHaveLength(64);

      mobileToken = data.token;
      mobileUserId = data.userId;
    });

    it('GET /login/user-exists (mobile) -> should be true after registration', async () => {
      const res = await request(httpServer)
        .get('/login/user-exists')
        .query({ mobile: mobile1 })
        .expect(200);

      expectOkEnvelope(res.body);
      expect(res.body.data.exists).toBe(true);
    });

    it('GET /user-center/me -> should show mobile, registered=true, no email', async () => {
      const res = await request(httpServer)
        .get('/user-center/me')
        .set('x-client-ssaid', ssaid)
        .set('x-client-token', mobileToken)
        .expect(200);

      expectOkEnvelope(res.body);
      const data = (res.body as GenericReturnMessageDto<AppUser>).data;
      expect(data.id).toBe(mobileUserId);
      expect(data.mobile).toBe(mobile1);
      expect(data.registered).toBe(true);
      expect(data.passwordSet).toBe(false);
      expect(data.email).toBeNull();
    });
  });

  // ──────────────────────────────────────────────────────────
  // 3. Mobile user: set password & login by password
  // ──────────────────────────────────────────────────────────

  describe('Mobile user: password flow', () => {
    it('POST /user-center/change-password -> set password for mobile user', async () => {
      const res = await request(httpServer)
        .post('/user-center/change-password')
        .set('x-client-ssaid', ssaid)
        .set('x-client-token', mobileToken)
        .send({ newPassword: password1 })
        .expect(200);

      expectOkEnvelope(res.body);

      // changePassword kicks sessions, re-login with mobile + password
      const loginOk = await request(httpServer)
        .post('/login')
        .set('x-client-ssaid', ssaid)
        .send({ mobile: mobile1, password: password1 })
        .expect(200);

      expectOkEnvelope(loginOk.body);
      const data = (loginOk.body as GenericReturnMessageDto<LoginResponseDto>)
        .data;
      expect(data.token).toHaveLength(64);
      mobileToken = data.token;
    });

    it('POST /login (mobile + wrong password) -> should 403', async () => {
      const res = await request(httpServer)
        .post('/login')
        .set('x-client-ssaid', ssaid)
        .send({ mobile: mobile1, password: 'WRONG' })
        .expect(403);

      expectOkEnvelope(res.body);
    });

    it('POST /login (mobile + only password, user not exist) -> should 404', async () => {
      const res = await request(httpServer)
        .post('/login')
        .set('x-client-ssaid', ssaid)
        .send({ mobile: '86 19999999999', password: password1 })
        .expect(404);

      expectOkEnvelope(res.body);
    });
  });

  // ──────────────────────────────────────────────────────────
  // 4. Change mobile
  // ──────────────────────────────────────────────────────────

  describe('Change mobile', () => {
    it('POST /send-code/send (ChangeMobile) -> should succeed', async () => {
      const res = await request(httpServer)
        .post('/send-code/send')
        .set('x-client-ssaid', ssaid)
        .send({ mobile: mobile2, codePurpose: 'ChangeMobile' })
        .expect(200);

      expectOkEnvelope(res.body);
    });

    it('POST /user-center/change-mobile -> should change mobile', async () => {
      const res = await request(httpServer)
        .post('/user-center/change-mobile')
        .set('x-client-ssaid', ssaid)
        .set('x-client-token', mobileToken)
        .send({ mobile: mobile2, code: SMS_CODE })
        .expect(200);

      expectOkEnvelope(res.body);
    });

    it('POST /login (old mobile + password) -> should 404 (no user with old mobile)', async () => {
      const res = await request(httpServer)
        .post('/login')
        .set('x-client-ssaid', ssaid)
        .send({ mobile: mobile1, password: password1 })
        .expect(404);

      expectOkEnvelope(res.body);
    });

    it('POST /login (new mobile + password) -> should succeed', async () => {
      const res = await request(httpServer)
        .post('/login')
        .set('x-client-ssaid', ssaid)
        .send({ mobile: mobile2, password: password1 })
        .expect(200);

      expectOkEnvelope(res.body);
      const data = (res.body as GenericReturnMessageDto<LoginResponseDto>).data;
      expect(data.token).toHaveLength(64);
      mobileToken = data.token;
    });
  });

  // ──────────────────────────────────────────────────────────
  // 5. Reset password via mobile
  // ──────────────────────────────────────────────────────────

  describe('Reset password via mobile', () => {
    it('POST /send-code/send (mobile, ResetPassword) -> should succeed', async () => {
      const res = await request(httpServer)
        .post('/send-code/send')
        .set('x-client-ssaid', ssaid)
        .send({ mobile: mobile2, codePurpose: 'ResetPassword' })
        .expect(200);

      expectOkEnvelope(res.body);
    });

    it('POST /login/reset-password (mobile) -> should reset password', async () => {
      const res = await request(httpServer)
        .post('/login/reset-password')
        .send({ mobile: mobile2, code: SMS_CODE, newPassword: password2 })
        .expect(200);

      expectOkEnvelope(res.body);
    });

    it('POST /login (mobile + old password) -> should 403', async () => {
      const res = await request(httpServer)
        .post('/login')
        .set('x-client-ssaid', ssaid)
        .send({ mobile: mobile2, password: password1 })
        .expect(403);

      expectOkEnvelope(res.body);
    });

    it('POST /login (mobile + new password) -> should succeed', async () => {
      const res = await request(httpServer)
        .post('/login')
        .set('x-client-ssaid', ssaid)
        .send({ mobile: mobile2, password: password2 })
        .expect(200);

      expectOkEnvelope(res.body);
      mobileToken = (res.body as GenericReturnMessageDto<LoginResponseDto>).data
        .token;
    });
  });

  // ──────────────────────────────────────────────────────────
  // 6. Unregister via mobile
  // ──────────────────────────────────────────────────────────

  describe('Unregister via mobile', () => {
    it('POST /user-center/unregister -> should revoke session', async () => {
      const res = await request(httpServer)
        .post('/user-center/unregister')
        .set('x-client-ssaid', ssaid)
        .set('x-client-token', mobileToken)
        .expect(200);

      expectOkEnvelope(res.body);

      const me = await request(httpServer)
        .get('/user-center/me')
        .set('x-client-ssaid', ssaid)
        .set('x-client-token', mobileToken);

      expect(me.status).toBe(401);
    });

    it('POST /login/unregister-with-code (mobile) -> should succeed', async () => {
      await request(httpServer)
        .post('/send-code/send')
        .set('x-client-ssaid', ssaid)
        .send({ mobile: mobile2, codePurpose: 'Unregister' })
        .expect(200);

      const res = await request(httpServer)
        .post('/login/unregister-with-code')
        .send({ mobile: mobile2, code: SMS_CODE })
        .expect(200);

      expectOkEnvelope(res.body);
    });
  });

  // ──────────────────────────────────────────────────────────
  // 7. Email registration with setPassword, then add mobile
  // ──────────────────────────────────────────────────────────

  describe('Email registration + add mobile (cross-contact)', () => {
    it('POST /login (email + code + setPassword) -> register with email', async () => {
      await request(httpServer)
        .post('/send-code/send')
        .set('x-client-ssaid', ssaid2)
        .send({ email: email1, codePurpose: 'Login' })
        .expect(200);

      const res = await request(httpServer)
        .post('/login')
        .set('x-client-ssaid', ssaid2)
        .send({ email: email1, code: EMAIL_CODE, setPassword: password1 })
        .expect(200);

      expectOkEnvelope(res.body);
      const data = (res.body as GenericReturnMessageDto<LoginResponseDto>).data;
      token = data.token;
      userId = data.userId;
    });

    it('GET /user-center/me -> should have email but no mobile', async () => {
      const res = await request(httpServer)
        .get('/user-center/me')
        .set('x-client-ssaid', ssaid2)
        .set('x-client-token', token)
        .expect(200);

      const data = (res.body as GenericReturnMessageDto<AppUser>).data;
      expect(data.email).toBe(email1);
      expect(data.mobile).toBeNull();
      expect(data.registered).toBe(true);
      expect(data.passwordSet).toBe(true);
    });

    it('POST /user-center/change-mobile -> add mobile to email user', async () => {
      await request(httpServer)
        .post('/send-code/send')
        .set('x-client-ssaid', ssaid2)
        .send({ mobile: mobile1, codePurpose: 'ChangeMobile' })
        .expect(200);

      const res = await request(httpServer)
        .post('/user-center/change-mobile')
        .set('x-client-ssaid', ssaid2)
        .set('x-client-token', token)
        .send({ mobile: mobile1, code: SMS_CODE })
        .expect(200);

      expectOkEnvelope(res.body);
    });

    it('GET /user-center/me -> should now have both email and mobile', async () => {
      const res = await request(httpServer)
        .get('/user-center/me')
        .set('x-client-ssaid', ssaid2)
        .set('x-client-token', token)
        .expect(200);

      const data = (res.body as GenericReturnMessageDto<AppUser>).data;
      expect(data.email).toBe(email1);
      expect(data.mobile).toBe(mobile1);
      expect(data.registered).toBe(true);
    });

    it('should be able to login with email + password', async () => {
      const res = await request(httpServer)
        .post('/login')
        .set('x-client-ssaid', ssaid2)
        .send({ email: email1, password: password1 })
        .expect(200);

      expectOkEnvelope(res.body);
    });

    it('should be able to login with mobile + password', async () => {
      const res = await request(httpServer)
        .post('/login')
        .set('x-client-ssaid', ssaid2)
        .send({ mobile: mobile1, password: password1 })
        .expect(200);

      expectOkEnvelope(res.body);
    });

    it('user-exists should return true for both email and mobile', async () => {
      const byEmail = await request(httpServer)
        .get('/login/user-exists')
        .query({ email: email1 })
        .expect(200);

      expect(byEmail.body.data.exists).toBe(true);

      const byMobile = await request(httpServer)
        .get('/login/user-exists')
        .query({ mobile: mobile1 })
        .expect(200);

      expect(byMobile.body.data.exists).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────
  // 8. Change email on a user that has both email + mobile
  // ──────────────────────────────────────────────────────────

  describe('Change email on dual-contact user', () => {
    it('POST /user-center/change-email -> change email', async () => {
      await request(httpServer)
        .post('/send-code/send')
        .set('x-client-ssaid', ssaid2)
        .send({ email: email2, codePurpose: 'ChangeEmail' })
        .expect(200);

      const res = await request(httpServer)
        .post('/user-center/change-email')
        .set('x-client-ssaid', ssaid2)
        .set('x-client-token', token)
        .send({ email: email2, code: EMAIL_CODE })
        .expect(200);

      expectOkEnvelope(res.body);
    });

    it('GET /user-center/me -> should show new email, same mobile', async () => {
      const res = await request(httpServer)
        .get('/user-center/me')
        .set('x-client-ssaid', ssaid2)
        .set('x-client-token', token)
        .expect(200);

      const data = (res.body as GenericReturnMessageDto<AppUser>).data;
      expect(data.email).toBe(email2);
      expect(data.mobile).toBe(mobile1);
    });

    it('login with old email should 404, new email should succeed', async () => {
      const oldFail = await request(httpServer)
        .post('/login')
        .set('x-client-ssaid', ssaid2)
        .send({ email: email1, password: password1 })
        .expect(404);

      expectOkEnvelope(oldFail.body);

      const newOk = await request(httpServer)
        .post('/login')
        .set('x-client-ssaid', ssaid2)
        .send({ email: email2, password: password1 })
        .expect(200);

      expectOkEnvelope(newOk.body);
    });

    it('login with mobile should still succeed', async () => {
      const res = await request(httpServer)
        .post('/login')
        .set('x-client-ssaid', ssaid2)
        .send({ mobile: mobile1, password: password1 })
        .expect(200);

      expectOkEnvelope(res.body);
      token = (res.body as GenericReturnMessageDto<LoginResponseDto>).data
        .token;
    });
  });

  // ──────────────────────────────────────────────────────────
  // 9. Reset password via mobile, verify email login also uses new password
  // ──────────────────────────────────────────────────────────

  describe('Reset password via mobile affects email login too', () => {
    it('reset password via mobile', async () => {
      await request(httpServer)
        .post('/send-code/send')
        .set('x-client-ssaid', ssaid2)
        .send({ mobile: mobile1, codePurpose: 'ResetPassword' })
        .expect(200);

      await request(httpServer)
        .post('/login/reset-password')
        .send({ mobile: mobile1, code: SMS_CODE, newPassword: password2 })
        .expect(200);
    });

    it('login with email + old password should 403', async () => {
      const res = await request(httpServer)
        .post('/login')
        .set('x-client-ssaid', ssaid2)
        .send({ email: email2, password: password1 })
        .expect(403);

      expectOkEnvelope(res.body);
    });

    it('login with email + new password should succeed', async () => {
      const res = await request(httpServer)
        .post('/login')
        .set('x-client-ssaid', ssaid2)
        .send({ email: email2, password: password2 })
        .expect(200);

      expectOkEnvelope(res.body);
    });

    it('login with mobile + new password should succeed', async () => {
      const res = await request(httpServer)
        .post('/login')
        .set('x-client-ssaid', ssaid2)
        .send({ mobile: mobile1, password: password2 })
        .expect(200);

      expectOkEnvelope(res.body);
      token = (res.body as GenericReturnMessageDto<LoginResponseDto>).data
        .token;
    });
  });

  // ──────────────────────────────────────────────────────────
  // 10. Unregister dual-contact user
  // ──────────────────────────────────────────────────────────

  describe('Unregister dual-contact user', () => {
    it('POST /user-center/unregister -> should revoke session', async () => {
      const res = await request(httpServer)
        .post('/user-center/unregister')
        .set('x-client-ssaid', ssaid2)
        .set('x-client-token', token)
        .expect(200);

      expectOkEnvelope(res.body);

      const me = await request(httpServer)
        .get('/user-center/me')
        .set('x-client-ssaid', ssaid2)
        .set('x-client-token', token);

      expect(me.status).toBe(401);
    });

    it('POST /login/unregister-with-code (email) -> should succeed on already unregistered', async () => {
      await request(httpServer)
        .post('/send-code/send')
        .set('x-client-ssaid', ssaid2)
        .send({ email: email2, codePurpose: 'Unregister' })
        .expect(200);

      const res = await request(httpServer)
        .post('/login/unregister-with-code')
        .send({ email: email2, code: EMAIL_CODE })
        .expect(200);

      expectOkEnvelope(res.body);
    });
  });
});

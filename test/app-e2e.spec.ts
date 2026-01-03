import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

type BlankReturnMessageDto = {
  statusCode: number;
  message: string;
  success: boolean;
  timestamp: string;
};

type ReturnMessage<T> = BlankReturnMessageDto & { data?: T };

type LoginResponseDto = {
  token: string;
  tokenExpiresAt: string;
  userId: number;
};

type SimpleUserResultDto = {
  id: number;
  email?: string;
  passwordSet: boolean;
};

describe('SimpleUserModule (e2e)', () => {
  let app: INestApplication;
  let httpServer: any;

  // 固定：测试模式下验证码永远是 123456
  const TEST_CODE = '123456';

  // 每次跑用不同邮箱，避免被数据库里历史数据影响
  const rand = Math.random().toString(16).slice(2);
  const email1 = `e2e_${rand}@example.com`;
  const email2 = `e2e2_${rand}@example.com`;

  // x-client-ssaid 是你体系里“客户端会话标识”
  const ssaid = `ssaid_e2e_${rand}`;

  // 密码在流程中会变
  const password1 = `P@ss_${rand}_1`;
  const password2 = `P@ss_${rand}_2`;

  let token: string | undefined;

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
    // 你的所有返回都有这些字段（BlankReturnMessageDto）
    expect(resBody).toHaveProperty('statusCode');
    expect(resBody).toHaveProperty('message');
    expect(resBody).toHaveProperty('success');
    expect(resBody).toHaveProperty('timestamp');
  }

  it('GET /login/user-exists -> should be false for a brand new email', async () => {
    const res = await request(httpServer)
      .get('/login/user-exists')
      .query({ email: email1 })
      .expect(200);

    expectOkEnvelope(res.body);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.exists).toBe(false);
  });

  it('POST /send-code/send (login) -> should succeed', async () => {
    const res = await request(httpServer)
      .post('/send-code/send')
      .set('x-client-ssaid', ssaid)
      .send({ email: email1, codePurpose: 'Login' })
      .expect(200);

    expectOkEnvelope(res.body);
  });

  it('GET /send-code/verify (login) -> correct code should pass; wrong code should 403', async () => {
    // 正确验证码
    const ok = await request(httpServer)
      .get('/send-code/verify')
      .query({ email: email1, codePurpose: 'Login', code: TEST_CODE })
      .expect(200);

    expectOkEnvelope(ok.body);

    // 错误验证码
    const bad = await request(httpServer)
      .get('/send-code/verify')
      .query({ email: email1, codePurpose: 'Login', code: '000000' })
      .expect(403);

    expectOkEnvelope(bad.body);
  });

  it('POST /login (code) -> should auto-create user & return token', async () => {
    const res = await request(httpServer)
      .post('/login')
      .set('x-client-ssaid', ssaid)
      .send({ email: email1, code: TEST_CODE })
      .expect(200);

    expectOkEnvelope(res.body);
    const data = (res.body as ReturnMessage<LoginResponseDto>).data;
    expect(data).toBeDefined();
    expect(typeof data.userId).toBe('number');
    expect(typeof data.token).toBe('string');
    expect(data.token).toHaveLength(64);

    token = data.token;
  });

  it('GET /user-center/me -> should return current user info', async () => {
    const res = await request(httpServer)
      .get('/user-center/me')
      .set('x-client-ssaid', ssaid)
      .set('x-client-token', token)
      .expect(200);

    expectOkEnvelope(res.body);
    const data = (res.body as ReturnMessage<SimpleUserResultDto>).data;
    expect(data).toBeDefined();
    expect(typeof data.id).toBe('number');
    // 刚用 email 登录，通常应该有 email
    expect(data.email).toBe(email1);
    expect(typeof data.passwordSet).toBe('boolean');
  });

  it('POST /user-center/change-password -> set password (first time) and then login by password', async () => {
    // 第一次设置密码：currentPassword 可能不需要（passwordSet=false 时）
    const setRes = await request(httpServer)
      .post('/user-center/change-password')
      .set('x-client-ssaid', ssaid)
      .set('x-client-token', token)
      .send({ newPassword: password1 })
      .expect(200);

    expectOkEnvelope(setRes.body);

    // 用密码登录成功
    const loginOk = await request(httpServer)
      .post('/login')
      .set('x-client-ssaid', ssaid)
      .send({ email: email1, password: password1 })
      .expect(200);

    expectOkEnvelope(loginOk.body);
    const data = (loginOk.body as ReturnMessage<LoginResponseDto>).data;
    expect(data.token).toHaveLength(64);

    // 用错密码应 403
    const loginBad = await request(httpServer)
      .post('/login')
      .set('x-client-ssaid', ssaid)
      .send({ email: email1, password: 'WRONG_PASSWORD' })
      .expect(403);

    expectOkEnvelope(loginBad.body);
  });

  it('POST /send-code/send (ChangeEmail) -> POST /user-center/change-email -> should change email', async () => {
    // 发给新邮箱的验证码（purpose 注意大小写：ChangeEmail）
    const send = await request(httpServer)
      .post('/send-code/send')
      .set('x-client-ssaid', ssaid)
      .send({ email: email2, codePurpose: 'ChangeEmail' })
      .expect(200);

    expectOkEnvelope(send.body);

    // 提交换绑
    const change = await request(httpServer)
      .post('/user-center/change-email')
      .set('x-client-ssaid', ssaid)
      .set('x-client-token', token)
      .send({ email: email2, code: TEST_CODE })
      .expect(200);

    expectOkEnvelope(change.body);

    // 用“新邮箱 + 旧密码”再次登录验证换绑生效
    const relogin = await request(httpServer)
      .post('/login')
      .set('x-client-ssaid', ssaid)
      .send({ email: email2, password: password1 })
      .expect(200);

    expectOkEnvelope(relogin.body);
    const data = (relogin.body as ReturnMessage<LoginResponseDto>).data;
    expect(data.token).toHaveLength(64);
  });

  it('POST /send-code/send (ResetPassword) -> POST /login/reset-password -> login with new password', async () => {
    // 发 reset code（purpose 注意大小写：ResetPassword）
    const send = await request(httpServer)
      .post('/send-code/send')
      .set('x-client-ssaid', ssaid)
      .send({ email: email2, codePurpose: 'ResetPassword' })
      .expect(200);

    expectOkEnvelope(send.body);

    // 重置密码
    const reset = await request(httpServer)
      .post('/login/reset-password')
      .send({ email: email2, code: TEST_CODE, newPassword: password2 })
      .expect(200);

    expectOkEnvelope(reset.body);

    // 老密码应失败
    const oldBad = await request(httpServer)
      .post('/login')
      .set('x-client-ssaid', ssaid)
      .send({ email: email2, password: password1 })
      .expect(403);

    expectOkEnvelope(oldBad.body);

    // 新密码应成功
    const newOk = await request(httpServer)
      .post('/login')
      .set('x-client-ssaid', ssaid)
      .send({ email: email2, password: password2 })
      .expect(200);

    expectOkEnvelope(newOk.body);
  });
});

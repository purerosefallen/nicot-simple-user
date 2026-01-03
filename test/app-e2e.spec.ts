import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { AppUser } from '../src/app-user.entity';
import { GenericReturnMessageDto } from 'nicot';
import { LoginResponseDto } from '../src/simple-user/simple-user/login.dto';

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

  type ArticleCreateResult = {
    id: number;
    title: string;
    content: string;
    userId: number;
  };

  type ArticleResult = ArticleCreateResult & {
    user?: {
      id: number;
      email?: string;
      passwordSet: boolean;
      age: number;
    };
  };

  let userId: number | undefined;
  let currentEmail = email1;

  let articleId: number | undefined;
  const articleTitle1 = `Hello_${rand}`;
  const articleTitle2 = `Hello2_${rand}`;
  const articleContent1 = `Content_${rand}`;
  const articleContent2 = `Content2_${rand}`;

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
    const data = (res.body as GenericReturnMessageDto<LoginResponseDto>).data;
    expect(data).toBeDefined();
    expect(typeof data.userId).toBe('number');
    expect(typeof data.token).toBe('string');
    expect(data.token).toHaveLength(64);

    token = data.token;
    userId = data.userId;
  });

  it('GET /user-center/me -> should return current user info', async () => {
    const res = await request(httpServer)
      .get('/user-center/me')
      .set('x-client-ssaid', ssaid)
      .set('x-client-token', token)
      .expect(200);

    expectOkEnvelope(res.body);
    const data = (res.body as GenericReturnMessageDto<AppUser>).data;
    expect(data).toBeDefined();
    expect(typeof data.id).toBe('number');
    // 刚用 email 登录，通常应该有 email
    expect(data.email).toBe(email1);
    expect(typeof data.passwordSet).toBe('boolean');
    expect(data.age).toBe(18); // from AppUser default
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
    const data = (loginOk.body as GenericReturnMessageDto<LoginResponseDto>)
      .data;
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

    currentEmail = email2;

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
    const data = (relogin.body as GenericReturnMessageDto<LoginResponseDto>)
      .data;
    expect(data.token).toHaveLength(64);
  });

  describe('Article (e2e)', () => {
    it('POST /article -> should create article and auto-bind userId (ignore body.userId)', async () => {
      expect(token).toBeDefined();
      expect(userId).toBeDefined();

      const res = await request(httpServer)
        .post('/article')
        .set('x-client-ssaid', ssaid)
        .set('x-client-token', token)
        .send({
          title: articleTitle1,
          content: articleContent1,
          // 故意注入：如果 binding 正常，这个不该生效
          userId: 999999999,
        })
        .expect(200);

      expectOkEnvelope(res.body);

      const data = (res.body as GenericReturnMessageDto<ArticleCreateResult>)
        .data;
      expect(data).toBeDefined();
      expect(typeof data.id).toBe('number');
      expect(data.title).toBe(articleTitle1);
      expect(data.content).toBe(articleContent1);

      // 核心：binding 自动绑定为当前登录用户
      expect(data.userId).toBe(userId);

      articleId = data.id;
    });

    it('GET /article/{id} -> should return article with user info and correct userId/email', async () => {
      expect(articleId).toBeDefined();

      const res = await request(httpServer)
        .get(`/article/${articleId}`)
        .set('x-client-ssaid', ssaid)
        .set('x-client-token', token)
        .expect(200);

      expectOkEnvelope(res.body);
      const data = (res.body as GenericReturnMessageDto<ArticleResult>).data;
      expect(data).toBeDefined();
      expect(data.id).toBe(articleId);
      expect(data.userId).toBe(userId);

      // 你的 schema 里 findOne 会带 user（ManyToOne + NotColumn），这里顺手断言一下
      expect(data.user).toBeDefined();
      expect(data.user.id).toBe(userId);
      // email 可能是可选字段，但你这里应该有（我们已经换绑过）
      expect(data.user.email).toBe(currentEmail);
    });

    it('GET /article -> should list articles and include the created one', async () => {
      expect(articleId).toBeDefined();

      const res = await request(httpServer)
        .get('/article')
        .set('x-client-ssaid', ssaid)
        .set('x-client-token', token)
        .query({ pageCount: 1, recordsPerPage: 10 })
        .expect(200);

      expectOkEnvelope(res.body);
      expect(typeof res.body.total).toBe('number');
      expect(Array.isArray(res.body.data)).toBe(true);

      const found = (res.body.data as ArticleCreateResult[]).find(
        (x) => x.id === articleId,
      );
      expect(found).toBeDefined();
      expect(found.userId).toBe(userId);
    });

    it('PATCH /article/{id} -> should update title/content', async () => {
      expect(articleId).toBeDefined();

      const patch = await request(httpServer)
        .patch(`/article/${articleId}`)
        .set('x-client-ssaid', ssaid)
        .set('x-client-token', token)
        .send({ title: articleTitle2, content: articleContent2 })
        .expect(200);

      expectOkEnvelope(patch.body);

      const after = await request(httpServer)
        .get(`/article/${articleId}`)
        .set('x-client-ssaid', ssaid)
        .set('x-client-token', token)
        .expect(200);

      expectOkEnvelope(after.body);
      const data = (after.body as GenericReturnMessageDto<ArticleResult>).data;
      expect(data.title).toBe(articleTitle2);
      expect(data.content).toBe(articleContent2);
    });

    it('DELETE /article/{id} -> should delete; then GET should 404', async () => {
      expect(articleId).toBeDefined();

      const del = await request(httpServer)
        .delete(`/article/${articleId}`)
        .set('x-client-ssaid', ssaid)
        .set('x-client-token', token)
        .expect(200);

      expectOkEnvelope(del.body);

      const gone = await request(httpServer)
        .get(`/article/${articleId}`)
        .set('x-client-ssaid', ssaid)
        .set('x-client-token', token);

      expect(gone.status).toBe(404);
      expectOkEnvelope(gone.body);
    });
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

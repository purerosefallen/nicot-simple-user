import { Test, TestingModule } from '@nestjs/testing';
import {
  SimpleUser,
  SimpleUserModule,
  SimpleUserService,
} from '../src/simple-user';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlankReturnMessageDto } from 'nicot';

describe('InitialUser', () => {
  it('should create an initial user successfully', async () => {
    const m1 = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          entities: [],
          autoLoadEntities: true,
          dropSchema: true,
          synchronize: true,
          host: '127.0.0.1',
          port: 5432,
          username: 'postgres',
          password: 'postgres',
          database: 'postgres',
        }),
        TypeOrmModule.forFeature([SimpleUser]),
        SimpleUserModule.register({
          sendCodeGenerator: () => {
            throw new BlankReturnMessageDto(500, 'Not implemented');
          },
          initialUser: [
            {
              email: 'nanahira@momobako.com',
              password: 'foo',
            },
            {
              email: 'yuzu@momobako.com',
              password: 'bar',
            },
          ],
        }),
      ],
    }).compile();

    const app1 = m1.createNestApplication();
    await app1.init();

    const s1 = app1.get(SimpleUserService);

    const login1 = await s1.login(
      {
        email: 'nanahira@momobako.com',
        password: 'foo',
      },
      {
        ssaid: 'test-agent',
        ip: '1.1.1.1',
      },
    );

    const userId1 = login1.data.userId;

    expect(login1.data.userId).toBeGreaterThan(0);

    const login2 = await s1.login(
      {
        email: 'yuzu@momobako.com',
        password: 'bar',
      },
      {
        ssaid: 'test-agent',
        ip: '1.1.1.1',
      },
    );

    expect(login2.data.userId).toBeGreaterThan(0);
  });
});

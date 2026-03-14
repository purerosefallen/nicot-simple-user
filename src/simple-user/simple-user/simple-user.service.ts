import { Inject, Injectable } from '@nestjs/common';
import {
  BlankReturnMessageDto,
  ClassType,
  CrudBase,
  CrudOptions,
  GenericReturnMessageDto,
} from 'nicot';
import { SimpleUser } from '../simple-user.entity';
import {
  FindOneOptions,
  FindOptionsWhere,
  IsNull,
  LessThanOrEqual,
  QueryDeepPartialEntity,
  Repository,
} from 'typeorm';
import { SimpleUserExtraOptions, SimpleUserOptions } from '../options';
import { MODULE_OPTIONS_TOKEN } from '../module-builder';
import { OptionsExToken, UserRepoToken } from '../tokens';
import { UserContext, UserRiskControlContext } from '../resolver';
import { InjectAragami } from 'nestjs-aragami';
import { Aragami, CacheKey } from 'aragami';
import { LoginDto, LoginResponseDto } from './login.dto';
import { SendCodeService } from '../send-code/send-code.service';
import { CodePurpose } from '../send-code/send-code.dto';
import cryptoRandomString from 'crypto-random-string';
import { WaitTimeDto } from '../send-code/wait-time.dto';
import { ChangeEmailDto } from './change-email.dto';
import { ChangeMobileDto } from './change-mobile.dto';
import { ChangePasswordDto } from './change-password.dto';
import { ResetPasswordDto } from './reset-password.dto';
import {
  ContactAndCodeDto,
  ContactDto,
  getContactKey,
} from './contact.dto';

class LoginSession {
  @CacheKey()
  token: string;
  userId: number;
}

class LoginSessionByContact {
  token: string;
  contactKey: string;

  @CacheKey()
  cacheKey() {
    return `${this.contactKey}:${this.token}`;
  }
}

class PasswordLoginFailAttempt {
  userId: number;
  ssaid: string;
  ip: string;
  time: Date;
}

@Injectable()
export class SimpleUserService<
  U extends SimpleUser = SimpleUser,
> extends CrudBase<U> {
  constructor(
    @Inject(UserRepoToken)
    repo: Repository<U>,
    @Inject(MODULE_OPTIONS_TOKEN)
    private options: SimpleUserOptions,
    @Inject(OptionsExToken)
    private optionsEx: SimpleUserExtraOptions,
    @InjectAragami() private aragami: Aragami,
    private sendCodeService: SendCodeService,
  ) {
    super(
      optionsEx.userClass as ClassType<U>,
      repo,
      (optionsEx.userServiceCrudExtras as CrudOptions<U>) || {},
    );
  }

  private getFindOptions() {
    /*
    const findOptions: FindOneOptions<U> = {
      select: this.repo.metadata.columns.map(
        (c) => c.propertyName,
      ) as unknown as (keyof U)[],
    };
    return findOptions;
     */
    // reserve for future customizations
    return {} as FindOneOptions<U>;
  }

  async findOrCreateUser(ctx: UserContext): Promise<U> {
    const after = async (user: U) => {
      user.lastActiveIpAddress = ctx.ip;
      user.lastActiveTime = new Date();
      await this.repo.update(
        {
          id: user.id,
        } as FindOptionsWhere<U>,
        {
          lastActiveIpAddress: user.lastActiveIpAddress,
          lastActiveTime: user.lastActiveTime,
          unregisterTime: null,
        } as Partial<U> as QueryDeepPartialEntity<U>,
      );
      const fn = this.options.afterPutUser || ((u) => u);
      const res = await fn(user);
      return (res || user) as U;
    };
    const findOptions = this.getFindOptions();
    if (ctx.token) {
      const throw401 = () => {
        throw new BlankReturnMessageDto(
          401,
          'Invalid user token',
        ).toException();
      };
      const session = await this.aragami.get(LoginSession, ctx.token);
      if (!session) {
        throw401();
      }
      const user = await this.repo.findOne({
        ...findOptions,
        where: { id: session.userId } as FindOptionsWhere<U>,
      });
      if (!user || this.isUserExpired(user)) {
        throw401();
      }
      return after(user);
    }
    if (
      this.options.allowAnonymousUsers === false &&
      !ctx.forceAllowAnonymous
    ) {
      throw new BlankReturnMessageDto(
        401,
        'User authentication required',
      ).toException();
    }

    const getExistingUser = (repo = this.repo) =>
      repo.findOne({
        ...findOptions,
        where: { ssaid: ctx.ssaid } as FindOptionsWhere<U>,
      });

    const existingUser = await getExistingUser();
    if (existingUser) {
      return after(existingUser);
    }
    const newUser = await this.aragami.lock(
      `simple_user_create_${ctx.ssaid}`,
      async () => {
        return this._mayBeTransaction(async (db, repo) => {
          const existingUserInTx = await getExistingUser(repo);
          if (existingUserInTx) {
            return existingUserInTx;
          }
          const newUser = new this.optionsEx.userClass() as U;
          newUser.ssaid = ctx.ssaid;
          return await repo.save(newUser);
        });
      },
    );
    return after(newUser);
  }

  async findUserWithId(id: number): Promise<U> {
    const findOptions = this.getFindOptions();
    const user = await this.repo.findOne({
      ...findOptions,
      where: { id } as FindOptionsWhere<U>,
    });
    if (!user || this.isUserExpired(user)) {
      throw new BlankReturnMessageDto(404, 'User not found.').toException();
    }
    return user;
  }

  private getContactWhere(dto: ContactDto) {
    return (
      dto.email ? { email: dto.email } : { mobile: dto.mobile }
    ) as FindOptionsWhere<U>;
  }

  async checkUserExists(dto: ContactDto) {
    const res = await this.repo.exists({
      where: this.getContactWhere(dto),
    });

    return new GenericReturnMessageDto(200, 'success', { exists: res });
  }

  private passwordMaxAttempts = this.options.passwordMaxAttempts ?? 5;
  private passwordBlockTimeMs =
    this.options.passwordBlockTimeMs ?? 15 * 60 * 1000;

  private async checkPasswordRiskControl(ctx: UserRiskControlContext, user: U) {
    const riskControlKeys = [
      `userId:${user.id}:`,
      `ssaid:${ctx.ssaid}:`,
      `ip:${ctx.ip}:`,
    ];
    if (this.passwordBlockTimeMs && this.passwordMaxAttempts) {
      const checks = await Promise.all(
        riskControlKeys.map(async (key) => {
          const records = await this.aragami.values(
            PasswordLoginFailAttempt,
            key,
          );
          if (records.length >= this.passwordMaxAttempts) {
            records.sort((a, b) => a.time.getTime() - b.time.getTime());
            const firstExceed = records[0];
            return (
              firstExceed.time.getTime() + this.passwordBlockTimeMs - Date.now()
            );
          }
          return undefined;
        }),
      );

      const hits = checks.filter((c) => c !== undefined);
      if (hits.length > 0) {
        const waitTimeMs = Math.max(...hits);
        const waitTimeDto = new WaitTimeDto();
        waitTimeDto.waitTimeMs = waitTimeMs;
        throw new GenericReturnMessageDto(
          429,
          'Too many failed password attempts. Please wait before retrying.',
          waitTimeDto,
        ).toException();
      }
    }
  }

  private async recordPasswordFailAttempt(
    ctx: UserRiskControlContext,
    user: U,
  ) {
    const riskControlKeys = [
      `userId:${user.id}:`,
      `ssaid:${ctx.ssaid}:`,
      `ip:${ctx.ip}:`,
    ];
    if (this.passwordBlockTimeMs && this.passwordMaxAttempts) {
      const failAttempt = new PasswordLoginFailAttempt();
      failAttempt.userId = user.id;
      failAttempt.ssaid = ctx.ssaid;
      failAttempt.ip = ctx.ip;
      failAttempt.time = new Date();
      await Promise.all(
        riskControlKeys.map((key) =>
          this.aragami.set(failAttempt, {
            key,
            ttl: this.passwordBlockTimeMs,
          }),
        ),
      );
    }
  }

  private unregisterWaitTimeMs =
    this.options.unregisterWaitTimeMs ?? 30 * 24 * 60 * 60 * 1000;

  private getUnregisterTimeCondition() {
    return {
      unregisterTime: LessThanOrEqual(
        new Date(Date.now() - this.unregisterWaitTimeMs),
      ),
    } as FindOptionsWhere<U>;
  }

  private isUserExpired(user: U) {
    return (
      user?.unregisterTime &&
      user.unregisterTime.getTime() + this.unregisterWaitTimeMs < Date.now()
    );
  }

  async login(dto: LoginDto, ctx: UserRiskControlContext) {
    if (!dto.code && !dto.password) {
      throw new BlankReturnMessageDto(
        400,
        'Please provide code or password to login.',
      ).toException();
    }

    const contactWhere = this.getContactWhere(dto);

    let user = await this.repo.findOne({
      ...this.getFindOptions(),
      where: contactWhere,
    });

    if (this.isUserExpired(user)) {
      user = undefined;
    }

    const anonymousUser = await this.findOrCreateUser({
      ssaid: ctx.ssaid,
      ip: ctx.ip,
      token: undefined,
      forceAllowAnonymous: true,
    });

    const verifyCode = () =>
      this.sendCodeService.verifyCode({
        ...(dto.email ? { email: dto.email } : { mobile: dto.mobile }),
        code: dto.code,
        codePurpose: CodePurpose.Login,
      });

    if (user) {
      // existing
      if (dto.code) {
        await verifyCode();
      } else if (dto.password) {
        await this.checkPasswordRiskControl(ctx, user);
        const passwordValid = await user.checkPassword(dto.password);
        if (!passwordValid) {
          await this.recordPasswordFailAttempt(ctx, user);
          throw new BlankReturnMessageDto(
            403,
            'Invalid password.',
          ).toException();
        }
      } else {
        // in fact unreachable, but for type safety
        throw new BlankReturnMessageDto(
          400,
          'Please provide code or password to login.',
        ).toException();
      }
      if (user.unregisterTime) {
        // clean up unregisterTime to recover user
        await this.repo.update(
          {
            id: user.id,
          } as FindOptionsWhere<U>,
          {
            unregisterTime: null,
          } as Partial<U> as QueryDeepPartialEntity<U>,
        );
      }
      await this.options.onMigrateUser?.(anonymousUser, user);
      return this.issueTokenForUser(user, ctx);
    } else {
      // new user
      if (!dto.code) {
        throw new BlankReturnMessageDto(
          404,
          'User does not exist. Please provide code to create new user.',
        ).toException();
      }
      await verifyCode();
      if (dto.setPassword) {
        await anonymousUser.setPassword(dto.setPassword);
      }
      const contactFields = dto.email
        ? { email: dto.email }
        : { mobile: dto.mobile };
      await this._mayBeTransaction(async (db, repo) => {
        // clean up old unregistered users with the same contact
        await repo.delete({
          ...contactFields,
          unregisterTime: LessThanOrEqual(
            new Date(Date.now() - this.unregisterWaitTimeMs),
          ),
        } as FindOptionsWhere<U>);
        await repo.update(
          {
            id: anonymousUser.id,
          } as FindOptionsWhere<U>,
          {
            ...contactFields,
            ...(dto.setPassword
              ? { passwordHash: anonymousUser.passwordHash }
              : {}),
            ssaid: null,
            registerIpAddress: ctx.ip,
            registerTime: new Date(),
            unregisterTime: null, // in case of recovering unregistered user
          } as Partial<U> as QueryDeepPartialEntity<U>,
        );
      });
      if (dto.email) anonymousUser.email = dto.email;
      if (dto.mobile) anonymousUser.mobile = dto.mobile;
      return this.issueTokenForUser(anonymousUser, ctx);
    }
  }

  async changeEmail(user: U, dto: ChangeEmailDto) {
    if (!user.isRegistered()) {
      throw new BlankReturnMessageDto(
        402,
        'Not allowed to change email for anonymous user.',
      ).toException();
    }
    await this.sendCodeService.verifyCode({
      email: dto.email,
      code: dto.code,
      codePurpose: CodePurpose.ChangeEmail,
    });
    await this.repo.update(
      {
        id: user.id,
      } as FindOptionsWhere<U>,
      {
        email: dto.email,
      } as Partial<U> as QueryDeepPartialEntity<U>,
    );
    return new BlankReturnMessageDto(200, 'success');
  }

  async changeMobile(user: U, dto: ChangeMobileDto) {
    if (!user.isRegistered()) {
      throw new BlankReturnMessageDto(
        402,
        'Not allowed to change mobile for anonymous user.',
      ).toException();
    }
    await this.sendCodeService.verifyCode({
      mobile: dto.mobile,
      code: dto.code,
      codePurpose: CodePurpose.ChangeMobile,
    });
    await this.repo.update(
      {
        id: user.id,
      } as FindOptionsWhere<U>,
      {
        mobile: dto.mobile,
      } as Partial<U> as QueryDeepPartialEntity<U>,
    );
    return new BlankReturnMessageDto(200, 'success');
  }

  async issueTokenForUser(user: U, ctx: UserRiskControlContext) {
    await this.repo.update(
      {
        id: user.id,
      } as FindOptionsWhere<U>,
      {
        loginIpAddress: ctx.ip,
        loginTime: new Date(),
      } as Partial<U> as QueryDeepPartialEntity<U>,
    );
    const token = cryptoRandomString({
      length: 64,
      type: 'alphanumeric',
    });
    const session = new LoginSession();
    session.token = token;
    session.userId = user.id;
    const loginExpiryTimeMs =
      this.options.loginExpiryTimeMs ?? 30 * 24 * 60 * 60 * 1000;
    await this.aragami.set(session, {
      ttl: loginExpiryTimeMs,
    });
    const contactKeys: string[] = [];
    if (user.email) contactKeys.push(`email:${user.email}`);
    if (user.mobile) contactKeys.push(`mobile:${user.mobile}`);
    await Promise.all(
      contactKeys.map((contactKey) =>
        this.aragami.set(
          LoginSessionByContact,
          {
            token: token,
            contactKey: contactKey,
          },
          {
            ttl: loginExpiryTimeMs,
          },
        ),
      ),
    );
    const res = new LoginResponseDto();
    res.token = token;
    res.tokenExpiresAt = loginExpiryTimeMs
      ? new Date(Date.now() + loginExpiryTimeMs)
      : new Date(8640000000000000);
    res.userId = user.id;
    return new GenericReturnMessageDto(200, 'success', res);
  }

  private async kickByContactKey(contactKey: string) {
    const allSessions = await this.aragami.values(
      LoginSessionByContact,
      `${contactKey}:`,
    );
    await Promise.all(
      allSessions.map((s) => this.aragami.del(LoginSession, s.token)),
    );
    await this.aragami.clear(LoginSessionByContact, `${contactKey}:`);
  }

  async kickUser(user: U) {
    const promises: Promise<void>[] = [];
    if (user.email)
      promises.push(this.kickByContactKey(`email:${user.email}`));
    if (user.mobile)
      promises.push(this.kickByContactKey(`mobile:${user.mobile}`));
    await Promise.all(promises);
  }

  async changePassword(
    user: U,
    dto: ChangePasswordDto,
    ctx: UserRiskControlContext,
  ) {
    if (!user.isRegistered()) {
      throw new BlankReturnMessageDto(
        402,
        'Not allowed to change password for anonymous user.',
      ).toException();
    }
    if (user.passwordHash) {
      await this.checkPasswordRiskControl(ctx, user);
      const valid = await user.checkPassword(dto.currentPassword);
      if (!valid) {
        await this.recordPasswordFailAttempt(ctx, user);
        throw new BlankReturnMessageDto(
          403,
          'Current password is incorrect.',
        ).toException();
      }
    }
    await user.setPassword(dto.newPassword);
    await this.repo.update(
      {
        id: user.id,
      } as FindOptionsWhere<U>,
      {
        passwordHash: user.passwordHash,
      } as Partial<U> as QueryDeepPartialEntity<U>,
    );
    await this.kickUser(user);
    return new BlankReturnMessageDto(200, 'success');
  }

  async resetPassword(dto: ResetPasswordDto) {
    await this.sendCodeService.verifyCode({
      ...(dto.email ? { email: dto.email } : { mobile: dto.mobile }),
      code: dto.code,
      codePurpose: CodePurpose.ResetPassword,
    });

    const dummyUser = new this.optionsEx.userClass() as U;
    await dummyUser.setPassword(dto.newPassword);

    const contactWhere = this.getContactWhere(dto);
    await this.repo.update(contactWhere, {
      passwordHash: dummyUser.passwordHash,
    } as Partial<U> as QueryDeepPartialEntity<U>);
    await this.kickByContactKey(getContactKey(dto));
    return new BlankReturnMessageDto(200, 'success');
  }

  async unregister(user: U, tdb = this.repo.manager) {
    return this._mayBeTransaction(async (db, repo) => {
      user.unregisterTime = new Date();
      await repo.update(
        {
          id: user.id,
        } as FindOptionsWhere<U>,
        {
          unregisterTime: user.unregisterTime,
        } as Partial<U> as QueryDeepPartialEntity<U>,
      );
      await this.kickUser(user);
      await this.options.onUnregisterUser?.(user, tdb);
      return new BlankReturnMessageDto(200, 'success');
    }, tdb);
  }

  async unregisterWithCode(dto: ContactAndCodeDto) {
    await this.sendCodeService.verifyCode({
      ...(dto.email ? { email: dto.email } : { mobile: dto.mobile }),
      code: dto.code,
      codePurpose: CodePurpose.Unregister,
    });
    return this._mayBeTransaction(async (db, repo) => {
      const user = await repo.findOne({
        where: {
          ...this.getContactWhere(dto),
          unregisterTime: IsNull(),
        } as FindOptionsWhere<U>,
      });
      if (!user) {
        // this is already unregistered or not exist, so we silently return success
        return new BlankReturnMessageDto(200, 'success');
      }
      return this.unregister(user, db);
    });
  }
}

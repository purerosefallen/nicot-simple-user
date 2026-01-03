import { ConsoleLogger, Inject, Injectable } from '@nestjs/common';
import { MODULE_OPTIONS_TOKEN } from '../module-builder';
import { SimpleUserOptions } from '../options';
import { CodePurpose, SendCodeDto } from './send-code.dto';
import { Aragami, CacheKey } from 'aragami';
import { InjectAragami } from 'nestjs-aragami';
import { GenericReturnMessageDto } from 'nicot';
import { WaitTimeDto } from './wait-time.dto';
import { BlankReturnMessageDto } from 'nicot';
import { CodeContext } from './code-context';
import { UserRiskControlContext } from '../resolver';

const buildSendCodeCacheKey = (ctx: {
  email: string;
  codePurpose: CodePurpose;
}) => `email:${ctx.email}:${ctx.codePurpose}`;

class SendCodeRecord extends SendCodeDto {
  sentTime: Date;
  code: string;

  @CacheKey()
  get cacheKey() {
    return buildSendCodeCacheKey(this);
  }
}

class VerifyCodeAttemptRecord extends SendCodeDto {
  time: Date;

  @CacheKey()
  get cacheKey() {
    return buildSendCodeCacheKey(this) + `:attempts:${this.time.getTime()}`;
  }
}

@Injectable()
export class SendCodeService {
  constructor(
    @Inject(MODULE_OPTIONS_TOKEN) private options: SimpleUserOptions,
    @InjectAragami() private aragami: Aragami,
  ) {}

  private logger = new ConsoleLogger('SendCodeService');

  private sendCodeValidTimeMs =
    this.options.sendCodeValidTimeMs || 10 * 60 * 1000; // default: 10 minutes
  private sendCodeCooldownTimeMs =
    this.options.sendCodeCooldownTimeMs || 60 * 1000; // default: 1 minute

  async sendCode(dto: SendCodeDto, riskControlContext: UserRiskControlContext) {
    const riskControlKeys = [
      `ip:${riskControlContext.ip}:${dto.codePurpose}`,
      `ssaid:${riskControlContext.ssaid}:${dto.codePurpose}`,
    ];
    if (this.sendCodeCooldownTimeMs) {
      const cooldownChecks = await Promise.all(
        [buildSendCodeCacheKey(dto), ...riskControlKeys].map(async (key) => {
          const existing = await this.aragami.get(SendCodeRecord, key);
          if (existing) {
            const elapsed = Date.now() - existing.sentTime.getTime();
            if (elapsed < this.sendCodeCooldownTimeMs) {
              return this.sendCodeCooldownTimeMs - elapsed;
            }
          }
        }),
      );
      const hitChecks = cooldownChecks.filter((s) => !!s);
      if (hitChecks.length > 0) {
        const waitTimeMs = Math.max(...hitChecks);
        const waitTimeDto = new WaitTimeDto();
        waitTimeDto.waitTimeMs = waitTimeMs;
        throw new GenericReturnMessageDto(
          429,
          'Please wait before requesting another code',
          waitTimeDto,
        ).toException();
      }
    }
    if (!this.options.sendCodeGenerator) {
      throw new BlankReturnMessageDto(
        501,
        'Send code generator not configured',
      ).toException();
    }
    try {
      const code = await this.options.sendCodeGenerator(dto);
      const record = new SendCodeRecord();
      record.email = dto.email;
      record.codePurpose = dto.codePurpose;
      record.code = code;
      record.sentTime = new Date();
      await this.aragami.set(record, {
        ttl: this.sendCodeValidTimeMs,
      });
      if (this.sendCodeCooldownTimeMs) {
        await Promise.all(
          riskControlKeys.map((key) =>
            this.aragami.set(record, {
              ttl: this.sendCodeCooldownTimeMs,
              key,
            }),
          ),
        );
      }
      return new BlankReturnMessageDto(200, 'success');
    } catch (e) {
      this.logger.error(
        `Failed to send code to ${dto.email} for purpose ${dto.codePurpose}: ${e}`,
      );
      throw new GenericReturnMessageDto(
        501,
        'Failed to send code',
      ).toException();
    }
  }

  private verifyCodeMaxAttempts = this.options.verifyCodeMaxAttempts || 5; // default: 5
  private verifyCodeBlockTimeMs =
    this.options.verifyCodeBlockTimeMs || 15 * 60 * 1000; // default: 15 minutes

  async verifyCode(dto: CodeContext, noConsume = false) {
    const key = buildSendCodeCacheKey(dto);
    if (this.verifyCodeMaxAttempts && this.verifyCodeBlockTimeMs) {
      const tries = await this.aragami.values(
        VerifyCodeAttemptRecord,
        key + ':attempts:',
      );
      if (tries.length >= this.verifyCodeMaxAttempts) {
        tries.sort((a, b) => a.time.getTime() - b.time.getTime());
        const firstExceed = tries[0];
        const waitTimeMs =
          firstExceed.time.getTime() + this.verifyCodeBlockTimeMs - Date.now();
        const waitTimeDto = new WaitTimeDto();
        waitTimeDto.waitTimeMs = waitTimeMs;
        throw new GenericReturnMessageDto(
          429,
          'Too many invalid code attempts, please try again later',
          waitTimeDto,
        ).toException();
      }
    }
    const record = await this.aragami.get(SendCodeRecord, key);
    if (!record || record.code !== dto.code) {
      if (this.verifyCodeMaxAttempts && this.verifyCodeBlockTimeMs) {
        const attemptRecord = new VerifyCodeAttemptRecord();
        attemptRecord.email = dto.email;
        attemptRecord.codePurpose = dto.codePurpose;
        attemptRecord.time = new Date();
        await this.aragami.set(attemptRecord, {
          ttl: this.verifyCodeBlockTimeMs,
        });
      }
      throw new BlankReturnMessageDto(403, 'Invalid email code').toException();
    }
    // this is success route
    if (!noConsume) {
      await this.aragami.del(SendCodeRecord, key);
    }
    await this.aragami.clear(VerifyCodeAttemptRecord, key);
    return new BlankReturnMessageDto(200, 'success');
  }
}

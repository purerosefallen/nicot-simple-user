import { AragamiOptions, Awaitable } from 'aragami';
import { ClassType } from 'nicot';
import { SimpleUser } from './simple-user.entity';
import { CrudOptions } from 'nicot';
import { SendCodeDto } from './send-code/send-code.dto';

export interface SimpleUserExtraOptions {
  userClass?: ClassType<SimpleUser>;
  userServiceCrudExtras?: CrudOptions<SimpleUser>;
  userConnectionName?: string;
  isGlobal?: boolean;
  reexportAragami?: boolean;
  useExistingAragami?: boolean;
}

export interface SimpleUserOptions {
  allowAnonymousUsers?: boolean; // default: true
  redisUrl?: string;
  aragamiExtras?: AragamiOptions;
  loginExpiryTimeMs?: number; // default: 30 days
  afterPutUser?: (user: SimpleUser) => Awaitable<SimpleUser | undefined>;
  sendCodeGenerator: (ctx: SendCodeDto) => Awaitable<string>;
  sendCodeValidTimeMs?: number; // default: 10 minutes
  sendCodeCooldownTimeMs?: number; // default: 1 minute
  verifyCodeMaxAttempts?: number; // default: 5
  verifyCodeBlockTimeMs?: number; // default: 15 minutes
  passwordMaxAttempts?: number; // default: 5
  passwordBlockTimeMs?: number; // default: 15 minutes
  onMigrateUser?: (oldUser: SimpleUser, newUser: SimpleUser) => Awaitable<void>;
}

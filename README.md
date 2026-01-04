# nicot-simple-user

`nicot-simple-user` is a configurable NestJS feature module that provides a complete “simple user system”:

- Anonymous users (keyed by `x-client-ssaid`)
- Email verification codes (send + verify)
- Login with code or password (auto-create on first code login)
- Server-side sessions (Redis/Aragami), revocable instantly (no JWT)
- Built-in risk control (cooldown, attempt limits, temporary blocks)
- Swagger/OpenAPI schemas patched dynamically based on your configured `userClass`

This is a **library module** meant to be imported into an existing NestJS application.

It is built on top of **nicot** and follows nicot’s entity/DTO conventions.  
nicot (npm): https://www.npmjs.com/package/nicot

---

## Peer Dependencies

`nicot-simple-user` expects the following peer dependencies:

```json
"peerDependencies": {
  "@nestjs/common": "^11.0.1",
  "@nestjs/core": "^11.0.1",
  "@nestjs/swagger": "^11.2.3",
  "@nestjs/typeorm": "^11.0.0",
  "class-transformer": "^0.5.1",
  "class-validator": "^0.14.3",
  "nicot": "^1.3.1",
  "typeorm": "^0.3.28"
}
```

> Most NestJS apps already have `@nestjs/common` and `@nestjs/core` installed.

---

## Installation

Install `nicot-simple-user` plus its peer dependencies (no version pin needed here):

```shell
# pnpm
pnpm add nicot-simple-user \
  @nestjs/swagger @nestjs/typeorm \
  class-transformer class-validator \
  nicot typeorm

# npm
npm i nicot-simple-user \
  @nestjs/swagger @nestjs/typeorm \
  class-transformer class-validator \
  nicot typeorm

# yarn
yarn add nicot-simple-user \
  @nestjs/swagger @nestjs/typeorm \
  class-transformer class-validator \
  nicot typeorm
```

You also need:
- a working TypeORM setup in your Nest app
- a Redis-compatible backend for Aragami sessions/risk-control (usually Redis)

---

## Quick Start (Recommended: `registerAsync`)

### Why `registerAsync`?

`nicot-simple-user` supports dynamic module configuration. The recommended approach is to use `registerAsync` so you can:

- read config from `@nestjs/config`
- import your own delivery module (SMTP/SMS/etc.)
- inject dependencies into `sendCodeGenerator`

> API note: `register()` and `registerAsync()` each take **one parameter only**.
>
> - `register()` takes a single object where **options + extras are merged**.
> - `registerAsync()` takes a single object that contains **extras + async options factory**.

This README focuses on `registerAsync()`.

---

## Example: register with `@nestjs/config` + an SMTP module

Below is an example that:
- imports `ConfigModule` / `ConfigService`
- imports a hypothetical `SmtpModule` (your own module)
- generates and sends email codes via an injected `SmtpService`

```ts
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SimpleUserModule } from 'nicot-simple-user'
import { SendCodeDto } from 'nicot-simple-user/send-code/send-code.dto'

// Your own modules (examples)
import { SmtpModule } from './smtp/smtp.module'
import { SmtpService } from './smtp/smtp.service'

// Optional: your custom user entity (see "Custom userClass" section)
import { AppUser } from './entities/app-user.entity'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRoot({
      // ... your DB config
      // entities: [AppUser, ...]
    }),

    // The module responsible for actually delivering the code
    SmtpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        host: config.getOrThrow<string>('SMTP_HOST'),
        user: config.getOrThrow<string>('SMTP_USER'),
        pass: config.getOrThrow<string>('SMTP_PASS'),
      }),
    }),

    // nicot-simple-user
    SimpleUserModule.registerAsync({
      // ---- extras (structural) ----
      userClass: AppUser, // optional, defaults to SimpleUser
      userConnectionName: 'default', // optional
      userServiceCrudExtras: { relations: [] }, // optional: affects /me OpenAPI schema
      isGlobal: false, // optional

      // ---- async options ----
      imports: [ConfigModule, SmtpModule],
      inject: [ConfigService, SmtpService],
      useFactory: async (config: ConfigService, smtp: SmtpService) => ({
        redisUrl: config.getOrThrow<string>('REDIS_URL'),

        // REQUIRED: generate + deliver the code, then return it for storage & verification
        sendCodeGenerator: async (ctx: SendCodeDto) => {
          const code = String(Math.floor(100000 + Math.random() * 900000))

          await smtp.sendMail({
            to: ctx.email,
            subject: `Your verification code (${ctx.codePurpose})`,
            text: `Your verification code is: ${code}`,
          })

          return code
        },

        // optional behavior tuning
        allowAnonymousUsers: true,
        loginExpiryTimeMs: 30 * 24 * 60 * 60 * 1000,
        sendCodeValidTimeMs: 10 * 60 * 1000,
        sendCodeCooldownTimeMs: 60 * 1000,
        verifyCodeMaxAttempts: 5,
        verifyCodeBlockTimeMs: 15 * 60 * 1000,
        passwordMaxAttempts: 5,
        passwordBlockTimeMs: 15 * 60 * 1000,
      }),
    }),
  ],
})
export class AppModule {}
```

---

## ⚠️ About `registerAsync`, request-scoped providers, and Aragami

When using `registerAsync`, **be careful about injecting request-scoped providers**
(directly or indirectly) into the options factory.

**The core rule**

In NestJS, provider scope is *contagious*:

> If a provider depends on a request-scoped provider, it must also become request-scoped.

This implies:

- If **any token in `registerAsync.inject` is request-scoped**
- Then the internal `MODULE_OPTIONS_TOKEN` of `nicot-simple-user` **will also become request-scoped**
- As a result, **the entire dependency chain of this module may be upgraded to request scope**

This can happen *silently*, without any warning.

---

**A common real-world example**

Consider this pattern:

```ts
SimpleUserModule.registerAsync({
  imports: [SmtpModule],
  inject: [SmtpService],
  useFactory: async (smtp: SmtpService) => ({
    sendCodeGenerator: async (ctx) => {
      // ...
    },
  }),
})
```

At first glance, `SmtpService` looks harmless.

However, in many real projects:

- `SmtpService` depends on an email template renderer
- which depends on an i18n service
- which uses a ParamResolver or request context
- which is **request-scoped**

Once that happens, **the entire `SimpleUserModule` options provider becomes request-scoped**.

---

**Why this is dangerous**

`nicot-simple-user` internally integrates with **Aragami** for:

- sessions
- verification code storage
- cooldown / risk control
- locks and counters

Aragami is designed to be **singleton infrastructure**.

If it is accidentally instantiated or resolved through a request-scoped provider chain,
you may observe:

- multiple Aragami runtimes
- duplicated Redis connections
- inconsistent lock / cooldown behavior
- subtle bugs that only appear under concurrency

These issues are extremely hard to debug once they occur.

---

**Recommended approach: use an existing Aragami instance**

To avoid scope pollution, the **recommended and safest approach** is:

> **Register Aragami at the application level, and tell `nicot-simple-user` to reuse it.**

That is what `useExistingAragami` is for.

```ts
@Module({
  imports: [
    AragamiModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        redis: { uri: config.getOrThrow('REDIS_URL') },
      }),
    }),

    SimpleUserModule.registerAsync({
      useExistingAragami: true,

      imports: [SmtpModule],
      inject: [SmtpService],
      useFactory: async (smtp: SmtpService) => ({
        sendCodeGenerator: async (ctx) => {
          // ...
        },
      }),
    }),
  ],
})
export class AppModule {}
```

With this setup:

- Aragami remains **singleton and global**
- `nicot-simple-user` does **not** attempt to create or configure Aragami
- even if `sendCodeGenerator` depends on request-scoped services,
  **Aragami itself is not affected**

---

**Design guideline**

- Module options (`register` / `registerAsync`) should be treated as **startup-time configuration**
- Request-specific data should flow through **method parameters**, such as:
  - `SendCodeDto`
  - request context objects
  - runtime services resolved at request time

As a rule of thumb:

> If something depends on request context (i18n, tenant, locale, user agent, IP),
> it should **not** be injected into a module options factory.

---

**Summary**

- Injecting request-scoped providers into `registerAsync` can silently upgrade the entire module to request scope
- This can break Aragami’s singleton assumptions
- **The current best practice is:**
  - register Aragami once at the application level
  - set `useExistingAragami: true` in `nicot-simple-user`

This keeps infrastructure stable and avoids extremely subtle scope-related bugs.


---

## Request Headers

Clients should send the following headers:

- `x-client-ssaid` (**required** in most endpoints): a stable client session identifier
- `x-client-token` (optional): auth token for logged-in users

### About `x-client-ssaid`

`x-client-ssaid` is how the module identifies a client session/device. It is required even for anonymous users.

- Generate it once on the client and persist it (localStorage/cookie/device storage).
- Use a stable random string (UUID/ULID/NanoID are all acceptable).
- Treat it like a session identifier, not a secret.

---

## Custom `userClass` (nicot entity)

By default, the module uses the built-in `SimpleUser` entity.  
If your app needs extra fields, you can extend `SimpleUser` and pass it as `userClass`.

**Important:** your extended user class should be a **nicot entity** (not a plain TypeORM-only entity), so nicot decorators can control API output.

### Example: extend `SimpleUser` with nicot decorators

```ts
import { Entity, Index } from 'typeorm'
import { SimpleUser } from 'nicot-simple-user/simple-user.entity'
import { StringColumn, NotInResult } from 'nicot'

@Entity()
export class AppUser extends SimpleUser {
  @Index()
  @StringColumn(64, { nullable: true, description: 'User nickname' })
  nickname?: string

  // This field will be excluded from nicot result DTOs
  @NotInResult()
  @StringColumn(255, { nullable: true, description: 'Internal-only field' })
  internalNote?: string
}
```

### Why nicot decorators matter for `/me`

The `/api/user-center/me` endpoint uses a nicot-generated DTO (via `RestfulFactory`) based on your configured `userClass`.  
That means fields marked with nicot’s `@NotInResult()` are **trimmed** from:

- the `/me` OpenAPI schema
- the `/me` response output

So you can safely keep internal-only columns without exposing them through `/me`.

---

## API Overview (HTTP)

All endpoints return a standard envelope:

- `statusCode`
- `message`
- `success`
- `timestamp`
- optional `data`

### Endpoints

#### Send verification code

**POST** `/api/send-code/send`

- Headers: `x-client-ssaid`
- Body: `{ email, codePurpose }`
- 200 success
- 429 cooldown hit (returns `data.waitTimeMs`)

`codePurpose` values:
- `login`
- `ResetPassword`
- `ChangeEmail`

---

#### Verify a code

**GET** `/api/send-code/verify?email=...&codePurpose=...&code=...`

- 200 success
- 403 invalid code
- 429 too many invalid attempts (returns `data.waitTimeMs`)

By default, successful verification consumes the code.

---

#### Check if a user exists by email

**GET** `/api/login/user-exists?email=...`

Returns:
- `data.exists: boolean`

---

#### Login (code or password)

**POST** `/api/login`

- Headers: `x-client-ssaid`
- Body:
  - `{ email, code }` for code login
  - `{ email, password }` for password login
  - `{ email, code, setPassword }` to set password on first creation (optional)

Returns:
- `data.token` (64-char opaque string)
- `data.tokenExpiresAt`
- `data.userId`

Notes:
- Existing user:
  - code login verifies code
  - password login verifies password (with risk control)
- New user:
  - requires `code`
  - upgrades the anonymous user associated with `x-client-ssaid`
  - optional `setPassword` sets a password during creation

---

#### Get current user

**GET** `/api/user-center/me`

- Headers: `x-client-ssaid`
- Headers: `x-client-token` (optional; used to resolve logged-in user)

Behavior:
- With `allowAnonymousUsers=true` (default), missing token may still resolve to an anonymous user record.
- With `allowAnonymousUsers=false`, missing/invalid token results in 401.

---

#### Change password

**POST** `/api/user-center/change-password`

- Headers: `x-client-ssaid`
- Headers: `x-client-token`
- Body: `{ newPassword, currentPassword? }`

Rules:
- If a password already exists, `currentPassword` must be correct.
- On success, all sessions for this user email are revoked.

---

#### Change email

**POST** `/api/user-center/change-email`

- Headers: `x-client-ssaid`
- Headers: `x-client-token`
- Body: `{ email, code }` (code must be for `ChangeEmail`)

---

#### Reset password

**POST** `/api/login/reset-password`

- Body: `{ email, code, newPassword }` (code must be for `ResetPassword`)

On success:
- password hash is updated
- all sessions for that email are revoked

---

## Risk Control Behavior

### Send-code cooldown (429)

Cooldown is enforced across multiple dimensions:

- `email + purpose`
- `ip + purpose`
- `ssaid + purpose`

If any dimension is in cooldown, the API returns:

- 429
- `data.waitTimeMs`: milliseconds until retry is allowed

---

### Verify-code invalid attempt blocking (429)

Invalid verification attempts are blocked after:

- `verifyCodeMaxAttempts` (default 5) within
- `verifyCodeBlockTimeMs` (default 15 minutes)

Successful verification clears the failure records.

---

### Password attempt blocking (429)

Password failures are tracked across:

- `userId`
- `ssaid`
- `ip`

and blocked after `passwordMaxAttempts` within `passwordBlockTimeMs`.

---

## Testing Notes

For deterministic tests, configure `sendCodeGenerator` to always return `123456`:

```ts
SimpleUserModule.registerAsync({
  imports: [],
  inject: [],
  useFactory: async () => ({
    redisUrl: process.env.REDIS_URL!,
    sendCodeGenerator: async () => '123456',
  }),
})
```

---

## License

MIT

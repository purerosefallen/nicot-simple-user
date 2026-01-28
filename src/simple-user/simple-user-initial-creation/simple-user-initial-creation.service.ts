import { ConsoleLogger, Inject, Injectable } from '@nestjs/common';
import { CrudBase } from 'nicot';
import { OptionsExToken, UserRepoToken } from '../tokens';
import { Repository } from 'typeorm';
import { MODULE_OPTIONS_TOKEN } from '../module-builder';
import { SimpleUserExtraOptions, SimpleUserOptions } from '../options';
import { SimpleUser } from '../simple-user.entity';
import { makeArray } from 'aragami/dist/src/utility/utility';

@Injectable()
export class SimpleUserInitialCreationService extends CrudBase<SimpleUser> {
  constructor(
    @Inject(UserRepoToken)
    repo: Repository<SimpleUser>,
    @Inject(MODULE_OPTIONS_TOKEN)
    private options: SimpleUserOptions,
    @Inject(OptionsExToken)
    private optionsEx: SimpleUserExtraOptions,
  ) {
    super(optionsEx.userClass, repo, optionsEx.userServiceCrudExtras || {});
  }

  private logger = new ConsoleLogger('SimpleUserInitialCreationService');

  async createInitialUser(initialUser?: Partial<SimpleUser>, repo = this.repo) {
    const existing = await repo.findOne({
      where: { email: initialUser.email },
      select: ['id'],
      lock: {
        mode: 'pessimistic_write',
        tables: [repo.metadata.tableName],
      },
    });

    const serviceInstance = new CrudBase(
      this.entityClass,
      repo,
      this.optionsEx.userServiceCrudExtras || {},
    );

    if (existing) {
      await serviceInstance.update(existing.id, initialUser);
      this.logger.log(
        `Initial user with email ${initialUser.email} already exists. Updated existing user.`,
      );
    } else {
      await serviceInstance.create(initialUser);
      this.logger.log(`Created initial user with email ${initialUser.email}.`);
    }
  }

  async createAllInitialUsers() {
    const initialUsers = makeArray(this.options.initialUser).filter(
      (u) => u?.email,
    );

    if (!initialUsers?.length) {
      return;
    }

    await this._mayBeTransaction(async (_, repo) => {
      for (const user of initialUsers) {
        await this.createInitialUser(user, repo);
      }
    });
  }

  async onApplicationBootstrap() {
    await this.createAllInitialUsers();
  }
}

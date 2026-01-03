import {
  DateColumn,
  IdBase,
  InternalColumn,
  NotColumn,
  NotWritable,
  StringColumn,
} from 'nicot';
import { Entity, Index } from 'typeorm';
import argon2 from 'argon2';

@Entity()
export class SimpleUser extends IdBase() {
  @Index()
  @NotWritable()
  @StringColumn(255, {
    description:
      'Email address of the user. Only available for registered users',
  })
  email: string;

  @Index()
  @InternalColumn()
  @StringColumn(255, {
    description: 'SSAID of the user. Only available for anonymous users',
  })
  ssaid: string;

  @InternalColumn()
  @StringColumn(255, {
    description:
      'Hashed password of the user. Only available for registered users',
  })
  passwordHash: string;

  @NotColumn({
    description: 'Indicates whether the user has set a password',
    required: true,
  })
  passwordSet: boolean;

  async afterGet() {
    this.passwordSet = !!this.passwordHash;
  }

  /**
   * Set user's password.
   * This will hash the password using Argon2id and store the hash.
   */
  async setPassword(password: string): Promise<void> {
    this.passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
    });
  }

  /**
   * Verify user's password.
   */
  async checkPassword(password: string): Promise<boolean> {
    if (!this.passwordHash || !password) return false;

    try {
      return await argon2.verify(this.passwordHash, password);
    } catch {
      // hash format invalid / corrupted
      return false;
    }
  }

  @InternalColumn()
  @StringColumn(39, {
    description: 'Last login IP address of the user',
  })
  loginIpAddress: string;

  @InternalColumn()
  @DateColumn({
    description: 'Last login time of the user',
  })
  loginTime: Date;

  @InternalColumn()
  @StringColumn(39, {
    description: 'Registration IP address of the user',
  })
  registerIpAddress: string;

  @InternalColumn()
  @DateColumn({
    description: 'Registration time of the user',
  })
  registerTime: Date;

  @InternalColumn()
  @StringColumn(39, {
    description: 'Last active IP address of the user',
  })
  lastActiveIpAddress: string;

  @InternalColumn()
  @DateColumn({
    description: 'Last active time of the user',
  })
  lastActiveTime: Date;
}

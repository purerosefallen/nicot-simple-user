import {
  BindingColumn,
  IdBase,
  IntColumn,
  NotColumn,
  NotQueryable,
  NotWritable,
  QueryEqual,
  StringColumn,
} from 'nicot';
import { Entity, ManyToOne } from 'typeorm';
import { AppUser } from '../app-user.entity';

@Entity()
export class Article extends IdBase() {
  @QueryEqual()
  @StringColumn(255, {
    required: true,
    description: 'Article Title',
  })
  title: string;

  @StringColumn(10000, {
    description: 'Article Content',
    default: '',
  })
  content: string;

  @BindingColumn()
  @NotWritable()
  @IntColumn('bigint', {
    unsigned: true,
    description: 'Author User ID',
  })
  userId: number;

  @NotColumn()
  @ManyToOne(() => AppUser, (user) => user.articles, {
    onDelete: 'CASCADE',
  })
  user: AppUser;
}

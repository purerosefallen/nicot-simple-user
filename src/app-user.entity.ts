import { SimpleUser } from './simple-user';
import { Entity, OneToMany } from 'typeorm';
import { IntColumn, NotColumn } from 'nicot';
import { Article } from './article/article.entity';

@Entity()
export class AppUser extends SimpleUser {
  @IntColumn('int', {
    default: 18,
  })
  age: number;

  @NotColumn()
  @OneToMany(() => Article, (article) => article.user)
  articles: Article[];
}

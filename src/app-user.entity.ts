import { SimpleUser } from './simple-user/index.js';
import { Entity, OneToMany } from 'typeorm';
import { IntColumn, NotColumn } from 'nicot';
import { Article } from './article/article.entity.js';

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

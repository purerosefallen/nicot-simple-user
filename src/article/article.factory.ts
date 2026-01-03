import { RestfulFactory } from 'nicot';
import { Article } from './article.entity';

export const ArticleFactory = new RestfulFactory(Article, {
  relations: ['user'],
  skipNonQueryableFields: true,
});

import { RestfulFactory } from 'nicot';
import { Article } from './article.entity.js';

export const ArticleFactory = new RestfulFactory(Article, {
  relations: ['user'],
  skipNonQueryableFields: true,
});

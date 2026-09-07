import { Controller } from '@nestjs/common';
import { ArticleFactory } from './article.factory.js';
import { ArticleService } from './article.service.js';
import { ApiInject } from 'nicot';

@Controller('article')
export class ArticleController extends ArticleFactory.baseController() {
  constructor(@ApiInject() private service: ArticleService) {
    super(service);
  }
}

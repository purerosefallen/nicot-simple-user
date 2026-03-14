import { Controller } from '@nestjs/common';
import { ArticleFactory } from './article.factory';
import { ArticleService } from './article.service';
import { ApiInject } from 'nicot';

@Controller('article')
export class ArticleController extends ArticleFactory.baseController() {
  constructor(@ApiInject() private service: ArticleService) {
    super(service);
  }
}

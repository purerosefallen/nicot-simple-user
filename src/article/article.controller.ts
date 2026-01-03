import { Controller } from '@nestjs/common';
import { ArticleFactory } from './article.factory';
import { ArticleService } from './article.service';

@Controller('article')
export class ArticleController extends ArticleFactory.baseController() {
  constructor(private service: ArticleService) {
    super(service);
  }
}

import { Injectable } from '@nestjs/common';
import { ArticleFactory } from './article.factory';
import { InjectRepository } from '@nestjs/typeorm';
import { Article } from './article.entity';
import { InjectCurrentUser } from '../simple-user';
import { AppUser } from '../app-user.entity';
import { BindingValue } from 'nicot';

@Injectable()
export class ArticleService extends ArticleFactory.crudService() {
  constructor(
    @InjectRepository(Article) repo,
    @InjectCurrentUser() private currentUser: AppUser,
  ) {
    super(repo);
  }

  @BindingValue()
  getCurrentUserId() {
    return this.currentUser.id;
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { ArticleService } from './article.service.js';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Article } from './article.entity.js';
import { userResolverProvider } from '../simple-user/index.js';

describe('ArticleService', () => {
  let service: ArticleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticleService,
        { provide: getRepositoryToken(Article), useValue: {} },
        { provide: userResolverProvider.token, useValue: { id: 1 } },
      ],
    }).compile();

    service = module.get<ArticleService>(ArticleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

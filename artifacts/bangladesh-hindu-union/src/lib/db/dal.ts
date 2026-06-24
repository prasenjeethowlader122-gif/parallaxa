import { type NewsArticle, type CreateArticleInput, type UpdateArticleInput } from './articles'

export class NotFoundError extends Error { constructor(m: string) { super(m); this.name = 'NotFoundError' } }
export class ForbiddenError extends Error { constructor(m: string) { super(m); this.name = 'ForbiddenError' } }

export const dal = {
  createArticle: async (_userId: string, _input: CreateArticleInput): Promise<NewsArticle | null> => null,
  getMyArticles: async (_userId: string, _opts?: any): Promise<NewsArticle[]> => [],
  getMyArticlesByStatus: async (_userId: string, _status: string, _opts?: any): Promise<NewsArticle[]> => [],
  countMyArticles: async (_userId: string): Promise<number> => 0,
  updateMyArticle: async (_userId: string, _id: string, _input: UpdateArticleInput): Promise<NewsArticle | null> => null,
  deleteMyArticle: async (_userId: string, _id: string): Promise<boolean> => false,
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Post, PostStatus } from '../posts/entities/post.entity';
import { User } from '../users/entities/user.entity';
import { SearchQueryDto } from './dto/search-query.dto';
import { 
  SearchResult, 
  SearchSuggestion, 
  SearchResponse,
  SearchResultUser,
  SearchResultPost 
} from './interfaces/search-result.interface';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async search(query: SearchQueryDto): Promise<SearchResponse> {
    const { q, type, page = 1, limit = 10, sortBy, sortOrder } = query;
    const offset = (page - 1) * limit;

    this.logger.log(`Search query: "${q}", type: ${type}, page: ${page}`);

    let results: SearchResult[] = [];
    let total = 0;

    try {
      if (type === 'all' || type === 'user') {
        const userResults = await this.searchUsers(
          q, 
          type === 'user' ? limit : Math.ceil(limit / 2), 
          offset,
          sortBy,
          sortOrder
        );
        results = [...results, ...userResults.users];
        if (type === 'user') total = userResults.total;
      }

      if (type === 'all' || type === 'post') {
        const postResults = await this.searchPosts(
          q, 
          type === 'post' ? limit : Math.ceil(limit / 2), 
          offset, 
          sortBy, 
          sortOrder
        );
        results = [...results, ...postResults.posts];
        if (type === 'post') total = postResults.total;
      }

      if (type === 'all') {
        const [userTotal, postTotal] = await Promise.all([
          this.getUserSearchCount(q),
          this.getPostSearchCount(q)
        ]);
        total = userTotal + postTotal;
      }

      // Sort results by relevance if type is 'all'
      if (type === 'all' && sortBy === 'relevance') {
        results.sort((a, b) => this.calculateRelevance(b, q) - this.calculateRelevance(a, q));
      }

      // Limit results for 'all' type
      if (type === 'all') {
        results = results.slice(0, limit);
      }

      const totalPages = Math.ceil(total / limit);

      return {
        results,
        total,
        page,
        limit,
        totalPages,
        query: q,
      };
    } catch (error) {
      this.logger.error(`Search failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getSuggestions(query: string): Promise<SearchSuggestion[]> {
    const suggestions: SearchSuggestion[] = [];
    
    try {
      // Get top 3 user suggestions
      const users = await this.usersRepository
        .createQueryBuilder('user')
        .where('user.name ILIKE :query OR user.email ILIKE :query', { 
          query: `%${query}%` 
        })
        .orderBy('user.name', 'ASC')
        .limit(3)
        .getMany();

      suggestions.push(...users.map(user => ({
        id: user.id,
        type: 'user' as const,
        title: user.name,
        avatar: user.avatar,
      })));

      // Get top 3 post suggestions
      const posts = await this.postsRepository
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.author', 'author')
        .where('post.status = :status', { status: PostStatus.PUBLISHED })
        .andWhere('post.title ILIKE :query OR post.content ILIKE :query', { 
          query: `%${query}%` 
        })
        .orderBy('post.likes', 'DESC')
        .addOrderBy('post.views', 'DESC')
        .limit(3)
        .getMany();

      suggestions.push(...posts.map(post => ({
        id: post.id,
        type: 'post' as const,
        title: post.title,
        avatar: post.author?.avatar,
      })));

      return suggestions;
    } catch (error) {
      this.logger.error(`Get suggestions failed: ${error.message}`, error.stack);
      return [];
    }
  }

  async quickSearch(query: string, limit: number = 5): Promise<SearchSuggestion[]> {
    const userLimit = Math.ceil(limit / 2);
    const postLimit = limit - userLimit;

    try {
      const [users, posts] = await Promise.all([
        this.usersRepository
          .createQueryBuilder('user')
          .where('user.name ILIKE :query OR user.email ILIKE :query', { 
            query: `%${query}%` 
          })
          .orderBy('user.name', 'ASC')
          .limit(userLimit)
          .getMany(),
        
        this.postsRepository
          .createQueryBuilder('post')
          .leftJoinAndSelect('post.author', 'author')
          .where('post.status = :status', { status: PostStatus.PUBLISHED })
          .andWhere('post.title ILIKE :query OR post.content ILIKE :query', { 
            query: `%${query}%` 
          })
          .orderBy('post.likes', 'DESC')
          .limit(postLimit)
          .getMany()
      ]);

      const suggestions: SearchSuggestion[] = [
        ...users.map(user => ({
          id: user.id,
          type: 'user' as const,
          title: user.name,
          avatar: user.avatar,
        })),
        ...posts.map(post => ({
          id: post.id,
          type: 'post' as const,
          title: post.title,
          avatar: post.author?.avatar,
        })),
      ];

      return suggestions;
    } catch (error) {
      this.logger.error(`Quick search failed: ${error.message}`, error.stack);
      return [];
    }
  }

  private async searchUsers(
    query: string, 
    limit: number, 
    offset: number,
    sortBy?: string,
    sortOrder?: string
  ): Promise<{ users: SearchResultUser[], total: number }> {
    const queryBuilder = this.usersRepository
      .createQueryBuilder('user')
      .where('user.name ILIKE :query OR user.email ILIKE :query', { 
        query: `%${query}%` 
      });

    // Apply sorting
    if (sortBy === 'date') {
      queryBuilder.orderBy('user.createdAt', sortOrder as 'ASC' | 'DESC');
    } else {
      queryBuilder.orderBy('user.name', 'ASC');
    }

    queryBuilder.skip(offset).take(limit);

    const [users, total] = await queryBuilder.getManyAndCount();

    return {
      users: users.map(user => ({
        id: user.id,
        type: 'user' as const,
        title: user.name,
        avatar: user.avatar,
        excerpt: user.email,
        createdAt: user.createdAt,
      })),
      total,
    };
  }

  private async searchPosts(
    query: string, 
    limit: number, 
    offset: number, 
    sortBy?: string, 
    sortOrder?: string
  ): Promise<{ posts: SearchResultPost[], total: number }> {
    const queryBuilder = this.postsRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .where('post.status = :status', { status: PostStatus.PUBLISHED })
      .andWhere('post.title ILIKE :query OR post.content ILIKE :query', { 
        query: `%${query}%` 
      });

    // Apply sorting
    if (sortBy === 'date') {
      queryBuilder.orderBy('post.publishedAt', sortOrder as 'ASC' | 'DESC');
    } else if (sortBy === 'likes') {
      queryBuilder.orderBy('post.likes', sortOrder as 'ASC' | 'DESC');
    } else {
      // Default relevance sorting
      queryBuilder.orderBy('post.likes', 'DESC').addOrderBy('post.views', 'DESC');
    }

    queryBuilder.skip(offset).take(limit);

    const [posts, total] = await queryBuilder.getManyAndCount();

    return {
      posts: posts.map(post => ({
        id: post.id,
        type: 'post' as const,
        title: post.title,
        excerpt: post.content.substring(0, 150) + (post.content.length > 150 ? '...' : ''),
        image: post.image,
        author: {
          id: post.author.id,
          name: post.author.name,
          avatar: post.author.avatar,
        },
        createdAt: post.publishedAt || post.createdAt,
        likes: post.likes,
        views: post.views,
      })),
      total,
    };
  }

  private async getUserSearchCount(query: string): Promise<number> {
    return this.usersRepository
      .createQueryBuilder('user')
      .where('user.name ILIKE :query OR user.email ILIKE :query', { 
        query: `%${query}%` 
      })
      .getCount();
  }

  private async getPostSearchCount(query: string): Promise<number> {
    return this.postsRepository
      .createQueryBuilder('post')
      .where('post.status = :status', { status: PostStatus.PUBLISHED })
      .andWhere('post.title ILIKE :query OR post.content ILIKE :query', { 
        query: `%${query}%` 
      })
      .getCount();
  }

  private calculateRelevance(item: SearchResult, query: string): number {
    const queryLower = query.toLowerCase();
    const titleLower = item.title.toLowerCase();
    
    let score = 0;
    
    // Exact match gets highest score
    if (titleLower === queryLower) score += 100;
    
    // Title starts with query
    if (titleLower.startsWith(queryLower)) score += 50;
    
    // Title contains query
    if (titleLower.includes(queryLower)) score += 25;
    
    // For posts, factor in likes and views
    if (item.type === 'post') {
      const post = item as SearchResultPost;
      score += (post.likes || 0) * 0.1;
      score += (post.views || 0) * 0.01;
    }
    
    return score;
  }
}
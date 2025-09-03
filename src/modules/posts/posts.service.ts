import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { Post } from './entities/post.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { PostsQueryDto, UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
  ) {}

  async create(createPostDto: CreatePostDto, authorId: string): Promise<Post> {
    const post = this.postsRepository.create({
      ...createPostDto,
      authorId,
    });
    return this.postsRepository.save(post);
  }

  async findAll(query: PostsQueryDto): Promise<{
    posts: Post[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const queryBuilder = this.postsRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.comments', 'comments')
      .leftJoinAndSelect('comments.author', 'commentAuthor');

    // Search functionality
    if (search) {
      queryBuilder.where(
        'post.title ILIKE :search OR post.content ILIKE :search',
        { search: `%${search}%` }
      );
    }

    // Sorting
    if (sortBy === 'comments') {
      queryBuilder.addSelect('COUNT(comments.id)', 'commentCount')
        .groupBy('post.id, author.id, comments.id, commentAuthor.id')
        .orderBy('commentCount', sortOrder as 'ASC' | 'DESC');
    } else {
      queryBuilder.orderBy(`post.${sortBy}`, sortOrder as 'ASC' | 'DESC');
    }

    // Pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [posts, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      posts,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(id: string): Promise<Post> {
    const post = await this.postsRepository.findOne({
      where: { id },
      relations: ['author', 'comments', 'comments.author'],
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    // Increment views
    post.views += 1;
    await this.postsRepository.save(post);

    return post;
  }

  async update(id: string, updatePostDto: UpdatePostDto): Promise<Post> {
    const post = await this.findOne(id);
    
    Object.assign(post, updatePostDto);
    return this.postsRepository.save(post);
  }

  async remove(id: string): Promise<void> {
    const post = await this.findOne(id);
    await this.postsRepository.remove(post);
  }

  async likePost(id: string): Promise<Post> {
    const post = await this.findOne(id);
    post.likes += 1;
    return this.postsRepository.save(post);
  }

  async getPopularPosts(limit: number = 5): Promise<Post[]> {
    return this.postsRepository.find({
      relations: ['author', 'comments'],
      order: { likes: 'DESC', views: 'DESC' },
      take: limit,
    });
  }

  async getRecentPosts(limit: number = 5): Promise<Post[]> {
    return this.postsRepository.find({
      relations: ['author', 'comments'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}